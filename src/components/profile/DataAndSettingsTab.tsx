'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Download,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useNutritionStore } from '@/store/useNutritionStore';
import { INITIAL_EXERCISES } from '@/data/initial-data';
import {
  BackupFile,
  createBackup,
  parseBackup,
  shareOrDownloadBackup,
} from '@/lib/backup';
import { exportWorkoutsToCSV } from '@/lib/calculations';
import { DEFAULT_AI_REPORT_PROMPT } from '@/lib/ai-report';
import {
  enableRestTimerNotifications,
  getNotificationPermissionState,
  triggerImmediateRestNotification,
} from '@/lib/notifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export interface BackupFeedbackState {
  type: 'success' | 'error';
  text: string;
  canUndo?: boolean;
}

interface DataAndSettingsTabProps {
  onRequestRestore: (file: BackupFile) => void;
  backupFeedback: BackupFeedbackState | null;
  onBackupFeedback: (feedback: BackupFeedbackState | null) => void;
  onUndoRestore: () => void;
}

export function DataAndSettingsTab({
  onRequestRestore,
  backupFeedback,
  onBackupFeedback,
  onUndoRestore,
}: DataAndSettingsTabProps) {
  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);
  const exercises = useWorkoutStore((s) => s.exercises);
  const measurements = useWorkoutStore((s) => s.measurements);
  const progressPhotos = useWorkoutStore((s) => s.progressPhotos);
  const settings = useWorkoutStore((s) => s.settings);
  const routines = useWorkoutStore((s) => s.routines);
  const folders = useWorkoutStore((s) => s.folders);
  const lastBackupAt = useWorkoutStore((s) => s.lastBackupAt);

  const updateSettings = useWorkoutStore((s) => s.updateSettings);
  const clearAllData = useWorkoutStore((s) => s.clearAllData);
  const markBackupDone = useWorkoutStore((s) => s.markBackupDone);

  const [includePhotosInBackup, setIncludePhotosInBackup] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [notifStatus, setNotifStatus] = useState<
    NotificationPermission | 'unsupported'
  >('default');
  const [notifMessage, setNotifMessage] = useState<string | null>(null);

  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNotifStatus(getNotificationPermissionState());
  }, []);

  const weightUnit = settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';

  const daysSinceBackup = lastBackupAt
    ? Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / 86_400_000)
    : null;
  const backupOverdue = daysSinceBackup === null || daysSinceBackup > 7;
  const lastBackupLabel =
    daysSinceBackup === null
      ? 'Nenhum backup realizado ainda'
      : daysSinceBackup === 0
        ? 'Último backup: hoje'
        : daysSinceBackup === 1
          ? 'Último backup: ontem'
          : `Último backup: há ${daysSinceBackup} dias`;

  const restOptions = Array.from(
    new Set([
      60,
      90,
      120,
      150,
      ...(settings.defaultRestSeconds > 0 ? [settings.defaultRestSeconds] : []),
    ])
  ).sort((a, b) => a - b);

  const barWeightOptions = Array.from(
    new Set([
      20,
      15,
      10,
      ...(settings.defaultBarWeightKg > 0 ? [settings.defaultBarWeightKg] : []),
    ])
  ).sort((a, b) => b - a);

  const weeklyGoalValue = String(
    [2, 3, 4, 5, 6].includes(settings.weeklyWorkoutGoal)
      ? settings.weeklyWorkoutGoal
      : 4
  );

  const activeAiPrompt = settings.aiReportPrompt ?? DEFAULT_AI_REPORT_PROMPT;
  const isCustomAiPrompt =
    settings.aiReportPrompt !== undefined &&
    settings.aiReportPrompt !== DEFAULT_AI_REPORT_PROMPT;

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const nutritionBackup = useNutritionStore
        .getState()
        .getNutritionBackupData();
      const file = createBackup(
        {
          exercises,
          folders,
          routines,
          workoutHistory,
          measurements,
          progressPhotos,
          settings,
          nutrition: nutritionBackup,
        },
        {
          includePhotos: includePhotosInBackup,
          seedIds: new Set(INITIAL_EXERCISES.map((e) => e.id)),
        }
      );
      const result = await shareOrDownloadBackup(file);
      if (result !== 'cancelled') {
        markBackupDone();
        const msg = 'Backup exportado com sucesso!';
        onBackupFeedback({ type: 'success', text: msg });
        toast.success(msg);
      }
    } catch {
      const msg = 'Não foi possível exportar o backup.';
      onBackupFeedback({ type: 'error', text: msg });
      toast.error(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const selected = input.files?.[0];
    input.value = '';
    if (!selected) return;
    const parsed = parseBackup(await selected.text());
    if (!parsed.ok) {
      onBackupFeedback({ type: 'error', text: parsed.error });
      toast.error(parsed.error);
      return;
    }
    onRequestRestore(parsed.file);
  };

  const handleDownloadCSV = () => {
    const csvContent = exportWorkoutsToCSV(workoutHistory, exercises);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ironpulse_workouts_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Arquivo CSV exportado com sucesso!');
  };

  const handleConfirmResetAll = () => {
    clearAllData();
    setConfirmResetOpen(false);
    toast.success('Todos os dados foram zerados.');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Backup & Restauração */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
            Backup &amp; Restauração
          </CardTitle>
          <CardDescription className="leading-relaxed">
            Seus dados ficam salvos apenas neste aparelho. Exporte um backup em{' '}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-foreground">
              .json
            </code>{' '}
            (rotinas, histórico, nutrição, medidas, fotos e configurações) e
            restaure quando trocar de celular ou limpar o navegador.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              backupOverdue
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-400'
                : 'bg-secondary/60 border-border text-muted-foreground'
            }`}
          >
            {backupOverdue ? (
              <AlertTriangle className="size-4 shrink-0" />
            ) : (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>
              {lastBackupLabel}
              {backupOverdue && ' — recomendamos fazer um backup agora.'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-3.5 py-2 min-h-[44px]">
            <Label
              htmlFor="include-photos-backup"
              className="normal-case tracking-normal text-sm font-medium text-foreground cursor-pointer flex-1"
            >
              Incluir fotos de progresso{' '}
              <span className="text-xs font-normal text-muted-foreground tabular-nums">
                ({progressPhotos.length})
              </span>
            </Label>
            <Switch
              id="include-photos-backup"
              checked={includePhotosInBackup}
              onCheckedChange={setIncludePhotosInBackup}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              size="lg"
              onClick={handleExportBackup}
              disabled={isExporting}
              className="w-full text-sm"
            >
              <Download className="size-5" />
              {isExporting ? 'Exportando...' : 'Exportar Backup'}
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={() => restoreInputRef.current?.click()}
              className="w-full text-sm"
            >
              <Upload className="size-5" /> Restaurar Backup
            </Button>

            <input
              ref={restoreInputRef}
              type="file"
              accept="application/json,.json"
              aria-label="Selecionar arquivo de backup JSON"
              className="sr-only"
              onChange={handleRestoreFile}
            />
          </div>

          {backupFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs flex flex-wrap items-center gap-2 ${
                backupFeedback.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-400'
              }`}
            >
              {backupFeedback.type === 'success' ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <AlertTriangle className="size-4 shrink-0" />
              )}
              <span className="flex-1 min-w-[160px]">
                {backupFeedback.text}
              </span>
              {backupFeedback.canUndo && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onUndoRestore}
                  className="min-h-[44px] px-3 text-xs"
                >
                  <Undo2 className="size-4" /> Desfazer
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exportação CSV & Zona de Perigo */}
      <Card className="flex flex-col justify-between">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Download className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
            Exportar &amp; Gerenciar Dados
          </CardTitle>
          <CardDescription className="leading-relaxed">
            Exporte todo o seu histórico de treinos em formato{' '}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-foreground">
              .csv
            </code>{' '}
            ou limpe todos os dados armazenados no navegador.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleDownloadCSV}
              className="min-h-[44px] text-xs"
            >
              <Download className="size-4" /> Exportar Histórico CSV
            </Button>

            <Button
              variant="destructive-outline"
              onClick={() => setConfirmResetOpen(true)}
              className="min-h-[44px] text-xs"
            >
              <Trash2 className="size-4" /> Zerar Todos os Dados
            </Button>
          </div>

          <Separator />

          {/* Prompt Personalizado de Relatório IA */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <Label
                htmlFor="settings-ai-prompt"
                className="flex items-center gap-1.5"
              >
                <Sparkles className="size-3.5 text-purple-600 dark:text-purple-400" />
                Prompt do Relatório IA
              </Label>
              {isCustomAiPrompt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    updateSettings({
                      aiReportPrompt: DEFAULT_AI_REPORT_PROMPT,
                    });
                    toast.success('Prompt padrão restaurado.');
                  }}
                  className="min-h-[44px] px-2.5 text-xs"
                >
                  <RotateCcw className="size-3.5" /> Restaurar padrão
                </Button>
              )}
            </div>
            <Textarea
              id="settings-ai-prompt"
              rows={5}
              value={activeAiPrompt}
              onChange={(e) =>
                updateSettings({ aiReportPrompt: e.target.value })
              }
              placeholder="Instruções usadas ao gerar o relatório de treino com IA..."
              className="text-base sm:text-sm leading-relaxed"
            />
            <p className="text-[11px] text-muted-foreground">
              Personalize as instruções enviadas no cabeçalho do relatório de
              treino gerado para análise em IA.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preferências do Usuário & Treino */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Settings className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
            Preferências do Usuário &amp; Treino
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="settings-profile-name">Nome no Perfil</Label>
            <Input
              id="settings-profile-name"
              type="text"
              value={settings.name}
              onChange={(e) => updateSettings({ name: e.target.value })}
              placeholder="Seu nome..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settings-profile-bio">Bio / Objetivo</Label>
            <Input
              id="settings-profile-bio"
              type="text"
              value={settings.bio}
              onChange={(e) => updateSettings({ bio: e.target.value })}
              placeholder="Ex: Foco em hipertrofia e força..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="select-theme">Tema da Interface</Label>
              <Select
                value={settings.theme === 'light' ? 'light' : 'dark'}
                onValueChange={(val) =>
                  updateSettings({
                    theme: val === 'light' ? 'light' : 'dark',
                  })
                }
              >
                <SelectTrigger id="select-theme">
                  <SelectValue placeholder="Selecione o tema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Escuro (Padrão)</SelectItem>
                  <SelectItem value="light">Claro (Alto Contraste)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="select-weight-unit">Unidade de Peso</Label>
              <Select
                value={weightUnit}
                onValueChange={(val) =>
                  updateSettings({
                    weightUnit: val === 'lbs' ? 'lbs' : 'kg',
                  })
                }
              >
                <SelectTrigger id="select-weight-unit">
                  <SelectValue placeholder="Unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Quilogramas (kg)</SelectItem>
                  <SelectItem value="lbs">Libras (lbs)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="select-weekly-goal">Meta Semanal</Label>
              <Select
                value={weeklyGoalValue}
                onValueChange={(val) =>
                  updateSettings({ weeklyWorkoutGoal: Number(val) })
                }
              >
                <SelectTrigger id="select-weekly-goal">
                  <SelectValue placeholder="Meta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 treinos / sem</SelectItem>
                  <SelectItem value="3">3 treinos / sem</SelectItem>
                  <SelectItem value="4">4 treinos / sem</SelectItem>
                  <SelectItem value="5">5 treinos / sem</SelectItem>
                  <SelectItem value="6">6 treinos / sem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="select-default-rest">Descanso Padrão</Label>
              <Select
                value={String(settings.defaultRestSeconds || 90)}
                onValueChange={(val) =>
                  updateSettings({ defaultRestSeconds: Number(val) })
                }
              >
                <SelectTrigger id="select-default-rest">
                  <SelectValue placeholder="Descanso" />
                </SelectTrigger>
                <SelectContent>
                  {restOptions.map((sec) => (
                    <SelectItem key={sec} value={String(sec)}>
                      {sec} segundos
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="select-bar-weight">Peso da Barra</Label>
              <Select
                value={String(settings.defaultBarWeightKg || 20)}
                onValueChange={(val) => {
                  const num = Number(val);
                  updateSettings({
                    defaultBarWeightKg: num,
                    barbellWeightKg: num,
                  });
                }}
              >
                <SelectTrigger id="select-bar-weight">
                  <SelectValue placeholder="Barra" />
                </SelectTrigger>
                <SelectContent>
                  {barWeightOptions.map((kg) => (
                    <SelectItem key={kg} value={String(kg)}>
                      {kg === 20 ? '20 kg (Olímpica)' : `${kg} kg`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between gap-3 min-h-[44px] rounded-xl border border-border bg-secondary/40 px-3.5 py-2">
              <Label
                htmlFor="switch-rpe-column"
                className="normal-case tracking-normal text-xs sm:text-sm font-medium text-foreground cursor-pointer flex-1"
              >
                Exibir coluna RPE na tabela de treino (Avançado)
              </Label>
              <Switch
                id="switch-rpe-column"
                checked={Boolean(settings.showRpeColumn)}
                onCheckedChange={(checked) =>
                  updateSettings({ showRpeColumn: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between gap-3 min-h-[44px] rounded-xl border border-border bg-secondary/40 px-3.5 py-2">
              <Label
                htmlFor="switch-sound-enabled"
                className="normal-case tracking-normal text-xs sm:text-sm font-medium text-foreground cursor-pointer flex-1"
              >
                Alerta Sonoro ao Fim do Descanso
              </Label>
              <Switch
                id="switch-sound-enabled"
                checked={settings.soundEnabled}
                onCheckedChange={(checked) =>
                  updateSettings({ soundEnabled: checked })
                }
              />
            </div>
          </div>

          <Separator />

          {/* Notificações Push */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Bell className="size-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  Notificações Push no iPhone / Segundo Plano
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Receba alerta na tela bloqueada quando o tempo de descanso
                  acabar.
                </p>
              </div>
              <Badge
                variant={notifStatus === 'granted' ? 'success' : 'secondary'}
                className="text-[10px] uppercase shrink-0"
              >
                {notifStatus === 'granted' ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {notifStatus !== 'granted' ? (
                <Button
                  size="sm"
                  onClick={async () => {
                    const res = await enableRestTimerNotifications();
                    setNotifStatus(getNotificationPermissionState());
                    if (res.granted) {
                      const msg =
                        'Notificações de descanso ativadas com sucesso!';
                      setNotifMessage(msg);
                      toast.success(msg);
                    } else if (res.reason) {
                      setNotifMessage(res.reason);
                      toast.info(res.reason);
                    }
                  }}
                  className="min-h-[44px] text-xs"
                >
                  <Bell className="size-3.5" /> Ativar Notificações de Descanso
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    await triggerImmediateRestNotification('Supino Reto');
                    const msg = 'Notificação de teste enviada!';
                    setNotifMessage(msg);
                    toast.success(msg);
                  }}
                  className="min-h-[44px] text-xs"
                >
                  <Bell className="size-3.5 text-blue-600 dark:text-blue-400" />{' '}
                  Testar Notificação Agora
                </Button>
              )}
            </div>

            {notifMessage && (
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                {notifMessage}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmResetOpen}
        onOpenChange={setConfirmResetOpen}
        title="Zerar Todos os Dados?"
        description="Deseja apagar todos os dados cadastrados e voltar ao estado inicial vazio? Recomendamos exportar um backup antes de continuar."
        confirmLabel="Zerar Dados"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleConfirmResetAll}
      />
    </div>
  );
}
