// Хоолны "сагс"-ны бүтээгдэхүүний сан. Утгууд нь НЭГ НЭГЖИД ногдох ойролцоо
// (баримжаа) шим тэжээл — хүн бүрийн тоо хэмжээгээр үржүүлж тооцно.
// Компанийн админ ирээдүйд Firestore-ийн `catalog/products`-оор шинэчилж/
// нэмж болно; тэр хоосон үед энэ суулгасан жагсаалт ажиллана.
export const PRODUCTS = [
  { id: 'egg', name: 'Өндөг (чанасан)', emoji: '🥚', unit: 'ширхэг', kcal: 72, protein: 6.3, fat: 4.8, carbs: 0.4 },
  { id: 'bread', name: 'Талх', emoji: '🍞', unit: 'зүсэм', kcal: 80, protein: 3, fat: 1, carbs: 15 },
  { id: 'butter', name: 'Цөцгийн тос', emoji: '🧈', unit: 'халбага (10г)', kcal: 72, protein: 0, fat: 8, carbs: 0 },
  { id: 'cheese', name: 'Бяслаг', emoji: '🧀', unit: 'зүсэм (20г)', kcal: 80, protein: 5, fat: 6.5, carbs: 0.3 },
  { id: 'milk', name: 'Сүү', emoji: '🥛', unit: 'аяга (250мл)', kcal: 150, protein: 8, fat: 8, carbs: 12 },
  { id: 'yogurt', name: 'Тараг', emoji: '🥣', unit: 'аяга', kcal: 150, protein: 8.5, fat: 8, carbs: 11 },
  { id: 'milk_tea', name: 'Сүүтэй цай', emoji: '🍵', unit: 'аяга', kcal: 60, protein: 2, fat: 3, carbs: 6 },
  { id: 'oatmeal', name: 'Овъёосны будаа', emoji: '🥣', unit: 'аяга', kcal: 150, protein: 5, fat: 3, carbs: 27 },
  { id: 'rice', name: 'Цагаан будаа', emoji: '🍚', unit: 'аяга (болгосон)', kcal: 205, protein: 4.3, fat: 0.4, carbs: 45 },
  { id: 'buckwheat', name: 'Сагаг', emoji: '🌾', unit: 'аяга (болгосон)', kcal: 155, protein: 5.7, fat: 1, carbs: 33 },
  { id: 'noodles', name: 'Гоймон', emoji: '🍜', unit: '100г (болгосон)', kcal: 140, protein: 5, fat: 1, carbs: 28 },
  { id: 'potato', name: 'Төмс', emoji: '🥔', unit: 'ширхэг (150г)', kcal: 115, protein: 3, fat: 0.1, carbs: 26 },
  { id: 'beef', name: 'Үхрийн мах', emoji: '🥩', unit: '100г', kcal: 250, protein: 26, fat: 15, carbs: 0 },
  { id: 'mutton', name: 'Хонины мах', emoji: '🍖', unit: '100г', kcal: 290, protein: 25, fat: 21, carbs: 0 },
  { id: 'chicken', name: 'Тахианы мах', emoji: '🍗', unit: '100г', kcal: 165, protein: 31, fat: 3.6, carbs: 0 },
  { id: 'fish', name: 'Загас', emoji: '🐟', unit: '100г', kcal: 140, protein: 22, fat: 5, carbs: 0 },
  { id: 'tomato', name: 'Помидор', emoji: '🍅', unit: 'ширхэг', kcal: 22, protein: 1, fat: 0.2, carbs: 4.8 },
  { id: 'cucumber', name: 'Өргөст хэмх', emoji: '🥒', unit: 'ширхэг', kcal: 30, protein: 1.3, fat: 0.2, carbs: 7 },
  { id: 'carrot', name: 'Лууван', emoji: '🥕', unit: 'ширхэг', kcal: 25, protein: 0.6, fat: 0.1, carbs: 6 },
  { id: 'cabbage', name: 'Байцаа', emoji: '🥬', unit: '100г', kcal: 25, protein: 1.3, fat: 0.1, carbs: 6 },
  { id: 'apple', name: 'Алим', emoji: '🍎', unit: 'ширхэг', kcal: 95, protein: 0.5, fat: 0.3, carbs: 25 },
  { id: 'banana', name: 'Банана', emoji: '🍌', unit: 'ширхэг', kcal: 105, protein: 1.3, fat: 0.4, carbs: 27 },
];

export const PRODUCT_BY_ID = Object.fromEntries(PRODUCTS.map((product) => [product.id, product]));

export const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Өглөө', emoji: '🌅' },
  { key: 'lunch', label: 'Өдөр', emoji: '☀️' },
  { key: 'dinner', label: 'Орой', emoji: '🌙' },
];
