import { Platform } from 'react-native';

let Notifications = null;
try {
  Notifications = require('expo-notifications');
} catch {
  Notifications = null;
}

// Апп нээлттэй (foreground) байхад мэдэгдлийг харуулах эсэхийг энэ handler шийддэг.
// Үүнийг огт тохируулаагүй байсан тул товлосон 08:00 болон оройн сануулга апп
// нээлттэй үед ЧИМЭЭГҮЙ алгасагддаг байв. SDK 54 (expo-notifications 0.32)-д хуучин
// shouldShowAlert талбар deprecated болсон тул shouldShowBanner / shouldShowList хэрэглэнэ.
if (Notifications?.setNotificationHandler) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const scheduleFriendlyReminder = async ({ title, body, hour, minute }) => Notifications.scheduleNotificationAsync({
  content: { title, body, sound: true },
  trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: 'family-habits' },
});

export async function scheduleDailyHabitReminder({ hour = 20, minute = 30, morningHour = 8, morningMinute = 0 } = {}) {
  if (!Notifications) return { ok: false, code: 'MODULE_MISSING', reason: 'expo-notifications суулгаагүй байна' };
  const permission = await Notifications.requestPermissionsAsync();
  // Зөвшөөрөл олгогдоогүй бол НИГ ялгах кодтой буцаана — дуудагч нь энэ
  // утгыг үл тоомсорлож enabled:true гэж cloud/local дээр хадгалж болохгүй.
  if (permission.status !== 'granted') {
    return { ok: false, code: 'PERMISSION_DENIED', reason: 'notification permission denied' };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('family-habits', {
      name: 'Family Habit reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 120],
    });
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
  await scheduleFriendlyReminder({
    title: 'Өглөөний мэнд, гэр бүл ээ ☀️',
    body: 'Өнөөдрийн нэг жижиг дадлаа сонгоод өдрөө сайхан эхлүүлээрэй.',
    hour: morningHour,
    minute: morningMinute,
  });

  if (hour !== morningHour || minute !== morningMinute) {
    await scheduleFriendlyReminder({
      title: 'Өнөөдрийн ялалтаа тэмдэглэе 🌙',
      body: 'Хийсэн дадлуудаа check хийгээд гэр бүлийн оноогоо нэмээрэй.',
      hour,
      minute,
    });
  }

  return { ok: true };
}

export async function cancelHabitReminders() {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
