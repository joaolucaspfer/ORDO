import React, { useCallback, useState } from 'react';
import {
  FlatList,
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
import TimeInput from '../components/TimeInput';
import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, type Theme } from '../theme';
import { timeToLabel, labelToTimeMin, WEEKDAYS_SHORT, ALL_DAYS_MASK } from '../lib/dates';
import { CATEGORIES, CATEGORY_MAP, emojiForTask, type Category } from '../lib/categories';
import type { Task } from '../db/types';
import { listTasks, createTask, updateTask, deleteTask, getTask } from '../db/tasks';
import { syncTaskReminder, cancelTaskReminder } from '../lib/notifications';

interface FormState {
  title: string;
  category: Category;
  emoji: string;
  timeLabel: string;
  days: number;
  details: string;
  targetMinutes: string;
  remindEnabled: boolean;
  remindBefore: number;
}

const DETAILS_PLACEHOLDER: Record<Category, string> = {
  prayer: 'O que vais fazer? Ex.: Leitura do Evangelho, terço, oração em silêncio.',
  work: 'Lista as tarefas do dia (uma por linha).',
  training: 'Escreve os exercícios, um por linha. Ex.: 3×10 flexões, corrida 10 min, prancha.',
  study: 'O que vais estudar? Ex.: Matemática — cap. 3.',
  other: 'Notas ou passos, um por linha.',
};

const MINUTES_LABEL: Record<Category, string> = {
  prayer: 'Minutos',
  work: 'Duração estimada',
  training: 'Minutos de treino',
  study: 'Minutos de estudo',
  other: 'Duração (min)',
};

const DEFAULT_FORM: FormState = {
  title: '',
  category: 'prayer',
  emoji: '',
  timeLabel: '',
  days: ALL_DAYS_MASK,
  details: '',
  targetMinutes: '',
  remindEnabled: true,
  remindBefore: 30,
};

const REMIND_BEFORE_OPTIONS = [5, 15, 30, 60];

