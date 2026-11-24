'use client';

import React, { useRef, useState } from 'react';
import { AlertTriangle, Camera, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { formatWeightWithUnit } from '@/lib/calculations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Formato de imagem inválido.'));
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error('Arquivo não é uma imagem válida.'));
      img.onload = () => {
        const MAX_EDGE = 960;
        let { width, height } = img;
        if (width > MAX_EDGE || height > MAX_EDGE) {
          if (width >= height) {
            height = Math.round((height * MAX_EDGE) / width);
            width = MAX_EDGE;
          } else {
            width = Math.round((width * MAX_EDGE) / height);
            height = MAX_EDGE;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.78);
        resolve(compressed);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function ProgressPhotosTab() {
  const progressPhotos = useWorkoutStore((s) => s.progressPhotos);
  const measurements = useWorkoutStore((s) => s.measurements);
  const settings = useWorkoutStore((s) => s.settings);
  const addProgressPhoto = useWorkoutStore((s) => s.addProgressPhoto);
  const deleteProgressPhoto = useWorkoutStore((s) => s.deleteProgressPhoto);

  const [photoError, setPhotoError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const weightUnit = settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setPhotoError(null);

    if (!file.type.startsWith('image/')) {
      const msg = 'Selecione um arquivo de imagem válido (JPG, PNG, WebP).';
      setPhotoError(msg);
      toast.error(msg);
      return;
    }

    try {
      const dataUrl = await compressImageFile(file);
      // Protege contra estouro do limite de ~5MB do localStorage
      const approxCurrentBytes =
        typeof localStorage !== 'undefined'
          ? (localStorage.getItem('ironpulse-storage-v3')?.length ?? 0) * 2
          : 0;
      const incomingBytes = dataUrl.length * 2;
      if (approxCurrentBytes + incomingBytes > 4_200_000) {
        const msg =
          'Armazenamento local quase cheio. Exclua fotos antigas ou faça um backup antes de adicionar novas fotos.';
        setPhotoError(msg);
        toast.error(msg);
        return;
      }

      const latestWeight =
        measurements[measurements.length - 1]?.weightKg || 0;
      addProgressPhoto({
        date: new Date().toISOString().slice(0, 10),
        weightKg: latestWeight,
        caption: 'Registro de Progresso',
        pose: 'Frente',
        dataUrl,
      });
      toast.success('Foto de progresso adicionada!');
    } catch {
      const msg = 'Não foi possível processar esta imagem. Tente outra foto.';
      setPhotoError(msg);
      toast.error(msg);
    }
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteId) return;
    deleteProgressPhoto(pendingDeleteId);
    setPendingDeleteId(null);
    toast.success('Foto de progresso excluída.');
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-foreground">
            Galeria de Fotos de Progresso
          </h2>
          <p className="text-xs text-muted-foreground">
            Adicione fotos associadas à data e ao seu peso corporal
          </p>
        </div>

        <div className="shrink-0">
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full min-h-[44px] px-4 text-xs w-full sm:w-auto"
          >
            <Camera className="size-4" /> Adicionar Foto
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            aria-label="Selecionar foto de progresso"
            className="sr-only"
          />
        </div>
      </Card>

      {photoError && (
        <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{photoError}</span>
        </div>
      )}

      {progressPhotos.length === 0 ? (
        <Card className="border-dashed p-12 text-center space-y-3 shadow-none">
          <Camera className="size-10 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-bold text-foreground">
            Nenhuma foto de progresso salva ainda
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Clique em &ldquo;Adicionar Foto&rdquo; acima para registrar sua
            evolução física.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {progressPhotos.map((photo) => (
            <Card
              key={photo.id}
              className="overflow-hidden flex flex-col justify-between"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.dataUrl}
                alt={photo.caption}
                className="w-full h-64 object-cover bg-secondary"
              />
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-xs font-bold text-foreground tabular-nums">
                      {photo.date}
                      {photo.weightKg
                        ? ` • ${formatWeightWithUnit(photo.weightKg, weightUnit, true)}`
                        : ''}
                    </p>
                    {photo.pose && (
                      <Badge variant="secondary" className="text-[10px]">
                        {photo.pose}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {photo.caption}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir foto de progresso"
                  onClick={() => setPendingDeleteId(photo.id)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Excluir Foto de Progresso"
        description="Deseja excluir esta foto de progresso? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
