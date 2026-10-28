import { formatDateKey } from './dates';

// "2300" / "23:0" / "7" зэрэг гараар бичсэн утгыг "HH:MM" хэлбэрт ойртуулна.
export const formatTimeInput = (value) => {
  const digits = String(value || '').replace(/[^0-9]/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

const toMinutes = (hhmm) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
};

// Унтсан → сэрсэн хоорондох нойр (цаг, 0.1-ээр). Шөнө дундыг давж болно
// (23:00 → 07:00 = 8 цаг). Хоёр цаг хоёулаа хүчинтэй биш бол null.
export const calcSleepHours = (bedTime, wakeTime) => {
  const bed = toMinutes(bedTime);
  const wake = toMinutes(wakeTime);
  if (bed === null || wake === null) return null;
  const minutes = (wake - bed + 1440) % 1440;
  return minutes === 0 ? null : Math.round((minutes / 60) * 10) / 10;
};

export const formatHours = (hours) => {
  const total = Math.round(Math.abs(hours) * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} ц ${m} мин` : `${h} цаг`;
};

// Сүүлийн `days` хоногийн нойрны тойм: бүртгэсэн шөнө, дундаж, нийт алдагдал
// (goodRange-ийн доод хязгаараас дутсан цагийн нийлбэр), сайн унтсан шөнө.
export const getSleepSummary = ({ dailyLogs, memberId, taskId, goodRange, days = 30 }) => {
  if (!memberId || !taskId || !Array.isArray(goodRange)) return null;
  const nights = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const hours = Number(dailyLogs?.[formatDateKey(date)]?.[memberId]?.tasks?.[taskId]?.hoursValue);
    if (Number.isFinite(hours) && hours > 0) nights.push(hours);
  }
  if (!nights.length) return { nights: 0, goodRange };
  const [min] = goodRange;
  return {
    nights: nights.length,
    goodRange,
    average: Math.round((nights.reduce((sum, h) => sum + h, 0) / nights.length) * 10) / 10,
    debt: Math.round(nights.reduce((sum, h) => sum + Math.max(min - h, 0), 0) * 10) / 10,
    goodNights: nights.filter((h) => h >= min).length,
  };
};
