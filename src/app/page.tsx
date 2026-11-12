'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Dumbbell,
  Flame,
  Home,
  Play,
  Search,
  Trophy,
  User,
} from 'lucide-react';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { RoutinesView } from '@/components/routines/RoutinesView';
import { SocialFeedView } from '@/components/feed/SocialFeedView';
import { ExercisesView } from '@/components/exercises/ExercisesView';
import { ProfileAnalyticsView } from '@/components/profile/ProfileAnalyticsView';
import { ActiveWorkoutDrawer } from '@/components/workout/ActiveWorkoutDrawer';

type MainTab = 'workout' | 'feed' | 'exercises' | 'profile';

export default function IronPulseAppPage() {
  const [activeTab, setActiveTab] = useState<MainTab>('workout');
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const startEmptyWorkout = useWorkoutStore((s) => s.startEmptyWorkout);
  const toggleMinimizeWorkout = useWorkoutStore((s) => s.toggleMinimizeWorkout);
  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const navItems: {
    id: MainTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'workout', label: 'Treinar', icon: Dumbbell },
    { id: 'feed', label: 'Feed', icon: Home },
    { id: 'exercises', label: 'Exercícios', icon: Search },
    { id: 'profile', label: 'Perfil & Analytics', icon: User },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#090A0F]">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-[#0E1017] border-r border-slate-800/80 p-5 justify-between z-30">
        <div className="space-y-6">
          {/* Logo IronPulse */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#1D8FE1] flex items-center justify-center text-white font-black text-sm shadow-lg shadow-[#1D8FE1]/30">
                IP
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-white">
                  IRONPULSE
                </span>
                <span className="block text-[10px] uppercase tracking-widest text-[#38BDF8] font-bold -mt-1">
                  Workout Tracker
                </span>
              </div>
            </div>
          </div>

          {activeWorkout ? (
            <button
              onClick={() => toggleMinimizeWorkout(false)}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs flex items-center justify-center gap-2 animate-pulse"
            >
              <Flame className="w-4 h-4" /> Retomar Treino Ativo
            </button>
          ) : (
            <button
              onClick={() => startEmptyWorkout('Treino Livre')}
              className="w-full py-3 px-4 rounded-xl bg-[#1D8FE1] hover:bg-[#167AC6] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#1D8FE1]/25 transition"
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
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition ${
                    isActive
                      ? 'bg-[#1D8FE1]/15 text-[#38BDF8] border border-[#1D8FE1]/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="bg-[#141824] border border-slate-800/90 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> Total de Sessões
            </span>
            <span className="font-extrabold text-white">
              {workoutHistory.length}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5 text-[#38BDF8]" /> PRs Históricos
            </span>
            <span className="font-extrabold text-amber-400">
              {workoutHistory.reduce((acc, w) => acc + w.prCount, 0)}
            </span>
          </div>
        </div>
      </aside>

      {/* Top Header Mobile com suporte a Safe Area do iPhone */}
      <header className="md:hidden sticky top-0 z-30 bg-[#0E1017]/95 backdrop-blur-md border-b border-slate-800 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#1D8FE1] flex items-center justify-center text-white font-black text-xs">
            IP
          </div>
          <span className="text-lg font-black tracking-tight text-white">
            IRONPULSE
          </span>
        </div>

        {activeWorkout ? (
          <button
            onClick={() => toggleMinimizeWorkout(false)}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold"
          >
            Treino Ativo
          </button>
        ) : (
          <button
            onClick={() => startEmptyWorkout('Treino Livre')}
            className="px-3 py-1.5 rounded-lg bg-[#1D8FE1] text-white text-xs font-bold flex items-center gap-1"
          >
            <Play className="w-3 h-3 fill-current" /> Treinar
          </button>
        )}
      </header>

      {/* Área Principal de Conteúdo */}
      <main className="flex-1 md:pl-64">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
          {activeTab === 'workout' && <RoutinesView />}
          {activeTab === 'feed' && <SocialFeedView />}
          {activeTab === 'exercises' && <ExercisesView />}
          {activeTab === 'profile' && <ProfileAnalyticsView />}
        </div>
      </main>

      {/* Barra de Navegação Inferior Mobile com Safe Area do iPhone */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#0E1017]/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-4 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-bold transition ${
                isActive ? 'text-[#38BDF8]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              {item.label.split(' ')[0]}
            </button>
          );
        })}
      </nav>

      {/* Drawer Persistente do Workout Logger ao Vivo / Edição */}
      <ActiveWorkoutDrawer />
    </div>
  );
}
