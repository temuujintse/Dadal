export const POINTS_BY_DIFFICULTY = {
  easy: 5,
  normal: 10,
  hard: 20,
  bonus: 30,
};

export const defaultNotificationSettings = { enabled: false, hour: 20, minute: 30, water: false };

// Тоон утгыг аюулгүй хөрвүүлнэ. `value || fallback` хэрэглэвэл 0 нь falsy учраас
// default рүү үсэрдэг — үүнээс сэргийлж зөвхөн бодитоор хоосон/буруу утга дээр
// fallback руу шилжинэ. (null, undefined, '' болон NaN → fallback; 0 → 0.)
const toNumber = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// Дадлын дэлгэрэнгүй хэсэг ЯМАР хэлбэртэй байхыг заана. Өмнө нь бүх дадал
// `hasInput: true` + чөлөөт текст талбартай байсан тул "хэдэн цаг унтсан",
// "хэдэн аяга ус уусан", "хэдэн цагт хийсэн" бүгд ЯГ ижил хоосон нүд болж
// харагддаг байв — хэрэглэгч юу бичихээ мэдэхгүй, ихэнх нь хоосон үлддэг.
//
//   hours    → 1-12 цагийн сонголт (нойр)        → hoursValue
//   count    → − N + тоолуур (аяга ус)           → countValue
//   duration → таймер (дасгал, унших)            → timerMinutes / таймер
//   options  → чипс сонголт                      → selectedOptions
//   text     → чөлөөт текст (хуучин зан төлөв)   → inputValue
//   none     → дэлгэрэнгүй хэсэггүй
export const DETAIL_TYPES = ['hours', 'count', 'duration', 'options', 'text', 'none'];

// Хуучин (Firestore-д хадгалагдсан) дадалд detailType талбар БАЙХГҮЙ тул
// одоо байгаа талбаруудаас нь дүгнэж өгнө — migration шаардлагагүй.
const inferDetailType = (task) => {
  if (DETAIL_TYPES.includes(task.detailType)) return task.detailType;
  if (toNumber(task.timerMinutes, 0) > 0) return 'duration';
  if (Array.isArray(task.options) && task.options.length) return 'options';
  if (task.hasInput) return 'text';
  return 'none';
};

// ── Хуучин (legacy) Firestore баримтуудад зориулсан нөхөн бөглөлт ────────
// АСУУДАЛ: 2026-09-ийн өмнө үүссэн гэр бүлийн дадлууд Firestore-д
// detailType/tip/countMax/goodRange ТАЛБАРГҮЙ хадгалагдсан байдаг. Тэдгээрийг
// зүгээр normalizeTask-аар дамжуулбал `wake_sleep` нь hasInput:true-гээс
// болж 'text' болж хувирч, шинэ нойрны цаг сонгогч, зөвлөмж, эргэх холбоо
// ХУУЧИН хэрэглэгчид ОГТ харагдахгүй байв (шинэ гэр бүлд л ажиллана).
// Шийдэл: built-in id-аар нь мэдэгдэж буй метадатаг нөхнө. Хэрэглэгчийн
// өөрчилсөн зүйлийг (text, points, required…) ХӨНДӨХГҮЙ — зөвхөн БАЙХГҮЙ
// талбарыг нөхнө. Хүүхдийн нойрны муж (10-11) нь зөвхөн шинээр үүсгэсэн
// гэр бүлд оногддог тул энд насанд хүрэгчийн утгыг ашиглав.
const BUILTIN_TASK_META = {
  wake_sleep: { detailType: 'hours', goodRange: [7, 8], tip: 'Та өдөрт 7-8 цагийн нойр авч хүч энергтэй ажиллана.' },
  morning_water: { detailType: 'count', countMax: 3, tip: 'Өглөө сэрээд бүлээн ус уувал хоол боловсруулах эрхтэн сэрж, бие тэнхээжинэ.' },
  exercise: { detailType: 'duration', tip: 'Өдөрт 15-20 минутын хөдөлгөөн зүрх судас, сэтгэл санаанд хамгийн их үр дүнтэй.' },
  daily_water: { detailType: 'count', countMax: 8, tip: '1 аяга ≈ 250мл. Өдөрт 8 аяга уувал 2 литр болно.' },
  early_sleep: { detailType: 'hours', goodRange: [7, 8], tip: 'Орой эрт унтсанаар маргаашийн өглөө хамаагүй хөнгөн эхэлнэ.' },
};

