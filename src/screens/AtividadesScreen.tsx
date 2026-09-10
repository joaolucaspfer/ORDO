import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { PressableScale as Pressable } from '../components/PressableScale';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, type Theme } from '../theme';
import { timeToLabel, WEEKDAYS_SHORT, ALL_DAYS_MASK } from '../lib/dates';
import { CATEGORY_MAP, emojiForTask, type Category } from '../lib/categories';
import { tasksOnDay } from '../db/tasks';
import type { Task } from '../db/types';

const FILTER_CATEGORIES: { key: Category | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: 'Todas', emoji: '📋' },
  { key: 'study', label: 'Estudos', emoji: '📚' },
  { key: 'work', label: 'Trabalho', emoji: '💼' },
  { key: 'other', label: 'Outras', emoji: '📌' },
];

function daysLabel(days: number): string {
  if (days === ALL_DAYS_MASK) return 'Todos os dias';
  const labels = WEEKDAYS_SHORT.filter((_, i) => (days & (1 << i)) !== 0);
  return labels.length === 0 ? '—' : labels.join(', ');
}

export default function AtividadesScreen() {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Category | 'all'>('all');

  const reload = useCallback(async () => {
    const all: Task[] = [];
    for (let day = 0; day <= 6; day++) {
      const dayTasks = await tasksOnDay(db, day);
      for (const t of dayTasks) {
        if (!all.find((x) => x.id === t.id)) all.push(t);
      }
    }
    setTasks(all);
  }, [db]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const filtered = filter === 'all'
    ? tasks.filter((t) => t.category === 'study' || t.category === 'work' || t.category === 'other')
    : tasks.filter((t) => t.category === filter);

  const grouped: Record<string, Task[]> = {};
  for (const t of filtered) {
    const cat = CATEGORY_MAP[t.category];
    const label = cat.label;
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(t);
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {FILTER_CATEGORIES.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterEmoji]}>{f.emoji}</Text>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={Object.keys(grouped)}
        keyExtractor={(k) => k}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>
              {filter === 'all'
                ? 'Não tens tarefas de estudo, trabalho ou outras.\nCria na aba Rotina.'
                : `Não tens tarefas de ${CATEGORY_MAP[filter].label.toLowerCase()}.\nCria na aba Rotina.`}
            </Text>
          </View>
        }
        renderItem={({ item: catLabel }) => {
          const items = grouped[catLabel];
          const cat = items[0]?.category ?? 'other';
          const info = CATEGORY_MAP[cat];
          return (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: `${info.color}22` }]}>
                  <Text style={styles.sectionEmoji}>{info.emoji}</Text>
                </View>
                <Text style={styles.sectionTitle}>{catLabel}</Text>
                <Text style={styles.sectionCount}>{items.length}</Text>
              </View>
              {items.map((task) => (
                <View key={task.id} style={styles.taskCard}>
                  <View style={styles.taskBody}>
                    <View style={styles.taskTitleRow}>
                      <Text style={styles.taskEmoji}>{emojiForTask(task.category, task.emoji)}</Text>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                    </View>
                    <View style={styles.taskMeta}>
                      {task.time_min != null && (
                        <Text style={styles.taskTime}>🕐 {timeToLabel(task.time_min)}</Text>
                      )}
                      <Text style={styles.taskDays}>📅 {daysLabel(task.days)}</Text>
                      {task.target_minutes != null && (
                        <Text style={styles.taskDuration}>⏱ {task.target_minutes} min</Text>
                      )}
                    </View>
                    {task.details ? (
                      <Text style={styles.taskDetails} numberOfLines={2}>{task.details}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          );
        }}
      />
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    filterChipActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    filterEmoji: { fontSize: 14 },
    filterText: { color: theme.text, fontSize: 13, fontWeight: '700' },
    filterTextActive: { color: theme.onPrimary },
    list: { padding: 16, paddingBottom: 40, gap: 16 },
    section: { gap: 8 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sectionIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionEmoji: { fontSize: 16 },
    sectionTitle: { flex: 1, color: theme.text, fontSize: 16, fontWeight: '800' },
    sectionCount: { color: theme.subtext, fontSize: 13, fontWeight: '700' },
    taskCard: {
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
    },
    taskBody: { gap: 4 },
    taskTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    taskEmoji: { fontSize: 16 },
    taskTitle: { flex: 1, color: theme.text, fontSize: 15, fontWeight: '700' },
    taskMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    taskTime: { color: theme.primary, fontSize: 12, fontWeight: '700' },
    taskDays: { color: theme.subtext, fontSize: 12 },
    taskDuration: { color: theme.subtext, fontSize: 12 },
    taskDetails: { color: theme.subtext, fontSize: 12, marginTop: 4, lineHeight: 16 },
    empty: {
      alignItems: 'center',
      padding: 28,
      gap: 12,
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    emptyEmoji: { fontSize: 44 },
    emptyText: { color: theme.subtext, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  });