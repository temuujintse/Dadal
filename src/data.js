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

// Веб хувилбар дээр эдгээрийг CSS gradient ашигладаг байсан (bg-gradient-to-br...).
// RN дээр Tailwind gradient class ажилладаггүй тул нэг цэвэр өнгөөр орлуулсан.
// Хожим expo-linear-gradient нэмж gradient сэргээж болно.
export const rewardVisuals = {
  reward_1: { icon: Ticket, bg: '#7c3aed', bar: '#a78bfa', tabColor: '#6d28d9', tabBg: '#ede9fe' },
  reward_2: { icon: Award, bg: '#ea580c', bar: '#fb923c', tabColor: '#c2410c', tabBg: '#ffedd5' },
  reward_3: { icon: Utensils, bg: '#0d9488', bar: '#2dd4bf', tabColor: '#0f766e', tabBg: '#ccfbf1' },
  reward_4: { icon: Gift, bg: '#2563eb', bar: '#60a5fa', tabColor: '#1d4ed8', tabBg: '#dbeafe' },
  reward_5: { icon: Sparkles, bg: '#c026d3', bar: '#e879f9', tabColor: '#a21caf', tabBg: '#fae8ff' },
  reward_6: { icon: Flame, bg: '#e11d48', bar: '#fb7185', tabColor: '#be123c', tabBg: '#ffe4e6' },
};
