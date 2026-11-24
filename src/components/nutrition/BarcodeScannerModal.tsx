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
  X,
} from 'lucide-react';
import { FoodItem } from '@/types/nutrition';
import { FOODS_SEED_BR } from '@/data/foods-seed-br';
import { useNutritionStore } from '@/store/useNutritionStore';
import {
  fetchOpenFoodFactsByBarcode,
  normalizeBarcode,
} from '@/lib/openfoodfacts';

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
          if (
            !isLookingUpRef.current &&
            videoRef.current.readyState >= 2
          ) {
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

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void lookupBarcode(manualCode);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="barcode-scanner-title"
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#3B82F6] flex items-center justify-center shrink-0">
              <ScanBarcode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="barcode-scanner-title"
                className="text-base sm:text-lg font-extrabold text-slate-900 truncate"
              >
                Ler Código de Barras
              </h2>
              <p className="text-xs text-slate-500">
                EAN-13, EAN-8 ou UPC-A • Open Food Facts
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar leitor de código de barras"
            className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Viewport da Câmera */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 aspect-[16/10] flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover ${
                cameraStatus === 'active' ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {cameraStatus === 'active' && (
              <>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="w-4/5 max-w-[280px] h-28 rounded-2xl border-2 border-[#3B82F6] shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] flex items-center justify-center">
                    <div className="w-11/12 h-0.5 bg-red-500/80 animate-pulse" />
                  </div>
                </div>
                <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/70 text-white text-[11px] font-semibold whitespace-nowrap">
                  Aponte para o código de barras (
                  {cameraEngine === 'native' ? 'Nativo' : 'ZXing'})
                </span>
              </>
            )}

            {cameraStatus === 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white p-4 text-center">
                <Loader2 className="w-7 h-7 animate-spin text-[#3B82F6]" />
                <p className="text-xs font-semibold">
                  Solicitando acesso à câmera traseira...
                </p>
              </div>
            )}

            {(cameraStatus === 'denied' ||
              cameraStatus === 'unavailable' ||
              cameraStatus === 'error') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-200 p-5 text-center bg-slate-900/95">
                <CameraOff className="w-8 h-8 text-amber-400" />
                <p className="text-xs leading-relaxed max-w-xs">
                  {cameraErrorMsg}
                </p>
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  className="h-10 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Tentar câmera novamente
                </button>
              </div>
            )}
          </div>

          {/* Entrada Manual de Código de Barras */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label
              htmlFor="manual-barcode-input"
              className="block text-xs font-bold uppercase tracking-wider text-slate-600"
            >
              Ou digite o número do código de barras
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Camera className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="manual-barcode-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={manualCode}
                  onChange={(e) => {
                    setManualCode(e.target.value.replace(/\D/g, '').slice(0, 14));
                    if (lookupError) setLookupError(null);
                  }}
                  placeholder="Ex: 7891000100103"
                  className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-base font-bold text-slate-900 placeholder-slate-400 tabular-nums focus:outline-none focus:border-[#3B82F6]"
                />
              </div>
              <button
                type="submit"
                disabled={isLookingUp || manualCode.length < 8}
                className="h-11 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 transition"
              >
                {isLookingUp ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>Buscar</span>
              </button>
            </div>
          </form>

          {/* Feedback de Busca / Produto Não Encontrado */}
          {isLookingUp && (
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-[#3B82F6] text-xs font-semibold flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Consultando informações nutricionais do código {manualCode}...</span>
            </div>
          )}

          {lookupError && !isLookingUp && (
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isOfflineError
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <div className="flex items-start gap-2 text-xs font-semibold">
                {isOfflineError ? (
                  <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{lookupError}</span>
              </div>

              {notFoundBarcode && (
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    onCreateCustomWithBarcode(notFoundBarcode);
                  }}
                  className="w-full h-11 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar alimento com código {notFoundBarcode}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
