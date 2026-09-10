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
import TimeInput from '../components/TimeInput';
import * as ImagePicker from 'expo-image-picker';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, type Theme } from '../theme';
import { getProfile, upsertProfile } from '../db/profile';
import type { Profile } from '../db/types';
import { persistProfilePhoto } from '../lib/profilePhoto';
import {
  GENDER_OPTIONS,
  GENDER_LABEL,
  normalizeBirthYearInput,
  normalizeHeightInput,
  isHeightValid,
  validateBirthInput,
  calcBmi,
  bmiCategoryAdjusted,
  computeAge,
} from '../lib/health';
import { getStats, type Stats } from '../db/streak';
import { totalFocusMinutes } from '../db/sessions';
import {
  addWeighIn,
  latestWeighIn,
  listWeighIns,
  daysSinceLastWeighIn,
  weightProgress,
  weighInLabel,
} from '../db/weight';
import type { WeighIn } from '../db/types';
import { pad2 } from '../lib/dates';

const WAKE_OPTIONS = [360, 390, 420, 450, 480, 510, 540, 600, 660];

function wakeLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

async function saveProfile(
  db: SQLiteDatabase,
  profile: Profile,
  patch: Partial<Profile>
) {
  await upsertProfile(db, { ...profile, ...patch });
  return { ...profile, ...patch } as Profile;
}

