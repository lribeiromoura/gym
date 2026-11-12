import { describe, expect, it } from 'vitest';
import {
  backupFileName,
  BackupSourceState,
  createBackup,
  mergeById,
  parseBackup,
  serializeBackup,
  summarizeBackup,
} from './backup';
import { EXERCISES_SEED } from '@/data/exercises-seed';
import { INITIAL_USER_SETTINGS } from '@/data/initial-data';
import type { Exercise, ProgressPhoto, Routine, RoutineFolder } from '@/types/workout';

const seedIds = new Set(EXERCISES_SEED.map((e) => e.id));

const customExercise = {
  ...EXERCISES_SEED[0],
  id: 'custom-1',
  title: 'Meu Exercício',
  isCustom: true,
} as Exercise;

const photo = {
  id: 'photo-1',
  date: '2026-11-01',
  weightKg: 80,
  caption: 'teste',
  dataUrl: 'data:image/png;base64,AAAA',
  pose: 'Frente',
} as ProgressPhoto;

const routine = { id: 'r-1', title: 'Treino A' } as unknown as Routine;
const folder = { id: 'f-1', name: 'Pasta' } as unknown as RoutineFolder;

const state: BackupSourceState = {
  exercises: [...EXERCISES_SEED, customExercise],
  folders: [folder],
  routines: [routine],
  workoutHistory: [],
  measurements: [],
  progressPhotos: [photo],
  settings: INITIAL_USER_SETTINGS,
};

describe('backup', () => {
  it('faz round-trip create → serialize → parse', () => {
    const file = createBackup(state, { includePhotos: true, seedIds });
    const parsed = parseBackup(serializeBackup(file));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.file).toEqual(file);
  });

  it('exporta apenas exercícios fora do seed', () => {
    const file = createBackup(state, { includePhotos: true, seedIds });
    expect(file.data.exercises.map((e) => e.id)).toEqual(['custom-1']);
    expect(file.data).not.toHaveProperty('activeWorkout');
  });

  it('remove fotos quando includePhotos = false', () => {
    const file = createBackup(state, { includePhotos: false, seedIds });
    expect(file.data.progressPhotos).toEqual([]);
    expect(file.includesPhotos).toBe(false);
  });

  it('resume as contagens', () => {
    const file = createBackup(state, { includePhotos: true, seedIds });
    expect(summarizeBackup(file)).toMatchObject({
      routines: 1,
      folders: 1,
      photos: 1,
      customExercises: 1,
      workouts: 0,
    });
  });

  it('rejeita JSON inválido, outro app e versão futura', () => {
    expect(parseBackup('not json').ok).toBe(false);
    expect(parseBackup('{"app":"outro","schemaVersion":1}').ok).toBe(false);
    expect(parseBackup('{"app":"ironpulse","schemaVersion":99}').ok).toBe(false);
    expect(
      parseBackup('{"app":"ironpulse","schemaVersion":1,"data":{"routines":{}}}').ok
    ).toBe(false);
    expect(
      parseBackup('{"app":"ironpulse","schemaVersion":1,"data":{"routines":[{"x":1}]}}').ok
    ).toBe(false);
  });

  it('preenche coleções ausentes com listas vazias', () => {
    const parsed = parseBackup('{"app":"ironpulse","schemaVersion":1,"data":{}}');
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.file.data.routines).toEqual([]);
      expect(parsed.file.data.settings).toEqual({});
    }
  });

  it('mergeById não duplica ids', () => {
    const merged = mergeById([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }]);
    expect(merged.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('gera nome de arquivo com data', () => {
    expect(backupFileName(new Date(2026, 10, 12))).toBe('ironpulse-backup-2026-11-12.json');
  });
});
