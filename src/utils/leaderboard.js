import { formatDateKey } from './dates';

// Хугацааны сонголт: апп нь сүүлийн 35 хоногийн лог ачаалдаг (useFamilyData
// DAILY_LOG_LOOKBACK_DAYS) тул 1 жил гэх мэт урт хугацаа одоохондоо байхгүй.
export const LEADERBOARD_PERIODS = [
  { id: 'week', label: '7 хоног' },
  { id: 'month30', label: '30 хоног' },
  { id: 'thisMonth', label: 'Энэ сар' },
];

const periodKeys = (periodId, today = new Date()) => {
  const days = periodId === 'week' ? 7 : periodId === 'month30' ? 30 : today.getDate();
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    return formatDateKey(date);
  });
};

// Гишүүн бүрийн тухайн хугацааны оноо (дуусгасан дадлын оноо), биелэлт
// (дуусгасан заавал дадал / боломжит) — оноогоор эрэмбэлсэн.
export const computeLeaderboard = ({ periodId, dailyLogs, tasksByMember, memberList }) => {
  const keys = periodKeys(periodId);
  const rows = memberList.map((member) => {
    const tasks = Array.isArray(tasksByMember?.[member.uid]) ? tasksByMember[member.uid] : [];
    const required = tasks.filter((task) => task.required !== false);
    let points = 0;
    let done = 0;
    keys.forEach((key) => {
      const logs = dailyLogs?.[key]?.[member.uid]?.tasks || {};
      tasks.forEach((task) => {
        if (!logs[task.id]?.done) return;
        points += Number(task.points) || 0;
        if (task.required !== false) done += 1;
      });
    });
    const goal = required.length * keys.length;
    return {
      uid: member.uid,
      name: member.name || 'Гишүүн',
      avatar: member.avatar,
      photo: member.photoURL || member.photoData || null,
      points,
      done,
      goal,
      rate: goal ? Math.round((done / goal) * 100) : 0,
    };
  }).sort((a, b) => b.points - a.points || b.rate - a.rate);

  const totalDone = rows.reduce((sum, row) => sum + row.done, 0);
  const totalGoal = rows.reduce((sum, row) => sum + row.goal, 0);
  return {
    rows,
    totalPoints: rows.reduce((sum, row) => sum + row.points, 0),
    completionRate: totalGoal ? Math.round((totalDone / totalGoal) * 100) : 0,
    top: rows[0]?.points > 0 ? rows[0] : null,
  };
};