export const normalizeTask = (rawTask, index = 0) => {
  // Firestore-оос ирсэн хуучин/корrupt өгөгдөл дотор null, эсвэл object биш
  // элемент орж ирвэл task.id уншихад апп шууд crash хийдэг байсан —
  // хоосон task болгон хувиргаад үргэлжлүүлнэ.
  const task = rawTask && typeof rawTask === 'object' ? rawTask : {};
  const meta = BUILTIN_TASK_META[task.id] || {};
  return {
    id: String(task.id || `task_${Date.now()}_${index}`),
    // Хуучин бүлгүүдэд хадгалагдсан нойрны дадлын нэрийг шинэ, тодорхой нэрээр харуулна.
    text: task.id === 'wake_sleep' && task.text === 'Эрт сэрэх, нойр сайн авах'
      ? `Эрт сэрэх, ${Array.isArray(task.goodRange) ? task.goodRange.join('-') : '7-8'} цагийн нойр авах`
      : task.text || '',
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
    // Админы сонгосон "үндсэн" дадал — бүх гишүүнд үйлчилнэ, гишүүн өөрөө устгахгүй.
    core: Boolean(task.core),
    // Дараалал: баримтад ТОДОРХОЙ бичсэн утга → built-in метадата → таамаг.
    detailType: DETAIL_TYPES.includes(task.detailType)
      ? task.detailType
      : (meta.detailType || inferDetailType(task)),
    // count төрлийн дээд хязгаар (жишээ нь бүлээн ус 1-3 аяга). 0 = хязгааргүй.
    countMax: toNumber(task.countMax, toNumber(meta.countMax, 0)),
    // Дэлгэрэнгүй дотор харагдах ТОГТМОЛ зөвлөмж. Хэрэглэгчийн бичих зүйл
    // биш — аппын өгөх зөвлөгөө, тиймээс дадлын тодорхойлолт дээр сууна.
    tip: task.tip || meta.tip || '',
    // Бүх дадал эхэлсэн/дууссан цагаа бүртгэнэ (хэрэглэгчийн хүсэлт №6).
    // Эхний цаг нь check хийх мөчид АВТОМАТААР, хоёр дахийг өөрөө оруулна.
    trackTime: task.trackTime !== false,
    // detailType:'hours' дадалд "зөв" тооцогдох муж ([доод, дээд]). Сонгосон
    // цаг энэ мужид багтвал баталгаажуулах, багтахгүй бол ЗӨӨЛӨН сануулга
    // харуулна (загнах биш). null бол ямар ч эргэх холбоо харуулахгүй.
    goodRange: Array.isArray(task.goodRange) && task.goodRange.length === 2
      ? [toNumber(task.goodRange[0], 0), toNumber(task.goodRange[1], 0)]
      : (meta.goodRange || null),
  };
};

