import type { SQLiteDatabase } from 'expo-sqlite';
import { parseISODate } from '../lib/dates';
import {
  PERFECT_DAY_BONUS_XP,
  PERFECT_DAY_BONUS_COINS,
  COINS_PER_CHECKIN,
} from '../lib/categories';
import { tasksOnDay } from './tasks';
import { applyCreatureDelta, ENERGY_PER_CHECKIN } from './creature';
import { grantBonusOnce } from './bonus';

export async function checkinIdsForDate(db: SQLiteDatabase, date: string): Promise<number[]> {
  const rows = await db.getAllAsync<{ task_id: number }>(
    'SELECT task_id FROM checkins WHERE date = ?',
    date
  );
  return rows.map((r) => r.task_id);
}

export async function hasCheckin(
  db: SQLiteDatabase,
  taskId: number,
  date: string
): Promise<boolean> {
  const row = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM checkins WHERE task_id = ? AND date = ?',
    taskId,
    date
  );
  return row != null;
}

export async function isPerfectDay(db: SQLiteDatabase, date: string): Promise<boolean> {
  const done = await checkinIdsForDate(db, date);
  const doneSet = new Set(done);
  const scheduled = await tasksOnDay(db, parseISODate(date).getDay());
  if (scheduled.length === 0) return false;
  return scheduled.every((t) => doneSet.has(t.id));
}

export interface ToggleResult {
  added: boolean;
  perfectDayBonus: boolean;
}

export async function toggleCheckin(
  db: SQLiteDatabase,
  taskId: number,
  date: string,
  xpForTask: number
): Promise<ToggleResult> {
  const added = !(await hasCheckin(db, taskId, date));
  const energyDelta = added ? ENERGY_PER_CHECKIN : -ENERGY_PER_CHECKIN;
  const coinsDelta = added ? COINS_PER_CHECKIN : -COINS_PER_CHECKIN;

  if (added) {
    await db.runAsync(
      'INSERT INTO checkins (task_id, date, created_at) VALUES (?, ?, ?)',
      taskId,
      date,
      new Date().toISOString()
    );
  } else {
    await db.runAsync('DELETE FROM checkins WHERE task_id = ? AND date = ?', taskId, date);
  }

  await applyCreatureDelta(
    db,
    added ? xpForTask : -xpForTask,
    energyDelta,
    coinsDelta
  );

  let perfectDayBonus = false;
  if (added && (await isPerfectDay(db, date))) {
    const granted = await grantBonusOnce(db, date, 'perfect_day');
    if (granted) {
      await applyCreatureDelta(db, PERFECT_DAY_BONUS_XP, 0, PERFECT_DAY_BONUS_COINS);
      perfectDayBonus = true;
    }
  }

  return { added, perfectDayBonus };
}