import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSQLiteContext } from 'expo-sqlite';
import { theme } from '../theme';
import { timeToLabel, labelToTimeMin, WEEKDAYS_SHORT, ALL_DAYS_MASK } from '../lib/dates';
import {
  buildOnboardingRoutine,
  TRAINING_FREQ_OPTIONS,
  TRAINING_TYPES,
  BODY_PARTS,
  PRAYER_ITEMS,
  STUDY_FREQ_OPTIONS,
  type OnboardAnswers,
} from '../lib/onboarding';
import { CATEGORY_MAP } from '../lib/categories';
import { upsertProfile } from '../db/profile';
import { getCreature, renameCreature } from '../db/creature';
import { createTask, getTask } from '../db/tasks';
import { persistProfilePhoto } from '../lib/profilePhoto';
import { syncTaskReminder } from '../lib/notifications';
import { emitCreatureName } from '../lib/creatureEvents';

const WAKE_OPTIONS = [360, 390, 420, 450, 480, 510, 540, 600, 660];

const INTRO_SLIDES = [
  {
    emoji: '🐶',
    title: 'Bem-vindo ao Ordo',
    text: 'O Ordo ajuda-te a guardar o teu dia: oração, estudo, trabalho e treino — cada coisa ao seu tempo. Tudo fica guardado apenas no teu telemóvel.',
  },
  {
    emoji: '🐕',
    title: 'O teu companheiro',
    text: 'Este é o Ordo, o teu cão. Ele vive da tua rotina: quando cumpras tarefas, ele ganha energia, pontos e cresce contigo. Podes mudar-lhe o nome em qualquer altura, na página dele.',
  },
  {
    emoji: '🧭',
    title: 'Como se usa',
    text: '«Hoje» mostra a tua próxima tarefa. «Rotina» é onde montas e editas as tarefas. «Treinos» guarda exercício e peso. «Perfil» tem a tua informação e objetivos. Completa as tarefas para o Ordo ficar mais forte.',
  },
];

const INITIAL_ANSWERS: OnboardAnswers = {
  name: '',
  photoUri: null,
  wakeMin: 7 * 60,
  birthDay: '',
  birthMonth: '',
  birthYear: '',
  dogName: '',
  training: null as never as boolean,
  trainingFreq: null,
  trainingType: null,
  trainingParts: [],
  trainingOther: '',
  prayer: null as never as boolean,
  prayerItems: [],
  study: null as never as boolean,
  studyFreq: null,
  studySubject: '',
  studyMinutes: null,
  work: null as never as boolean,
  workName: '',
  workDays: null,
};

type StepKey =
  | 'profile'
  | 'dogName'
  | 'training'
  | 'trainingFreq'
  | 'trainingType'
  | 'trainingParts'
  | 'trainingOther'
  | 'prayer'
  | 'prayerItems'
  | 'study'
  | 'studyDetails'
  | 'work'
  | 'workDetails'
  | 'review';

interface Draft {
  key: string;
  title: string;
  timeLabel: string;
}

interface Props {
  onDone: () => void;
}

function buildSteps(a: OnboardAnswers): StepKey[] {
  const steps: StepKey[] = ['profile', 'dogName'];
  if (a.training) {
    steps.push('trainingFreq', 'trainingType');
    if (a.trainingType === 'gym') steps.push('trainingParts');
    if (a.trainingType === 'other') steps.push('trainingOther');
  }
  steps.push('prayer');
  if (a.prayer) steps.push('prayerItems');
  steps.push('study');
  if (a.study) steps.push('studyDetails');
  steps.push('work');
  if (a.work) steps.push('workDetails');
  steps.push('review');
  return steps;
}

function daysLabel(days: number): string {
  if (days === ALL_DAYS_MASK) return 'Todos os dias';
  const labels = WEEKDAYS_SHORT.filter((_, i) => (days & (1 << i)) !== 0);
  return labels.length === 0 ? '—' : labels.join(', ');
}

