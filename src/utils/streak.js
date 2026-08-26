import { getPreviousDateKey } from './dates';

export const isDayComplete = (logs, tasks, uid, dateKey) => {
  const requiredTasks = (Array.isArray(tasks) ? tasks : []).filter((task) => task?.required !== false);
  if (requiredTasks.length === 0) return false;
  const userDayTasks = logs?.[dateKey]?.[uid]?.tasks || {};
  return requiredTasks.every((task) => userDayTasks?.[task.id]?.done === true);
};

// Streak-ийг endDateKey-ээс эхлээд ухарч тоолно.
//
// ЧУХАЛ: өнөөдрийн заавал биелүүлэх дадлууд дуусаагүй байхад тооллогыг өнөөдрөөс
// эхлүүлбэл эхний давталт шууд зогсоод 0 буцаадаг байсан. useFamilyData-гийн
// updateTaskLog нь энэ 0-г Firestore руу (members/{uid}.streak) бичдэг тул
// хэрэглэгч өглөө эхний дадлаа тэмдэглэмэгц хуримтлуулсан streak нь БҮРМӨСӨН
// устдаг алдаа үүсдэг байв.
//
// Засвар: өнөөдөр дуусаагүй бол өчигдрөөс эхэлж тоолно (өмнөх streak хэвээр
// хадгалагдана), өнөөдөр дууссан бол өнөөдрөөс эхэлж тоолно (streak 1-ээр нэмэгдэнэ).
export const calculateStreak = (logs, tasks, uid, endDateKey) => {
  let cursor = isDayComplete(logs, tasks, uid, endDateKey)
    ? endDateKey
    : getPreviousDateKey(endDateKey);
  let streak = 0;
  while (isDayComplete(logs, tasks, uid, cursor)) {
    streak += 1;
    cursor = getPreviousDateKey(cursor);
  }
  return streak;
};
