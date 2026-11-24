'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  ClipboardList,
  Dumbbell,
  Flame,
  Moon,
  Play,
  Search,
  Sun,
  Trophy,
  User,
  Utensils,
} from 'lucide-react';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { RoutinesView } from '@/components/routines/RoutinesView';
import { SharedImportModal } from '@/components/routines/SharedImportModal';
import { SocialFeedView } from '@/components/feed/SocialFeedView';
import { ExercisesView } from '@/components/exercises/ExercisesView';
import { ProfileAnalyticsView } from '@/components/profile/ProfileAnalyticsView';
import { NutritionView } from '@/components/nutrition/NutritionView';
import { ActiveWorkoutDrawer } from '@/components/workout/ActiveWorkoutDrawer';
import { decodeShareToken, SharePayload } from '@/lib/share';

type MainTab = 'workout' | 'nutrition' | 'feed' | 'exercises' | 'profile';

export default function IronPulseAppPage() {
  const [activeTab, setActiveTab] = useState<MainTab>('workout');
  const [sharedPayload, setSharedPayload] = useState<SharePayload | null>(null);
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const startEmptyWorkout = useWorkoutStore((s) => s.startEmptyWorkout);
  const toggleMinimizeWorkout = useWorkoutStore((s) => s.toggleMinimizeWorkout);
  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);
  const settings = useWorkoutStore((s) => s.settings);
  const updateSettings = useWorkoutStore((s) => s.updateSettings);

  const isDark = (settings?.theme ?? 'dark') !== 'light';

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark', 'theme-dark');
      root.classList.remove('theme-light');
    } else {
      root.classList.add('theme-light');
      root.classList.remove('dark', 'theme-dark');
    }
  }, [isDark]);

  const toggleTheme = () => {
    updateSettings({ theme: isDark ? 'light' : 'dark' });
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [activeTab]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Verifica se o link aberto contém um treino ou pasta compartilhada (?share=...)
    const params = new URLSearchParams(window.location.search);
    const shareToken = params.get('share');
    if (shareToken) {
      const decoded = decodeShareToken(shareToken);
      if (decoded) {
        setSharedPayload(decoded);
      }
    }
  }, []);

  const clearShareUrlParam = () => {
    setSharedPayload(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('share');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const navItems: {
    id: MainTab;
    label: string;
    mobileLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'workout', label: 'Treinar', mobileLabel: 'Treinar', icon: Dumbbell },
    { id: 'nutrition', label: 'Nutrição', mobileLabel: 'Nutrição', icon: Utensils },
    { id: 'feed', label: 'Histórico', mobileLabel: 'Histórico', icon: ClipboardList },
    { id: 'exercises', label: 'Exercícios', mobileLabel: 'Exercícios', icon: Search },
    { id: 'profile', label: 'Perfil & Analytics', mobileLabel: 'Perfil', icon: User },
  ];

  const isMinimized = Boolean(activeWorkout?.isMinimized);

  return (
    <div
      className={`min-h-screen flex flex-col md:flex-row transition-colors ${
        isDark
          ? 'theme-dark dark bg-[#0B0F17] text-[#F8FAFC]'
          : 'theme-light bg-[#F8FAFC] text-slate-900'
      }`}
    >
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-slate-200 p-5 justify-between z-30">
        <div className="space-y-6">
          {/* Logo IronPulse + Alternância de Tema */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-600/25">
                IP
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-slate-900">
                  IRONPULSE
                </span>
                <span className="block text-[10px] uppercase tracking-widest text-[#3B82F6] font-bold -mt-1">
                  Workout Tracker
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              title={isDark ? 'Modo Claro (☀️)' : 'Modo Escuro (🌙)'}
              className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 transition shrink-0"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-slate-700" />
              )}
            </button>
          </div>

          {activeWorkout ? (
            <button
              onClick={() => toggleMinimizeWorkout(false)}
              className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-xs flex items-center justify-center gap-2"
            >
              <Flame className="w-4 h-4 text-emerald-600" /> Retomar Treino Ativo
            </button>
          ) : (
            <button
              onClick={() => startEmptyWorkout('Treino Livre')}
              className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition"
            >
              <Play className="w-4 h-4 fill-current" /> + Iniciar Treino
            </button>
          )}

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full min-h-[44px] flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition ${
                    isActive
                      ? 'bg-[#3B82F6]/15 text-[#3B82F6]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-semibold flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-500" /> Total de Sessões
            </span>
            <span className="font-extrabold text-slate-900">
              {workoutHistory.length}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-semibold flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5 text-[#3B82F6]" /> PRs Históricos
            </span>
            <span className="font-extrabold text-amber-600">
              {workoutHistory.reduce((acc, w) => acc + w.prCount, 0)}
            </span>
          </div>
        </div>
      </aside>

      {/* Top Header Mobile com suporte a Safe Area do iPhone */}
      <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-black text-xs shadow-sm">
            IP
          </div>
          <span className="text-lg font-black tracking-tight text-slate-900">
            IRONPULSE
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!activeWorkout && activeTab !== 'workout' && (
            <button
              onClick={() => startEmptyWorkout('Treino Livre')}
              className="h-11 px-4 rounded-full bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Treinar
            </button>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            title={isDark ? 'Modo Claro (☀️)' : 'Modo Escuro (🌙)'}
            className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 transition"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-slate-700" />
            )}
          </button>
        </div>
      </header>

      {/* Área Principal de Conteúdo */}
      <main
        className={`flex-1 md:pl-64 ${
          isMinimized ? 'pb-56 md:pb-24' : 'pb-24 md:pb-8'
        }`}
      >
        <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
          {activeTab === 'workout' && <RoutinesView />}
          {activeTab === 'nutrition' && <NutritionView />}
          {activeTab === 'feed' && <SocialFeedView />}
          {activeTab === 'exercises' && <ExercisesView />}
          {activeTab === 'profile' && <ProfileAnalyticsView />}
        </div>
      </main>

      {/* Barra de Navegação Inferior Mobile com Safe Area do iPhone (5 abas) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-5 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`min-h-[48px] flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl text-[11px] leading-tight font-bold transition whitespace-nowrap ${
                isActive
                  ? 'text-[#3B82F6]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5 shrink-0" />
              <span>{item.mobileLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* Drawer Persistente do Workout Logger ao Vivo / Edição */}
      <ActiveWorkoutDrawer />

      {/* Modal de Visualização e Importação de Treino / Pasta Compartilhada via Link */}
      <SharedImportModal
        payload={sharedPayload}
        onClose={clearShareUrlParam}
        onImported={() => {
          clearShareUrlParam();
          setActiveTab('workout');
        }}
      />
    </div>
  );
}
