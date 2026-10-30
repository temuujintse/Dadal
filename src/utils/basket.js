import { PRODUCT_BY_ID, MEAL_SLOTS } from '../constants/products';

// Хоолны сагс: { breakfast: [{ productId, qty }], lunch: [...], dinner: [...] }
// qty нь НЭГ ХҮНД ногдох тоо хэмжээ.
export const EMPTY_PLAN = { breakfast: [], lunch: [], dinner: [] };

const round = (value) => Math.round(value * 10) / 10;

export const sumItems = (items = []) => items.reduce((acc, item) => {
  const product = PRODUCT_BY_ID[item.productId];
  const qty = Number(item.qty) || 0;
  if (!product || qty <= 0) return acc;
  return {
    kcal: acc.kcal + product.kcal * qty,
    protein: acc.protein + product.protein * qty,
    fat: acc.fat + product.fat * qty,
    carbs: acc.carbs + product.carbs * qty,
  };
}, { kcal: 0, protein: 0, fat: 0, carbs: 0 });

export const roundTotals = (totals) => ({
  kcal: Math.round(totals.kcal),
  protein: round(totals.protein),
  fat: round(totals.fat),
  carbs: round(totals.carbs),
});

// Нэг хүний өдрийн нийлбэр (өглөө+өдөр+орой).
export const sumPlan = (plan) => roundTotals(MEAL_SLOTS.reduce((acc, slot) => {
  const part = sumItems(plan?.[slot.key]);
  return { kcal: acc.kcal + part.kcal, protein: acc.protein + part.protein, fat: acc.fat + part.fat, carbs: acc.carbs + part.carbs };
}, { kcal: 0, protein: 0, fat: 0, carbs: 0 }));

// Firestore-оос ирсэн өгөгдлийг цэвэрлэнэ (танигдаагүй бүтээгдэхүүн, 0 тоо хасагдана).
export const normalizePlan = (raw) => Object.fromEntries(MEAL_SLOTS.map((slot) => [
  slot.key,
  (Array.isArray(raw?.[slot.key]) ? raw[slot.key] : [])
    .filter((item) => PRODUCT_BY_ID[item?.productId] && Number(item?.qty) > 0)
    .map((item) => ({ productId: item.productId, qty: Number(item.qty) })),
]));

export const isPlanEmpty = (plan) => MEAL_SLOTS.every((slot) => !(plan?.[slot.key] || []).length);

// "Өндөг 3, Талх 2" гэх мэт богино текст.
export const describeItems = (items = []) => items
  .map((item) => {
    const product = PRODUCT_BY_ID[item.productId];
    return product ? `${product.name} ${item.qty}` : null;
  })
  .filter(Boolean)
  .join(', ');