const STEP_META: Record<StepKey, { emoji: string; title: string; subtitle: string }> = {
  profile: {
    emoji: '🐶',
    title: 'Quem és?',
    subtitle: 'Assim te conheço no Ordo e saúdo-te todos os dias.',
  },
  dogName: {
    emoji: '🐕',
    title: 'Como se chama o teu cão?',
    subtitle: 'Ele cuida da tua rotina contigo. Se não lhe deres nome, chama-se Ordo.',
  },
  training: {
    emoji: '🏋️',
    title: 'Practicas exercício físico?',
    subtitle: 'Treino também é rotina. Vamos montar a tua semana.',
  },
  trainingFreq: {
    emoji: '📅',
    title: 'Quantas vezes por semana?',
    subtitle: 'Uso isto para espalhar os treinos e não sobrecarregar.',
  },
  trainingType: {
    emoji: '🎽',
    title: 'O que praticas?',
    subtitle: 'Isso muda o tipo de treino que te sugiro.',
  },
  trainingParts: {
    emoji: '💪',
    title: 'Que partes do corpo treinas?',
    subtitle: 'Juntas já selecionadas são distribuídas pelos dias da semana.',
  },
  trainingOther: {
    emoji: '✏️',
    title: 'Como se chama o teu treino?',
    subtitle: 'Ex.: Calistenia, CrossFit, artes marciais…',
  },
  prayer: {
    emoji: '🙏',
    title: 'Queres momentos de oração?',
    subtitle: 'O terço, o Angelus, a Lectio Divina… cada coisa ao seu tempo.',
  },
  prayerItems: {
    emoji: '📿',
    title: 'O que queres rezar?',
    subtitle: 'Cada um vira uma tarefa com hora e duração sugeridas.',
  },
  study: {
    emoji: '📚',
    title: 'Estudas?',
    subtitle: 'Vou-te ajudar a reservar tempo para isso na agenda.',
  },
  studyDetails: {
    emoji: '🕓',
    title: 'Como estudas?',
    subtitle: 'O que estudas, com que frequência e por quanto tempo.',
  },
  work: {
    emoji: '💼',
    title: 'Trabalhas?',
    subtitle: 'Ou tens estudos a tempo inteiro — o que ocupar o teu dia.',
  },
  workDetails: {
    emoji: '🗓️',
    title: 'O teu trabalho',
    subtitle: 'Escolhe um nome e os dias em que acontece.',
  },
  review: {
    emoji: '✨',
    title: 'Cria a tua rotina',
    subtitle: 'Dá nome às tarefas e ajusta as horas. Depois é só começar.',
  },
};

