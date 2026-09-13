import { Ticket, Award, Utensils, Gift, Sparkles, Flame } from 'lucide-react-native';

export const defaultMeals = {
  day1: { breakfast: 'Өндөг помидор хуурга сүү', lunch: 'Карритай будаа, өндөгтэй хуурга', dinner: 'Тараг' },
  day2: { breakfast: 'Чанасан өндөг, сүү', lunch: 'Чөлөөт', dinner: 'Аяган хиам' },
  day3: { breakfast: 'Өндөг дүпү мөөгтэй хуурга', lunch: 'Ногоотой шөл будаа, мантуу', dinner: 'Жимс' },
  day4: { breakfast: 'Шарсан өндөг, салат, сүү', lunch: 'Цуйван, удон гоймон', dinner: 'Ясны шөлтэй гоймон' },
  day5: { breakfast: 'Тахиатай хуурга, салат', lunch: 'Тефтель, хучмал, бифштекс', dinner: 'Тараг' },
  day6: { breakfast: 'Сэндвич, чөлөөт', lunch: 'Ажлаас', dinner: 'Тахиа, бууз, хуушуур, загас' },
  day7: { breakfast: 'Будаатай цай', lunch: 'Будаатай хуурга, мантуун бууз', dinner: 'Мах чанах будаа, бантан, гурил' },
};

export const defaultFamilyRewards = [
  { id: 'reward_1', name: 'Кино үзэх', desc: 'Гэр бүлээрээ кино театрт очих эрх', target: 2000 },
  { id: 'reward_2', name: 'Сагс тоглох', desc: 'Гэр бүлээрээ заал авч тоглох эрх', target: 2000 },
  { id: 'reward_3', name: 'Гадуур хооллох', desc: 'Дурсамжтай оройн зоог барих эрх', target: 2000 },
  { id: 'reward_4', name: 'Урамшуулал 4', desc: 'Дараа нэр өгнө...', target: 3000 },
  { id: 'reward_5', name: 'Урамшуулал 5', desc: 'Дараа нэр өгнө...', target: 4000 },
  { id: 'reward_6', name: 'Урамшуулал 6', desc: 'Дараа нэр өгнө...', target: 5000 },
];

// 3 гол өнгөт систем: BRAND #F97316 (улбар шар) + SURFACE #FFFFFF (цагаан) + BLUE #2563EB (цэнхэр)
// Шагнал бүрийн ялгаа нь өнгөөр биш — icon/label/layout-аар илэрнэ.
export const rewardVisuals = {
  reward_1: { icon: Ticket, bg: '#f97316', bar: '#fb923c', tabColor: '#f97316', tabBg: '#fff7ed' },
  reward_2: { icon: Award, bg: '#f97316', bar: '#fb923c', tabColor: '#f97316', tabBg: '#fff7ed' },
  reward_3: { icon: Utensils, bg: '#f97316', bar: '#fb923c', tabColor: '#f97316', tabBg: '#fff7ed' },
  reward_4: { icon: Gift, bg: '#f97316', bar: '#fb923c', tabColor: '#f97316', tabBg: '#fff7ed' },
  reward_5: { icon: Sparkles, bg: '#f97316', bar: '#fb923c', tabColor: '#f97316', tabBg: '#fff7ed' },
  reward_6: { icon: Flame, bg: '#f97316', bar: '#fb923c', tabColor: '#f97316', tabBg: '#fff7ed' },
};
