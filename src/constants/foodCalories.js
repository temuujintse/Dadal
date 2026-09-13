// Монгол хоол, хүнсний зүйлсийн КАЛОРИ болон ШИМ ТЭЖЭЭЛИЙН лавлах жагсаалт.
//
// АНХААР: эдгээр нь албан ёсны хоол судлалын өгөгдлийн сан (жишээ нь USDA)-аас
// биш, түгээмэл орц/порцын хэмжээгээр тооцсон ОЙРОЛЦОО (баримжаа) утга. Хүн
// бүрийн орц, хэмжээ өөр өөр байдаг тул үнэн зөв тооцоолол биш, ерөнхий
// баримжаа гэдгийг хэрэглэгчид тодорхой харуулах ёстой (жишээ нь "~" тэмдэг
// эсвэл "ойролцоогоор" гэсэн үг хэрэглэх).
//
// kcal    : нэг ердийн порцонд ногдох ойролцоо калори
// protein : уураг (г)
// fat     : өөх тос (г)
// carbs   : нүүрс ус (г)
// serving : тухайн утгуудад харгалзах ердийн порцын тайлбар
// mealTypes: аль хоолны цагт голчлон тохирохыг санал болгох зорилготой
//
// Шим тэжээлийн утгууд нь 4·уураг + 9·өөх + 4·нүүрс ус ≈ kcal гэсэн
// харьцаанд ойролцоогоор нийцүүлэн бодогдсон.
export const foodCalories = [
  { id: 'tsuivan', name: 'Цуйван', kcal: 550, protein: 25, fat: 22, carbs: 60, serving: '1 тавган порц (~350г)', mealTypes: ['lunch', 'dinner'] },
  { id: 'buuz', name: 'Бууз', kcal: 420, protein: 22, fat: 20, carbs: 38, serving: '5 ширхэг', mealTypes: ['lunch', 'dinner'] },
  { id: 'khuushuur', name: 'Хуушуур', kcal: 480, protein: 20, fat: 26, carbs: 40, serving: '2 ширхэг', mealTypes: ['lunch', 'dinner'] },
  { id: 'guriltai-shol', name: 'Гурилтай шөл', kcal: 350, protein: 16, fat: 14, carbs: 40, serving: '1 тавган порц', mealTypes: ['lunch', 'dinner'] },
  { id: 'makh-shol', name: 'Махан шөл', kcal: 280, protein: 20, fat: 16, carbs: 14, serving: '1 тавган порц', mealTypes: ['lunch', 'dinner'] },
  { id: 'mantuu', name: 'Мантуу', kcal: 300, protein: 8, fat: 4, carbs: 58, serving: '2 ширхэг', mealTypes: ['breakfast', 'lunch'] },
  { id: 'khorkhog', name: 'Хорхог', kcal: 650, protein: 45, fat: 40, carbs: 28, serving: '1 порц (мах + төмс)', mealTypes: ['lunch', 'dinner'] },
  { id: 'boortsog', name: 'Боорцог', kcal: 350, protein: 6, fat: 16, carbs: 45, serving: '5 ширхэг', mealTypes: ['snack'] },
  { id: 'aaruul', name: 'Ааруул', kcal: 180, protein: 15, fat: 6, carbs: 16, serving: '50г', mealTypes: ['snack'] },
  { id: 'aarts', name: 'Аарц', kcal: 250, protein: 14, fat: 14, carbs: 16, serving: '100г', mealTypes: ['snack'] },
  { id: 'airag', name: 'Айраг', kcal: 110, protein: 4, fat: 3, carbs: 16, serving: '1 аяга (250мл)', mealTypes: ['snack'] },
  { id: 'sutei-tsai', name: 'Сүүтэй цай', kcal: 60, protein: 2, fat: 3, carbs: 6, serving: '1 аяга', mealTypes: ['breakfast', 'snack'] },
  { id: 'suu', name: 'Сүү', kcal: 150, protein: 8, fat: 8, carbs: 12, serving: '1 аяга (250мл)', mealTypes: ['breakfast', 'snack'] },
  { id: 'tarag', name: 'Тараг', kcal: 120, protein: 8, fat: 4, carbs: 13, serving: '1 аяга', mealTypes: ['breakfast', 'snack'] },
  { id: 'oendogtei-huurga', name: 'Өндөгтэй хуурга будаа', kcal: 500, protein: 18, fat: 20, carbs: 62, serving: '1 тавган порц', mealTypes: ['breakfast', 'lunch', 'dinner'] },
  { id: 'tomsnii-shol', name: 'Төмсний шөл', kcal: 200, protein: 6, fat: 7, carbs: 28, serving: '1 тавган порц', mealTypes: ['lunch', 'dinner'] },
  { id: 'baitsaatai-shol', name: 'Байцаатай шөл', kcal: 150, protein: 6, fat: 6, carbs: 18, serving: '1 тавган порц', mealTypes: ['lunch', 'dinner'] },
  { id: 'salat', name: 'Ногооны салат', kcal: 120, protein: 3, fat: 7, carbs: 12, serving: '1 порц', mealTypes: ['lunch', 'dinner', 'snack'] },
  { id: 'talkh', name: 'Талх', kcal: 80, protein: 3, fat: 1, carbs: 15, serving: '1 зүсэм', mealTypes: ['breakfast', 'snack'] },
  { id: 'tos', name: 'Цөцгийн тос', kcal: 120, protein: 0, fat: 13, carbs: 0, serving: '1 халбага', mealTypes: ['breakfast'] },
  { id: 'bansh', name: 'Банш', kcal: 400, protein: 20, fat: 18, carbs: 40, serving: '10 ширхэг (шөлтэй)', mealTypes: ['lunch', 'dinner'] },
  { id: 'khiam', name: 'Хиам', kcal: 250, protein: 12, fat: 20, carbs: 4, serving: '100г', mealTypes: ['breakfast', 'snack'] },
  { id: 'takhia-shar', name: 'Тахианы мах (шарсан)', kcal: 350, protein: 40, fat: 20, carbs: 0, serving: '150г', mealTypes: ['lunch', 'dinner'] },
  { id: 'ukhriin-makh', name: 'Үхрийн мах (чанасан)', kcal: 300, protein: 38, fat: 16, carbs: 0, serving: '140г', mealTypes: ['lunch', 'dinner'] },
  { id: 'khoniny-makh', name: 'Хонины мах (чанасан)', kcal: 330, protein: 35, fat: 20, carbs: 0, serving: '140г', mealTypes: ['lunch', 'dinner'] },
  { id: 'zagas-shar', name: 'Загас (шарсан)', kcal: 280, protein: 32, fat: 16, carbs: 0, serving: '150г', mealTypes: ['lunch', 'dinner'] },
  { id: 'budaa', name: 'Цагаан будаа', kcal: 200, protein: 4, fat: 1, carbs: 44, serving: '1 аяга (чанасан)', mealTypes: ['lunch', 'dinner'] },
  { id: 'makaron', name: 'Гурилан бүтээгдэхүүн (макарон)', kcal: 220, protein: 8, fat: 1, carbs: 43, serving: '1 аяга (чанасан)', mealTypes: ['lunch', 'dinner'] },
  { id: 'tomsnii-shar', name: 'Төмс (шарсан)', kcal: 320, protein: 4, fat: 15, carbs: 42, serving: '1 порц', mealTypes: ['lunch', 'dinner', 'snack'] },
  { id: 'alim', name: 'Алим', kcal: 95, protein: 0, fat: 0, carbs: 25, serving: '1 ширхэг', mealTypes: ['snack'] },
  { id: 'jurag', name: 'Жүрж', kcal: 60, protein: 1, fat: 0, carbs: 15, serving: '1 ширхэг', mealTypes: ['snack'] },
  { id: 'banan', name: 'Банана', kcal: 105, protein: 1, fat: 0, carbs: 27, serving: '1 ширхэг', mealTypes: ['snack'] },
  { id: 'guzeelzgene', name: 'Гүзээлзгэнэ', kcal: 50, protein: 1, fat: 0, carbs: 12, serving: '1 аяга', mealTypes: ['snack'] },
  { id: 'chikher', name: 'Чихэр', kcal: 40, protein: 0, fat: 0, carbs: 10, serving: '1 ширхэг', mealTypes: ['snack'] },
  { id: 'shokolad', name: 'Шоколад', kcal: 110, protein: 1, fat: 7, carbs: 12, serving: '1 хэсэг (~20г)', mealTypes: ['snack'] },
  { id: 'kola', name: 'Ундаа (кола төрөл)', kcal: 140, protein: 0, fat: 0, carbs: 35, serving: '330мл', mealTypes: ['snack'] },
  { id: 'kofe-sutei', name: 'Кофе (сүүтэй)', kcal: 80, protein: 3, fat: 3, carbs: 10, serving: '1 аяга', mealTypes: ['breakfast', 'snack'] },
  { id: 'pizza', name: 'Пицца', kcal: 280, protein: 12, fat: 11, carbs: 34, serving: '1 хэсэг', mealTypes: ['lunch', 'dinner'] },
  { id: 'gamburger', name: 'Гамбургер', kcal: 550, protein: 25, fat: 28, carbs: 46, serving: '1 ширхэг', mealTypes: ['lunch', 'dinner'] },
  { id: 'khiamtai-huurga', name: 'Хиамтай хуурга гурил', kcal: 480, protein: 18, fat: 22, carbs: 52, serving: '1 тавган порц', mealTypes: ['lunch', 'dinner'] },
  { id: 'binder-suu', name: 'Хөрөнгөжсөн сүүн бүтээгдэхүүн (айраг, тараг зэрэг)', kcal: 130, protein: 6, fat: 5, carbs: 14, serving: '1 аяга', mealTypes: ['breakfast', 'snack'] },
  { id: 'yogurt', name: 'Йогурт', kcal: 100, protein: 6, fat: 3, carbs: 13, serving: '1 стакан (150г)', mealTypes: ['breakfast', 'snack'] },
  { id: 'ovsyanka', name: 'Овъёосны будаа', kcal: 180, protein: 6, fat: 4, carbs: 30, serving: '1 аяга (чанасан)', mealTypes: ['breakfast'] },
  { id: 'khuurga-noogootoi', name: 'Ногоотой хуурга', kcal: 320, protein: 15, fat: 18, carbs: 24, serving: '1 тавган порц', mealTypes: ['lunch', 'dinner'] },
  { id: 'us', name: 'Ус', kcal: 0, protein: 0, fat: 0, carbs: 0, serving: '1 аяга', mealTypes: ['breakfast', 'lunch', 'dinner', 'snack'] },
];

