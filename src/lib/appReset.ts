import type { SQLiteDatabase } from 'expo-sqlite';
import { clearProfilePhotos } from './profilePhoto';

type ResetListener = () => void;
const listeners = new Set<ResetListener>();

export function onAppReset(listener: ResetListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitAppReset(): void {
  listeners.forEach((listener) => listener());
}

export async function resetAllData(db: SQLiteDatabase): Promise<void> {
  await clearProfilePhotos();
  await db.execAsync(
    `DELETE FROM profile;
     DELETE FROM tasks;
     DELETE FROM checkins;
     DELETE FROM sessions;
     DELETE FROM bonus;
     DELETE FROM owned;
     DELETE FROM wardrobe;
     DELETE FROM weigh_ins;
     DELETE FROM creature;`
  );
}

export async function clearHistory(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(
    `DELETE FROM checkins;
     DELETE FROM sessions;
     DELETE FROM bonus;
     DELETE FROM workouts;
     DELETE FROM weigh_ins;`
  );
}