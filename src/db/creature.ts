import type { SQLiteDatabase } from 'expo-sqlite';
import { todayISO, daysBetween } from '../lib/dates';
import { ACCESSORY_MAP, type Accessory, type AccessorySlot } from '../lib/wardrobe';
import type { CreatureRow, OwnedItem, WardrobeEntry } from './types';

export const MAX_ENERGY = 100;
export const ENERGY_PER_CHECKIN = 10;
export const ENERGY_DECAY_PER_DAY = 25;

export async function getCreature(db: SQLiteDatabase): Promise<CreatureRow> {
  let creature = await db.getFirstAsync<CreatureRow>('SELECT * FROM creature WHERE id = 1');
  if (!creature) {
    const now = new Date().toISOString();
    await db.runAsync(
      'INSERT INTO creature (id, type, name, xp, energy, coins, coat, last_seen, created_at) VALUES (1, ?, ?, 0, ?, 0, ?, ?, ?)',
      'plant',
      'Ordo',
      MAX_ENERGY,
      'brown',
      todayISO(),
      now
    );
    creature = await db.getFirstAsync<CreatureRow>('SELECT * FROM creature WHERE id = 1');
  }
  return creature as CreatureRow;
}

export async function refreshCreature(
  db: SQLiteDatabase,
  creature: CreatureRow
): Promise<CreatureRow> {
  const today = todayISO();
  const gap = daysBetween(creature.last_seen, today);
  if (gap <= 0) {
    return creature;
  }
  const energy = Math.max(0, creature.energy - ENERGY_DECAY_PER_DAY * gap);
  await db.runAsync('UPDATE creature SET energy = ?, last_seen = ? WHERE id = 1', energy, today);
  return { ...creature, energy, last_seen: today };
}

export async function applyCreatureDelta(
  db: SQLiteDatabase,
  xpDelta: number,
  energyDelta: number,
  coinsDelta = 0
): Promise<CreatureRow> {
  const creature = await getCreature(db);
  const xp = Math.max(0, creature.xp + xpDelta);
  const energy = Math.min(MAX_ENERGY, Math.max(0, creature.energy + energyDelta));
  const coins = Math.max(0, creature.coins + coinsDelta);
  await db.runAsync(
    'UPDATE creature SET xp = ?, energy = ?, coins = ? WHERE id = 1',
    xp,
    energy,
    coins
  );
  return { ...creature, xp, energy, coins };
}

export async function renameCreature(db: SQLiteDatabase, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  await db.runAsync('UPDATE creature SET name = ? WHERE id = 1', trimmed);
}

export async function setCoat(db: SQLiteDatabase, coatId: string): Promise<void> {
  await db.runAsync('UPDATE creature SET coat = ? WHERE id = 1', coatId);
}

export async function getOwnedItems(db: SQLiteDatabase): Promise<Set<string>> {
  const rows = await db.getAllAsync<OwnedItem>('SELECT item FROM owned');
  return new Set(rows.map((r) => r.item));
}

export async function getEquipped(db: SQLiteDatabase): Promise<Record<string, Accessory>> {
  const rows = await db.getAllAsync<WardrobeEntry>('SELECT slot, item FROM wardrobe');
  const map: Record<string, Accessory> = {};
  for (const row of rows) {
    const item = ACCESSORY_MAP[row.item];
    if (item) map[row.slot] = item;
  }
  return map;
}

export interface BuyResult {
  ok: boolean;
  reason: 'already_owned' | 'not_enough_coins' | 'unknown_item' | 'ok';
}

export async function buyAccessory(
  db: SQLiteDatabase,
  itemId: string
): Promise<BuyResult> {
  const item = ACCESSORY_MAP[itemId];
  if (!item) return { ok: false, reason: 'unknown_item' };
  const owned = await getOwnedItems(db);
  if (owned.has(itemId)) return { ok: false, reason: 'already_owned' };

  const creature = await getCreature(db);
  if (creature.coins < item.price) return { ok: false, reason: 'not_enough_coins' };

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('INSERT INTO owned (item) VALUES (?)', itemId);
    await txn.runAsync('UPDATE creature SET coins = ? WHERE id = 1', creature.coins - item.price);
  });
  return { ok: true, reason: 'ok' };
}

export async function equipAccessory(
  db: SQLiteDatabase,
  slot: AccessorySlot,
  itemId: string
): Promise<void> {
  await db.runAsync(
    'INSERT INTO wardrobe (slot, item) VALUES (?, ?) ON CONFLICT(slot) DO UPDATE SET item = excluded.item',
    slot,
    itemId
  );
}

export async function unequipAccessory(db: SQLiteDatabase, slot: AccessorySlot): Promise<void> {
  await db.runAsync('DELETE FROM wardrobe WHERE slot = ?', slot);
}