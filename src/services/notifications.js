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

const scheduleFriendlyReminder = async ({ title, body, hour, minute, channelId = 'family-habits' }) => Notifications.scheduleNotificationAsync({
  content: { title, body, sound: true },
  trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId },
});

// Өдөрт 5 удаа, сэрүүн цагийн туршид тархсан ус уух сануулга. Одоохондоо
// цагийг нь хэрэглэгчээр өөрчлүүлэхгүй, зөвхөн асаах/унтраах л боломжтой —
// тогтмол цагийн жагсаалт хамгийн энгийн бөгөөд найдвартай хувилбар.
const WATER_REMINDER_TIMES = [
  { hour: 10, minute: 0 },
  { hour: 12, minute: 30 },
  { hour: 15, minute: 0 },
  { hour: 17, minute: 30 },
  { hour: 19, minute: 30 },
];

const WATER_MESSAGES = [
  'Нэг аяга ус уухаа мартчихсан биз ээ? 💧',
  'Бага зуур зогсоод ус аягалаарай 💧',
  'Биед чинь ус хэрэгтэй байна — цэнэглэе 💧',
  'Ус уух цаг боллоо, гэр бүлээрээ сануулцгаая 💧',
  'Өдрийн эцсийн ус уулт — өнөөдрийн зорилтоо биелүүлээрэй 💧',
];

// Гэрээ: { ok:true } эсвэл { ok:false, code, reason }. Дуудагч тал
// (useFamilyData.saveNotificationSettings) code-ыг шалгаж, enabled:true-г
// зөвшөөрөл татгалзсан үед ч local/cloud-д бичихээс сэргийлнэ.
//
// habit болон water хоёр төрлийн сануулгыг ЭНД НЭГ дор дахин товлоно —
// учир нь expo-notifications-д "зөвхөн нэг төрлийг цуцлах" API байхгүй,
// cancelAllScheduledNotificationsAsync нь БҮГДИЙГ арилгадаг. Тиймээс аль
// нэгийг нь асаах/унтраахад ХОЁУЛАНГ нь одоогийн тохиргооноос нь дахин
// барина — эс тэгвэл нэгийг унтраахад нөгөөг санамсаргүй устгачихна.
export async function applyNotificationSettings({ habit, water } = {}) {
  if (!Notifications) return { ok: false, code: 'MODULE_MISSING', reason: 'expo-notifications суулгаагүй байна' };

  const wantsAny = Boolean(habit?.enabled) || Boolean(water?.enabled);
  if (wantsAny) {
    const permission = await Notifications.requestPermissionsAsync();
    if (permission.status !== 'granted') {
      return { ok: false, code: 'PERMISSION_DENIED', reason: 'notification permission denied' };
    }
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('family-habits', {
      name: 'Family Habit reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 120],
    });
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  if (habit?.enabled) {
    const morningHour = habit.morningHour ?? 8;
    const morningMinute = habit.morningMinute ?? 0;
    await scheduleFriendlyReminder({
      title: 'Өглөөний мэнд, гэр бүл ээ ☀️',
      body: 'Өнөөдрийн нэг жижиг дадлаа сонгоод өдрөө сайхан эхлүүлээрэй.',
      hour: morningHour,
      minute: morningMinute,
    });
    if (habit.hour !== morningHour || habit.minute !== morningMinute) {
      await scheduleFriendlyReminder({
        title: 'Өнөөдрийн ялалтаа тэмдэглэе 🌙',
        body: 'Хийсэн дадлуудаа check хийгээд гэр бүлийн оноогоо нэмээрэй.',
        hour: habit.hour,
        minute: habit.minute,
      });
    }
  }

  if (water?.enabled) {
    await Promise.all(WATER_REMINDER_TIMES.map((time, index) => scheduleFriendlyReminder({
      title: 'Ус уух цаг 💧',
      body: WATER_MESSAGES[index % WATER_MESSAGES.length],
      hour: time.hour,
      minute: time.minute,
    })));
  }

  return { ok: true };
}

export async function cancelHabitReminders() {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