// ── Гэр бүлийн дадал (өмнөх, өөрчлөгдөөгүй 18 дадал) ─────────────────────
const familyTasks = (isKid) => [
  normalizeTask({ id: 'wake_sleep', text: isKid ? 'Эрт сэрэх, 10-11 цагийн нойр авах' : 'Эрт сэрэх, 7-8 цагийн нойр авах', detailType: 'hours', goodRange: isKid ? [10, 11] : [7, 8], tip: isKid ? 'Хүүхэд өдөрт 10-11 цагийн нойр авч өсөж, хүч энергтэй байна.' : 'Та өдөрт 7-8 цагийн нойр авч хүч энергтэй ажиллана.', category: 'health', points: 10, required: true }),
  normalizeTask({ id: 'morning_water', text: 'Өглөө бүлээн ус 1-3 аяга уух', detailType: 'count', countMax: 3, tip: 'Өглөө сэрээд бүлээн ус уувал хоол боловсруулах эрхтэн сэрж, бие тэнхээжинэ.', category: 'health', points: 5, difficulty: 'easy', required: true }),
  normalizeTask({ id: 'english_reading', text: 'Ном унших / Англи хэл', note: '10-15 минут', timerMinutes: 15, hasInput: true, inputPlaceholder: 'Хэдэн минут?', category: 'learning', points: 20, difficulty: 'hard', required: true }),
  normalizeTask({ id: 'mongolian_reading', text: 'Монгол ном унших', note: '10-15 минут', timerMinutes: 15, hasInput: true, inputPlaceholder: 'Хэдэн минут?', category: 'learning', points: 15, required: false }),
  normalizeTask({ id: 'exercise', text: 'Дасгал хийх 15-20 минут', detailType: 'duration', options: ['Алхах', 'Гүйх', 'Дугуй унах'], timerMinutes: 20, tip: 'Өдөрт 15-20 минутын хөдөлгөөн зүрх судас, сэтгэл санаанд хамгийн их үр дүнтэй.', category: 'health', points: 20, difficulty: 'hard', required: true }),
  normalizeTask({ id: 'breakfast', text: 'Өглөөний цай сайн уух', note: 'Ислэг, уураглаг бүтээгдэхүүн хэрэглэх', hasInput: true, inputPlaceholder: 'Цаг?', category: 'nutrition', points: 10, required: true }),
  normalizeTask({ id: 'vitamins', text: 'Эрдэс витамин хэрэглэх', hasInput: true, inputPlaceholder: 'Тэмдэглэл', category: 'health', points: 5, difficulty: 'easy', required: false }),
  normalizeTask({ id: 'meal_prep', text: 'Хоол хийх / бэлдэх', options: ['Өдрийн хоол хийх', 'Оройн хоол бэлдэх', 'Маргаашийн хоолоо бэлдэх'], hasInput: true, inputPlaceholder: 'Цаг?', category: 'home', points: 15, required: false }),
  normalizeTask({ id: 'ielts_listening', text: 'IELTS сонсох / давтах', note: 'Давтаж унших, цээжлэх', timerMinutes: 30, category: 'learning', points: 20, difficulty: 'hard', required: false }),
  normalizeTask({ id: 'history', text: 'Түүх сонсох, уншиж судлах', timerMinutes: 20, category: 'learning', points: 10, required: false }),
  normalizeTask({ id: 'calm', text: 'Уурлахгүй байх тал дээр ажиллах', note: 'Тэвчээртэй байх', hasInput: true, inputPlaceholder: 'Сэтгэл зүйгээ бичих', category: 'mindset', points: 15, required: true }),
  normalizeTask({ id: 'work', text: 'Ажлаа хийх', note: 'Ажилласан цагаа бүртгэх', hasInput: true, inputPlaceholder: 'Зарцуулсан цаг?', inputSuffix: 'цаг', category: 'work', points: 20, required: false }),
  normalizeTask({ id: 'daily_water', text: 'Өдөрт 2 литр ус уух', detailType: 'count', countMax: 8, tip: '1 аяга ≈ 250мл. Өдөрт 8 аяга уувал 2 литр болно.', category: 'health', points: 10, required: true }),
  normalizeTask({ id: 'stocks', text: 'Хувьцаа судлах', note: '20-30 минут', timerMinutes: 20, category: 'learning', points: 15, required: false }),
  normalizeTask({ id: 'sports', text: 'Спортоор хичээллэх', options: ['Сагс тоглох', 'Бокс', 'Усанд сэлэх'], frequency: '7 хоногт 3 удаа', category: 'health', points: 20, required: false }),
  normalizeTask({ id: 'family_time', text: 'Орой гэр бүлээрээ тоглох / цаг өнгөрүүлэх', options: ['Хөзөр тоглох', 'Спорт тоглоом', 'Кино үзэх', 'Алхах'], frequency: 'Сард 4 удаа', category: 'family', points: 30, difficulty: 'bonus', required: false }),
  normalizeTask({ id: 'hygiene', text: 'Оройн арчилгаа, ариун цэвэр', options: ['Нүүрээ цэвэрлэх', 'Шүд угаах', 'Усанд орох'], category: 'health', points: 10, required: true }),
  normalizeTask({ id: 'early_sleep', text: 'Орой эрт унтах', note: '21:40-23:00 өмнө', hasInput: true, inputPlaceholder: 'Унтсан цаг?', category: 'health', points: 15, required: true }),
];

// ── Найзуудын дадал — хамтдаа тэмүлэх, ганцаараа хийхэд хэцүү зүйлс ──────
const friendsTasks = () => [
  normalizeTask({ id: 'f_exercise', text: 'Хамт дасгал хийх / алхах', detailType: 'duration', options: ['Алхах', 'Гүйх', 'Фитнес'], timerMinutes: 20, tip: 'Найзтайгаа хамт хөдөлгөөн хийвэл тогтмол дадал болгоход хамгийн хялбар.', category: 'health', points: 20, difficulty: 'hard', required: true }),
  normalizeTask({ id: 'f_reading', text: 'Ном унших / суралцах', detailType: 'duration', timerMinutes: 20, tip: 'Юу уншсанаа найзуудтайгаа хуваалцаарай.', category: 'learning', points: 15, required: true }),
  normalizeTask({ id: 'f_water', text: 'Өдөрт 2 литр ус уух', detailType: 'count', countMax: 8, tip: '1 аяга ≈ 250мл. Өдөрт 8 аяга уувал 2 литр болно.', category: 'health', points: 10, required: true }),
  normalizeTask({ id: 'f_sleep', text: 'Цагтаа унтах', detailType: 'hours', goodRange: [7, 8], tip: 'Өдөрт 7-8 цагийн нойр авч хүч энергтэй байгаарай.', category: 'health', points: 10, required: true }),
  normalizeTask({ id: 'f_checkin', text: 'Долоо хоногт нэг удаа уулзах / ярилцах', options: ['Уулзсан', 'Дуудлага хийсэн', 'Мессеж бичсэн'], frequency: '7 хоногт 1 удаа', category: 'social', points: 20, required: false }),
  normalizeTask({ id: 'f_challenge', text: 'Хамтарсан сорилт биелүүлэх', note: 'Сар бүр шинэ сорилт', hasInput: true, inputPlaceholder: 'Юу хийсэн бэ?', category: 'social', points: 25, difficulty: 'bonus', required: false }),
];

