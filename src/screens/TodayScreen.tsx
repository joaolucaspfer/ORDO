import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PressableScale as Pressable } from '../components/PressableScale';
import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme, type Theme } from '../theme';
import { FONT } from '../lib/fonts';
import { formatLongDate, todayISO, timeToLabel, greetingForHour } from '../lib/dates';
import { CATEGORY_MAP, emojiForTask } from '../lib/categories';
import { COATS, COAT_MAP, type Coat, type Accessory } from '../lib/wardrobe';
import DachshundView from '../components/DachshundView';
import type { Task, Profile, CreatureRow } from '../db/types';
import { tasksOnDay } from '../db/tasks';
import { toggleCheckin, checkinIdsForDate } from '../db/checkins';
import { refreshCreature, getCreature, getEquipped } from '../db/creature';
import { getStats, type Stats } from '../db/streak';
import { focusMinutesOn, addSessionMinutes } from '../db/sessions';
import { getProfile } from '../db/profile';
import { addWeighIn, daysSinceLastWeighIn } from '../db/weight';
import type { RootTabParamList } from '../navigation';
import MottoFooter from '../components/MottoFooter';

interface TodayData {
  tasks: Task[];
  done: Set<number>;
  stats: Stats;
  creature: CreatureRow;
  profile: Profile | null;
  focusMin: number;
  equipped: Record<string, Accessory>;
  lastSinceDays: number | null;
}

interface RunningTimer {
  taskId: number;
  startedAt: number;
}

