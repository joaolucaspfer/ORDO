import type { Category } from '../lib/categories';

export interface Task {
  id: number;
  title: string;
  category: Category;
  emoji: string | null;
  time_min: number | null;
  days: number;
  details: string;
  target_minutes: number | null;
  notif_id: string | null;
  remind_enabled: number;
  remind_before: number;
  position: number;
  created_at: string;
}

export interface Profile {
  id: number;
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
  created_at: string;
}

export interface WeighIn {
  id: number;
  date: string;
  kg: number;
}

export interface Session {
  id: number;
  task_id: number;
  date: string;
  minutes: number;
}

export interface Workout {
  id: number;
  title: string;
  kind: string;
  date: string;
  duration_min: number;
  notes: string;
}

export interface Checkin {
  id: number;
  task_id: number;
  date: string;
}

export type CreatureType = 'plant' | 'animal';

export interface CreatureRow {
  id: number;
  type: CreatureType;
  name: string;
  xp: number;
  energy: number;
  coins: number;
  coat: string;
  last_seen: string;
  created_at: string;
}

export interface OwnedItem {
  item: string;
}

export interface WardrobeEntry {
  slot: string;
  item: string;
}