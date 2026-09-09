export type Category = 'prayer' | 'work' | 'training' | 'study' | 'other';

export interface CategoryInfo {
  id: Category;
  label: string;
  emoji: string;
  color: string;
  xp: number;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'prayer', label: 'Oração', emoji: '🙏', color: '#C9A7EB', xp: 15 },
  { id: 'work', label: 'Trabalho', emoji: '💼', color: '#6FB1E8', xp: 10 },
  { id: 'training', label: 'Treino', emoji: '🏋️', color: '#E87E63', xp: 12 },
  { id: 'study', label: 'Estudo', emoji: '📚', color: '#6FCEC4', xp: 12 },
  { id: 'other', label: 'Outro', emoji: '⭐', color: '#93A89A', xp: 10 },
];

export const CATEGORY_MAP: Record<Category, CategoryInfo> = {
  prayer: CATEGORIES[0],
  work: CATEGORIES[1],
  training: CATEGORIES[2],
  study: CATEGORIES[3],
  other: CATEGORIES[4],
};

export const PERFECT_DAY_BONUS_XP = 20;
export const PERFECT_DAY_BONUS_COINS = 15;
export const COINS_PER_CHECKIN = 5;