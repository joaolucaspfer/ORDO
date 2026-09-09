import type { SQLiteDatabase } from 'expo-sqlite';
import type { WeighIn } from './types';
import { todayISO, toISODate } from '../lib/dates';

export async function addWeighIn(
  db: SQLiteDatabase,
  kg: number,
  date: string = todayISO()
): Promise<void> {
  await db.runAsync(
    `INSERT INTO weigh_ins (date, kg, created_at) VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET kg = excluded.kg`,
    date,
    kg,
    new Date().toISOString()
  );
}

export async function listWeighIns(
  db: SQLiteDatabase,
  limit = 5
): Promise<WeighIn[]> {
  const rows = await db.getAllAsync<WeighIn>(
    `SELECT id, date, kg FROM weigh_ins ORDER BY date DESC LIMIT ?`,
    limit
  );
  return rows;
}

export async function latestWeighIn(
  db: SQLiteDatabase
): Promise<WeighIn | null> {
  return db.getFirstAsync<WeighIn>(
    'SELECT id, date, kg FROM weigh_ins ORDER BY date DESC LIMIT 1'
  );
}

export async function daysSinceLastWeighIn(db: SQLiteDatabase): Promise<number | null> {
  const latest = await latestWeighIn(db);
  if (!latest) return null;
  const last = new Date(`${latest.date}T00:00:00`);
  const now = new Date(`${todayISO()}T00:00:00`);
  return Math.round((now.getTime() - last.getTime()) / 86400000);
}

export function weighInLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${toISODate(d).slice(8, 10)}/${(d.getMonth() + 1) < 10 ? `0${d.getMonth() + 1}` : d.getMonth() + 1}`;
}

export function weightProgress(
  startKg: number,
  targetKg: number,
  currentKg: number
): number {
  if (startKg === targetKg) return 1;
  const pct = (startKg - currentKg) / (startKg - targetKg);
  return Math.max(0, Math.min(1, pct));
}