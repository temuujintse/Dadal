export const dayNamesFull = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
export const dayNamesShort = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];
export const mealKeyByWeekday = ['day7', 'day1', 'day2', 'day3', 'day4', 'day5', 'day6'];

export const formatDateKey = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayDateKey = () => formatDateKey(new Date());

export const getPreviousDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() - 1);
  return formatDateKey(d);
};

export const getWeekAgoKeys = () => {
  const keys = [];
  const today = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    keys.push(formatDateKey(d));
  }
  return keys;
};