export default function OnboardingScreen({ onDone }: Props) {
  const db = useSQLiteContext();
  const [answers, setAnswers] = useState<OnboardAnswers>(INITIAL_ANSWERS);
  const [stageIndex, setStageIndex] = useState(0);
  const [introStage, setIntroStage] = useState(0);
  const [wakeCustom, setWakeCustom] = useState(timeToLabel(INITIAL_ANSWERS.wakeMin));
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [saving, setSaving] = useState(false);

  const steps = useMemo(() => buildSteps(answers), [answers]);
  const index = Math.min(stageIndex, steps.length - 1);
  const current = steps[index];
  const last = index === steps.length - 1;

  useEffect(() => {
    if (current === 'review') {
      const base = buildOnboardingRoutine(answers);
      setDrafts((prev) => {
        const map = new Map((prev ?? []).map((d) => [d.key, d]));
        return base.map((p) => ({
          key: p.key,
          title: map.get(p.key)?.title ?? p.title,
          timeLabel: map.get(p.key)?.timeLabel ?? timeToLabel(p.timeMin),
        }));
      });
    }
  }, [current, answers]);

  const set = <K extends keyof OnboardAnswers>(key: K, value: OnboardAnswers[K]) => {
    setAnswers((a) => {
      const next = { ...a };
      (next as Record<string, unknown>)[key] = value;
      return next;
    });
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      set('photoUri', result.assets[0].uri);
    }
  };

  const toggleInList = (key: keyof OnboardAnswers, value: string) => {
    setAnswers((a) => {
      const list = (a[key] as unknown as string[]) ?? [];
      const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
      const updated = { ...a };
      (updated as Record<string, unknown>)[key] = next;
      return updated;
    });
  };

  const canContinue =
    current === 'profile'
      ? answers.name.trim().length > 0
      : current === 'dogName'
      ? true
      : current === 'training'
      ? answers.training != null
      : current === 'trainingFreq'
      ? answers.trainingFreq != null
      : current === 'trainingType'
      ? answers.trainingType != null
      : current === 'trainingParts'
      ? answers.trainingParts.length > 0
      : current === 'trainingOther'
      ? answers.trainingOther.trim().length > 0
      : current === 'prayer'
      ? answers.prayer != null
      : current === 'prayerItems'
      ? answers.prayerItems.length > 0
      : current === 'study'
      ? answers.study != null
      : current === 'studyDetails'
      ? answers.studyFreq != null
      : current === 'work'
      ? answers.work != null
      : current === 'workDetails'
      ? answers.workDays != null
      : true;

  const goBack = () => {
    if (index > 0) setStageIndex(index - 1);
  };

  const goNext = () => {
    if (!canContinue) return;
    setStageIndex(index + 1);
  };

  const skip = () => {
    if (current === 'training') set('training', false);
    if (current === 'prayer') set('prayer', false);
    if (current === 'study') set('study', false);
    if (current === 'work') set('work', false);
    setStageIndex(index + 1);
  };

  const isYesNo =
    current === 'training' || current === 'prayer' || current === 'study' || current === 'work';

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const finalUri = answers.photoUri ? await persistProfilePhoto(answers.photoUri) : null;
      const birthDay = Math.min(31, Math.max(1, Number(answers.birthDay) || 0)) || null;
      const birthMonth = Math.min(12, Math.max(1, Number(answers.birthMonth) || 0)) || null;
      const birthYear = Math.min(2026, Math.max(1900, Number(answers.birthYear) || 0)) || null;
      await upsertProfile(db, {
        name: answers.name.trim(),
        photo_uri: finalUri,
        wake_min: answers.wakeMin,
        birth_year: birthYear,
        birth_month: birthMonth,
        birth_day: birthDay,
        height_cm: null,
        goal_enabled: 0,
        goal_start_kg: null,
        goal_target_kg: null,
      });
      await getCreature(db);
      const creatureName = answers.dogName.trim() || 'Ordo';
      await renameCreature(db, creatureName);
      emitCreatureName(creatureName);

      const pending = buildOnboardingRoutine(answers);
      for (const p of pending) {
        const draft = drafts?.find((d) => d.key === p.key);
        const title = (draft?.title ?? p.title).trim() || p.title;
        const parsed = draft?.timeLabel != null ? labelToTimeMin(draft.timeLabel) : null;
        const timeMin = parsed ?? p.timeMin;
        const taskId = await createTask(db, {
          title,
          category: p.category,
          time_min: timeMin,
          days: p.days,
          details: p.details,
          target_minutes: p.targetMinutes,
          remind_enabled: 1,
          remind_before: 30,
        });
        const task = await getTask(db, taskId);
        if (task) {
          await syncTaskReminder(db, task);
        }
      }
      onDone();
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    const meta = STEP_META[current];

    if (current === 'profile') {
      return (
        <View>
          <Pressable style={styles.photoWrap} onPress={pickPhoto}>
            {answers.photoUri ? (
              <Image source={{ uri: answers.photoUri }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoEmoji}>📸</Text>
              </View>
            )}
            <Text style={styles.photoLabel}>
              {answers.photoUri ? 'Trocar foto' : 'Adicionar foto'}
            </Text>
          </Pressable>
          <Text style={styles.label}>Como te chamas?</Text>
          <TextInput
            style={styles.input}
            placeholder="O teu primeiro nome"
            placeholderTextColor={theme.subtext}
            value={answers.name}
            onChangeText={(name) => set('name', name)}
            autoCapitalize="words"
          />
          <Text style={styles.label}>Quando fazes anos? (opcional)</Text>
          <Text style={styles.hint}>No teu dia, a página inicial dá-te os parabéns 🎂</Text>
          <View style={styles.birthRow}>
            <View style={styles.birthField}>
              <Text style={styles.birthFieldLabel}>Dia</Text>
              <TextInput
                style={styles.birthInput}
                placeholder="15"
                placeholderTextColor={theme.subtext}
                value={answers.birthDay}
                onChangeText={(t) => set('birthDay', t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <View style={styles.birthField}>
              <Text style={styles.birthFieldLabel}>Mês</Text>
              <TextInput
                style={styles.birthInput}
                placeholder="6"
                placeholderTextColor={theme.subtext}
                value={answers.birthMonth}
                onChangeText={(t) => set('birthMonth', t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <View style={styles.birthField}>
              <Text style={styles.birthFieldLabel}>Ano</Text>
              <TextInput
                style={styles.birthInput}
                placeholder="1998"
                placeholderTextColor={theme.subtext}
                value={answers.birthYear}
                onChangeText={(t) => set('birthYear', t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>
          <Text style={styles.label}>A que horas acordas?</Text>
          <View style={styles.chipsRow}>
            {WAKE_OPTIONS.map((mins) => {
              const active = answers.wakeMin === mins;
              return (
                <Pressable
                  key={mins}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => {
                    set('wakeMin', mins);
                    setWakeCustom(timeToLabel(mins));
                  }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {timeToLabel(mins)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>Ou escreve a hora (HH:MM)</Text>
          <TextInput
            style={styles.input}
            placeholder="07:00"
            placeholderTextColor={theme.subtext}
            value={wakeCustom}
            onChangeText={(t) => {
              setWakeCustom(t);
              const parsed = labelToTimeMin(t);
              if (parsed != null) set('wakeMin', parsed);
            }}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      );
    }

    if (current === 'dogName') {
      return (
        <View>
          <TextInput
            style={styles.input}
            placeholder="Ordo"
            placeholderTextColor={theme.subtext}
            value={answers.dogName}
            onChangeText={(dogName) => set('dogName', dogName)}
            autoCapitalize="words"
          />
          <Text style={styles.hint}>
            Se deixares vazio, ele chama-se Ordo. Podes mudar depois na página do cão.
          </Text>
        </View>
      );
    }

    if (
      current === 'training' ||
      current === 'prayer' ||
      current === 'study' ||
      current === 'work'
    ) {
      const value =
        current === 'training'
          ? answers.training
          : current === 'prayer'
          ? answers.prayer
          : current === 'study'
          ? answers.study
          : answers.work;
      const setKey =
        current === 'training'
          ? 'training'
          : current === 'prayer'
          ? 'prayer'
          : current === 'study'
          ? 'study'
          : 'work';
      return <YesNo value={value ?? false} hasAnswer={value != null} onChange={(v) => set(setKey as any, v)} />;
    }

    if (current === 'trainingFreq') {
      return (
        <View style={styles.chipList}>
          {TRAINING_FREQ_OPTIONS.map((o) => {
            const active = answers.trainingFreq === o.value;
            return (
              <Pressable key={o.value} style={[styles.bigOption, active && styles.bigOptionActive]} onPress={() => set('trainingFreq', o.value)}>
                <Text style={styles.bigOptionTitle}>{o.label}</Text>
                <Text style={[styles.bigOptionHint, active && { color: '#0C1A10' }]}>{o.hint}</Text>
              </Pressable>
            );
          })}
        </View>
      );
    }

    if (current === 'trainingType') {
      return (
        <View style={styles.chipList}>
          {TRAINING_TYPES.map((t) => {
            const active = answers.trainingType === t.value;
            return (
              <Pressable key={t.value} style={[styles.bigOptionRow, active && styles.bigOptionRowActive]} onPress={() => set('trainingType', t.value)}>
                <Text style={styles.bigOptionEmoji}>{t.emoji}</Text>
                <Text style={styles.bigOptionRowText}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      );
    }

    if (current === 'trainingParts') {
      return (
        <View style={styles.chipList}>
          {BODY_PARTS.map((part) => {
            const active = answers.trainingParts.includes(part);
            return (
              <Pressable
                key={part}
                style={[styles.bigOptionRow, active && styles.bigOptionRowActive]}
                onPress={() => toggleInList('trainingParts', part)}
              >
                <Text style={styles.bigOptionRowText}>{part}</Text>
                <View style={[styles.check, active && styles.checkActive]}>
                  {active && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>
      );
    }

    if (current === 'trainingOther') {
      return (
        <View>
          <TextInput
            style={styles.input}
            placeholder="Ex.: Calistenia"
            placeholderTextColor={theme.subtext}
            value={answers.trainingOther}
            onChangeText={(trainingOther) => set('trainingOther', trainingOther)}
            autoCapitalize="words"
          />
        </View>
      );
    }

    if (current === 'prayerItems') {
      return (
        <View style={styles.chipList}>
          {PRAYER_ITEMS.map((p) => {
            const active = answers.prayerItems.includes(p.key);
            return (
              <Pressable
                key={p.key}
                style={[styles.bigOptionRow, active && styles.bigOptionRowActive]}
                onPress={() => toggleInList('prayerItems', p.key)}
              >
                <Text style={styles.bigOptionEmoji}>{p.emoji}</Text>
                <View style={styles.bigOptionRowWrap}>
                  <Text style={styles.bigOptionRowText}>{p.label}</Text>
                  <Text style={styles.bigOptionMeta}>{timeToLabel(p.time(answers.wakeMin))} · {p.minutes} min</Text>
                </View>
                <View style={[styles.check, active && styles.checkActive]}>
                  {active && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>
      );
    }

    if (current === 'studyDetails') {
      return (
        <View>
          <Text style={styles.label}>O que estudas? (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: Matemática, Inglês, Catecismo…"
            placeholderTextColor={theme.subtext}
            value={answers.studySubject}
            onChangeText={(studySubject) => set('studySubject', studySubject)}
            autoCapitalize="words"
          />
          <Text style={styles.label}>Quantas vezes por semana?</Text>
          <View style={styles.chipsRow}>
            {STUDY_FREQ_OPTIONS.map((o) => {
              const active = answers.studyFreq === o.value;
              return (
                <Pressable key={o.value} style={[styles.chip, active && styles.chipActive]} onPress={() => set('studyFreq', o.value)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>Sugestão: {answers.studyFreq === 'all' ? 'de segunda a sábado' : answers.studyFreq === 'some' ? 'seg, qua, sex' : answers.studyFreq === 'few' ? 'seg e qui' : ''}</Text>
          <Text style={styles.label}>Quanto tempo por sessão?</Text>
          <View style={styles.chipsRow}>
            {[25, 50, 90].map((m) => {
              const active = answers.studyMinutes === m;
              return (
                <Pressable key={m} style={[styles.chip, active && styles.chipActive]} onPress={() => set('studyMinutes', m)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{m} min</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    if (current === 'workDetails') {
      return (
        <View>
          <Text style={styles.label}>Nome (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: Jornada, Turno da manhã…"
            placeholderTextColor={theme.subtext}
            value={answers.workName}
            onChangeText={(workName) => set('workName', workName)}
            autoCapitalize="words"
          />
          <Text style={styles.label}>Em que dias?</Text>
          <View style={styles.chipsRow}>
            {(
              [
                ['weekdays', 'Dias úteis'],
                ['all', 'Todos os dias'],
              ] as const
            ).map(([value, label]) => {
              const active = answers.workDays === value;
              return (
                <Pressable key={value} style={[styles.chip, active && styles.chipActive]} onPress={() => set('workDays', value)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    if (current === 'review') {
      const pending = buildOnboardingRoutine(answers);
      if (pending.length === 0) {
        return <Text style={styles.hint}>Ainda não há tarefas para criar.</Text>;
      }
      return (
        <View>
          <View style={styles.reviewSummary}>
            <Text style={styles.reviewCount}>{pending.length} tarefas</Text>
            <Text style={styles.hint}>Muda os nomes e horas antes de criar.</Text>
          </View>
          {pending.map((p) => {
            const draft = drafts?.find((d) => d.key === p.key);
            const info = CATEGORY_MAP[p.category];
            return (
              <View key={p.key} style={styles.reviewRow}>
                <Text style={styles.reviewEmoji}>{info.emoji}</Text>
                <View style={styles.reviewFields}>
                  <TextInput
                    style={styles.reviewNameInput}
                    value={draft?.title ?? p.title}
                    onChangeText={(title) =>
                      setDrafts((prev) => prev?.map((d) => (d.key === p.key ? { ...d, title } : d)) ?? prev)
                    }
                    placeholder="Nome da tarefa"
                    placeholderTextColor={theme.subtext}
                  />
                  <View style={styles.reviewMetaRow}>
                    <TextInput
                      style={styles.reviewTimeInput}
                      value={draft?.timeLabel ?? timeToLabel(p.timeMin)}
                      onChangeText={(timeLabel) =>
                        setDrafts((prev) => prev?.map((d) => (d.key === p.key ? { ...d, timeLabel } : d)) ?? prev)
                      }
                      keyboardType="numbers-and-punctuation"
                    />
                    {p.targetMinutes != null && (
                      <Text style={styles.reviewMeta}>⏱ {p.targetMinutes} min</Text>
                    )}
                    <Text style={styles.reviewMeta}>{daysLabel(p.days)}</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setDrafts((prev) => prev?.filter((d) => d.key !== p.key) ?? prev)}
                  style={styles.reviewRemove}
                >
                  <Text style={styles.reviewRemoveText}>✕</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      );
    }

    return null;
  };

  const meta = STEP_META[current];

  if (introStage < INTRO_SLIDES.length) {
    const slide = INTRO_SLIDES[introStage];
    const lastIntro = introStage === INTRO_SLIDES.length - 1;
    return (
      <View style={styles.container}>
        <View style={styles.introDots}>
          {INTRO_SLIDES.map((_, i) => (
            <View key={i} style={[styles.stepDot, i <= introStage && styles.stepDotActive]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.introCard]}>
            <Text style={styles.introEmoji}>{slide.emoji}</Text>
            <Text style={styles.introTitle}>{slide.title}</Text>
            <Text style={styles.introText}>{slide.text}</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            {introStage > 0 && (
              <Pressable style={styles.backButton} onPress={() => setIntroStage(introStage - 1)}>
                <Text style={styles.backButtonText}>Voltar</Text>
              </Pressable>
            )}
            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                if (lastIntro) {
                  setStageIndex(0);
                  setIntroStage(INTRO_SLIDES.length);
                } else {
                  setIntroStage(introStage + 1);
                }
              }}
            >
              <Text style={styles.primaryButtonText}>
                {lastIntro ? 'Começar 🐶' : 'Continuar'}
              </Text>
            </Pressable>
          </View>
          {introStage === 0 && (
            <Pressable style={styles.skipRow} onPress={() => setIntroStage(INTRO_SLIDES.length)}>
              <Text style={styles.skipText}>Saltar introdução</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.steps}>
        {steps.map((_, i) => (
          <View key={i} style={[styles.stepDot, i <= index && styles.stepDotActive]} />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.heading}>
          <Text style={styles.emoji}>{meta.emoji}</Text>
          <Text style={styles.title}>{meta.title}</Text>
          <Text style={styles.subtitle}>{meta.subtitle}</Text>
        </View>
        {renderStep()}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          {index > 0 && (
            <Pressable style={styles.backButton} onPress={goBack}>
              <Text style={styles.backButtonText}>Voltar</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]}
            onPress={last ? finish : goNext}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>
              {last ? (saving ? 'A criar…' : 'Criar a minha rotina 🐶') : 'Continuar'}
            </Text>
          </Pressable>
        </View>
        {isYesNo && (
          <Pressable style={styles.skipRow} onPress={skip} disabled={saving}>
            <Text style={styles.skipText}>Saltar esta resposta</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function YesNo({ value, hasAnswer, onChange }: { value: boolean; hasAnswer: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.yesNoRow}>
      {(
        [
          [true, '✅ Sim'],
          [false, '❌ Não'],
        ] as const
      ).map(([v, label]) => {
        const active = hasAnswer && value === v;
        return (
          <Pressable key={String(v)} style={[styles.bigOptionRow, styles.yesNo, active && styles.bigOptionRowActive]} onPress={() => onChange(v)}>
            <Text style={styles.bigOptionRowText}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  introDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 64,
    paddingBottom: 8,
  },
  introCard: {
    alignItems: 'center',
    paddingTop: 24,
  },
  introEmoji: {
    fontSize: 76,
  },
  introTitle: {
    color: theme.text,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 18,
    textAlign: 'center',
  },
  introText: {
    color: theme.subtext,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  steps: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  stepDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: theme.cardAlt,
  },
  stepDotActive: {
    backgroundColor: theme.primary,
  },
  content: {
    padding: 24,
    paddingBottom: 140,
  },
  heading: {
    alignItems: 'center',
    marginBottom: 18,
  },
  emoji: {
    fontSize: 52,
    marginTop: 8,
  },
  title: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: theme.subtext,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  photoWrap: {
    alignItems: 'center',
    marginVertical: 8,
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: theme.primary,
  },
  photoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: theme.border,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmoji: {
    fontSize: 34,
  },
  photoLabel: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  label: {
    alignSelf: 'stretch',
    color: theme.subtext,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 6,
  },
  hint: {
    color: theme.subtext,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 17,
  },
input: {
    alignSelf: 'stretch',
    backgroundColor: theme.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  birthRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  birthField: {
    flex: 1,
  },
  birthFieldLabel: {
    color: theme.subtext,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  birthInput: {
    alignSelf: 'stretch',
    backgroundColor: theme.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  chip: {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  chipText: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#0C1A10',
  },
  chipList: {
    gap: 10,
  },
  bigOption: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    padding: 16,
    alignItems: 'center',
  },
  bigOptionActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primary,
  },
  bigOptionTitle: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '800',
  },
  bigOptionHint: {
    color: theme.subtext,
    fontSize: 12,
    marginTop: 2,
  },
  bigOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    padding: 14,
  },
  bigOptionRowActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft,
  },
  bigOptionEmoji: {
    fontSize: 22,
  },
  bigOptionRowText: {
    flex: 1,
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
  },
  bigOptionRowWrap: {
    flex: 1,
  },
  bigOptionMeta: {
    color: theme.subtext,
    fontSize: 12,
    marginTop: 2,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primary,
  },
  checkMark: {
    color: '#0C1A10',
    fontSize: 14,
    fontWeight: '800',
  },
  yesNoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  yesNo: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 18,
  },
  reviewSummary: {
    backgroundColor: theme.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    marginBottom: 12,
  },
  reviewCount: {
    color: theme.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    marginBottom: 10,
  },
  reviewEmoji: {
    fontSize: 22,
  },
  reviewFields: {
    flex: 1,
    gap: 6,
  },
  reviewNameInput: {
    backgroundColor: theme.cardAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
  },
  reviewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewTimeInput: {
    backgroundColor: theme.cardAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.text,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    minWidth: 62,
  },
  reviewMeta: {
    color: theme.subtext,
    fontSize: 12,
  },
  reviewRemove: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(228,105,91,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewRemoveText: {
    color: theme.danger,
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    paddingBottom: 34,
    backgroundColor: theme.bg,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  backButton: {
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  backButtonText: {
    color: theme.subtext,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    color: '#0C1A10',
    fontSize: 16,
    fontWeight: '800',
  },
  skipRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  skipText: {
    color: theme.subtext,
    fontSize: 13,
    fontWeight: '600',
  },
});