import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PressableScale as Pressable } from '../components/PressableScale';
import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, type Theme } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createWorkout,
  deleteWorkout,
  listWorkouts,
  weekWorkoutStats,
  WORKOUT_KINDS,
} from '../db/workouts';
import type { Workout, Profile, WeighIn } from '../db/types';
import { formatLongDate, todayISO } from '../lib/dates';
import { getProfile } from '../db/profile';
import {
  addWeighIn,
  listWeighIns,
  weightProgress,
  weighInLabel,
} from '../db/weight';

const KIND_KEYS = Object.keys(WORKOUT_KINDS);
const KIND_ORDER = ['gym', 'run', 'football', 'bike', 'swim', 'other'];
const DURATION_CHIPS = [30, 45, 60, 90];

function dateAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${d.getFullYear()}-${m < 10 ? `0${m}` : m}-${day < 10 ? `0${day}` : day}`;
}

function dateLabel(iso: string): string {
  if (iso === todayISO()) return 'Hoje';
  if (iso === dateAgo(1)) return 'Ontem';
  return formatLongDate(iso);
}

export default function TrainingsScreen() {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [week, setWeek] = useState({ minutes: 0, sessions: 0 });
  const [showForm, setShowForm] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [weighIns, setWeighIns] = useState<WeighIn[]>([]);
  const [weightNew, setWeightNew] = useState('');

  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('gym');
  const [date, setDate] = useState(() => todayISO());
  const [duration, setDuration] = useState<number | null>(null);
  const [durationCustom, setDurationCustom] = useState('');
  const [notes, setNotes] = useState('');

  const reload = useCallback(async () => {
    const [list, stats, prof, wIns] = await Promise.all([
      listWorkouts(db),
      weekWorkoutStats(db),
      getProfile(db),
      listWeighIns(db, 5),
    ]);
    setWorkouts(list);
    setWeek(stats);
    setProfile(prof);
    setWeighIns(wIns);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const openForm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTitle('');
    setKind('gym');
    setDate(todayISO());
    setDuration(null);
    setDurationCustom('');
    setNotes('');
    setShowForm(true);
  };

  const save = async () => {
    const minutes = duration ?? Number(durationCustom);
    if (!title.trim()) {
      Alert.alert('Falta o nome', 'Dá um nome ao teu treino, ex.: «Peito» ou «Futebol 5x5».');
      return;
    }
    if (!Number.isFinite(minutes) || minutes <= 0) {
      Alert.alert('Falta a duração', 'Indica quantos minutos durou o treino.');
      return;
    }
    await createWorkout(db, {
      title: title.trim(),
      kind,
      date,
      duration_min: Math.round(minutes),
      notes: notes.trim(),
    });
    setShowForm(false);
    await reload();
  };

  const updateWeightNow = async () => {
    const kg = Number(weightNew.trim().replace(',', '.'));
    if (!Number.isFinite(kg) || kg <= 0) {
      Alert.alert('Valor inválido', 'Escreve o teu peso em kg, ex.: 72,5');
      return;
    }
    await addWeighIn(db, kg);
    setWeightNew('');
    await reload();
    Alert.alert('Registado 📈', `Peso atual: ${Number(kg.toFixed(1))} kg.`);
  };

  const remove = (w: Workout) => {
    Alert.alert(
      'Remover treino',
      `Apagar «${w.title}» (${w.duration_min} min)?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            await deleteWorkout(db, w.id);
            await reload();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.weekCard}>
          <Text style={styles.weekTitle}>Esta semana</Text>
          <View style={styles.weekRow}>
            <View style={styles.weekStat}>
              <Text style={styles.weekValue}>{week.minutes}</Text>
              <Text style={styles.weekLabel}>min de treino</Text>
            </View>
            <View style={styles.weekDivider} />
            <View style={styles.weekStat}>
              <Text style={styles.weekValue}>{week.sessions}</Text>
              <Text style={styles.weekLabel}>treinos</Text>
            </View>
          </View>
        </View>

        <View style={styles.weightCard}>
          <Text style={styles.weekTitle}>⚖️ Acompanhar peso</Text>
          <Text style={styles.hint}>
            Regista o teu peso de vez em quando e acompanha a evolução ao lado dos treinos.
          </Text>
          {profile?.goal_enabled === 1 &&
            profile.goal_start_kg != null &&
            profile.goal_target_kg != null && (
              <>
                <View style={styles.weightTargetRow}>
                  <Text style={styles.weightTargetText}>{profile.goal_start_kg} kg</Text>
                  <Text style={styles.weightTargetText}>
                    → {Number(weighIns[0]?.kg ?? profile.goal_start_kg)} kg
                  </Text>
                  <Text style={styles.weightTargetText}>{profile.goal_target_kg} kg</Text>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${Math.round(
                          weightProgress(
                            profile.goal_start_kg,
                            profile.goal_target_kg,
                            weighIns[0]?.kg ?? profile.goal_start_kg
                          ) * 100
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.hint}>OBJETIVO: {profile.goal_target_kg} kg</Text>
              </>
            )}

          <Text style={styles.fieldLabel}>Registar peso hoje</Text>
          <View style={styles.weightInputRow}>
            <TextInput
              style={[styles.input, styles.weightInput]}
              value={weightNew}
              onChangeText={setWeightNew}
              placeholder="Peso em kg"
              placeholderTextColor={theme.subtext}
              keyboardType="decimal-pad"
            />
            <Pressable style={styles.weightSaveButton} onPress={updateWeightNow}>
              <Text style={styles.weightSaveButtonText}>Guardar</Text>
            </Pressable>
          </View>

          {weighIns.length > 1 && (
            <View style={styles.weightHistory}>
              {weighIns.map((w, i) => {
                const prev = weighIns[i + 1];
                const delta = prev != null ? w.kg - prev.kg : 0;
                return (
                  <View key={w.id} style={styles.weightRow}>
                    <Text style={styles.historyDate}>{weighInLabel(w.date)}</Text>
                    <Text style={styles.historyKg}>{Number(w.kg.toFixed(1))} kg</Text>
                    <Text
                      style={[
                        styles.historyDelta,
                        delta < 0 ? styles.deltaDown : delta > 0 ? styles.deltaUp : styles.deltaSame,
                      ]}
                    >
                      {prev != null
                        ? delta === 0
                          ? '→'
                          : delta > 0
                          ? `▲ +${Number(delta.toFixed(1))}`
                          : `▼ ${Number(delta.toFixed(1))}`
                        : '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Histórico</Text>
        {workouts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🏋️</Text>
            <Text style={styles.emptyText}>
              Ainda não registaste treinos. Toca no botão + para começares o teu diário.
            </Text>
          </View>
        ) : (
          workouts.map((w) => {
            const info = WORKOUT_KINDS[w.kind] ?? WORKOUT_KINDS.other;
            return (
              <Pressable key={w.id} style={styles.workoutRow} onPress={() => remove(w)}>
                <View style={styles.workoutEmojiWrap}>
                  <Text style={styles.workoutEmoji}>{info.emoji}</Text>
                </View>
                <View style={styles.workoutInfo}>
                  <Text style={styles.workoutTitle}>{w.title}</Text>
                  <Text style={styles.workoutMeta}>
                    {info.label} · {dateLabel(w.date)} · ⏱ {w.duration_min} min
                  </Text>
                  {w.notes ? (
                    <Text style={styles.workoutNotes}>{w.notes}</Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 66 }]}
        onPress={openForm}
      >
        <Text style={styles.fabText}>＋</Text>
      </Pressable>

      <Modal visible={showForm} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo treino</Text>
              <Pressable onPress={() => setShowForm(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets
            >
              <Text style={styles.fieldLabel}>NOME</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Ex.: Peito & Tríceps, Corrida de manhã…"
                placeholderTextColor={theme.subtext}
              />

              <Text style={styles.fieldLabel}>TIPO</Text>
              <View style={styles.chips}>
                {KIND_ORDER.map((k) => {
                  const active = kind === k;
                  return (
                    <Pressable key={k} style={[styles.chip, active && styles.chipActive]} onPress={() => setKind(k)}>
                      <Text style={styles.chipEmoji}>{WORKOUT_KINDS[k].emoji}</Text>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {WORKOUT_KINDS[k].label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>QUANDO</Text>
              <View style={styles.chips}>
                {[0, 1, 2, 3].map((d) => {
                  const iso = dateAgo(d);
                  const active = date === iso;
                  return (
                    <Pressable key={d} style={[styles.chip, active && styles.chipActive]} onPress={() => setDate(iso)}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{dateLabel(iso)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>DURAÇÃO</Text>
              <View style={styles.chips}>
                {DURATION_CHIPS.map((m) => {
                  const active = duration === m;
                  return (
                    <Pressable key={m} style={[styles.chip, active && styles.chipActive]} onPress={() => { setDuration(m); setDurationCustom(''); }}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{m} min</Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                style={styles.input}
                value={durationCustom}
                onChangeText={(t) => { setDurationCustom(t.replace(/[^0-9]/g, '')); setDuration(null); }}
                placeholder="Ou minutos personalizados"
                placeholderTextColor={theme.subtext}
                keyboardType="number-pad"
              />

              <Text style={styles.fieldLabel}>NOTAS (OPCIONAL)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Kms, ritmo, sensação, exercícios…"
                placeholderTextColor={theme.subtext}
                multiline
              />

              <Pressable style={styles.saveButton} onPress={save}>
                <Text style={styles.saveButtonText}>Guardar treino</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 96,
    gap: 12,
  },
  weekCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
  },
  weekTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  weekStat: {
    flex: 1,
    alignItems: 'center',
  },
  weekValue: {
    color: theme.primary,
    fontSize: 26,
    fontWeight: '800',
  },
  weekLabel: {
    color: theme.subtext,
    fontSize: 12,
    marginTop: 2,
  },
  weekDivider: {
    width: 1,
    height: 44,
    backgroundColor: theme.border,
  },
  weightCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
  },
  hint: {
    color: theme.subtext,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 17,
  },
  weightTargetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  weightTargetText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.cardAlt,
    marginTop: 8,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: theme.primary,
  },
  weightInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  weightInput: {
    flex: 1,
  },
  weightSaveButton: {
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  weightSaveButtonText: { color: theme.onPrimary, fontSize: 14, fontWeight: '800' },
  weightHistory: { marginTop: 6 },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  historyDate: { flex: 1, color: theme.subtext, fontSize: 13 },
  historyKg: { color: theme.text, fontSize: 14, fontWeight: '700' },
  historyDelta: { width: 54, textAlign: 'right', fontSize: 13, fontWeight: '700' },
  deltaDown: { color: theme.primary },
  deltaUp: { color: theme.danger },
  deltaSame: { color: theme.subtext },
  sectionTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 6,
  },
  emptyCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    padding: 28,
    gap: 10,
  },
  emptyEmoji: {
    fontSize: 38,
  },
  emptyText: {
    color: theme.subtext,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  workoutRow: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    gap: 12,
    alignItems: 'center',
  },
  workoutEmojiWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutEmoji: {
    fontSize: 20,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
  },
  workoutMeta: {
    color: theme.subtext,
    fontSize: 12,
    marginTop: 2,
  },
  workoutNotes: {
    color: theme.subtext,
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    right: 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: {
    color: theme.onPrimary,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 34,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '800',
  },
  modalClose: {
    color: theme.subtext,
    fontSize: 20,
    fontWeight: '700',
    padding: 4,
  },
  fieldLabel: {
    color: theme.subtext,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.cardAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  notesInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: theme.cardAlt,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  chipEmoji: {
    fontSize: 14,
  },
  chipText: {
    color: theme.subtext,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: theme.onPrimary,
    fontWeight: '800',
  },
  saveButton: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: theme.onPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  });