import type { SQLiteDatabase } from 'expo-sqlite';
import type { Workout } from './types';
import { parseISODate, toISODate, todayISO } from '../lib/dates';

export interface WorkoutInput {
  title: string;
  kind: string;
  date: string;
  duration_min: number;
  notes: string;
}

export const WORKOUT_KINDS: Record<string, { label: string; emoji: string }> = {
  gym: { label: 'Academia', emoji: '🏋️' },
  run: { label: 'Corrida', emoji: '🏃' },
  football: { label: 'Futebol', emoji: '⚽' },
  bike: { label: 'Bicicleta', emoji: '🚴' },
  swim: { label: 'Natação', emoji: '🏊' },
  other: { label: 'Outro', emoji: '🎽' },
};

export async function createWorkout(
  db: SQLiteDatabase,
  input: WorkoutInput
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO workouts (title, kind, date, duration_min, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    input.title,
    input.kind,
    input.date,
    input.duration_min,
    input.notes,
    new Date().toISOString()
  );
  return Number(result.lastInsertRowId);
}

export async function listWorkouts(db: SQLiteDatabase): Promise<Workout[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT id, title, kind, date, duration_min, notes
     FROM workouts ORDER BY date DESC, id DESC`
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    kind: r.kind,
    date: r.date as string,
    duration_min: r.duration_min,
    notes: r.notes as string,
  }));
}

export async function deleteWorkout(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM workouts WHERE id = ?', id);
}

function startOfWeekISO(iso: string): string {
  const d = parseISODate(iso);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return toISODate(d);
}

export async function weekWorkoutStats(
  db: SQLiteDatabase,
  iso: string = todayISO()
): Promise<{ minutes: number; sessions: number }> {
  const start = startOfWeekISO(iso);
  const row = await db.getFirstAsync<any>(
    `SELECT COALESCE(SUM(duration_min), 0) AS minutes, COUNT(*) AS sessions
     FROM workouts WHERE date >= ?`,
    start
  );
  return { minutes: row?.minutes ?? 0, sessions: row?.sessions ?? 0 };
}