export default function ProfileScreen() {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [wakeCustom, setWakeCustom] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [focusTotal, setFocusTotal] = useState(0);
  const [weighIns, setWeighIns] = useState<WeighIn[]>([]);
  const [lastSinceDays, setLastSinceDays] = useState<number | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const [goalOn, setGoalOn] = useState(false);
  const [goalStart, setGoalStart] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [weightNew, setWeightNew] = useState('');

  const reload = useCallback(async () => {
    const [prof, statsData, focus, wIns, since] = await Promise.all([
      getProfile(db),
      getStats(db),
      totalFocusMinutes(db),
      listWeighIns(db, 6),
      daysSinceLastWeighIn(db),
    ]);
    setProfile(prof);
    if (prof) {
      setNameDraft(prof.name);
      setWakeCustom(prof.wake_min != null ? wakeLabel(prof.wake_min) : '');
      setBirthYear(prof.birth_year != null ? String(prof.birth_year) : '');
      setBirthMonth(prof.birth_month != null ? String(prof.birth_month) : '');
      setBirthDay(prof.birth_day != null ? String(prof.birth_day) : '');
      setHeightCm(prof.height_cm != null ? String(prof.height_cm) : '');
      setGoalOn(prof.goal_enabled === 1);
      setGoalStart(prof.goal_start_kg != null ? String(prof.goal_start_kg) : '');
      setGoalTarget(prof.goal_target_kg != null ? String(prof.goal_target_kg) : '');
    }
    setStats(statsData);
    setFocusTotal(focus);
    setWeighIns(wIns);
    setLastSinceDays(since);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const patch = async (p: Partial<Profile>) => {
    if (!profile) return;
    setProfile(await saveProfile(db, profile, p));
  };

  const saveName = async () => {
    if (!profile) return;
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameDraft(profile.name);
      return;
    }
    await patch({ name: trimmed });
    Alert.alert('Feito!', 'Nome atualizado.');
  };

  const savePersonal = async () => {
    if (!profile) return;
    const year = birthYear.trim() === '' ? null : Math.min(Math.max(1900, Number(birthYear) || 0), new Date().getFullYear());
    const month = birthMonth.trim() === '' ? null : Math.min(Math.max(1, Number(birthMonth) || 0), 12);
    const day = birthDay.trim() === '' ? null : Math.min(Math.max(1, Number(birthDay) || 0), 31);
    const birthErr = validateBirthInput(year, month, day);
    if (birthErr) {
      Alert.alert('Verifica os teus dados', birthErr);
      return;
    }
    const height = heightCm.trim() === '' ? null : Number(heightCm);
    if (height != null && !isHeightValid(height)) {
      Alert.alert('Altura inválida', 'Indica uma altura entre 100 e 250 cm.');
      return;
    }
    await patch({ birth_year: year, birth_month: month, birth_day: day, height_cm: height });
    Alert.alert('Feito!', 'Dados pessoais atualizados.');
  };

  const saveGender = async (gender: string) => {
    if (!profile) return;
    await patch({ gender });
    Alert.alert('Feito!', 'Género atualizado.');
  };

  const changePhoto = async () => {
    if (photoBusy || !profile) return;
    setPhotoBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = await persistProfilePhoto(result.assets[0].uri);
        await patch({ photo_uri: uri });
      }
    } finally {
      setPhotoBusy(false);
    }
  };

  const saveWake = async (wakeMin: number) => {
    if (!profile) return;
    await patch({ wake_min: wakeMin });
    setWakeCustom(wakeLabel(wakeMin));
    Alert.alert('Feito!', `Acordas às ${wakeLabel(wakeMin)}.`);
  };

  const saveWakeCustom = async () => {
    if (!profile) return;
    const match = wakeCustom.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      setWakeCustom(profile.wake_min != null ? wakeLabel(profile.wake_min) : '');
      return;
    }
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (h > 23 || m > 59) {
      setWakeCustom(profile.wake_min != null ? wakeLabel(profile.wake_min) : '');
      return;
    }
    await saveWake(h * 60 + m);
  };

  const enableGoal = async () => {
    if (!profile) return;
    const start = Number(goalStart);
    const target = Number(goalTarget);
    if (!Number.isFinite(start) || !Number.isFinite(target) || start <= 0 || target <= 0) {
      Alert.alert('Faltam valores', 'Indica o peso atual e o peso que queres atingir (em kg).');
      return;
    }
    await addWeighIn(db, start);
    await patch({
      goal_enabled: 1,
      goal_start_kg: start,
      goal_target_kg: target,
      weight_freq: profile.weight_freq ?? 7,
    });
    await reload();
    Alert.alert('Objetivo definido 💪', `De ${start} kg para ${target} kg. Boa caminhada!`);
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

  if (!profile) {
    return <View style={styles.container} />;
  }

  const latest = weighIns[0] ?? null;
  const currentWeight = latest?.kg ?? (profile.goal_start_kg ?? null);
  const goalProgress =
    profile.goal_enabled === 1 &&
    profile.goal_start_kg != null &&
    profile.goal_target_kg != null &&
    currentWeight != null
      ? weightProgress(profile.goal_start_kg, profile.goal_target_kg, currentWeight)
      : null;
  const weightFreq = profile.weight_freq ?? 7;
  const overdue = lastSinceDays != null && lastSinceDays >= weightFreq;
  const bmi =
    profile.height_cm != null && currentWeight != null
      ? calcBmi(currentWeight, profile.height_cm)
      : null;
  const age = computeAge(profile.birth_year, profile.birth_month, profile.birth_day);
  const bmiInfo = bmi != null ? bmiCategoryAdjusted(bmi, age) : null;
  const hM = profile.height_cm != null ? profile.height_cm / 100 : null;
  const bmiMin = hM != null ? Math.round(18.5 * hM * hM) : null;
  const bmiMax =
    hM != null ? Math.round((age != null && age >= 65 ? 28 : 24.9) * hM * hM) : null;
  const bmiContext =
    bmi != null && bmiMin != null && bmiMax != null
      ? `Para ${profile.gender ? GENDER_LABEL[profile.gender] ?? 'ti' : 'ti'}${
          age != null ? ` de ${age} anos` : ''
        } com ${profile.height_cm} cm de altura, o peso aconselhado está entre ${bmiMin} e ${bmiMax} kg.`
      : null;

  const suggestedTime = (minsAfter: number) => {
    return profile.wake_min != null
      ? wakeLabel(((profile.wake_min + minsAfter) % 1440 + 1440) % 1440)
      : '—';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View style={styles.hero}>
        <Pressable style={styles.photoWrap} onPress={changePhoto}>
          {profile.photo_uri ? (
            <Image source={{ uri: profile.photo_uri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoEmoji}>📸</Text>
            </View>
          )}
          <View style={styles.photoBadge}>
            <Text style={styles.photoBadgeText}>✎</Text>
          </View>
        </Pressable>
        <View style={styles.heroFields}>
          <TextInput
            style={styles.input}
            value={nameDraft}
            onChangeText={setNameDraft}
            placeholder="O teu nome"
            placeholderTextColor={theme.subtext}
          />
          <Pressable style={styles.saveButton} onPress={saveName}>
            <Text style={styles.saveButtonText}>Guardar nome</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🪪 Dados pessoais</Text>
        <Text style={styles.hint}>
          Só para personalizares contigo — fica guardado apenas no teu telemóvel. No dia do teu
          aniversário, a página inicial dá-te os parabéns 🎂
        </Text>
        <View style={styles.row}>
          <View style={styles.rowField}>
            <Text style={styles.fieldLabel}>Dia (opcional)</Text>
            <TextInput
              style={styles.input}
              value={birthDay}
              onChangeText={(t) => setBirthDay(t.replace(/[^0-9]/g, ''))}
              placeholder="15"
              placeholderTextColor={theme.subtext}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <View style={styles.rowField}>
            <Text style={styles.fieldLabel}>Mês (opcional)</Text>
            <TextInput
              style={styles.input}
              value={birthMonth}
              onChangeText={(t) => setBirthMonth(t.replace(/[^0-9]/g, ''))}
              placeholder="6"
              placeholderTextColor={theme.subtext}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.rowField}>
            <Text style={styles.fieldLabel}>Ano de nascimento</Text>
            <TextInput
              style={styles.input}
              value={birthYear}
              onChangeText={(t) => setBirthYear(normalizeBirthYearInput(t))}
              placeholder="Ex.: 1998"
              placeholderTextColor={theme.subtext}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.rowField}>
            <Text style={styles.fieldLabel}>Altura (cm)</Text>
            <TextInput
              style={styles.input}
              value={heightCm}
              onChangeText={(t) => setHeightCm(normalizeHeightInput(t))}
              placeholder="Ex.: 175"
              placeholderTextColor={theme.subtext}
              keyboardType="number-pad"
            />
          </View>
        </View>
        <Text style={styles.fieldLabel}>Género</Text>
        <View style={styles.chips}>
          {GENDER_OPTIONS.map((g) => {
            const active = profile.gender === g.value;
            return (
              <Pressable
                key={g.value}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => saveGender(g.value)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{g.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable style={styles.saveButton} onPress={savePersonal}>
          <Text style={styles.saveButtonText}>Guardar dados</Text>
        </Pressable>
        {profile.birth_year != null && (
          <Text style={styles.hint}>
            Idade aproximada: {Math.max(0, 2026 - profile.birth_year)} anos
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 Objetivo de peso</Text>
        {profile.goal_enabled === 1 ? (
          <>
            <Text style={styles.hint}>
              Caminho: {profile.goal_start_kg} kg → {profile.goal_target_kg} kg
              {currentWeight != null ? ` · agora: ${Number(currentWeight.toFixed(1))} kg` : ''}
            </Text>
            {goalProgress != null && (
              <>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${goalProgress * 100}%` }]} />
                </View>
                <Text style={styles.hint}>
                  {Math.round(goalProgress * 100)}% do caminho percorrido
                </Text>
              </>
            )}
            <Text style={styles.fieldLabel}>Registar peso hoje</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.kgInput]}
                value={weightNew}
                onChangeText={setWeightNew}
                placeholder="Peso em kg"
                placeholderTextColor={theme.subtext}
                keyboardType="decimal-pad"
              />
              <Pressable style={styles.saveButton} onPress={updateWeightNow}>
                <Text style={styles.saveButtonText}>Guardar</Text>
              </Pressable>
            </View>
            {overdue && (
              <View style={styles.banner}>
                <Text style={styles.bannerText}>
                  Já passaram {lastSinceDays} dias desde a última pesagem. Está na hora de uma
                  atualização 😉
                </Text>
              </View>
            )}
            {weighIns.length > 1 && (
              <View style={styles.history}>
                <Text style={styles.fieldLabel}>Evolução recente</Text>
                {weighIns.map((w, i) => {
                  const prev = weighIns[i + 1];
                  const delta = prev != null ? w.kg - prev.kg : 0;
                  return (
                    <View key={w.id} style={styles.historyRow}>
                      <Text style={styles.historyDate}>{weighInLabel(w.date)}</Text>
                      <Text style={styles.historyKg}>{Number(w.kg.toFixed(1))} kg</Text>
                      <Text style={[styles.historyDelta, delta < 0 ? styles.deltaDown : delta > 0 ? styles.deltaUp : styles.deltaSame]}>
                        {prev != null ? (delta === 0 ? '→' : delta > 0 ? `▲ +${Number(delta.toFixed(1))}` : `▼ ${Number(delta.toFixed(1))}`) : '—'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.hint}>
              Define um objetivo de peso e, de vez em quando, a app pede-te uma atualização para
              veres a tua evolução.
            </Text>
            <View style={styles.row}>
              <View style={styles.rowField}>
                <Text style={styles.fieldLabel}>Peso atual</Text>
                <TextInput
                  style={styles.input}
                  value={goalStart}
                  onChangeText={setGoalStart}
                  placeholder="kg"
                  placeholderTextColor={theme.subtext}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.rowField}>
                <Text style={styles.fieldLabel}>Peso pretendido</Text>
                <TextInput
                  style={styles.input}
                  value={goalTarget}
                  onChangeText={setGoalTarget}
                  placeholder="kg"
                  placeholderTextColor={theme.subtext}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <Pressable style={styles.primaryButton} onPress={enableGoal}>
              <Text style={styles.primaryButtonText}>Definir objetivo 💪</Text>
            </Pressable>
          </>
        )}
      </View>

      {bmi != null && bmiInfo != null && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧮 Índice de Massa Corporal</Text>
          <View style={styles.bmiRow}>
            <Text style={styles.bmiValue}>{bmi.toFixed(1)}</Text>
            <Text style={[styles.bmiCategory, { color: theme[bmiInfo.key] }]}>{bmiInfo.label}</Text>
          </View>
          <Text style={styles.hint}>{bmiInfo.note}</Text>
          {bmiContext != null && <Text style={styles.hint}>{bmiContext}</Text>}
          <Text style={styles.hint}>
            Interpretado com a tua altura, género e idade. Atualiza o peso quando a página Hoje te
            pedir.
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>⏰ Hora de acordar</Text>
        <Text style={styles.hint}>
          As tarefas sugeridas baseiam-se nela (oração da manhã, estudo, trabalho…).
        </Text>
        <View style={styles.chips}>
          {WAKE_OPTIONS.map((w) => {
            const active = profile.wake_min === w;
            return (
              <Pressable key={w} style={[styles.chip, active && styles.chipActive]} onPress={() => saveWake(w)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{wakeLabel(w)}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.row}>
          <TimeInput
            style={[styles.input, styles.kgInput]}
            value={wakeCustom}
            onChange={(label) => setWakeCustom(label)}
            placeholder="HH:MM"
            placeholderTextColor={theme.subtext}
            onEndEditing={saveWakeCustom}
          />
          <Pressable style={styles.saveButton} onPress={saveWakeCustom}>
            <Text style={styles.saveButtonText}>Definir</Text>
          </Pressable>
        </View>
      </View>

      {stats && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📈 Números da tua rotina</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.streak}</Text>
              <Text style={styles.statLabel}>dias seguidos</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.perfectDays}</Text>
              <Text style={styles.statLabel}>dias perfeitos</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalDone}</Text>
              <Text style={styles.statLabel}>tarefas</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{focusTotal}</Text>
              <Text style={styles.statLabel}>min focados</Text>
            </View>
          </View>
          <Text style={styles.hint}>
            ⌛ Sugestões baseadas na tua hora de acordar: oração da manhã às {suggestedTime(15)},
            estudo às {suggestedTime(240)}, trabalho às {suggestedTime(120)}.
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔔 Lembretes</Text>
        <Text style={styles.hint}>
          Cada tarefa da Rotina decide o seu próprio lembrete: se o queres e quanto tempo antes
          (ex.: 30 min antes). Abre a página Rotina e toca numa tarefa para configurar. Organiza o
          resto em Config.
        </Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
    },
    photoWrap: { position: 'relative' },
    photo: {
      width: 84,
      height: 84,
      borderRadius: 42,
      borderWidth: 3,
      borderColor: theme.primary,
    },
    photoPlaceholder: {
      width: 84,
      height: 84,
      borderRadius: 42,
      borderWidth: 3,
      borderColor: theme.border,
      backgroundColor: theme.cardAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoEmoji: { fontSize: 30 },
    photoBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoBadgeText: { color: theme.onPrimary, fontSize: 14, fontWeight: '900' },
    heroFields: { flex: 1, gap: 10 },
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
    saveButton: {
      backgroundColor: theme.primarySoft,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 9,
      alignSelf: 'flex-start',
    },
    saveButtonText: { color: theme.primary, fontSize: 14, fontWeight: '700' },
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
    },
    cardTitle: {
      color: theme.text,
      fontSize: 14,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    hint: { color: theme.subtext, fontSize: 12, marginTop: 8, lineHeight: 17 },
    fieldLabel: {
      color: theme.subtext,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
      marginTop: 12,
      marginBottom: 6,
    },
    row: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 10 },
    rowField: { flex: 1 },
    kgInput: { flex: 1 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    chip: {
      backgroundColor: theme.cardAlt,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    chipText: { color: theme.subtext, fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: theme.onPrimary, fontWeight: '800' },
    bmiRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
    },
    bmiValue: {
      color: theme.text,
      fontSize: 30,
      fontWeight: '900',
    },
    bmiCategory: {
      fontSize: 16,
      fontWeight: '800',
    },
    track: {
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.cardAlt,
      marginTop: 12,
      overflow: 'hidden',
    },
    fill: { height: '100%', borderRadius: 5, backgroundColor: theme.primary },
    banner: {
      backgroundColor: theme.primarySoft,
      borderRadius: 10,
      padding: 10,
      marginTop: 12,
    },
    bannerText: { color: theme.primary, fontSize: 12, lineHeight: 17 },
    history: { marginTop: 6 },
    historyRow: {
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
    primaryButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 12,
    },
    primaryButtonText: { color: theme.onPrimary, fontSize: 15, fontWeight: '800' },
    statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    statCard: {
      flex: 1,
      backgroundColor: theme.cardAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 12,
      alignItems: 'center',
    },
    statValue: { color: theme.primary, fontSize: 18, fontWeight: '800' },
    statLabel: { color: theme.subtext, fontSize: 10, marginTop: 2, textAlign: 'center' },
  });