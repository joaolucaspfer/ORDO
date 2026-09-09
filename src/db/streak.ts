import type { SQLiteDatabase } from 'expo-sqlite';
import { toISODate, todayISO, parseISODate } from '../lib/dates';
import { checkinIdsForDate } from './checkins';
import { tasksOnDay } from './tasks';
import { countPerfectDays } from './bonus';

async function countCheckinsOn(db: SQLiteDatabase, iso: string): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) as n FROM checkins WHERE date = ?',
    iso
  );
  return row?.n ?? 0;
}

export async function computeStreak(db: SQLiteDatabase, date = todayISO()): Promise<number> {
  const cursor = parseISODate(date);
  if ((await countCheckinsOn(db, date)) === 0) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  for (;;) {
    const n = await countCheckinsOn(db, toISODate(cursor));
    if (n === 0) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface Stats {
  doneToday: number;
  totalToday: number;
  totalDone: number;
  perfectDays: number;
  streak: number;
}

export async function getStats(db: SQLiteDatabase, date = todayISO()): Promise<Stats> {
  const doneToday = (await checkinIdsForDate(db, date)).length;
  const scheduled = await tasksOnDay(db, parseISODate(date).getDay());
  const totalRow = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) as n FROM checkins');
  const streak = await computeStreak(db, date);
  const perfectDays = await countPerfectDays(db);
  return {
    doneToday,
    totalToday: scheduled.length,
    totalDone: totalRow?.n ?? 0,
    perfectDays,
    streak,
  };
}