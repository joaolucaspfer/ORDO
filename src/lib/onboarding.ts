import type { Category } from './categories';
import { ALL_DAYS_MASK } from './dates';

export type TrainingType = 'gym' | 'football' | 'run' | 'swim' | 'other';

export interface OnboardAnswers {
  name: string;
  photoUri: string | null;
  wakeMin: number;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  dogName: string;
  training: boolean;
  trainingFreq: number | null;
  trainingType: TrainingType | null;
  trainingParts: string[];
  trainingOther: string;
  prayer: boolean;
  prayerItems: string[];
  study: boolean;
  studyFreq: 'all' | 'some' | 'few' | null;
  studySubject: string;
  studyMinutes: number | null;
  work: boolean;
  workName: string;
  workDays: 'all' | 'weekdays' | null;
}

export interface PendingTask {
  key: string;
  title: string;
  category: Category;
  timeMin: number;
  days: number;
  details: string;
  targetMinutes: number | null;
}

export const TRAINING_FREQ_OPTIONS: { value: number; label: string; hint: string }[] = [
  { value: 1, label: '1x', hint: 'Raramente' },
  { value: 2, label: '2–3x', hint: 'Leve' },
  { value: 4, label: '4–5x', hint: 'Consistente' },
  { value: 6, label: '6x+', hint: 'Atleta' },
];

