import type { SQLiteDatabase } from 'expo-sqlite';

export async function grantBonusOnce(
  db: SQLiteDatabase,
  date: string,
  kind: string
): Promise<boolean> {
  try {
    await db.runAsync(
      'INSERT INTO bonus (date, kind, created_at) VALUES (?, ?, ?)',
      date,
      kind,
      new Date().toISOString()
    );
    return true;
  } catch {
    return false;
  }
}

export async function countPerfectDays(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) as n FROM bonus WHERE kind = 'perfect_day'"
  );
  return row?.n ?? 0;
}