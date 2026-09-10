import type { SQLiteDatabase } from 'expo-sqlite';
import type { Profile } from './types';

export async function getProfile(db: SQLiteDatabase): Promise<Profile | null> {
  return db.getFirstAsync<Profile>('SELECT * FROM profile WHERE id = 1');
}

export interface ProfileInput {
  name: string;
  photo_uri: string | null;
  wake_min: number | null;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  height_cm: number | null;
  goal_enabled: number;
  goal_start_kg: number | null;
  goal_target_kg: number | null;
  weight_freq: number | null;
  gender: string | null;
}

export async function upsertProfile(
  db: SQLiteDatabase,
  input: ProfileInput
): Promise<void> {
  const existing = await getProfile(db);
  const created = existing?.created_at ?? new Date().toISOString();
  await db.runAsync(
    `INSERT INTO profile (id, name, photo_uri, wake_min, birth_year, birth_month, birth_day, height_cm, goal_enabled, goal_start_kg, goal_target_kg, weight_freq, gender, created_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       photo_uri = excluded.photo_uri,
       wake_min = excluded.wake_min,
       birth_year = excluded.birth_year,
       birth_month = excluded.birth_month,
       birth_day = excluded.birth_day,
       height_cm = excluded.height_cm,
       goal_enabled = excluded.goal_enabled,
       goal_start_kg = excluded.goal_start_kg,
       goal_target_kg = excluded.goal_target_kg,
       weight_freq = excluded.weight_freq,
       gender = excluded.gender`,
    input.name,
    input.photo_uri,
    input.wake_min,
    input.birth_year,
    input.birth_month,
    input.birth_day,
    input.height_cm,
    input.goal_enabled,
    input.goal_start_kg,
    input.goal_target_kg,
    input.weight_freq,
    input.gender,
    created
  );
}