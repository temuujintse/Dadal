export const POINTS_BY_DIFFICULTY = {
  easy: 5,
  normal: 10,
  hard: 20,
  bonus: 30,
};

export const defaultNotificationSettings = { enabled: false, hour: 20, minute: 30 };

// Тоон утгыг аюулгүй хөрвүүлнэ. `value || fallback` хэрэглэвэл 0 нь falsy учраас
// default рүү үсэрдэг — үүнээс сэргийлж зөвхөн бодитоор хоосон/буруу утга дээр
// fallback руу шилжинэ. (null, undefined, '' болон NaN → fallback; 0 → 0.)
const toNumber = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const normalizeTask = (rawTask, index = 0) => {
  // Firestore-оос ирсэн хуучин/корrupt өгөгдөл дотор null, эсвэл object биш
  // элемент орж ирвэл task.id уншихад апп шууд crash хийдэг байсан —
  // хоосон task болгон хувиргаад үргэлжлүүлнэ.
  const task = rawTask && typeof rawTask === 'object' ? rawTask : {};
  return {
    id: String(task.id || `task_${Date.now()}_${index}`),
    text: task.text || '',
    note: task.note || '',
    hasInput: Boolean(task.hasInput),
    inputPlaceholder: task.inputPlaceholder || 'Тэмдэглэл',
    inputSuffix: task.inputSuffix || '',
    options: Array.isArray(task.options) ? task.options : [],
    timerMinutes: toNumber(task.timerMinutes, 0),
    frequency: task.frequency || 'Өдөр бүр',
    category: task.category || 'general',
    difficulty: task.difficulty || 'normal',
    // Өмнө нь `Number(task.points || DEFAULT)` байсан тул 0 оноо оруулахад чимээгүй
    // 10 (эсвэл difficulty-ийн default) болж хувирдаг байв.
    points: toNumber(task.points, toNumber(POINTS_BY_DIFFICULTY[task.difficulty || 'normal'], 10)),
    required: task.required !== false,
  };
};

export const getBaseTasks = (isKid = false) => [
  normalizeTask({ id: 'wake_sleep', text: 'Эрт сэрэх, нойр сайн авах', note: isKid ? '10-11 цагийн нойр авах' : '7-8 цагийн нойр авах', hasInput: true, inputPlaceholder: 'Сэрсэн цаг?', category: 'health', points: 10, required: true }),
  normalizeTask({ id: 'morning_water', text: 'Өглөө бүлээн ус уух', hasInput: true, inputPlaceholder: 'Уусан цаг?', category: 'health', points: 5, difficulty: 'easy', required: true }),
  normalizeTask({ id: 'english_reading', text: 'Ном унших / Англи хэл', note: '10-15 минут', timerMinutes: 15, hasInput: true, inputPlaceholder: 'Хэдэн минут?', category: 'learning', points: 20, difficulty: 'hard', required: true }),
  normalizeTask({ id: 'mongolian_reading', text: 'Монгол ном унших', note: '10-15 минут', timerMinutes: 15, hasInput: true, inputPlaceholder: 'Хэдэн минут?', category: 'learning', points: 15, required: false }),
  normalizeTask({ id: 'exercise', text: 'Дасгал хийх 15-20 минут', options: ['Алхах', 'Гүйх', 'Дугуй унах'], timerMinutes: 20, category: 'health', points: 20, difficulty: 'hard', required: true }),
  normalizeTask({ id: 'breakfast', text: 'Өглөөний цай сайн уух', note: 'Ислэг, уураглаг бүтээгдэхүүн хэрэглэх', hasInput: true, inputPlaceholder: 'Цаг?', category: 'nutrition', points: 10, required: true }),
  normalizeTask({ id: 'vitamins', text: 'Эрдэс витамин хэрэглэх', hasInput: true, inputPlaceholder: 'Тэмдэглэл', category: 'health', points: 5, difficulty: 'easy', required: false }),
  normalizeTask({ id: 'meal_prep', text: 'Хоол хийх / бэлдэх', options: ['Өдрийн хоол хийх', 'Оройн хоол бэлдэх', 'Маргаашийн хоолоо бэлдэх'], hasInput: true, inputPlaceholder: 'Цаг?', category: 'home', points: 15, required: false }),
  normalizeTask({ id: 'ielts_listening', text: 'IELTS сонсох / давтах', note: 'Давтаж унших, цээжлэх', timerMinutes: 30, category: 'learning', points: 20, difficulty: 'hard', required: false }),
  normalizeTask({ id: 'history', text: 'Түүх сонсох, уншиж судлах', timerMinutes: 20, category: 'learning', points: 10, required: false }),
  normalizeTask({ id: 'calm', text: 'Уурлахгүй байх тал дээр ажиллах', note: 'Тэвчээртэй байх', hasInput: true, inputPlaceholder: 'Сэтгэл зүйгээ бичих', category: 'mindset', points: 15, required: true }),
  normalizeTask({ id: 'work', text: 'Ажлаа хийх', note: 'Ажилласан цагаа бүртгэх', hasInput: true, inputPlaceholder: 'Зарцуулсан цаг?', inputSuffix: 'цаг', category: 'work', points: 20, required: false }),
  normalizeTask({ id: 'daily_water', text: 'Өдөрт 2 литр ус уух', hasInput: true, inputPlaceholder: 'Хэмжээ?', category: 'health', points: 10, required: true }),
  normalizeTask({ id: 'stocks', text: 'Хувьцаа судлах', note: '20-30 минут', timerMinutes: 20, category: 'learning', points: 15, required: false }),
  normalizeTask({ id: 'sports', text: 'Спортоор хичээллэх', options: ['Сагс тоглох', 'Бокс', 'Усанд сэлэх'], frequency: '7 хоногт 3 удаа', category: 'health', points: 20, required: false }),
  normalizeTask({ id: 'family_time', text: 'Орой гэр бүлээрээ тоглох / цаг өнгөрүүлэх', options: ['Хөзөр тоглох', 'Спорт тоглоом', 'Кино үзэх', 'Алхах'], frequency: 'Сард 4 удаа', category: 'family', points: 30, difficulty: 'bonus', required: false }),
  normalizeTask({ id: 'hygiene', text: 'Оройн арчилгаа, ариун цэвэр', options: ['Нүүрээ цэвэрлэх', 'Шүд угаах', 'Усанд орох'], category: 'health', points: 10, required: true }),
  normalizeTask({ id: 'early_sleep', text: 'Орой эрт унтах', note: '21:40-23:00 өмнө', hasInput: true, inputPlaceholder: 'Унтсан цаг?', category: 'health', points: 15, required: true }),
];
