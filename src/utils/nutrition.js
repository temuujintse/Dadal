// Хувь хүний өдрийн илчлэгийн ойролцоо хэрэгцээг тооцоолно (PLAN_V2 §4.2).
//
// Аргачлал: Mifflin-St Jeor тэгшитгэл — өнөөдрийн практикт хамгийн түгээмэл
// ашиглагддаг суурь бодисын солилцооны (BMR) томьёо. Дараа нь хөдөлгөөний
// коэффициентээр үржүүлж өдрийн нийт хэрэгцээг (TDEE) гаргана.
//
// ЧУХАЛ ХЯЗГААРЛАЛТУУД:
//  1. Энэ бол ОЙРОЛЦОО БАРИМЖАА. Хүн бүрийн бодит хэрэгцээ булчингийн хэмжээ,
//     эрүүл мэндийн байдал, хэвшсэн хөдөлгөөнөөс шалтгаалж ±20% хүртэл зөрдөг.
//  2. 18-аас доош насны хүүхдэд Mifflin-St Jeor ХҮЧИНГҮЙ — өсөлтийн үеийн
//     хэрэгцээ нас, бэлгийн бойжилтын үе шатаас хамаардаг тул энд тооцохгүй,
//     ерөнхий утга руу шилжинэ. Хүүхдийн илчлэгийн зорилтыг апп өгөх ёсгүй.
//  3. Энэ нь эмчийн болон хоол зүйчийн зөвлөгөө БИШ.
export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Бага хөдөлгөөнтэй', hint: 'Ихэвчлэн суугаа ажил', factor: 1.2 },
  { id: 'light', label: 'Хөнгөн', hint: '7 хоногт 1-3 удаа дасгал', factor: 1.375 },
  { id: 'moderate', label: 'Дунд', hint: '7 хоногт 3-5 удаа дасгал', factor: 1.55 },
  { id: 'active', label: 'Идэвхтэй', hint: '7 хоногт 6-7 удаа дасгал', factor: 1.725 },
];

export const SEX_OPTIONS = [
  { id: 'male', label: 'Эрэгтэй' },
  { id: 'female', label: 'Эмэгтэй' },
];

const toNum = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export const getActivityFactor = (activityLevel) => (
  ACTIVITY_LEVELS.find((level) => level.id === activityLevel)?.factor || 1.2
);

// Бөглөсөн талбарууд нь тооцоолол хийхэд ХҮРЭЛЦЭХ эсэх.
export const hasCalorieProfile = (profile) => {
  if (!profile) return false;
  return toNum(profile.birthYear) > 1900
    && toNum(profile.heightCm) > 0
    && toNum(profile.weightKg) > 0
    && (profile.sex === 'male' || profile.sex === 'female');
};

export const getAgeFromBirthYear = (birthYear, now = new Date()) => {
  const year = toNum(birthYear);
  if (year <= 1900) return 0;
  return now.getFullYear() - year;
};

// Тооцоолол боломжтой бол { ok:true, calories, age }, эс бөгөөс шалтгааныг
// буцаана — дуудаж буй тал нь ерөнхий утга руу шилжих эсэхээ шийднэ.
export const calcDailyCalories = (profile, now = new Date()) => {
  if (!hasCalorieProfile(profile)) return { ok: false, reason: 'incomplete' };
  const age = getAgeFromBirthYear(profile.birthYear, now);
  // Хүүхдэд томьёо хүчингүй (дээрх тайлбар №2).
  if (age < 18) return { ok: false, reason: 'minor', age };
  if (age > 120) return { ok: false, reason: 'invalid-age', age };
  const weight = toNum(profile.weightKg);
  const height = toNum(profile.heightCm);
  const bmr = profile.sex === 'male'
    ? (10 * weight) + (6.25 * height) - (5 * age) + 5
    : (10 * weight) + (6.25 * height) - (5 * age) - 161;
  const tdee = bmr * getActivityFactor(profile.activityLevel);
  // Хэт бага/хэт өндөр гарсан тохиолдолд эрүүл бус зорилт өгөхгүйн тулд
  // боломжийн хүрээнд барина.
  const calories = Math.round(Math.min(Math.max(tdee, 1200), 4500) / 10) * 10;
  return { ok: true, calories, age, bmr: Math.round(bmr) };
};

// Уураг/өөх/нүүрс усны зорилтыг илчлэгээс хувиар гаргана (25/30/45) —
// FoodLogSection-ийн 3 полосыг хувь хүний зорилттой уялдуулна.
export const macroTargetsFromCalories = (calories) => {
  const kcal = toNum(calories);
  if (kcal <= 0) return null;
  return {
    protein: Math.round((kcal * 0.25) / 4),
    fat: Math.round((kcal * 0.30) / 9),
    carbs: Math.round((kcal * 0.45) / 4),
  };
};