export const FREQ_DAYS: Record<number, number[]> = {
  1: [1],
  2: [1, 4],
  4: [1, 2, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
};

export const TRAINING_TYPES: { value: TrainingType; label: string; emoji: string }[] = [
  { value: 'gym', label: 'Academia', emoji: '🏋️' },
  { value: 'football', label: 'Futebol', emoji: '⚽' },
  { value: 'run', label: 'Corrida', emoji: '🏃' },
  { value: 'swim', label: 'Natação', emoji: '🏊' },
  { value: 'other', label: 'Outro', emoji: '🎽' },
];

export const BODY_PARTS = [
  'Full body',
  'Peito & Tríceps',
  'Costas & Bíceps',
  'Pernas & Glúteos',
  'Ombros & Abdómen',
];

export const PRAYER_ITEMS: {
  key: string;
  label: string;
  emoji: string;
  time: (wakeMin: number) => number;
  days: number;
  minutes: number;
  details: string;
}[] = [
  {
    key: 'terco',
    label: 'Terço',
    emoji: '📿',
    time: () => 20 * 60 + 30,
    days: ALL_DAYS_MASK,
    minutes: 20,
    details: 'Rezar o Terço\nA contemplar os mistérios do dia',
  },
  {
    key: 'angelus',
    label: 'Angelus',
    emoji: '🕊️',
    time: () => 12 * 60,
    days: ALL_DAYS_MASK,
    minutes: 5,
    details: 'Rezar o Angelus\nAo meio-dia',
  },
  {
    key: 'lectio',
    label: 'Lectio Divina',
    emoji: '📖',
    time: (w) => w + 150,
    days: ALL_DAYS_MASK,
    minutes: 20,
    details: 'Lectio Divina\nLeitura orante da Palavra',
  },
  {
    key: 'evangelho',
    label: 'Leitura do Evangelho',
    emoji: '✝️',
    time: (w) => w + 30,
    days: ALL_DAYS_MASK,
    minutes: 10,
    details: 'Não basta ler: o Evangelho é para viver.',
  },
  {
    key: 'missa',
    label: 'Santa Missa',
    emoji: '⛪',
    time: () => 10 * 60,
    days: 1 << 0,
    minutes: 60,
    details: 'Domingo é dia do Senhor\nMissa de manhã',
  },
  {
    key: 'meditacao',
    label: 'Meditação',
    emoji: '🧘',
    time: (w) => w + 15,
    days: ALL_DAYS_MASK,
    minutes: 10,
    details: 'Silêncio e presença\na começar o dia',
  },
  {
    key: 'noite',
    label: 'Oração da noite',
    emoji: '🌙',
    time: () => 22 * 60,
    days: ALL_DAYS_MASK,
    minutes: 5,
    details: 'Exame de consciência\nAgradecer o dia e pedir luz',
  },
];

export const STUDY_FREQ_OPTIONS: {
  value: 'all' | 'some' | 'few';
  label: string;
  hint: string;
}[] = [
  { value: 'all', label: 'Todos os dias', hint: 'Incluindo sábado' },
  { value: 'some', label: '3–4x', hint: 'Seg · Qua · Sex' },
  { value: 'few', label: '1–2x', hint: 'Seg · Qui' },
];

const STUDY_DAYS: Record<'all' | 'some' | 'few', number[]> = {
  all: [1, 2, 3, 4, 5, 6],
  some: [1, 3, 5],
  few: [1, 4],
};

const WORKDAYS_MASK = (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4) | (1 << 5);

function maskOfDayIndexes(indexes: number[]): number {
  return indexes.reduce((acc, day) => acc | (1 << day), 0);
}

export function buildOnboardingRoutine(a: OnboardAnswers): PendingTask[] {
  const tasks: PendingTask[] = [];

  if (a.training && a.trainingFreq != null && a.trainingType) {
    const daysArr = FREQ_DAYS[a.trainingFreq] ?? [1];
    if (a.trainingType === 'gym') {
      const parts = a.trainingParts.length > 0 ? a.trainingParts : ['Full body'];
      const perDay = a.trainingFreq >= 4 ? 1 : 2;
      daysArr.forEach((day, i) => {
        const subset = parts.slice(i * perDay, i * perDay + perDay);
        const name = subset.length > 0 ? subset.join(' + ') : 'Full body';
        tasks.push({
          key: `train-${i}`,
          title: `Treino — ${name}`,
          category: 'training',
          timeMin: a.wakeMin + 600,
          days: maskOfDayIndexes([day]),
          details: `Treino de academia · ${name}`,
          targetMinutes: 60,
        });
      });
    } else {
      const spec: Record<TrainingType, { title: string; minutes: number; details: string }> = {
        football: { title: 'Treino de futebol', minutes: 60, details: 'Treino de futebol\nToque, técnica e jogo' },
        run: { title: 'Corrida', minutes: 35, details: 'Sessão de corrida\nAquecimento, ritmo e alongamento' },
        swim: { title: 'Natação', minutes: 45, details: 'Sessão de natação\nÁgua fria escreve a alma' },
        other: {
          title: a.trainingOther.trim() || 'Treino',
          minutes: 45,
          details: a.trainingOther.trim() || 'Sessão de treino',
        },
        gym: { title: 'Treino', minutes: 60, details: 'Treino de academia' },
      };
      const s = spec[a.trainingType];
      tasks.push({
        key: 'train-0',
        title: s.title,
        category: 'training',
        timeMin: a.wakeMin + 600,
        days: maskOfDayIndexes(daysArr),
        details: s.details,
        targetMinutes: s.minutes,
      });
    }
  }

  if (a.prayer && a.prayerItems.length > 0) {
    PRAYER_ITEMS.filter((p) => a.prayerItems.includes(p.key)).forEach((p) => {
      tasks.push({
        key: `pray-${p.key}`,
        title: p.label,
        category: 'prayer',
        timeMin: p.time(a.wakeMin),
        days: p.days,
        details: p.details,
        targetMinutes: p.minutes,
      });
    });
  }

  if (a.study && a.studyFreq) {
    tasks.push({
      key: 'study-0',
      title: a.studySubject.trim() ? `Estudo — ${a.studySubject.trim()}` : 'Estudar',
      category: 'study',
      timeMin: a.wakeMin + 240,
      days: maskOfDayIndexes(STUDY_DAYS[a.studyFreq]),
      details: a.studySubject.trim()
        ? `Sessão de estudo · ${a.studySubject.trim()}\nFoco total, sem telemóvel`
        : 'Sessão de estudo\nFoco total, sem telemóvel',
      targetMinutes: a.studyMinutes ?? 50,
    });
  }

  if (a.work) {
    tasks.push({
      key: 'work-0',
      title: a.workName.trim() || 'Trabalho',
      category: 'work',
      timeMin: a.wakeMin + 120,
      days: a.workDays === 'all' ? ALL_DAYS_MASK : WORKDAYS_MASK,
      details: '',
      targetMinutes: null,
    });
  }

  return tasks;
}