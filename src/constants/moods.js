import { Smile, Meh, Frown } from 'lucide-react-native';

// 3 өнгөний системд нийцүүлэв (2026-09): ногоон/шар хосыг ХАСАЖ,
// эерэг = цэнхэр, дунд = брэндийн улбар шар, сөрөг = улаан болгов.
export const moods = [
  // emoji/label/light/dark/shadow — MoodBubble-ийн 3D градиент бөмбөлөгт.
  { id: 'happy', Icon: Smile, color: '#2563eb', bg: '#dbeafe', emoji: '😄', label: 'Сайхан', light: '#bfdbfe', dark: '#2563eb', shadow: '#1d4ed8' },
  { id: 'neutral', Icon: Meh, color: '#f97316', bg: '#ffedd5', emoji: '😐', label: 'Дунд', light: '#fed7aa', dark: '#f97316', shadow: '#c2410c' },
  { id: 'sad', Icon: Frown, color: '#ef4444', bg: '#fee2e2', emoji: '😢', label: 'Муу', light: '#fecaca', dark: '#ef4444', shadow: '#b91c1c' },
];