export const findFoodById = (id) => foodCalories.find((item) => item.id === id) || null;

// Ерөнхий насанд хүрсэн хүний ДУНДАЖ өдрийн калорийн зорилт. Гэр бүлийн
// гишүүн бүрийн нас/жин/хүйс/идэвхийн түвшин апп-д одоогоор бүртгэгддэггүй
// тул энэ бол зөвхөн ЕРӨНХИЙ лавлах тоо — хувь хүний бодит хэрэгцээ үүнээс
// ялгаатай байж болно.
export const GENERIC_DAILY_CALORIE_TARGET = 2000;

// Шим тэжээлийн өдрийн зорилт — 2000 ккал дээр 15% уураг / 30% өөх /
// 55% нүүрс ус гэсэн ТЭНЦВЭРТЭЙ харьцаагаар бодсон:
//   уураг 75г·4 = 300 · өөх 67г·9 = 603 · нүүрс ус 275г·4 = 1100 ≈ 2003 ккал
// Энэ нь эмнэлгийн зөвлөгөө биш, ерөнхий баримжаа.
export const DAILY_NUTRITION_TARGET = {
  protein: 75,
  fat: 67,
  carbs: 275,
};

// Задаргааны мөрүүдийг UI дээр давтахгүйн тулд энд нэг дор тодорхойлов.
export const MACRO_META = [
  { key: 'protein', label: 'Уураг', color: '#2563eb' },
  { key: 'fat', label: 'Өөх тос', color: '#f97316' },
  { key: 'carbs', label: 'Нүүрс ус', color: '#64748b' },
];

// Бүртгэлийн жагсаалтаас нийт ккал + шим тэжээлийг нэг дор нэгтгэнэ.
// Гараар нэмсэн (custom) хоолонд шим тэжээл байхгүй байж болох тул
// талбар бүрийг аюулгүйгээр тоо болгож уншина.
export const sumNutrition = (entries = []) => entries.reduce(
  (acc, item) => ({
    kcal: acc.kcal + (Number(item?.kcal) || 0),
    protein: acc.protein + (Number(item?.protein) || 0),
    fat: acc.fat + (Number(item?.fat) || 0),
    carbs: acc.carbs + (Number(item?.carbs) || 0),
  }),
  { kcal: 0, protein: 0, fat: 0, carbs: 0 }
);
