// Дизайн системийн төв — 3 ГОЛ ӨНГӨ + улаан (устгах/алдаа) тусдаа
// BRAND (улбар шар) #F97316 · SURFACE (цагаан) #FFFFFF · BLUE (амжилт/идэвхтэй) #2563EB
// + ERROR (зөвхөн устгах/алдаа) #EF4444
// + neutrals: background #FFF7ED, border #E5E7EB, text #1E293B / #64748B, disabled #CBD5E1
//
// 2026-09-нд НОГООН (emerald/success #22C55E)-г ХАСАВ — "3 өнгө" гэсэн
// хэрэглэгчийн хүсэлтийн дагуу. "Дуусгасан" төлөв одоо ЦЭНХЭР (blue) өнгөтэй.
// Улаан ЗӨВХӨН устгах/алдааны товч дээр үлдсэн — үүнийг ч хасвал устгах
// товчийг андуурч дарах эрсдэл нэмэгддэг тул ЗОРИУДААР хэвээр үлдээв.
export const palette = {
  brand: {
    50: '#fff7ed',
    100: '#ffedd5',
    500: '#f97316',
    600: '#ea580c',
  },
  navy: '#1e293b',
  navySoft: '#334155',
  // "Дуусгасан", "амжилттай", "идэвхтэй" гэсэн бүх утга ЭНД нэгддэг.
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
  },
  error: '#ef4444',
  errorSoft: '#fee2e2',
  // Neutrals — structural, not brand
  border: '#e5e7eb',
  surface: '#ffffff',
  background: '#fff7ed',
  backgroundWarm: '#fffaf5',
  muted: '#64748b',
  disabled: '#cbd5e1',
  ink: '#1e293b',
};

export const radii = {
  card: 24,
  cardLarge: 28,
  pill: 9999,
};

export const spacing = {
  cardPadding: 16,
  sectionGap: 16,
};
