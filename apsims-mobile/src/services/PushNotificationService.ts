/**
 * APSIMS Push Notification Service
 * Handles Expo Push Notifications for fee alerts, results, homework reminders
 * Works with expo-notifications (already installed in package.json)
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

/* ═══ Config ═══ */
const PUSH_TOKEN_KEY = 'apsims_push_token';
const NOTIF_PREFS_KEY = 'apsims_notif_prefs';

export interface NotifPrefs {
  feeReminders: boolean;
  newResults: boolean;
  attendance: boolean;
  announcements: boolean;
  homework: boolean;
  disciplineAlerts: boolean;
}

export const DEFAULT_PREFS: NotifPrefs = {
  feeReminders: true,
  newResults: true,
  attendance: true,
  announcements: true,
  homework: true,
  disciplineAlerts: false,
};

/* ═══ Setup handler BEFORE mounting ═══ */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/* ═══════════════════════════════════════════════
   1. REGISTER FOR PUSH NOTIFICATIONS
═══════════════════════════════════════════════ */
export async function registerForPushNotifications(userId?: number, userRole?: string): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.warn('Push notifications only work on physical devices');
      return null;
    }

    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission denied');
      return null;
    }

    // Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('apsims-default', {
        name: 'APSIMS Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4f46e5',
        sound: 'default',
      });
      await Notifications.setNotificationChannelAsync('apsims-fees', {
        name: 'Fee Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#dc2626',
        sound: 'default',
      });
      await Notifications.setNotificationChannelAsync('apsims-results', {
        name: 'Academic Results',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#059669',
        sound: 'default',
      });
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID || undefined,
    });
    const token = tokenData.data;

    // Cache locally
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

    // Save to Supabase for server-side push
    if (userId) {
      await supabase.from('school_push_tokens').upsert({
        user_id: userId,
        push_token: token,
        platform: Platform.OS,
        role: userRole || 'unknown',
        device_name: Device.deviceName || 'Unknown Device',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }

    console.log('✅ Push token registered:', token.slice(0, 30) + '…');
    return token;
  } catch (error) {
    console.error('Push registration error:', error);
    return null;
  }
}

/* ═══════════════════════════════════════════════
   2. SEND LOCAL NOTIFICATION (immediate, on-device)
═══════════════════════════════════════════════ */
export async function sendLocalNotification({
  title,
  body,
  data = {},
  channel = 'apsims-default',
  delay = 0,
}: {
  title: string;
  body: string;
  data?: Record<string, any>;
  channel?: string;
  delay?: number;
}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: channel } : {}),
    },
    trigger: delay > 0 ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delay, repeats: false } : null,
  });
}

/* ═══════════════════════════════════════════════
   3. PRE-BUILT NOTIFICATION TEMPLATES
═══════════════════════════════════════════════ */

/** Fee balance alert */
export async function notifyFeeBalance(studentName: string, balance: number, dueDate?: string) {
  const prefs = await getNotifPrefs();
  if (!prefs.feeReminders) return;
  await sendLocalNotification({
    title: '💳 Fee Balance Reminder',
    body: `${studentName} has an outstanding balance of KES ${balance.toLocaleString('en-KE')}${dueDate ? ` due by ${dueDate}` : ''}. Pay via M-Pesa now.`,
    data: { type: 'fee_reminder', balance },
    channel: 'apsims-fees',
  });
}

/** New results published */
export async function notifyNewResults(studentName: string, subject: string, score: number, grade: string) {
  const prefs = await getNotifPrefs();
  if (!prefs.newResults) return;
  await sendLocalNotification({
    title: '📊 New Results Published',
    body: `${studentName} scored ${score}% (Grade ${grade}) in ${subject}. Tap to view full report card.`,
    data: { type: 'results', subject, score, grade },
    channel: 'apsims-results',
  });
}