export default function RoutineScreen() {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [timeError, setTimeError] = useState(false);

  const reload = useCallback(async () => {
    setTasks(await listTasks(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const openNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setTimeError(false);
    setModalVisible(true);
  };

  const openEdit = (task: Task) => {
    setEditingId(task.id);
    setForm({
      title: task.title,
      category: task.category,
      emoji: task.emoji ?? '',
      timeLabel: task.time_min != null ? timeToLabel(task.time_min) : '',
      days: task.days,
      details: task.details ?? '',
      targetMinutes: task.target_minutes != null ? String(task.target_minutes) : '',
      remindEnabled: task.remind_enabled !== 0,
      remindBefore: task.remind_before,
    });
    setTimeError(false);
    setModalVisible(true);
  };

  const onSave = async () => {
    const title = form.title.trim();
    if (!title) return;

    const timeMin = form.timeLabel.trim() === '' ? null : labelToTimeMin(form.timeLabel);
    if (form.timeLabel.trim() !== '' && timeMin == null) {
      setTimeError(true);
      return;
    }
    setTimeError(false);

    const digits = form.targetMinutes.replace(/[^0-9]/g, '');
    const target =
      digits === '' ? null : Math.min(Math.max(1, Number(digits)), 12 * 60);

    const input = {
      title,
      category: form.category,
      emoji: form.emoji.trim() || null,
      time_min: timeMin,
      days: form.days,
      details: form.details.trim(),
      target_minutes: target,
      remind_enabled: form.remindEnabled ? 1 : 0,
      remind_before: form.remindBefore,
    };

    let savedId: number | undefined;
    if (editingId == null) {
      savedId = await createTask(db, input);
    } else {
      await updateTask(db, editingId, input);
      savedId = editingId;
    }

    if (savedId != null) {
      const task = await getTask(db, savedId);
      if (task) {
        await syncTaskReminder(db, task);
      }
    }

    setModalVisible(false);
    await reload();
  };

  const onDelete = async () => {
    if (editingId == null) return;
    const task = await getTask(db, editingId);
    await cancelTaskReminder(task?.notif_id ?? null);
    await deleteTask(db, editingId);
    setModalVisible(false);
    await reload();
  };

  const toggleDay = (i: number) => {
    const bit = 1 << i;
    setForm((f) => (f.days & bit ? { ...f, days: f.days & ~bit } : { ...f, days: f.days | bit }));
  };

  const daysLabel = (days: number): string => {
    if (days === ALL_DAYS_MASK) return 'Todos os dias';
    const labels = WEEKDAYS_SHORT.filter((_, i) => (days & (1 << i)) !== 0);
    return labels.length === 0 ? 'Nenhum dia' : labels.join(', ');
  };

  const renderTask = ({ item }: { item: Task }) => {
    const info = CATEGORY_MAP[item.category];
    const detailPreview = item.details?.trim().split('\n')[0] ?? '';
    return (
      <View style={styles.taskCard}>
        <View style={[styles.taskIcon, { backgroundColor: `${info.color}22` }]}>
          <Text style={styles.taskEmoji}>{emojiForTask(item.category, item.emoji)}</Text>
        </View>
        <View style={styles.taskBody}>
          <Text style={styles.taskTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.taskMeta}>
            {info.label}
            {item.time_min != null ? ` · ${timeToLabel(item.time_min)}` : ' · a qualquer hora'}
            {item.time_min != null
              ? item.remind_enabled
                ? ` · 🔔 ${item.remind_before} min antes`
                : ' · 🔕'
              : ''}
            {item.target_minutes != null ? ` · ⏱ ${item.target_minutes} min` : ''}
          </Text>
          {detailPreview && <Text style={styles.taskDetail} numberOfLines={1}>{detailPreview}</Text>}
          <View style={styles.daysPill}>
            <Text style={styles.daysPillText}>{daysLabel(item.days)}</Text>
          </View>
        </View>
        <View style={styles.taskActions}>
          <Pressable style={styles.smallButton} onPress={() => openEdit(item)}>
            <Text style={styles.smallButtonText}>Editar</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        keyExtractor={(t) => String(t.id)}
        renderItem={renderTask}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>A tua rotina está vazia</Text>
            <Text style={styles.emptyText}>
              Adiciona tarefas de oração, trabalho, treino e estudo para cuidares da tua criatura.
            </Text>
          </View>
        }
      />
      <Pressable style={styles.fab} onPress={openNew}>
        <Text style={styles.fabText}>+ Nova tarefa</Text>
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <ScrollView
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets
            >
              <Text style={styles.modalTitle}>
                {editingId == null ? 'Nova tarefa' : 'Editar tarefa'}
              </Text>

              <Text style={styles.label}>O quê?</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex.: Oração da manhã"
                placeholderTextColor={theme.subtext}
                value={form.title}
                onChangeText={(title) => setForm((f) => ({ ...f, title }))}
              />

              <Text style={styles.label}>Categoria</Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((c) => {
                  const active = form.category === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      style={[styles.categoryChip, active && { backgroundColor: c.color + '33', borderColor: c.color }]}
                      onPress={() => setForm((f) => ({ ...f, category: c.id }))}
                    >
                      <Text style={styles.categoryChipText}>
                        {c.emoji} {c.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Ícone (emoji) — opcional</Text>
              <TextInput
                style={styles.input}
                placeholder={`Deixa vazio para usar ${CATEGORY_MAP[form.category].emoji}`}
                placeholderTextColor={theme.subtext}
                value={form.emoji}
                onChangeText={(emoji) => setForm((f) => ({ ...f, emoji }))}
                maxLength={4}
              />
              <Text style={styles.hint}>
                Podes escolher qualquer emoji para representar esta tarefa.
              </Text>

              <Text style={styles.label}>{MINUTES_LABEL[form.category]}</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex.: 30"
                placeholderTextColor={theme.subtext}
                value={form.targetMinutes}
                onChangeText={(targetMinutes) => setForm((f) => ({ ...f, targetMinutes }))}
                keyboardType="number-pad"
              />
              <Text style={styles.hint}>
                Define isto para ativares o temporizador de foco na página Hoje.
              </Text>

              <Text style={styles.label}>Passos / detalhes</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder={DETAILS_PLACEHOLDER[form.category]}
                placeholderTextColor={theme.subtext}
                value={form.details}
                onChangeText={(details) => setForm((f) => ({ ...f, details }))}
                multiline
              />

              <Text style={styles.label}>Hora do lembrete (opcional)</Text>
              <TimeInput
                style={styles.input}
                placeholder="HH:MM — deixa vazio para qualquer hora"
                placeholderTextColor={theme.subtext}
                value={form.timeLabel}
                onChange={(label) => setForm((f) => ({ ...f, timeLabel: label }))}
              />
              {timeError && <Text style={styles.errorText}>Hora inválida. Usa o formato HH:MM.</Text>}

              <Text style={styles.label}>Lembrete de notificação</Text>
              <View style={styles.reminderRow}>
                {([
                  [true, '🔔 Receber notificação'],
                  [false, '🔕 Sem notificação'],
                ] as const).map(([on, label]) => {
                  const active = form.remindEnabled === on;
                  return (
                    <Pressable
                      key={String(on)}
                      style={[styles.remindPill, active && styles.remindPillActive]}
                      onPress={() => setForm((f) => ({ ...f, remindEnabled: on }))}
                    >
                      <Text style={[styles.remindPillText, active && styles.remindPillTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {form.remindEnabled &&
                (form.timeLabel.trim() !== '' ? (
                  <>
                    <Text style={styles.label}>Avisar quanto tempo antes?</Text>
                    <View style={styles.dayRow}>
                      {REMIND_BEFORE_OPTIONS.map((m) => {
                        const active = form.remindBefore === m;
                        return (
                          <Pressable
                            key={m}
                            style={[styles.dayChip, active && styles.dayChipActive]}
                            onPress={() => setForm((f) => ({ ...f, remindBefore: m }))}
                          >
                            <Text
                              style={[styles.dayChipText, active && styles.dayChipTextActive]}
                            >
                              {m} min
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : (
                  <Text style={styles.hint}>
                    A notificação será enviada X minutos antes — define uma hora acima para escolher.
                  </Text>
                ))}

              <Text style={styles.label}>Dias da semana</Text>
              <View style={styles.dayRow}>
                {WEEKDAYS_SHORT.map((day, i) => {
                  const active = (form.days & (1 << i)) !== 0;
                  return (
                    <Pressable
                      key={day}
                      style={[styles.dayChip, active && styles.dayChipActive]}
                      onPress={() => toggleDay(i)}
                    >
                      <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.modalActions}>
                <Pressable style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>
                <Pressable style={styles.saveButton} onPress={onSave}>
                  <Text style={styles.saveButtonText}>
                    {editingId == null ? 'Guardar' : 'Guardar alterações'}
                  </Text>
                </Pressable>
              </View>
              {editingId != null && (
                <Pressable style={styles.deleteButton} onPress={onDelete}>
                  <Text style={styles.deleteButtonText}>Eliminar tarefa</Text>
                </Pressable>
              )}
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 10,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    gap: 12,
  },
  taskIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskEmoji: {
    fontSize: 20,
  },
  taskBody: {
    flex: 1,
  },
  taskTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '600',
  },
  taskMeta: {
    color: theme.subtext,
    fontSize: 12,
    marginTop: 2,
  },
  taskDetail: {
    color: theme.subtext,
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  daysPill: {
    alignSelf: 'flex-start',
    backgroundColor: theme.cardAlt,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  daysPillText: {
    color: theme.subtext,
    fontSize: 11,
  },
  taskActions: {
    alignItems: 'flex-end',
  },
  smallButton: {
    backgroundColor: theme.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallButtonText: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 28,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyText: {
    color: theme.subtext,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: theme.primary,
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  fabText: {
    color: theme.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '92%',
  },
  modalScroll: {
    paddingBottom: 8,
  },
  modalTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  label: {
    color: theme.subtext,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 6,
  },
  hint: {
    color: theme.subtext,
    fontSize: 12,
    marginTop: 4,
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
  multiline: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.cardAlt,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  categoryChipText: {
    color: theme.text,
    fontSize: 13,
  },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 18,
    paddingHorizontal: 9,
    paddingVertical: 7,
    backgroundColor: theme.cardAlt,
  },
  dayChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  dayChipText: {
    color: theme.subtext,
    fontSize: 12,
    fontWeight: '600',
  },
  dayChipTextActive: {
    color: theme.onPrimary,
  },
  reminderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  remindPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.cardAlt,
  },
  remindPillActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  remindPillText: {
    color: theme.subtext,
    fontSize: 13,
    fontWeight: '600',
  },
  remindPillTextActive: {
    color: theme.onPrimary,
    fontWeight: '800',
  },
  errorText: {
    color: theme.danger,
    fontSize: 12,
    marginTop: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: theme.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  deleteButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  deleteButtonText: {
    color: theme.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  });