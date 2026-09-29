import { Platform } from 'react-native';

let Notifications: any = null;
if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');
}

// Android notification channel
export async function setupNotifications() {
  if (!Notifications) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('routine-reminders', {
      name: '루틴 알림',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D4537E',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('event-reminders', {
      name: '일정 알림',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#06B6D4',
      sound: 'default',
    });
  }
  return true;
}

// Request permission
export async function requestPermission(): Promise<boolean> {
  if (!Notifications) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Check permission status
export async function getPermissionStatus(): Promise<string> {
  if (!Notifications) return 'unavailable';
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

// Cancel all scheduled notifications
export async function cancelAllNotifications() {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Schedule routine reminders (AM/PM daily)
export async function scheduleRoutineReminders(
  amEnabled: boolean,
  pmEnabled: boolean,
  amTime: string, // "07:00"
  pmTime: string, // "21:00"
  routines: Array<{ name: string; time_slot: string; repeat_days: string }>
) {
  if (!Notifications) return;

  // Cancel existing routine notifications first
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier?.startsWith('routine-')) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  const amRoutines = routines.filter(r => r.time_slot === 'AM');
  const pmRoutines = routines.filter(r => r.time_slot === 'PM');

  if (amEnabled && amRoutines.length > 0) {
    const [h, m] = amTime.split(':').map(Number);
    const names = amRoutines.slice(0, 3).map(r => r.name).join(', ');
    const extra = amRoutines.length > 3 ? ` 외 ${amRoutines.length - 3}개` : '';

    await Notifications.scheduleNotificationAsync({
      identifier: 'routine-am',
      content: {
        title: '🌅 아침 루틴 시작!',
        body: `${names}${extra}`,
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: 'routine-reminders' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: h,
        minute: m,
      },
    });
  }

  if (pmEnabled && pmRoutines.length > 0) {
    const [h, m] = pmTime.split(':').map(Number);
    const names = pmRoutines.slice(0, 3).map(r => r.name).join(', ');
    const extra = pmRoutines.length > 3 ? ` 외 ${pmRoutines.length - 3}개` : '';

    await Notifications.scheduleNotificationAsync({
      identifier: 'routine-pm',
      content: {
        title: '🌙 저녁 루틴 시작!',
        body: `${names}${extra}`,
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: 'routine-reminders' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: h,
        minute: m,
      },
    });
  }
}

// Schedule event reminder (1 hour before)
export async function scheduleEventReminder(event: {
  id: string;
  title: string;
  date: string; // "2026-09-25"
  time: string; // "14:00"
  category: string;
}) {
  if (!Notifications) return;
  if (!event.time) return;

  // Cancel existing notification for this event
  try {
    await Notifications.cancelScheduledNotificationAsync(`event-${event.id}`);
  } catch {}

  const [year, month, day] = event.date.split('-').map(Number);
  const [hour, minute] = event.time.split(':').map(Number);

  // Reminder 1 hour before
  const eventDate = new Date(year, month - 1, day, hour, minute);
  const reminderDate = new Date(eventDate.getTime() - 60 * 60 * 1000);

  // Don't schedule if already past
  if (reminderDate.getTime() <= Date.now()) return;

  const catEmoji = event.category === 'salon' ? '💇‍♀️' : event.category === 'clinic' ? '🏥' : '🎸';

  await Notifications.scheduleNotificationAsync({
    identifier: `event-${event.id}`,
    content: {
      title: `${catEmoji} 1시간 후 일정`,
      body: `${event.title} - ${event.time}`,
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: 'event-reminders' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
    },
  });
}

// Cancel event reminder
export async function cancelEventReminder(eventId: string) {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`event-${eventId}`);
  } catch {}
}

// Reschedule all notifications (call after settings change or app open)
export async function rescheduleAll(dbFns: any) {
  if (!Notifications) return;

  const hasPermission = await requestPermission();
  if (!hasPermission) return;

  await setupNotifications();

  const amNotif = await dbFns.getSetting('am_notif');
  const pmNotif = await dbFns.getSetting('pm_notif');
  const amTime = (await dbFns.getSetting('am_time')) || '07:00';
  const pmTime = (await dbFns.getSetting('pm_time')) || '21:00';
  const routines = await dbFns.getAllRoutines();

  await scheduleRoutineReminders(
    amNotif === '1',
    pmNotif === '1',
    amTime,
    pmTime,
    routines
  );

  // Schedule upcoming events
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  try {
    const db = dbFns.getDB();
    const events = await db.getAllAsync(
      'SELECT * FROM beauty_events WHERE date >= ? ORDER BY date, time',
      [todayStr]
    );
    for (const ev of events) {
      await scheduleEventReminder(ev);
    }
  } catch {}
}
