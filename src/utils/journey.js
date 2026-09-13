// "1 сарын аялал" — апп нь 30 хоногийн хөтөлбөр хэлбэрээр ажилладаг
// (PLAN_V2 §6). Хэрэглэгч эхэлснээсээ хойш хэдэн дэх өдөртөө явааг нэг
// харцаар мэдэрч, 30 хоног дуусахад дүгнэлт хийж шинэ мөчлөг эхлүүлнэ.
export const JOURNEY_LENGTH = 30;

const parseKey = (dateKey) => {
  if (typeof dateKey !== 'string') return null;
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

// Firestore Timestamp / Date / ISO string → 'YYYY-MM-DD'
export const toDateKey = (value) => {
  if (!value) return null;
  let date = null;
  if (typeof value?.toDate === 'function') date = value.toDate();
  else if (value instanceof Date) date = value;
  else if (typeof value === 'string') date = new Date(value);
  if (!date || Number.isNaN(date.getTime())) return null;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

// Мөчлөгийн эхлэл: сүүлд "шинэ сар эхлүүлэх" дарсан өдөр, эс бөгөөс бүлэг
// үүсгэсэн өдөр. Аль нь ч байхгүй бол өнөөдөр (шинэ хэрэглэгч → 1 дэх өдөр).
export const getCycleStartKey = (familyProfile, todayKey) => (
  familyProfile?.cycleStartKey
  || toDateKey(familyProfile?.createdAt)
  || todayKey
  || null
);

// 1-ээс эхэлсэн өдрийн дугаар. Ирээдүйн огноо эсвэл эвдэрсэн утга орж
// ирвэл 1 болно — дэлгэц дээр хэзээ ч 0 эсвэл сөрөг тоо харагдахгүй.
export const getJourneyDay = (startKey, todayKey) => {
  const start = parseKey(startKey);
  const today = parseKey(todayKey);
  if (!start || !today) return 1;
  const diff = Math.round((today - start) / 86400000) + 1;
  if (!Number.isFinite(diff) || diff < 1) return 1;
  return diff;
};

// Дэлгэцэд хэрэгтэй бүх утгыг нэг дор.
export const getJourneyState = (familyProfile, todayKey) => {
  const startKey = getCycleStartKey(familyProfile, todayKey);
  const day = getJourneyDay(startKey, todayKey);
  const complete = day >= JOURNEY_LENGTH;
  return {
    startKey,
    day,
    total: JOURNEY_LENGTH,
    // Полосын дүүргэлт — 30 хоногоос хэтэрсэн ч 100%-аас дээш гарахгүй.
    percent: Math.min(Math.round((day / JOURNEY_LENGTH) * 100), 100),
    // Үлдсэн хоног (дууссан бол 0).
    remaining: Math.max(JOURNEY_LENGTH - day, 0),
    complete,
  };
};
