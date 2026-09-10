import type { SQLiteDatabase } from 'expo-sqlite';
import type { Category } from '../lib/categories';
import type { Task } from './types';

export interface TaskInput {
  title: string;
  category: Category;
  emoji?: string | null;
  time_min: number | null;
  days: number;
  details: string;
  target_minutes: number | null;
  remind_enabled: number;
  remind_before: number;
}

export async function listTasks(db: SQLiteDatabase): Promise<Task[]> {
  return db.getAllAsync<Task>(
    'SELECT * FROM tasks ORDER BY (time_min IS NULL), time_min, position, id'
  );
}

export async function getTask(db: SQLiteDatabase, id: number): Promise<Task | null> {
  return db.getFirstAsync<Task>('SELECT * FROM tasks WHERE id = ?', id);
}

export async function tasksOnDay(db: SQLiteDatabase, dayIndex: number): Promise<Task[]> {
  const tasks = await db.getAllAsync<Task>('SELECT * FROM tasks');
  return tasks
    .filter((t) => (t.days & (1 << dayIndex)) !== 0)
    .sort((a, b) => {
      if (a.time_min == null && b.time_min == null) return a.position - b.position;
      if (a.time_min == null) return 1;
      if (b.time_min == null) return -1;
      return a.time_min - b.time_min;
    });
}

export async function createTask(db: SQLiteDatabase, input: TaskInput): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO tasks (title, category, emoji, time_min, days, details, target_minutes, remind_enabled, remind_before, position, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.title,
    input.category,
    input.emoji ?? null,
    input.time_min,
    input.days,
    input.details,
    input.target_minutes,
    input.remind_enabled,
    input.remind_before,
    0,
    new Date().toISOString()
  );
  return Number(result.lastInsertRowId);
}

export async function updateTask(
  db: SQLiteDatabase,
  id: number,
  input: TaskInput
): Promise<void> {
  await db.runAsync(
    `UPDATE tasks SET title = ?, category = ?, emoji = ?, time_min = ?, days = ?, details = ?, target_minutes = ?, remind_enabled = ?, remind_before = ?
     WHERE id = ?`,
    input.title,
    input.category,
    input.emoji ?? null,
    input.time_min,
    input.days,
    input.details,
    input.target_minutes,
    input.remind_enabled,
    input.remind_before,
    id
  );
}

export async function setTaskNotifId(
  db: SQLiteDatabase,
  id: number,
  notifId: string | null
): Promise<void> {
  await db.runAsync('UPDATE tasks SET notif_id = ? WHERE id = ?', notifId, id);
}

export async function deleteTask(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM tasks WHERE id = ?', id);
}