/** Bulk results: term results ready */
export async function notifyTermResultsReady(termName: string, avgScore: number, position: number, total: number) {
  const prefs = await getNotifPrefs();
  if (!prefs.newResults) return;
  await sendLocalNotification({
    title: `🎓 ${termName} Results Ready`,
    body: `Average: ${avgScore.toFixed(1)}% | Position: ${position} of ${total} students. Tap to view your report card.`,
    data: { type: 'term_results', termName, avgScore },
    channel: 'apsims-results',
  });
}

/** Homework reminder */
export async function notifyHomeworkReminder(subject: string, dueDate: string, teacherName?: string) {
  const prefs = await getNotifPrefs();
  if (!prefs.homework) return;
  await sendLocalNotification({
    title: '📝 Homework Reminder',
    body: `${subject} homework due ${dueDate}${teacherName ? ` (${teacherName})` : ''}. Don't forget to submit!`,
    data: { type: 'homework', subject, dueDate },
  });
}

/** School announcement */
export async function notifyAnnouncement(title: string, message: string, priority: 'high' | 'normal' = 'normal') {
  const prefs = await getNotifPrefs();
  if (!prefs.announcements) return;
  await sendLocalNotification({
    title: priority === 'high' ? `🚨 ${title}` : `📢 ${title}`,
    body: message,
    data: { type: 'announcement', priority },
    channel: priority === 'high' ? 'apsims-fees' : 'apsims-default',
  });
}

/** Attendance alert */
export async function notifyAbsence(studentName: string, date: string, period?: string) {
  const prefs = await getNotifPrefs();
  if (!prefs.attendance) return;
  await sendLocalNotification({
    title: '⚠️ Absence Recorded',
    body: `${studentName} was marked absent${period ? ` during ${period}` : ''} on ${date}. Please contact the school if this is an error.`,
    data: { type: 'attendance', date },
    channel: 'apsims-fees',
  });
}

/** M-Pesa payment confirmed */
export async function notifyPaymentConfirmed(amount: number, mpesaRef: string, newBalance: number) {
  await sendLocalNotification({
    title: '✅ Payment Confirmed',
    body: `KES ${amount.toLocaleString('en-KE')} received. M-Pesa Ref: ${mpesaRef}. New balance: KES ${newBalance.toLocaleString('en-KE')}.`,
    data: { type: 'payment_confirmed', amount, mpesaRef },
    channel: 'apsims-results',
  });
}

/** STK push triggered */
export async function notifySTKPushSent(amount: number, phone: string) {
  await sendLocalNotification({
    title: '📲 M-Pesa Request Sent',
    body: `Enter your M-Pesa PIN to complete payment of KES ${amount.toLocaleString('en-KE')} on ${phone}. Request expires in 2 minutes.`,
    data: { type: 'stk_push', amount },
    delay: 1,
  });
}

/* ═══════════════════════════════════════════════
   4. NOTIFICATION PREFERENCES
═══════════════════════════════════════════════ */
export async function getNotifPrefs(): Promise<NotifPrefs> {
  try {
    const stored = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
    return stored ? { ...DEFAULT_PREFS, ...JSON.parse(stored) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function saveNotifPrefs(prefs: Partial<NotifPrefs>): Promise<void> {
  const current = await getNotifPrefs();
  await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
}

/* ═══════════════════════════════════════════════
   5. NOTIFICATION LISTENER SETUP (call in App.tsx)
═══════════════════════════════════════════════ */
export function setupNotificationListeners(onNotification?: (notif: Notifications.Notification) => void, onResponse?: (response: Notifications.NotificationResponse) => void) {
  // Received while app is open
  const receivedSub = Notifications.addNotificationReceivedListener(notif => {
    console.log('📩 Notification received:', notif.request.content.title);
    onNotification?.(notif);
  });

  // User tapped notification
  const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as any;
    console.log('👆 Notification tapped:', data?.type);
    onResponse?.(response);
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}

/* ═══════════════════════════════════════════════
   6. BADGE MANAGEMENT
═══════════════════════════════════════════════ */
export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge() {
  await Notifications.setBadgeCountAsync(0);
}

export async function getPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}
