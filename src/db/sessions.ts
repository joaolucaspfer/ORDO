import type { SQLiteDatabase } from 'expo-sqlite';
import { todayISO } from '../lib/dates';

export async function addSessionMinutes(
  db: SQLiteDatabase,
  taskId: number,
  date: string,
  minutes: number
): Promise<void> {
  const rounded = Math.round(minutes);
  if (!Number.isFinite(rounded) || rounded <= 0) return;
  await db.runAsync(
    'INSERT INTO sessions (task_id, date, minutes, created_at) VALUES (?, ?, ?, ?)',
    taskId,
    date,
    rounded,
    new Date().toISOString()
  );
}

export async function focusMinutesOn(db: SQLiteDatabase, date: string): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COALESCE(SUM(minutes), 0) as n FROM sessions WHERE date = ?',
    date
  );
  return row?.n ?? 0;
}

export async function totalFocusMinutes(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COALESCE(SUM(minutes), 0) as n FROM sessions'
  );
  return row?.n ?? 0;
}

export async function focusMinutesForTaskToday(
  db: SQLiteDatabase,
  taskId: number
): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COALESCE(SUM(minutes), 0) as n FROM sessions WHERE task_id = ? AND date = ?',
    taskId,
    todayISO()
  );
  return row?.n ?? 0;
}