// ── Хувь хүний дадал — өдөр тутмын үндсэн дадал, гэр бүл/хоолны хэсэггүй ──
const personalTasks = () => [
  normalizeTask({ id: 'p_sleep', text: 'Эрт унтаж, эрт сэрэх', detailType: 'hours', goodRange: [7, 8], tip: 'Та өдөрт 7-8 цагийн нойр авч хүч энергтэй ажиллана.', category: 'health', points: 10, required: true }),
  normalizeTask({ id: 'p_water', text: 'Өдөрт 2 литр ус уух', detailType: 'count', countMax: 8, tip: '1 аяга ≈ 250мл. Өдөрт 8 аяга уувал 2 литр болно.', category: 'health', points: 10, required: true }),
  normalizeTask({ id: 'p_exercise', text: 'Дасгал хийх 15-20 минут', detailType: 'duration', options: ['Алхах', 'Гүйх', 'Дугуй унах'], timerMinutes: 20, tip: 'Өдөрт 15-20 минутын хөдөлгөөн зүрх судас, сэтгэл санаанд хамгийн их үр дүнтэй.', category: 'health', points: 20, difficulty: 'hard', required: true }),
  normalizeTask({ id: 'p_reading', text: 'Ном унших / суралцах', detailType: 'duration', timerMinutes: 20, category: 'learning', points: 15, required: false }),
  normalizeTask({ id: 'p_work', text: 'Ажлаа хийх', note: 'Ажилласан цагаа бүртгэх', hasInput: true, inputPlaceholder: 'Зарцуулсан цаг?', inputSuffix: 'цаг', category: 'work', points: 20, required: false }),
  normalizeTask({ id: 'p_mindfulness', text: 'Амьсгалын дасгал / медитаци', detailType: 'duration', timerMinutes: 10, tip: 'Өдөрт 5-10 минутын гүн амьсгаа стрессийг мэдэгдэхүйц бууруулдаг.', category: 'mindset', points: 15, required: false }),
];

// ── Хосуудын дадал — хамтдаа цаг өнгөрүүлэх, харилцаагаа хөгжүүлэх ───────
const coupleTasks = () => [
  normalizeTask({ id: 'c_walk', text: 'Хамт алхах / дасгал хийх', detailType: 'duration', timerMinutes: 20, category: 'health', points: 15, required: true }),
  normalizeTask({ id: 'c_meal', text: 'Хамт хоол хийх / хооллох', options: ['Өглөө', 'Өдөр', 'Орой'], category: 'nutrition', points: 15, required: false }),
  normalizeTask({ id: 'c_gratitude', text: 'Өдөрт нэг талархал илэрхийлэх', hasInput: true, inputPlaceholder: 'Юунд талархав?', tip: 'Талархлаа илэрхийлэх нэг үг ч гэсэн харилцааг дулаацуулдаг.', category: 'mindset', points: 10, required: true }),
  normalizeTask({ id: 'c_screenfree', text: 'Утасгүй хамт цаг өнгөрүүлэх', detailType: 'duration', timerMinutes: 30, category: 'social', points: 20, required: false }),
  normalizeTask({ id: 'c_date', text: 'Долоо хоногт нэг удаа болзох', frequency: '7 хоногт 1 удаа', options: ['Гадуур', 'Гэртээ'], category: 'social', points: 30, difficulty: 'bonus', required: false }),
];

const TASK_PACKS = {
  family: familyTasks,
  friends: friendsTasks,
  personal: personalTasks,
  couple: coupleTasks,
};

// groupType-аар зөв дадлын багцыг сонгоно. Танигдаагүй/хоосон утга бол
// 'family' руу буулгана — normalizeGroupType-ийн адил invariant.
// `isKid` зөвхөн 'family' төрөлд утга учиртай (child гишүүн).
export const getBaseTasks = (groupType = 'family', isKid = false) => {
  const pack = TASK_PACKS[groupType] || TASK_PACKS.family;
  return pack(isKid);
};

// Шинэ бүлэг үүсгэхэд: админы сонгосон үндсэн дадлуудыг (coreTaskIds) core
// болгон тэмдэглэж буцаана. coreTaskIds байхгүй (хуучин урсгал) бол бүх багц.
export const getStarterTasks = (groupType, isKid, coreTaskIds) => {
  const base = getBaseTasks(groupType, isKid);
  if (!Array.isArray(coreTaskIds)) return base;
  return base.filter((task) => coreTaskIds.includes(task.id)).map((task) => ({ ...task, core: true, required: true }));
};
