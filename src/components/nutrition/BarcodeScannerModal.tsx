'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CameraOff,
  Loader2,
  Plus,
  RefreshCw,
  ScanBarcode,
  Search,
  WifiOff,
} from 'lucide-react';
import { FoodItem } from '@/types/nutrition';
import { FOODS_SEED_BR } from '@/data/foods-seed-br';
import { useNutritionStore } from '@/store/useNutritionStore';
import {
  fetchOpenFoodFactsByBarcode,
  normalizeBarcode,
} from '@/lib/openfoodfacts';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFoodFound: (food: FoodItem) => void;
  onCreateCustomWithBarcode: (barcode: string) => void;
}

interface NativeBarcodeDetector {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
}

interface NativeBarcodeDetectorCtor {
  new (options?: { formats?: string[] }): NativeBarcodeDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onFoodFound,
  onCreateCustomWithBarcode,
}: BarcodeScannerModalProps) {
  const customFoods = useNutritionStore((s) => s.customFoods);
  const cachedOnlineFoods = useNutritionStore((s) => s.cachedOnlineFoods);
  const cacheOnlineFoods = useNutritionStore((s) => s.cacheOnlineFoods);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const detectLoopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLookingUpRef = useRef(false);

  const [cameraStatus, setCameraStatus] = useState<
    'idle' | 'starting' | 'active' | 'denied' | 'unavailable' | 'error'
  >('idle');
  const [cameraEngine, setCameraEngine] = useState<'native' | 'zxing' | null>(
    null
  );
  const [cameraErrorMsg, setCameraErrorMsg] = useState<string | null>(null);

  const [manualCode, setManualCode] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [isOfflineError, setIsOfflineError] = useState(false);

  const stopCamera = useCallback(() => {
    if (detectLoopTimerRef.current) {
      clearTimeout(detectLoopTimerRef.current);
      detectLoopTimerRef.current = null;
    }
    if (zxingControlsRef.current) {
      try {
        zxingControlsRef.current.stop();
      } catch {
        // ignore stop errors
      }
      zxingControlsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const lookupBarcode = useCallback(
    async (rawCode: string) => {
      if (isLookingUpRef.current) return;
      const normalized = normalizeBarcode(rawCode);
      if (!normalized) {
        setLookupError(
          'Código de barras inválido. Digite entre 8 e 14 dígitos numéricos (EAN-8, UPC-A ou EAN-13).'
        );
        setNotFoundBarcode(null);
        setIsOfflineError(false);
        return;
      }

      isLookingUpRef.current = true;
      setIsLookingUp(true);
      setLookupError(null);
      setNotFoundBarcode(null);
      setIsOfflineError(false);
      setManualCode(normalized);

      try {
        // 1. Verifica catálogo local primeiro (custom, cache online e TACO)
        const localMatch =
          customFoods.find((f) => f.barcode === normalized) ||
          cachedOnlineFoods.find((f) => f.barcode === normalized) ||
          FOODS_SEED_BR.find((f) => f.barcode === normalized);

        if (localMatch) {
          stopCamera();
          onFoodFound(localMatch);
          return;
        }

        // 2. Consulta Open Food Facts v2
        const { food, isOffline } =
          await fetchOpenFoodFactsByBarcode(normalized);

        if (food) {
          cacheOnlineFoods([food]);
          stopCamera();
          onFoodFound(food);
          return;
        }

        if (isOffline) {
          setIsOfflineError(true);
          setNotFoundBarcode(normalized);
          setLookupError(
            'Sem conexão com a Open Food Facts no momento. Você pode cadastrar este alimento manualmente com o código já preenchido.'
          );
        } else {
          setNotFoundBarcode(normalized);
          setLookupError(
            `Nenhum produto encontrado na Open Food Facts para o código ${normalized}.`
          );
        }
      } finally {
        isLookingUpRef.current = false;
        setIsLookingUp(false);
      }
    },
    [
      customFoods,
      cachedOnlineFoods,
      cacheOnlineFoods,
      onFoodFound,
      stopCamera,
    ]
  );

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraErrorMsg(null);

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setCameraStatus('unavailable');
      setCameraErrorMsg(
        'A câmera não está disponível neste navegador/dispositivo. Use a digitação manual do código de barras abaixo.'
      );
      return;
    }

    setCameraStatus('starting');

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (err) {
      const name = (err as DOMException)?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraStatus('denied');
        setCameraErrorMsg(
          'Permissão de câmera negada. Libere o acesso à câmera nas configurações do navegador ou digite o código de barras manualmente.'
        );
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraStatus('unavailable');
        setCameraErrorMsg(
          'Nenhuma câmera encontrada neste dispositivo. Digite o código de barras manualmente abaixo.'
        );
      } else {
        setCameraStatus('error');
        setCameraErrorMsg(
          'Não foi possível iniciar a câmera. Tente novamente ou digite o código de barras manualmente.'
        );
      }
      return;
    }

    streamRef.current = stream;

    const videoEl = videoRef.current;
    if (!videoEl) {
      stopCamera();
      return;
    }

    // 1. Tenta BarcodeDetector nativo (Chrome / Android / Edge)
    const BarcodeDetectorAPI = (
      window as unknown as { BarcodeDetector?: NativeBarcodeDetectorCtor }
    ).BarcodeDetector;

    let useNative = false;
    if (typeof BarcodeDetectorAPI === 'function') {
      try {
        if (typeof BarcodeDetectorAPI.getSupportedFormats === 'function') {
          const formats = await BarcodeDetectorAPI.getSupportedFormats();
          useNative =
            formats.includes('ean_13') ||
            formats.includes('ean_8') ||
            formats.includes('upc_a');
        } else {
          useNative = true;
        }
      } catch {
        useNative = false;
      }
    }

    if (useNative && BarcodeDetectorAPI) {
      try {
        videoEl.srcObject = stream;
        await videoEl.play();
        setCameraEngine('native');
        setCameraStatus('active');

        const detector = new BarcodeDetectorAPI({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
        });

        const scanFrame = async () => {
          if (!streamRef.current || !videoRef.current) return;
          if (!isLookingUpRef.current && videoRef.current.readyState >= 2) {
            try {
              const detected = await detector.detect(videoRef.current);
              const rawValue = detected[0]?.rawValue;
              if (rawValue && normalizeBarcode(rawValue)) {
                void lookupBarcode(rawValue);
                return;
              }
            } catch {
              // ignora falha pontual de frame
            }
          }
          detectLoopTimerRef.current = setTimeout(scanFrame, 220);
        };

        detectLoopTimerRef.current = setTimeout(scanFrame, 250);
        return;
      } catch {
        // cai no fallback ZXing
      }
    }

    // 2. Fallback universal (@zxing/browser — iOS Safari, Firefox, etc.) com carregamento dinâmico
    try {
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
        await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ]);

      if (!streamRef.current || !videoRef.current) return;

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
      ]);

      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 250,
      });

      setCameraEngine('zxing');
      setCameraStatus('active');

      const controls = await reader.decodeFromStream(
        stream,
        videoRef.current,
        (result) => {
          if (result && !isLookingUpRef.current) {
            const text = result.getText();
            if (text && normalizeBarcode(text)) {
              void lookupBarcode(text);
            }
          }
        }
      );

      zxingControlsRef.current = controls;
    } catch {
      stopCamera();
      setCameraStatus('error');
      setCameraErrorMsg(
        'Não foi possível ativar o leitor de câmera neste navegador. Use o campo manual abaixo para consultar pelo número do código de barras.'
      );
    }
  }, [lookupBarcode, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      setManualCode('');
      setLookupError(null);
      setNotFoundBarcode(null);
      setIsOfflineError(false);
      void startCamera();
    } else {
      stopCamera();
      setCameraStatus('idle');
      setCameraEngine(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void lookupBarcode(manualCode);
  };

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          stopCamera();
          onClose();
        }
      }}
    >
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader className="shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-blue-600 dark:text-blue-400">
              <ScanBarcode className="size-5" />
            </div>
            <div className="min-w-0">
              <ResponsiveDialogTitle className="truncate">
                Ler Código de Barras
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                EAN-13, EAN-8 ou UPC-A • Open Food Facts
              </ResponsiveDialogDescription>
            </div>
          </div>
        </ResponsiveDialogHeader>

        {/* Corpo */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Viewport da Câmera */}
          <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-2xl border border-border bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`size-full object-cover ${
                cameraStatus === 'active' ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {cameraStatus === 'active' && (
              <>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="flex h-28 w-4/5 max-w-[280px] items-center justify-center rounded-2xl border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                    <div className="h-0.5 w-11/12 animate-pulse bg-red-500/80" />
                  </div>
                </div>
                <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/75 px-3 py-1 text-[11px] font-semibold text-white">
                  Aponte para o código de barras (
                  {cameraEngine === 'native' ? 'Nativo' : 'ZXing'})
                </span>
              </>
            )}

            {cameraStatus === 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-white">
                <Loader2 className="size-7 animate-spin text-primary" />
                <p className="text-xs font-semibold">
                  Solicitando acesso à câmera traseira...
                </p>
              </div>
            )}

            {(cameraStatus === 'denied' ||
              cameraStatus === 'unavailable' ||
              cameraStatus === 'error') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/95 p-5 text-center text-zinc-200">
                <CameraOff className="size-8 text-amber-400" />
                <p className="max-w-xs text-xs leading-relaxed">
                  {cameraErrorMsg}
                </p>
                <Button
                  onClick={() => void startCamera()}
                  className="text-xs"
                >
                  <RefreshCw className="size-3.5" /> Tentar câmera novamente
                </Button>
              </div>
            )}
          </div>

          {/* Entrada Manual de Código de Barras */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <Label htmlFor="manual-barcode-input">
              Ou digite o número do código de barras
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Camera className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="manual-barcode-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={manualCode}
                  onChange={(e) => {
                    setManualCode(
                      e.target.value.replace(/\D/g, '').slice(0, 14)
                    );
                    if (lookupError) setLookupError(null);
                  }}
                  placeholder="Ex: 7891000100103"
                  className="pl-10 font-bold tabular-nums"
                />
              </div>
              <Button
                type="submit"
                disabled={isLookingUp || manualCode.length < 8}
                className="shrink-0 text-xs"
              >
                {isLookingUp ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                <span>Buscar</span>
              </Button>
            </div>
          </form>

          {/* Feedback de Busca / Produto Não Encontrado */}
          {isLookingUp && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-primary/30 bg-primary/15 p-3.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <Loader2 className="size-4 shrink-0 animate-spin" />
              <span>
                Consultando informações nutricionais do código {manualCode}...
              </span>
            </div>
          )}

          {lookupError && !isLookingUp && (
            <div
              className={`space-y-3 rounded-2xl border p-4 ${
                isOfflineError
                  ? 'border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-400'
                  : 'border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-400'
              }`}
            >
              <div className="flex items-start gap-2 text-xs font-semibold">
                {isOfflineError ? (
                  <WifiOff className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                )}
                <span>{lookupError}</span>
              </div>

              {notFoundBarcode && (
                <Button
                  onClick={() => {
                    stopCamera();
                    onCreateCustomWithBarcode(notFoundBarcode);
                  }}
                  className="w-full text-xs"
                >
                  <Plus className="size-4" />
                  Cadastrar alimento com código {notFoundBarcode}
                </Button>
              )}
            </div>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
