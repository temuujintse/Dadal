export const habitSuggestionGroups = [
  {
    id: 'kids',
    label: 'Хүүхдэд',
    icon: '🧒',
    items: [
      { id: 's_kid_bed', text: 'Өглөө ор дэрээ хураах', category: 'home', points: 10, note: 'Өдрийг эмх цэгцтэй эхлэх' },
      { id: 's_kid_teeth', text: 'Шүдээ угаах', category: 'health', points: 5, note: 'Өглөө, орой 2 удаа' },
      { id: 's_kid_book10', text: 'Ном 10 минут унших', category: 'learning', points: 15, note: 'Өдөр бүр 10 минут', timerMinutes: 10 },
      { id: 's_kid_toys', text: 'Тоглоомоо хураах', category: 'home', points: 10 },
      { id: 's_kid_room', text: 'Өрөөгөө цэгцлэх', category: 'home', points: 10 },
      { id: 's_kid_hands', text: 'Гараа угаах', category: 'health', points: 5, note: 'Хоолны өмнө заавал' },
      { id: 's_kid_water', text: 'Ус уух', category: 'health', points: 5, note: 'Өдөрт 4-6 аяга' },
      { id: 's_kid_homework', text: 'Гэрийн даалгавраа хийх', category: 'learning', points: 15, note: 'Тогтмол цагт' },
    ],
  },
  {
    id: 'family',
    label: 'Томчууд / Гэр бүлд',
    icon: '👨‍👩‍👧‍👦',
    items: [
      { id: 's_adult_water', text: 'Өглөө ус уух', category: 'health', points: 5 },
      { id: 's_adult_exercise', text: '10 минут дасгал хийх', category: 'health', points: 15, timerMinutes: 10 },
      { id: 's_adult_read', text: 'Ном унших', category: 'learning', points: 15, timerMinutes: 15 },
      { id: 's_adult_tidy', text: 'Өрөөгөө цэгцлэх', category: 'home', points: 10 },
      { id: 's_adult_phone', text: 'Унтахаас өмнө утсаа холдуулах', category: 'mindset', points: 10, note: '21:30-аас хойш' },
      { id: 's_adult_family', text: 'Гэр бүлийн цаг', category: 'family', points: 30, note: 'Хамтдаа 20 минут', timerMinutes: 20 },
      { id: 's_adult_plan', text: 'Өнөөдрийн ажлаа төлөвлөх', category: 'work', points: 10, note: 'Өглөө 5 минут' },
      { id: 's_adult_sleep', text: 'Орой эрт унтах', category: 'health', points: 15, note: '23:00-аас өмнө' },
    ],
  },
  {
    id: 'everyone',
    label: 'Бүгдэд',
    icon: '🌿',
    items: [
      { id: 's_all_walk', text: '10 000 алхам алхах', category: 'health', points: 15 },
      { id: 's_all_noscreen', text: '1 цаг дэлгэцгүй байх', category: 'mindset', points: 15, timerMinutes: 60 },
      { id: 's_all_meditate', text: '5 минут бясалгал', category: 'mindset', points: 10, timerMinutes: 5 },
      { id: 's_all_veggie', text: 'Хоолондоо ногоо нэмэх', category: 'nutrition', points: 10 },
      { id: 's_all_nosugar', text: 'Чихэр, амтлаггүй өдөр', category: 'nutrition', points: 15 },
      { id: 's_all_thanks', text: 'Талархах 3 зүйл бичих', category: 'mindset', points: 10 },
    ],
  },
];

export const allHabitSuggestions = habitSuggestionGroups.flatMap((g) => g.items);
