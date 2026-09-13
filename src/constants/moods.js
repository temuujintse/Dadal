import { Smile, Meh, Frown } from 'lucide-react-native';

// 3 өнгөний системд нийцүүлэв (2026-09): ногоон/шар хосыг ХАСАЖ,
// эерэг = цэнхэр, дунд = брэндийн улбар шар, сөрөг = улаан болгов.
export const moods = [
  { id: 'happy', Icon: Smile, color: '#2563eb', bg: '#dbeafe' },
  { id: 'neutral', Icon: Meh, color: '#f97316', bg: '#ffedd5' },
  { id: 'sad', Icon: Frown, color: '#ef4444', bg: '#fee2e2' },
];
