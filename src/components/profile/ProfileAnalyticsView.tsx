'use client';

import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Camera,
  Check,
  Edit3,
  Ruler,
  Settings,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { BackupFile, RestoreMode } from '@/lib/backup';
import { convertVolumeFromKg } from '@/lib/calculations';
import { RestoreBackupModal } from '@/components/profile/RestoreBackupModal';
import { AnalyticsTab } from '@/components/profile/AnalyticsTab';
import { MeasurementsTab } from '@/components/profile/MeasurementsTab';
import { ProgressPhotosTab } from '@/components/profile/ProgressPhotosTab';
import {
  BackupFeedbackState,
  DataAndSettingsTab,
} from '@/components/profile/DataAndSettingsTab';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ProfileSubTab = 'analytics' | 'measurements' | 'photos' | 'data';

export function ProfileAnalyticsView() {
  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);
  const settings = useWorkoutStore((s) => s.settings);
  const updateSettings = useWorkoutStore((s) => s.updateSettings);
  const restoreBackup = useWorkoutStore((s) => s.restoreBackup);
  const undoLastRestore = useWorkoutStore((s) => s.undoLastRestore);

  const [subTab, setSubTab] = useState<ProfileSubTab>('analytics');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(settings.name);
  const [bioInput, setBioInput] = useState(settings.bio);

  const [pendingRestore, setPendingRestore] = useState<BackupFile | null>(null);
  const [backupFeedback, setBackupFeedback] =
    useState<BackupFeedbackState | null>(null);

  const weightUnit = settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';

  const totalStats = useMemo(() => {
    const totalWorkouts = workoutHistory.length;
    const totalVolume = workoutHistory.reduce(
      (acc, w) => acc + w.totalVolumeKg,
      0
    );
    const totalPRs = workoutHistory.reduce((acc, w) => acc + w.prCount, 0);
    return { totalWorkouts, totalVolume, totalPRs };
  }, [workoutHistory]);

  const initials = (settings.name || 'U')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nameInput.trim() || 'Usuário';
    updateSettings({
      name: cleanName,
      bio: bioInput.trim(),
    });
    setIsEditingName(false);
    toast.success('Perfil atualizado!');
  };

  const handleConfirmRestore = (mode: RestoreMode) => {
    if (!pendingRestore) return;
    try {
      restoreBackup(pendingRestore.data, mode);
      const msg =
        mode === 'replace'
          ? 'Backup restaurado com sucesso!'
          : 'Backup mesclado com sucesso!';
      setBackupFeedback({
        type: 'success',
        text: msg,
        canUndo: true,
      });
      toast.success(msg);
    } catch (err) {
      const quota = (err as Error)?.name === 'QuotaExceededError';
      const msg = quota
        ? 'Sem espaço no armazenamento do navegador. Tente um backup sem fotos.'
        : 'Não foi possível restaurar o backup. Nenhum dado foi alterado.';
      setBackupFeedback({
        type: 'error',
        text: msg,
      });
      toast.error(msg);
    } finally {
      setPendingRestore(null);
    }
  };

  const handleUndoRestore = () => {
    if (undoLastRestore()) {
      const msg = 'Restauração desfeita.';
      setBackupFeedback({ type: 'success', text: msg });
      toast.success(msg);
    } else {
      const msg = 'Não há restauração para desfazer.';
      setBackupFeedback({ type: 'error', text: msg });
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Header do Perfil com Edição Direta do Nome & KPIs Globais */}
      <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="size-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-extrabold shadow-sm shrink-0">
            {initials}
          </div>

          {isEditingName ? (
            <form
              onSubmit={handleSaveName}
              className="flex-1 max-w-md space-y-2"
            >
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Seu nome..."
                  aria-label="Nome do atleta"
                  className="font-bold"
                />
                <Button
                  type="submit"
                  size="default"
                  className="min-h-[44px] px-3.5 text-xs shrink-0"
                >
                  <Check className="size-3.5" /> Salvar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  aria-label="Cancelar edição do nome"
                  onClick={() => setIsEditingName(false)}
                  className="min-h-[44px] shrink-0"
                >
                  <X className="size-4" />
                </Button>
              </div>
              <Input
                type="text"
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                placeholder="Sua bio ou objetivo (opcional)..."
                aria-label="Bio ou objetivo"
              />
            </form>
          ) : (
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold text-foreground truncate">
                  {settings.name || 'Usuário'}
                </h1>
                <Badge variant="info" className="text-[11px]">
                  {settings.weeklyWorkoutGoal}x/sem
                </Badge>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setNameInput(settings.name);
                    setBioInput(settings.bio);
                    setIsEditingName(true);
                  }}
                  title="Alterar Nome"
                  className="min-h-[44px] px-3 text-xs text-blue-600 dark:text-blue-400"
                >
                  <Edit3 className="size-3.5" /> Alterar Nome
                </Button>
              </div>
              {settings.bio && (
                <p className="text-xs text-muted-foreground">{settings.bio}</p>
              )}
            </div>
          )}
        </div>

        {/* KPIs Globais */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-border shrink-0">
          <Card className="bg-secondary/50 px-3 py-2.5 text-center shadow-none">
            <span className="text-lg font-extrabold text-foreground tabular-nums block leading-tight">
              {totalStats.totalWorkouts}
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">Treinos</p>
          </Card>

          <Card className="bg-secondary/50 px-3 py-2.5 text-center shadow-none">
            <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400 tabular-nums block leading-tight">
              {weightUnit === 'lbs'
                ? `${(convertVolumeFromKg(totalStats.totalVolume, 'lbs') / 1000).toFixed(1)}k lbs`
                : `${(totalStats.totalVolume / 1000).toFixed(1)}t`}
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Volume Total
            </p>
          </Card>

          <Card className="bg-secondary/50 px-3 py-2.5 text-center shadow-none">
            <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400 tabular-nums block leading-tight">
              {totalStats.totalPRs}
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Recordes (PRs)
            </p>
          </Card>
        </div>
      </Card>

      {/* Navegação de Sub-Abas com shadcn Tabs */}
      <Tabs
        value={subTab}
        onValueChange={(value) => setSubTab(value as ProfileSubTab)}
        className="space-y-2"
      >
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-2xs">
          <TabsTrigger
            value="analytics"
            className="min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
          >
            <BarChart3 className="size-4 shrink-0" /> Analytics &amp; Heatmap
          </TabsTrigger>
          <TabsTrigger
            value="measurements"
            className="min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
          >
            <Ruler className="size-4 shrink-0" /> Medidas Corporais
          </TabsTrigger>
          <TabsTrigger
            value="photos"
            className="min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
          >
            <Camera className="size-4 shrink-0" /> Fotos de Progresso
          </TabsTrigger>
          <TabsTrigger
            value="data"
            className="min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
          >
            <Settings className="size-4 shrink-0" /> Backup &amp; Dados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>

        <TabsContent value="measurements">
          <MeasurementsTab />
        </TabsContent>

        <TabsContent value="photos">
          <ProgressPhotosTab />
        </TabsContent>

        <TabsContent value="data">
          <DataAndSettingsTab
            onRequestRestore={setPendingRestore}
            backupFeedback={backupFeedback}
            onBackupFeedback={setBackupFeedback}
            onUndoRestore={handleUndoRestore}
          />
        </TabsContent>
      </Tabs>

      {pendingRestore && (
        <RestoreBackupModal
          file={pendingRestore}
          onCancel={() => setPendingRestore(null)}
          onConfirm={handleConfirmRestore}
        />
      )}
    </div>
  );
}
