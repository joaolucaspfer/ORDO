import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Task } from '../db/types';
import { getTask, setTaskNotifId } from '../db/tasks';
import { CATEGORY_MAP } from './categories';

type NotificationsModule = typeof import('expo-notifications');

declare const require: (specifier: string) => NotificationsModule;

const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

let notificationsModule: NotificationsModule | null | undefined;

function getNotifications(): NotificationsModule | null {
  if (notificationsModule !== undefined) return notificationsModule;
  if (IS_EXPO_GO) {
    notificationsModule = null;
    return null;
  }
  try {
    notificationsModule = require('expo-notifications');
  } catch {
    notificationsModule = null;
  }
  return notificationsModule;
}

export async function ensureNotificationSetup(): Promise<boolean> {
  try {
    const Notifications = getNotifications();
    if (!Notifications) return false;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('routine', {
        name: 'Lembretes da rotina',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

export async function cancelTaskReminder(existingId: string | null): Promise<void> {
  if (!existingId) return;
  const Notifications = getNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(existingId);
  } catch {
    // recurso já não existe; ok
  }
}

async function scheduleTaskReminder(task: Task): Promise<string | null> {
  if (task.time_min == null || !task.remind_enabled) return null;
  const Notifications = getNotifications();
  if (!Notifications) return null;

  const granted = await ensureNotificationSetup();
  if (!granted) return null;

  const raw = task.time_min - task.remind_before;
  const triggerMin = ((raw % 1440) + 1440) % 1440;
  const hour = Math.floor(triggerMin / 60);
  const minute = triggerMin % 60;
  const category = CATEGORY_MAP[task.category];
  const durationText = task.target_minutes != null ? ` · ${task.target_minutes} min` : '';

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ ${task.title}`,
        body: `${category.label}${durationText} começa em ${task.remind_before} min — o teu cão espera por ti!`,
        sound: true,
        data: { taskId: task.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        channelId: 'routine',
        hour,
        minute,
      },
    });
  } catch {
    return null;
  }
}

export async function syncTaskReminder(
  db: SQLiteDatabase,
  task: Task
): Promise<void> {
  await cancelTaskReminder(task.notif_id);
  const newId = task.time_min != null ? await scheduleTaskReminder(task) : null;
  await setTaskNotifId(db, task.id, newId);
}

export async function resyncTaskReminderById(
  db: SQLiteDatabase,
  taskId: number
): Promise<void> {
  const task = await getTask(db, taskId);
  if (task) {
    await syncTaskReminder(db, task);
  }
}

export async function testNotification(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;
  const granted = await ensureNotificationSetup();
  if (!granted) return false;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Ordo 🐶',
        body: 'As notificações estão a funcionar!',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3,
        channelId: 'routine',
      },
    });
    return true;
  } catch {
    return false;
  }
}