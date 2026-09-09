export type AccessorySlot = 'head' | 'face' | 'neck' | 'back';

export interface Accessory {
  id: string;
  slot: AccessorySlot;
  label: string;
  emoji: string;
  price: number;
  color: string;
}

export const ACCESSORIES: Accessory[] = [
  { id: 'bandana', slot: 'neck', label: 'Bandana', emoji: '🎀', price: 30, color: '#55D66B' },
  { id: 'collar', slot: 'neck', label: 'Colar com medalha', emoji: '🔗', price: 50, color: '#E4572E' },
  { id: 'scarf', slot: 'neck', label: 'Lenço', emoji: '🧣', price: 60, color: '#6FB1E8' },
  { id: 'hat', slot: 'head', label: 'Boina', emoji: '🎩', price: 80, color: '#B98A2F' },
  { id: 'crown', slot: 'head', label: 'Coroa', emoji: '👑', price: 150, color: '#F2C94C' },
  { id: 'glasses', slot: 'face', label: 'Óculos de sol', emoji: '🕶️', price: 120, color: '#1B1B1B' },
  { id: 'cape', slot: 'back', label: 'Capa de herói', emoji: '🧥', price: 200, color: '#7C5CD0' },
];

export const ACCESSORY_MAP: Record<string, Accessory> = Object.fromEntries(
  ACCESSORIES.map((a) => [a.id, a])
);

export interface Coat {
  id: string;
  label: string;
  color: string;
}

export const COATS: Coat[] = [
  { id: 'brown', label: 'Castanho', color: '#B06A3F' },
  { id: 'black', label: 'Preto', color: '#3B3E3C' },
  { id: 'grey', label: 'Cinzento', color: '#8E9A8F' },
  { id: 'gold', label: 'Dourado', color: '#D9A84C' },
  { id: 'white', label: 'Branco', color: '#EFE9DC' },
  { id: 'blue', label: 'Azul', color: '#7FA8D9' },
];

export const COAT_MAP: Record<string, Coat> = Object.fromEntries(COATS.map((c) => [c.id, c]));