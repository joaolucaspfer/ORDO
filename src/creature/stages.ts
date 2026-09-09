export const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000];

export interface LevelProgress {
  level: number;
  next: number | null;
  inLevelXp: number;
  levelSpan: number;
  progressPct: number;
}

export function levelForXp(xp: number): LevelProgress {
  let index = LEVEL_THRESHOLDS.length - 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp < LEVEL_THRESHOLDS[i]) {
      index = i - 1;
      break;
    }
  }
  const currentMin = LEVEL_THRESHOLDS[index];
  const nextThreshold = LEVEL_THRESHOLDS[index + 1] ?? null;
  const inLevelXp = xp - currentMin;
  const levelSpan = nextThreshold != null ? nextThreshold - currentMin : 0;
  const progressPct = nextThreshold != null ? Math.min(1, inLevelXp / levelSpan) : 1;
  return {
    level: index + 1,
    next: nextThreshold,
    inLevelXp,
    levelSpan,
    progressPct,
  };
}

export type Mood = 'happy' | 'neutral' | 'sad';

export function moodForEnergy(energy: number): Mood {
  if (energy >= 70) return 'happy';
  if (energy >= 30) return 'neutral';
  return 'sad';
}

export const MAX_ENERGY = 100;