const DEFAULT_COAT: Coat = COATS[0];

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function TodayScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const today = todayISO();

  const [data, setData] = useState<TodayData | null>(null);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState<RunningTimer | null>(null);
  const [tick, setTick] = useState(0);
  const [weightNew, setWeightNew] = useState('');

  const reload = useCallback(async () => {
    const creature = await refreshCreature(db, await getCreature(db));
    const [tasks, doneIds, stats, profile, focusMin, equipped, lastSinceDays] = await Promise.all([
      tasksOnDay(db, new Date().getDay()),
      checkinIdsForDate(db, today),
      getStats(db, today),
      getProfile(db),
      focusMinutesOn(db, today),
      getEquipped(db),
      daysSinceLastWeighIn(db),
    ]);
    setData({ tasks, done: new Set(doneIds), stats, creature, profile, focusMin, equipped, lastSinceDays });
  }, [db, today]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  React.useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [running]);

  const onToggle = async (task: Task) => {
    if (busy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBusy(true);
    try {
      await toggleCheckin(db, task.id, today, CATEGORY_MAP[task.category].xp);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const startTimer = (task: Task) => {
    if (running) return;
    setRunning({ taskId: task.id, startedAt: Date.now() });
    setTick(0);
  };

  const stopTimer = async (task: Task) => {
    if (!running || running.taskId !== task.id) return;
    const seconds = Math.floor((Date.now() - running.startedAt) / 1000);
    setRunning(null);
    if (seconds < 10) return;
    const minutes = Math.max(1, Math.min(Math.round(seconds / 60), 6 * 60));
    await addSessionMinutes(db, task.id, today, minutes);
    const focusMin = await focusMinutesOn(db, today);
    setData((d) => (d ? { ...d, focusMin } : d));
    if (task.target_minutes != null && minutes >= task.target_minutes) {
      Alert.alert(
        'Muito bem! 🎉',
        `Alcançaste os ${task.target_minutes} min de ${CATEGORY_MAP[task.category].label.toLowerCase()} hoje.`
      );
    }
  };

  const saveWeightNow = async () => {
    const kg = Number(weightNew.trim().replace(',', '.'));
    if (!Number.isFinite(kg) || kg <= 0) {
      Alert.alert('Valor inválido', 'Escreve o teu peso em kg, ex.: 72,5');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addWeighIn(db, kg);
    setWeightNew('');
    await reload();
    Alert.alert('Registado 📈', `Peso atual: ${Number(kg.toFixed(1))} kg.`);
  };

  if (!data) {
    return <View style={styles.container} />;
  }

  const { tasks, done, stats, creature, profile, focusMin, equipped, lastSinceDays } = data;
  const progress = stats.totalToday === 0 ? 0 : stats.doneToday / stats.totalToday;
  const coat = creature.coat ? COAT_MAP[creature.coat] ?? DEFAULT_COAT : DEFAULT_COAT;
  const firstName = profile?.name?.split(' ')[0] ?? 'amigo';
  const now = new Date();
  const isBirthday =
    profile?.birth_day != null && profile?.birth_month != null && profile.birth_month === now.getMonth() + 1 && profile.birth_day === now.getDate();
  const greeting = isBirthday
    ? `Feliz aniversário, ${firstName}! 🎂`
    : `${greetingForHour(now.getHours())}, ${firstName}`;

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const timed = tasks
    .filter((t) => t.time_min != null)
    .sort((a, b) => (a.time_min ?? 0) - (b.time_min ?? 0));
  const unsigned = tasks.filter((t) => t.time_min == null);
  const upcoming = timed.filter((t) => (t.time_min ?? 0) >= nowMin && !done.has(t.id));
  const fillers = [...timed.filter((t) => !upcoming.includes(t) && !done.has(t.id)), ...unsigned];
  const next = [...upcoming, ...fillers].slice(0, 5);
  const first = next[0] ?? null;
  const rest = next.slice(1);

  const weightDue =
    profile != null &&
    profile.goal_enabled === 1 &&
    profile.weight_freq != null &&
    (lastSinceDays == null || lastSinceDays >= profile.weight_freq);

  const renderRow = (task: Task, big: boolean) => {
    const info = CATEGORY_MAP[task.category];
    const isDone = done.has(task.id);
    const isRunning = running?.taskId === task.id;
    const elapsed = running && isRunning ? Math.floor((Date.now() - running.startedAt) / 1000) : 0;
    return (
      <Pressable
        key={task.id}
        style={[styles.taskRow, big && styles.taskRowBig]}
        onPress={() => onToggle(task)}
        disabled={busy}
      >
        {big && task.time_min != null && (
          <View style={styles.bigTimeBlock}>
            <Text style={styles.bigTimeText}>{timeToLabel(task.time_min)}</Text>
            <Text style={styles.bigTimeHelper}>próxima tarefa</Text>
          </View>
        )}
        <View style={[styles.taskIcon, { backgroundColor: `${info.color}22` }]}>
          <Text style={styles.taskEmoji}>{emojiForTask(task.category, task.emoji)}</Text>
        </View>
        <View style={styles.taskBody}>
          <Text style={[styles.taskTitle, big && styles.taskTitleBig, isDone && styles.taskTitleDone]} numberOfLines={1}>
            {task.title}
          </Text>
          {!big && task.time_min != null && (
            <Text style={styles.taskTime}>{timeToLabel(task.time_min)}</Text>
          )}
          {isRunning && <Text style={styles.timerRunning}>▶ a decorrer · {formatClock(elapsed)}</Text>}
        </View>
        {task.target_minutes != null && (
          <Pressable
            style={[styles.timerButton, isRunning && styles.timerButtonRunning]}
            onPress={(e) => {
              e.stopPropagation();
              isRunning ? stopTimer(task) : startTimer(task);
            }}
            disabled={running != null && !isRunning}
          >
            <Text style={styles.timerButtonText}>{isRunning ? '⏹' : '▶'}</Text>
          </Pressable>
        )}
        <View style={[styles.checkCircle, isDone && styles.checkCircleDone]}>
          {isDone && <Text style={styles.checkMark}>✓</Text>}
        </View>
      </Pressable>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View style={styles.topRow}>
        <View style={styles.topText}>
          <Text style={[styles.greeting, isBirthday && styles.greetingBirthday]}>{greeting}</Text>
          <Text style={styles.date}>{formatLongDate(today)}</Text>
        </View>
        {profile?.photo_uri ? (
          <Pressable onPress={() => navigation.navigate('Perfil')}>
            <Image source={{ uri: profile.photo_uri }} style={styles.avatar} />
          </Pressable>
        ) : (
          <Pressable onPress={() => navigation.navigate('Perfil')}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{firstName.charAt(0).toUpperCase()}</Text>
            </View>
          </Pressable>
        )}
      </View>

      <View style={styles.dogCard}>
        <DachshundView coatColor={coat.color} energy={creature.energy} equipped={equipped} width={196} height={204} />
        <Text style={styles.creatureName}>{creature.name}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>
              🔥 {stats.streak} dia{stats.streak === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>🎯 {focusMin} min</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>
              {stats.doneToday}/{stats.totalToday}
            </Text>
          </View>
        </View>
      </View>

      {weightDue && (
        <View style={styles.weightCard}>
          <View style={styles.weightHeader}>
            <Text style={styles.weightTitle}>⚖️ Registar o peso</Text>
            <Text style={styles.weightInfo}>
              {lastSinceDays == null
                ? 'Primeira pesagem do teu objetivo.'
                : `Última pesagem há ${lastSinceDays} dia${lastSinceDays === 1 ? '' : 's'}.`}
            </Text>
          </View>
          <View style={styles.weightRow}>
            <TextInput
              style={styles.weightInput}
              value={weightNew}
              onChangeText={setWeightNew}
              placeholder="Peso em kg"
              placeholderTextColor={theme.subtext}
              keyboardType="decimal-pad"
            />
            <Pressable style={styles.weightButton} onPress={saveWeightNow}>
              <Text style={styles.weightButtonText}>Guardar</Text>
            </Pressable>
          </View>
        </View>
      )}

      {next.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>
            {tasks.length === 0 ? '🌤️' : '🎉'}
          </Text>
          <Text style={styles.emptyText}>
            {tasks.length === 0
              ? 'A tua rotina está vazia. Cria tarefas para o teu cão crescer.'
              : 'Concluíste tudo o que estava para hoje. Bom trabalho!'}
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Rotina')}>
            <Text style={styles.primaryButtonText}>
              {tasks.length === 0 ? 'Criar a minha rotina' : 'Ver a minha rotina'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          {first && renderRow(first, true)}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>A seguir</Text>
            <Pressable onPress={() => navigation.navigate('Rotina')}>
              <Text style={styles.sectionLink}>Ver todas</Text>
            </Pressable>
          </View>

          {rest.length === 0 ? (
            <View style={styles.quietCard}>
              <Text style={styles.quietText}>
                Depois disto, o resto do dia é teu. Continua assim! ☀️
              </Text>
            </View>
          ) : (
            <View style={styles.taskList}>{rest.map((t) => renderRow(t, false))}</View>
          )}
        </>
      )}

      <MottoFooter />
    </ScrollView>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    topText: { flex: 1 },
    greeting: { color: theme.text, fontSize: 22, fontWeight: '800', fontFamily: FONT.extrabold },
    greetingBirthday: { color: theme.primary },
    date: { color: theme.subtext, fontSize: 13, marginTop: 2 },
    avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: theme.primary },
    avatarPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: { color: theme.white, fontSize: 18, fontWeight: '800' },
    dogCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      paddingTop: 10,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    creatureName: { color: theme.text, fontSize: 16, fontWeight: '800', fontFamily: FONT.bold, marginTop: 4 },
    progressTrack: {
      width: '100%',
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.cardAlt,
      marginTop: 12,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 4, backgroundColor: theme.primary },
    chipRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    chip: { backgroundColor: theme.primarySoft, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6 },
    chipText: { color: theme.primary, fontSize: 12, fontWeight: '700' },
    weightCard: {
      backgroundColor: theme.primarySoft,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.primary,
      padding: 14,
    },
    weightHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    weightTitle: { color: theme.text, fontSize: 14, fontWeight: '800' },
    weightInfo: { color: theme.subtext, fontSize: 12, flexShrink: 1, textAlign: 'right' },
    weightRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    weightInput: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
    },
    weightButton: {
      backgroundColor: theme.primary,
      borderRadius: 10,
      paddingHorizontal: 16,
      justifyContent: 'center',
    },
    weightButtonText: { color: theme.onPrimary, fontSize: 14, fontWeight: '800' },
    taskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
    },
    taskRowBig: {
      borderRadius: 16,
      padding: 16,
      borderColor: theme.primaryDark,
      backgroundColor: theme.card,
    },
    bigTimeBlock: { alignItems: 'center', paddingRight: 12, borderRightWidth: 1, borderRightColor: theme.border },
    bigTimeText: { color: theme.primary, fontSize: 24, fontWeight: '900' },
    bigTimeHelper: { color: theme.subtext, fontSize: 10, marginTop: 2 },
    taskIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    taskEmoji: { fontSize: 20 },
    taskBody: { flex: 1 },
    taskTitle: { color: theme.text, fontSize: 15, fontWeight: '700' },
    taskTitleBig: { fontSize: 17, fontWeight: '800' },
    taskTitleDone: { color: theme.subtext, textDecorationLine: 'line-through' },
    taskTime: { color: theme.primary, fontSize: 13, fontWeight: '700', marginTop: 2 },
    timerRunning: { color: theme.primary, fontSize: 12, fontWeight: '700', marginTop: 2 },
    timerButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1.5,
      borderColor: theme.primary,
      backgroundColor: theme.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timerButtonRunning: { backgroundColor: theme.primary },
    timerButtonText: { color: theme.text, fontSize: 14 },
    checkCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkCircleDone: { backgroundColor: theme.primary },
    checkMark: { color: theme.onPrimary, fontSize: 15, fontWeight: '800' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    sectionTitle: { color: theme.text, fontSize: 15, fontWeight: '800', fontFamily: FONT.extrabold },
    sectionLink: { color: theme.primary, fontSize: 13, fontWeight: '700' },
    taskList: { gap: 8 },
    quietCard: {
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      alignItems: 'center',
    },
    quietText: { color: theme.subtext, fontSize: 13, textAlign: 'center', lineHeight: 18 },
    emptyCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 28,
      alignItems: 'center',
      marginTop: 10,
    },
    emptyEmoji: { fontSize: 44 },
    emptyText: { color: theme.subtext, fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20 },
    primaryButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingHorizontal: 22,
      paddingVertical: 13,
      marginTop: 16,
    },
    primaryButtonText: { color: theme.onPrimary, fontSize: 15, fontWeight: '800' },
  });