import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_VERSION = 9;

async function ensureColumn(
  db: SQLiteDatabase,
  table: string,
  column: string,
  ddl: string
): Promise<void> {
  const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!info.some((c) => c.name === column)) {
    await db.execAsync(ddl);
  }
}

export async function migrateDb(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version >= DATABASE_VERSION) {
    return;
  }

  if (version < 1) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'other',
        time_min INTEGER,
        days INTEGER NOT NULL DEFAULT 127,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(task_id, date)
      );

      CREATE TABLE IF NOT EXISTS creature (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        type TEXT NOT NULL DEFAULT 'plant',
        name TEXT NOT NULL DEFAULT 'Ordo',
        xp INTEGER NOT NULL DEFAULT 0,
        energy INTEGER NOT NULL DEFAULT 100,
        coins INTEGER NOT NULL DEFAULT 0,
        coat TEXT NOT NULL DEFAULT 'brown',
        last_seen TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bonus (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        kind TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(date, kind)
      );

      CREATE TABLE IF NOT EXISTS owned (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS wardrobe (
        slot TEXT PRIMARY KEY,
        item TEXT NOT NULL
      );
    `);
    version = 1;
  }

  if (version === 1) {
    await ensureColumn(
      db,
      'creature',
      'coins',
      `ALTER TABLE creature ADD COLUMN coins INTEGER NOT NULL DEFAULT 0;`
    );
    await ensureColumn(
      db,
      'creature',
      'coat',
      `ALTER TABLE creature ADD COLUMN coat TEXT NOT NULL DEFAULT 'brown';`
    );
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS owned (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS wardrobe (
        slot TEXT PRIMARY KEY,
        item TEXT NOT NULL
      );
    `);
    version = 2;
  }

  if (version === 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL,
        photo_uri TEXT,
        wake_min INTEGER,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        minutes INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    await ensureColumn(
      db,
      'tasks',
      'details',
      `ALTER TABLE tasks ADD COLUMN details TEXT NOT NULL DEFAULT '';`
    );
    await ensureColumn(
      db,
      'tasks',
      'target_minutes',
      `ALTER TABLE tasks ADD COLUMN target_minutes INTEGER;`
    );
    await ensureColumn(
      db,
      'tasks',
      'notif_id',
      `ALTER TABLE tasks ADD COLUMN notif_id TEXT;`
    );
    version = 3;
  }

  if (version === 3) {
    await ensureColumn(
      db,
      'tasks',
      'remind_enabled',
      `ALTER TABLE tasks ADD COLUMN remind_enabled INTEGER NOT NULL DEFAULT 1;`
    );
    await ensureColumn(
      db,
      'tasks',
      'remind_before',
      `ALTER TABLE tasks ADD COLUMN remind_before INTEGER NOT NULL DEFAULT 30;`
    );
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'gym',
        date TEXT NOT NULL,
        duration_min INTEGER NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
    `);
    version = 4;
  }

  if (version === 4) {
    await ensureColumn(
      db,
      'profile',
      'birth_year',
      `ALTER TABLE profile ADD COLUMN birth_year INTEGER;`
    );
    await ensureColumn(
      db,
      'profile',
      'height_cm',
      `ALTER TABLE profile ADD COLUMN height_cm INTEGER;`
    );
    await ensureColumn(
      db,
      'profile',
      'goal_enabled',
      `ALTER TABLE profile ADD COLUMN goal_enabled INTEGER NOT NULL DEFAULT 0;`
    );
    await ensureColumn(
      db,
      'profile',
      'goal_start_kg',
      `ALTER TABLE profile ADD COLUMN goal_start_kg REAL;`
    );
    await ensureColumn(
      db,
      'profile',
      'goal_target_kg',
      `ALTER TABLE profile ADD COLUMN goal_target_kg REAL;`
    );
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS weigh_ins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        kg REAL NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    version = 5;
  }

  if (version === 5) {
    await ensureColumn(
      db,
      'profile',
      'birth_month',
      `ALTER TABLE profile ADD COLUMN birth_month INTEGER;`
    );
    await ensureColumn(
      db,
      'profile',
      'birth_day',
      `ALTER TABLE profile ADD COLUMN birth_day INTEGER;`
    );
    version = 6;
  }

  if (version === 6) {
    await ensureColumn(
      db,
      'tasks',
      'emoji',
      `ALTER TABLE tasks ADD COLUMN emoji TEXT;`
    );
    version = 7;
  }

  if (version === 7) {
    await ensureColumn(
      db,
      'profile',
      'weight_freq',
      `ALTER TABLE profile ADD COLUMN weight_freq INTEGER;`
    );
    version = 8;
  }

  if (version === 8) {
    await ensureColumn(
      db,
      'profile',
      'gender',
      `ALTER TABLE profile ADD COLUMN gender TEXT;`
    );
    version = 9;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}