import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { defaultMeals, defaultFamilyRewards } from '../data';
import { normalizeTask, getBaseTasks, defaultNotificationSettings } from '../constants/tasks';
import { normalizeGroupType, getGroupTypeMeta } from '../constants/groupTypes';
import { formatDateKey, getTodayDateKey, getWeekAgoKeys, dayNamesShort } from '../utils/dates';
import { calculateStreak } from '../utils/streak';
import { getCycleStartKey } from '../utils/journey';
import { sanitizeInviteCode, generateInviteCode } from '../utils/invite';
import { applyNotificationSettings } from '../services/notifications';
import { successFeedback, selectionFeedback } from '../services/feedback';

// dailyLogs listener зөвхөн сүүлийн ~35 хоногийн баримт татна. Дэд collection
// хязгааргүй ургадаг тул өмнө нь БҮХ өдрийн лог санах ой/трафик руу ордог байв.
// 35 хоног = dashboard-ын -14..+14 цонх + долоо хоногийн статистик + streak-ийн
// боломжит уртыг (~1 сар) хангана.
const DAILY_LOG_LOOKBACK_DAYS = 35;

const getUniqueInviteCode = async (transaction = null) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateInviteCode();
    const ref = doc(db, 'inviteCodes', code);
    const snap = transaction ? await transaction.get(ref) : await getDoc(ref);
    if (!snap.exists()) return code;
  }
  return `FAM-${Date.now().toString().slice(-6)}`;
};

// Owns every piece of state that comes from (or is written to) Firestore for
// the signed-in user's family: membership, members, per-member tasks, daily
// logs, meals, rewards, notification settings — plus the derived values that
// the screens render from that data. `onTaskCompleted` / `onTaskUncompleted`
// / `onRewardRedeemed` let the caller (App.jsx) own purely-visual side
// effects (toast text, confetti) while this hook keeps the exact same call
// order the monolithic App.jsx used to, so behaviour is unchanged.
export function useFamilyData({ user, selectedDate, onTaskCompleted, onTaskUncompleted, onRewardRedeemed, onSaveError }) {
  const [familyId, setFamilyId] = useState(null);
  const [familyProfile, setFamilyProfile] = useState(null);
  const [familySetupError, setFamilySetupError] = useState(null);
  const [familySetupLoading, setFamilySetupLoading] = useState(false);
  // Family документ бодитоор БАЙХГҮЙ болсон (owner устгасан г.м.) — ингэж
  // ялгахгүй бол App.jsx `familyId && !familyProfile` үед МӨНХ ачаалалд
  // орчихдог байв.
  const [familyMissing, setFamilyMissing] = useState(false);

  const [members, setMembers] = useState({});
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [tasksByMember, setTasksByMember] = useState({});
  const [dailyLogs, setDailyLogs] = useState({});
  const [meals, setMeals] = useState(defaultMeals);
  const [foodLogs, setFoodLogs] = useState({});
  const [familyRewards, setFamilyRewards] = useState(defaultFamilyRewards);
  const [notificationSettings, setNotificationSettings] = useState(defaultNotificationSettings);

  const saveTimeoutRef = useRef(null);
  // Debounce хийгдэж буй (хараахан серверт бичигдээгүй) task хадгалалт.
  // { key, generation, memberId, dateKey, userLog, pointsDelta, streak, ... }
  const pendingSaveRef = useRef(null);
  // Generation token: resetMonthlyProgress нь бүх pending debounced бичилтийг хүчингүй болгоно.
  // clearTimeout дангаараа хангалтгүй — аль хэдийн эхэлсэн async promise нь reset-ийн дараа ч хуучин төлөвөө бичих эрсдэлтэй.
  const saveGenerationRef = useRef(0);
  const dailyLogsRef = useRef(dailyLogs);
  const membersRef = useRef(members);

  useEffect(() => { dailyLogsRef.current = dailyLogs; }, [dailyLogs]);
  useEffect(() => { membersRef.current = members; }, [members]);

  const todayKey = getTodayDateKey();

  // Same reset the original onAuthStateChanged callback performed inline
  // whenever the user became signed-out.
  useEffect(() => {
    if (!user) {
      setFamilyId(null);
      setFamilyProfile(null);
      setMembers({});
      setSelectedMemberId(null);
    }
  }, [user]);

  useEffect(() => {
    if (!isFirebaseConfigured || !user || !db) return undefined;
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        const data = snap.exists() ? snap.data() : null;
        setFamilyId(data?.familyId || null);
        if (!data?.familyId) {
          setFamilyProfile(null);
          setMembers({});
          setSelectedMemberId(null);
        }
      },
      (err) => {
        console.error('User membership listener error:', err.code, err.message);
        setFamilySetupError(`${err.code || 'unknown'}: users/{uid} уншиж чадсангүй.`);
      }
    );
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !familyId) return undefined;
    const familyRef = doc(db, 'families', familyId);
    setFamilyMissing(false);
    const unsubscribe = onSnapshot(
      familyRef,
      (snap) => {
        if (!snap.exists()) {
          setFamilyProfile(null);
          // Owner гэр бүлийг устгасан тохиолдол — ачаалж байна гэсэн хуурамч
          // дэлгэцэнд боомилж болохгүй, setup руу буцаана.
          setFamilyMissing(true);
          setFamilySetupError('Гэр бүлийн дата олдсонгүй. Owner устгасан байж магадгүй — шинээр үүсгэх эсвэл өөр кодоор нэгдэнэ үү.');
          return;
        }
        setFamilyMissing(false);
        setFamilyProfile({ familyId, id: familyId, ...(snap.data() || {}) });
      },
      (err) => {
        console.error('Family profile listener error:', err.code, err.message);
        setFamilySetupError(`${err.code || 'unknown'}: families/{familyId} уншиж чадсангүй.`);
      }
    );
    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !familyId) return undefined;
    const membersCollectionRef = collection(db, 'families', familyId, 'members');
    const unsubscribe = onSnapshot(
      membersCollectionRef,
      (snap) => {
        const next = {};
        snap.forEach((item) => { next[item.id] = { uid: item.id, ...(item.data() || {}) }; });
        setMembers(next);
        setSelectedMemberId((current) => {
          if (current && next[current]) return current;
          const preferred = user?.uid && next[user.uid] ? user.uid : Object.keys(next)[0];
          return preferred || null;
        });
      },
      (err) => console.error('Members listener error:', err.code, err.message)
    );
    return () => unsubscribe();
  }, [familyId, user?.uid]);

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !familyId) return undefined;
    const tasksRef = collection(db, 'families', familyId, 'tasks');
    const unsubscribe = onSnapshot(
      tasksRef,
      (snap) => {
        const next = {};
        snap.forEach((item) => {
          const data = item.data() || {};
          // Хуучин/single-doc миграцын үлдэгдэл дотор null эсвэл object биш
          // элемент орсон бол normalizeTask дотор унаж app-ыг crash хийдэг
          // байсан — listener дотор шүүж арилгана.
          next[item.id] = Array.isArray(data.tasks)
            ? data.tasks.filter((entry) => entry && typeof entry === 'object').map(normalizeTask)
            : [];
        });
        setTasksByMember(next);
      },
      (err) => console.error('Tasks listener error:', err.code, err.message)
    );
    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !familyId) return undefined;
    const cutoffKey = formatDateKey(new Date(Date.now() - DAILY_LOG_LOOKBACK_DAYS * 24 * 60 * 60 * 1000));
    // dateKey нь 'YYYY-MM-DD' string тул '>= ' харьцуулалт лексикографаар зөв ажиллана.
    const logsRef = query(
      collection(db, 'families', familyId, 'dailyLogs'),
      where('dateKey', '>=', cutoffKey)
    );
    const unsubscribe = onSnapshot(
      logsRef,
      (snap) => {
        const next = {};
        snap.forEach((item) => {
          const data = item.data() || {};
          const dateKey = data.dateKey;
          const uid = data.uid;
          if (!dateKey || !uid) return;
          next[dateKey] = next[dateKey] || {};
          next[dateKey][uid] = { tasks: data.tasks || {}, mood: data.mood || null };
        });
        setDailyLogs(next);
      },
      (err) => console.error('Daily logs listener error:', err.code, err.message)
    );
    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !familyId) return undefined;
    const rewardsRef = collection(db, 'families', familyId, 'rewards');
    const unsubscribe = onSnapshot(
      rewardsRef,
      (snap) => {
        const rewards = [];
        snap.forEach((item) => rewards.push({ id: item.id, ...(item.data() || {}) }));
        const sorted = rewards.length ? rewards.sort((a, b) => (a.order || 0) - (b.order || 0)) : defaultFamilyRewards;
        setFamilyRewards(sorted.map((reward, idx) => ({ ...defaultFamilyRewards[idx], ...reward })));
      },
      (err) => console.error('Rewards listener error:', err.code, err.message)
    );
    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !familyId) return undefined;
    const mealRef = doc(db, 'families', familyId, 'meals', 'current');
    const notificationRef = doc(db, 'families', familyId, 'settings', 'notifications');
    const foodLogRef = doc(db, 'families', familyId, 'nutrition', 'foodLogs');
    const unsubMeals = onSnapshot(mealRef, (snap) => setMeals(snap.exists() ? (snap.data()?.meals || defaultMeals) : defaultMeals));
    const unsubNotifications = onSnapshot(notificationRef, (snap) => setNotificationSettings(snap.exists() ? { ...defaultNotificationSettings, ...(snap.data() || {}) } : defaultNotificationSettings));
    const unsubFoodLogs = onSnapshot(foodLogRef, (snap) => setFoodLogs(snap.exists() ? (snap.data()?.logs || {}) : {}));
    return () => { unsubMeals(); unsubNotifications(); unsubFoodLogs(); };
  }, [familyId]);

  const memberList = useMemo(() => Object.values(members || {}).sort((a, b) => (a.joinedAt || '').localeCompare(b.joinedAt || '')), [members]);
  const displayStats = useMemo(() => {
    const out = {};
    memberList.forEach((member) => {
      out[member.name || member.uid] = { points: member.points || 0, streak: member.streak || 0, uid: member.uid, role: member.role, avatar: member.avatar || '🙂', photoURL: member.photoURL || null };
    });
    return out;
  }, [memberList]);
  const defaultStatsForDisplay = useMemo(() => {
    const out = {};
    memberList.forEach((member) => { out[member.name || member.uid] = { points: 0, streak: 0 }; });
    return out;
  }, [memberList]);

  const currentMember = selectedMemberId ? members[selectedMemberId] : null;
  const selectedUserName = currentMember?.name || user?.email || 'Гишүүн';
  const currentUserMember = user?.uid ? members[user.uid] : null;
  const canManage = ['parent', 'admin'].includes(currentUserMember?.role);
  const totalFamilyPoints = memberList.reduce((sum, member) => sum + (member.points || 0), 0);

  // ── Урилгын баримтын гишүүдийн тоог АДМИН-ы апп тогтмол шинэчилнэ ──────
  // Нэгдэхээр буй хүн families/{id}/members-ийг УНШИХ эрхгүй (дүрэм:
  // read if isFamilyMember) тул "бүлэг дүүрсэн үү?" гэдгийг зөвхөн
  // inviteCodes/{code} баримтаас мэдэж чадна. Админ энд memberCount-ыг
  // бичиж, дүүрсэн үед active:false болгоно (хос = 2 хүн, хувь хүн = 1).
  // Гишүүн хасагдвал буцаад идэвхжинэ. Дүрэм: update if isAdmin(familyId).
  const inviteSyncRef = useRef('');
  const inviteCodeForSync = familyProfile?.inviteCode || '';
  const groupTypeForSync = familyProfile?.groupType;
  useEffect(() => {
    if (!db || !canManage || !familyId || !inviteCodeForSync) return;
    const max = getGroupTypeMeta(groupTypeForSync).maxMembers;
    const count = memberList.length;
    const active = max > 1 && count < max;
    const signature = `${inviteCodeForSync}:${count}:${active}`;
    if (inviteSyncRef.current === signature) return;
    inviteSyncRef.current = signature;
    setDoc(doc(db, 'inviteCodes', inviteCodeForSync), {
      memberCount: count,
      maxMembers: max,
      active,
      updatedAt: serverTimestamp(),
    }, { merge: true }).catch((e) => {
      // Амжилтгүй болох нь эгзэгтэй биш — зөвхөн "дүүрсэн" шалгалт хоцорно.
      console.warn('Invite code sync error:', e?.code, e?.message);
    });
  }, [canManage, familyId, inviteCodeForSync, groupTypeForSync, memberList]);

  const baseTasks = useMemo(() => {
    const tasks = selectedMemberId ? tasksByMember[selectedMemberId] : [];
    return Array.isArray(tasks) ? tasks.map(normalizeTask) : [];
  }, [tasksByMember, selectedMemberId]);

  // Memoized — P2.4: timer tick бүрт шинэ object identity үүсгэвэл
  // memoized TaskCard/Dashboard хэрэггүй болно.
  const logsForSelectedDate = useMemo(
    () => (selectedMemberId ? dailyLogs?.[selectedDate]?.[selectedMemberId] || { tasks: {}, mood: null } : { tasks: {}, mood: null }),
    [dailyLogs, selectedMemberId, selectedDate]
  );
  const currentDisplayTasks = useMemo(() => baseTasks.map((task) => {
    const log = logsForSelectedDate.tasks?.[task.id] || {};
    return {
      ...task,
      done: Boolean(log.done),
      inputValue: log.inputValue || '',
      selectedOptions: Array.isArray(log.selectedOptions) ? log.selectedOptions : [],
      // detailType-ийн шинэ утгууд. applyTaskLogUpdate нь логийг
      // `{ ...existing, ...updates }` гэж нийлүүлдэг тул эдгээрийг нэмэхэд
      // хадгалалтын логик өөрчлөгдөхгүй — зөвхөн УНШИХ талыг нь энд нээнэ.
      hoursValue: Number.isFinite(Number(log.hoursValue)) && log.hoursValue !== null ? Number(log.hoursValue) : null,
      countValue: Number(log.countValue) || 0,
      startedAt: log.startedAt || '',
      endedAt: log.endedAt || '',
    };
  }), [baseTasks, logsForSelectedDate]);
  const completedCount = currentDisplayTasks.filter((task) => task.done).length;
  const requiredCount = currentDisplayTasks.filter((task) => task.required !== false).length;
  const remainingCount = Math.max(currentDisplayTasks.length - completedCount, 0);
  const progress = currentDisplayTasks.length > 0 ? Math.round((completedCount / currentDisplayTasks.length) * 100) : 0;
  const currentMood = logsForSelectedDate.mood || null;

  const weeklyReport = useMemo(() => {
    const keys = getWeekAgoKeys();
    let completed = 0;
    let possible = 0;
    const perMember = {};
    memberList.forEach((member) => {
      const tasks = tasksByMember[member.uid] || [];
      keys.forEach((key) => {
        const required = tasks.filter((task) => task.required !== false);
        possible += required.length;
        const taskLogs = dailyLogs?.[key]?.[member.uid]?.tasks || {};
        const doneCount = required.filter((task) => taskLogs?.[task.id]?.done).length;
        completed += doneCount;
        perMember[member.uid] = (perMember[member.uid] || 0) + doneCount;
      });
    });
    // Хэн ч нэг ч дадал биелүүлээгүй бол "шилдэг" гэж эхний хүнийг харуулахгүй.
    const best = Object.entries(perMember).sort((a, b) => b[1] - a[1])[0];
    const bestUid = best && best[1] > 0 ? best[0] : null;
    return {
      completed,
      possible,
      rate: possible > 0 ? Math.round((completed / possible) * 100) : 0,
      bestMemberName: bestUid ? members[bestUid]?.name : '-',
    };
  }, [dailyLogs, memberList, members, tasksByMember]);

  const weeklyTrend = useMemo(() => {
    const keys = getWeekAgoKeys();
    return keys.map((key) => {
      const [y, m, d] = key.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const tasks = selectedMemberId ? (tasksByMember[selectedMemberId] || []).filter((task) => task.required !== false) : [];
      const taskLogs = selectedMemberId ? (dailyLogs?.[key]?.[selectedMemberId]?.tasks || {}) : {};
      const done = tasks.filter((task) => taskLogs?.[task.id]?.done).length;
      return { label: dayNamesShort[date.getDay()], rate: tasks.length ? Math.round((done / tasks.length) * 100) : 0, completed: done, possible: tasks.length };
    });
  }, [dailyLogs, selectedMemberId, tasksByMember]);

  const handleCreateFamily = async ({ familyName, displayName, avatar = '🙂', extraMembers = [], groupType = 'family' }) => {
    if (!isFirebaseConfigured || !user || !db) return setFamilySetupError('Firebase config болон login шаардлагатай.');
    const safeFamilyName = (familyName || '').trim() || 'Миний гэр бүл';
    // Танигдаагүй/хоосон утга АЮУЛГҮЙ 'family' рүү буулгана — доор бичих
    // getBaseTasks(safeGroupType, …) дуудлагууд ямагт хүчинтэй пак сонгоно.
    const safeGroupType = normalizeGroupType(groupType);
    const safeDisplayName = (displayName || '').trim() || user.email || 'Parent';
    const preparedExtraMembers = (Array.isArray(extraMembers) ? extraMembers : [])
      .filter((member) => member?.name?.trim())
      .slice(0, 6)
      .map((member, index) => ({
        uid: `profile_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
        name: member.name.trim(),
        avatar: member.avatar || '🙂',
      }));
    setFamilySetupError(null);
    setFamilyMissing(false);
    setFamilySetupLoading(true);
    try {
      const familyRef = doc(collection(db, 'families'));
      await runTransaction(db, async (transaction) => {
        // Duplicate-family хамгаалалт: users/{uid}.familyId аль хэдийн БОДИТО
        // гэр бүл рүү зааж байвал шинээр үүсгэхгүй — хуучинх нь рүү авто буцна
        // (users listener familyId-г татаж App гол дэлгэц рүү шилжүүлнэ).
        // Өмнө нь partial failure-ийн дараа дахин дарахад ХОЁР дахь гэр бүл
        // үүсгэдэг байв.
        const existingUserSnap = await transaction.get(doc(db, 'users', user.uid));
        const existingFamilyId = existingUserSnap.data()?.familyId;
        if (existingFamilyId && existingFamilyId !== familyRef.id) {
          const existingFamilySnap = await transaction.get(doc(db, 'families', existingFamilyId));
          if (existingFamilySnap.exists()) throw new Error('family-already-exists');
        }
        const inviteCode = await getUniqueInviteCode(transaction);
        const inviteRef = doc(db, 'inviteCodes', inviteCode);
        const memberRef = doc(db, 'families', familyRef.id, 'members', user.uid);
        const taskRef = doc(db, 'families', familyRef.id, 'tasks', user.uid);
        const userRef = doc(db, 'users', user.uid);
        transaction.set(familyRef, {
          familyId: familyRef.id,
          familyName: safeFamilyName,
          groupType: safeGroupType,
          inviteCode,
          ownerUid: user.uid,
          // "1 сарын аялал"-ын мөчлөг эхэлсэн өдөр (PLAN_V2 §6). Шинэ сар
          // эхлүүлэх бүрд шинэчлэгдэнэ. createdAt нь serverTimestamp тул
          // клиент талд шууд уншигдахгүй байх мөч бий — тиймээс огнооны
          // түлхүүрийг ТУСДАА, энгийн string-ээр хадгална.
          cycleStartKey: getTodayDateKey(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        // Эзний role: groupType-ийн 'admin' string ('family'→'parent',
        // бусад→'admin'). canManage нь ['parent','admin'] хоёуланг зөвшөөрдөг
        // тул энэ өөрчлөлт хуучин 'family' урсгалд ХЭВИЙН ажиллана.
        const ownerRole = getGroupTypeMeta(safeGroupType).roles.admin;
        transaction.set(memberRef, {
          uid: user.uid,
          name: safeDisplayName,
          avatar,
          role: ownerRole,
          points: 0,
          streak: 0,
          joinedAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        });
        transaction.set(taskRef, { uid: user.uid, tasks: getBaseTasks(safeGroupType, false), updatedAt: serverTimestamp() });
        // Урилгын документэд groupType/maxMembers-ийг ХУУЛЖ хадгална.
        // Шалтгаан: нэгдэж буй хүн families/{id} баримтыг УНШИХ эрхгүй
        // (дүрэм: read if isFamilyMember) — харин inviteCodes/{code}-г get
        // хийж чадна. Тиймээс нэгдэх урсгалд хэрэгтэй мэдээллийг энд байрлуулав.
        // personal бүлэгт урилга ОГТ хэрэггүй тул шууд идэвхгүй үүснэ —
        // ингэснээр ганцаараа хөтлөх хөтөлбөрт хэн ч нэгдэж чадахгүй.
        const inviteMaxMembers = getGroupTypeMeta(safeGroupType).maxMembers;
        transaction.set(inviteRef, {
          code: inviteCode,
          familyId: familyRef.id,
          familyName: safeFamilyName,
          ownerUid: user.uid,
          groupType: safeGroupType,
          maxMembers: inviteMaxMembers,
          active: inviteMaxMembers > 1,
          createdAt: serverTimestamp(),
        });
        transaction.set(userRef, { uid: user.uid, familyId: familyRef.id, displayName: safeDisplayName, avatar, role: ownerRole, updatedAt: serverTimestamp() }, { merge: true });
      });

      // Головой transaction амжилттай болсны дараах seed batch-ууд. Эдгээр нь
      // унасан ч хэрэглэгчийг боомилж болохгүй: listeners байхгүй үед default
      // meals/rewards харуулдаг тул app хэвийн ажиллана. Зөвхөн мэдэгдэл өгнө.
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'families', familyRef.id, 'meals', 'current'), { meals: defaultMeals, updatedAt: serverTimestamp() }, { merge: true });
        batch.set(doc(db, 'families', familyRef.id, 'settings', 'notifications'), { ...defaultNotificationSettings, updatedAt: serverTimestamp() }, { merge: true });
        defaultFamilyRewards.forEach((reward, index) => {
          batch.set(doc(db, 'families', familyRef.id, 'rewards', reward.id), { ...reward, order: index, status: 'locked', redeemedAt: null, updatedAt: serverTimestamp() }, { merge: true });
        });
        await batch.commit();
      } catch (seedError) {
        console.error('Family seed batch error (non-fatal):', seedError.code, seedError.message);
        onSaveError?.('Гэр бүл үүслээ, гэхдээ анхны тохиргоо зарим хэсэг нь хадгалагдаагүй — дараа дахин оролдоно уу.');
      }

      // Managed child profiles are added after the owner transaction so Firestore
      // can authorize the parent role. Small batches stay below rules access limits.
      for (let start = 0; start < preparedExtraMembers.length; start += 3) {
        try {
          const memberBatch = writeBatch(db);
          preparedExtraMembers.slice(start, start + 3).forEach((member) => {
            memberBatch.set(doc(db, 'families', familyRef.id, 'members', member.uid), {
              uid: member.uid,
              name: member.name,
              avatar: member.avatar,
              role: getGroupTypeMeta(safeGroupType).roles.member,
              points: 0,
              streak: 0,
              joinedAt: new Date().toISOString(),
              managedByUid: user.uid,
              updatedAt: serverTimestamp(),
            });
            memberBatch.set(doc(db, 'families', familyRef.id, 'tasks', member.uid), {
              uid: member.uid,
              // isKid=true семантик зөвхөн 'family' төрөлд ач холбогдолтой
              // (нойрны зөвлөмж өөрчлөгдөнө) — бусад төрөлд аюулгүйгээр
              // үл тоомсорлогдоно.
              tasks: getBaseTasks(safeGroupType, true),
              updatedAt: serverTimestamp(),
            });
          });
          await memberBatch.commit();
        } catch (childError) {
          console.error('Child profile batch error (non-fatal):', childError.code, childError.message);
          onSaveError?.('Зарим гишүүний профайл нэмэгдээгүй — Settings дээр дахин нэмж болно.');
        }
      }
    } catch (e) {
      if (e.message === 'family-already-exists') {
        // Дuplicate үүсгэхийн оронд хуучин гэр бүл рүү буцахыг тайлбарлана —
        // users listener одоогийн familyId-г аль хэдийн татах ёстой.
        setFamilySetupError('Та аль хэдийн гэр бүлтэй байна. Апп түүн рүү автоматаар шилжих ёстой; хэрэв шилжээгүй бол аппыг дахин нээнэ үү.');
        return;
      }
      console.error('Create family error:', e.code, e.message);
      setFamilySetupError(`${e.code || 'unknown'}: Гэр бүл үүсгэж чадсангүй.`);
    } finally {
      setFamilySetupLoading(false);
    }
  };

  const handleJoinFamily = async ({ inviteCode, displayName, avatar = '🙂' }) => {
    if (!isFirebaseConfigured || !user || !db) return setFamilySetupError('Firebase config болон login шаардлагатай.');
    const cleanCode = sanitizeInviteCode(inviteCode);
    const safeDisplayName = (displayName || '').trim() || user.email || 'Member';
    if (!cleanCode) return setFamilySetupError('Invite code оруулна уу.');
    setFamilySetupError(null);
    setFamilySetupLoading(true);
    let stagedFamilyId = null;
    let stagedGroupType = null;
    try {
      await runTransaction(db, async (transaction) => {
        const inviteRef = doc(db, 'inviteCodes', cleanCode);
        const inviteSnap = await transaction.get(inviteRef);
        if (!inviteSnap.exists() || inviteSnap.data()?.active === false) throw new Error('invite-code-not-found');
        const targetFamilyId = inviteSnap.data()?.familyId;
        if (!targetFamilyId) throw new Error('invite-code-broken');

        // ЗАСВАР (permission-denied): нэгдэхээс ӨМНӨ families/{id} болон
        // tasks/{uid}-г transaction.get хийдэг байсан. Дүрэм дээр эдгээрийг
        // унших нь isFamilyMember() шаарддаг тул шинэ гишүүнд ҮРГЭЛЖ
        // permission-denied өгч, хэн ч урилгаар нэгдэж чаддаггүй байв.
        // Одоо зөвхөн урилгын баримтыг уншина (get нь signedIn-д нээлттэй);
        // гэр бүл/дадлын баримтыг гишүүн болсны ДАРАА шалгана.
        stagedFamilyId = targetFamilyId;
        const targetGroupType = normalizeGroupType(inviteSnap.data()?.groupType);
        stagedGroupType = targetGroupType;

        // Бүлгийн хязгаараас хэтэрсэн эсэх. Гишүүдийн жагсаалтыг нэгдэхээс
        // ӨМНӨ унших эрхгүй тул тоог урилгын баримт дээрх memberCount-оос
        // шалгана (админы апп доорх useEffect-ээр шинэчилж байдаг).
        const inviteMax = Number(inviteSnap.data()?.maxMembers) || 0;
        const inviteCount = Number(inviteSnap.data()?.memberCount) || 0;
        if (inviteMax > 0 && inviteCount >= inviteMax) throw new Error('family-full');

        const memberRef = doc(db, 'families', targetFamilyId, 'members', user.uid);
        const userRef = doc(db, 'users', user.uid);

        // FIRESTORE ДҮРЭМ ЗААВАЛ 'member' ЛИТЕРАЛ шаарддаг (members/{uid}
        // create дүрлийн 3-р зам: `request.resource.data.role == 'member'`,
        // FIRESTORE_RULES.txt) — groupType-ийн member string-ийг хэрэглэвэл
        // family-с бусад бүх төрөлд утга ЯГ 'member' тул нөлөөгүй, харин
        // family горимд ч энд ЗОРИУДААР 'member' үлдээнэ ('child' биш) —
        // учир нь энэ бол ӨӨРӨӨ урилгаар нэгдэж буй насанд хүрсэн хүн,
        // handleCreateFamily-ийн 'child' профайлаас ӨӨР эрхийн зам юм.
        transaction.set(memberRef, {
          uid: user.uid,
          name: safeDisplayName,
          avatar,
          role: 'member',
          points: 0,
          streak: 0,
          joinedAt: new Date().toISOString(),
          // Аль урилгын кодоор нэгдснийг гишүүний документ дээр үлдээнэ.
          // Firestore-ийн шинэчилсэн дүрэм үүнийг шалгаж, тухайн код
          // ҮНЭХЭЭР энэ гэр бүлийнх мөн эсэхийг баталгаажуулна. Үүнгүйгээр
          // нэвтэрсэн хэн ч дурын гэр бүлд өөрийгөө нэмж чаддаг байсан.
          joinedWithInviteCode: cleanCode,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        transaction.set(userRef, { uid: user.uid, familyId: targetFamilyId, displayName: safeDisplayName, avatar, role: 'member', joinedWithInviteCode: cleanCode, updatedAt: serverTimestamp() }, { merge: true });
      });
      // Одоо гишүүн болсон тул унших эрхтэй. Дадлын жагсаалт байхгүй бол
      // (дахин нэгдэж буй хүний хуучин дадлыг ДАРАХГҮЙ) анхны багцыг бичнэ.
      try {
        const taskRef = doc(db, 'families', stagedFamilyId, 'tasks', user.uid);
        const taskSnap = await getDoc(taskRef);
        if (!taskSnap.exists()) {
          await setDoc(taskRef, { uid: user.uid, tasks: getBaseTasks(stagedGroupType, false), updatedAt: serverTimestamp() });
        }
      } catch (taskErr) {
        // Эгзэгтэй биш: гишүүнчлэл аль хэдийн бичигдсэн, дадлаа дараа нэмж болно.
        console.warn('Join: default tasks error:', taskErr?.code, taskErr?.message);
      }
    } catch (e) {
      console.error('Join family error:', e.code, e.message);
      const reason = e.message === 'invite-code-not-found'
        ? 'Ийм invite code-той бүлэг олдсонгүй.'
        : e.message === 'family-full'
          ? 'Энэ бүлэг дүүрсэн байна — гишүүдийн тоо дээд хязгаартаа хүрсэн.'
          : 'Бүлэгт нэгдэхэд алдаа гарлаа.';
      setFamilySetupError(`${e.code || e.message || 'unknown'}: ${reason}`);
    } finally {
      setFamilySetupLoading(false);
    }
  };

  const resetFamilyState = () => {
    // Гараас товчоос хамаарахгүй бүх family-хамаатай state-г цэвэрлэнэ —
    // logout эсвэл өөр account руу шилжих үед өмнөх гишүүний meals/rewards/
    // логууд дэлгэцэн дээр цацрагддаг (cross-account bleed) байсан.
    saveGenerationRef.current += 1;
    pendingSaveRef.current = null;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setFamilyId(null);
    setFamilyProfile(null);
    setMembers({});
    setSelectedMemberId(null);
    setTasksByMember({});
    setDailyLogs({});
    setMeals(defaultMeals);
    setFamilyRewards(defaultFamilyRewards);
    setNotificationSettings(defaultNotificationSettings);
    setFamilySetupError(null);
    setFamilyMissing(false);
    dailyLogsRef.current = {};
    membersRef.current = {};
  };

  // Unmount үед хүлээгдэж буй хадгалалтыг ХАЯХГҮЙ — шууд бичнэ.
  const flushOnUnmountRef = useRef(null);
  useEffect(() => () => { flushOnUnmountRef.current?.(); }, []);

  // part: 'all' | 'tasks' | 'mood'. Task хадгалалт mood-ыг, mood хадгалалт
  // tasks-ийг БИЧИХГҮЙ — өмнө нь дадал тэмдэглээд 350ms дотор сэтгэл зүй
  // сонговол хойно ирсэн task бичилт mood-ыг хуучин утгаар нь дарж устгадаг байв.
  const persistDailyLog = async (uid, dateKey, nextLog, part = 'all') => {
    if (!isFirebaseConfigured || !db || !familyId || !uid) return;
    const payload = { uid, dateKey, updatedAt: serverTimestamp() };
    if (part !== 'mood') payload.tasks = nextLog.tasks || {};
    if (part !== 'tasks') payload.mood = nextLog.mood || null;
    await setDoc(doc(db, 'families', familyId, 'dailyLogs', `${dateKey}_${uid}`), payload, { merge: true });
  };

  // Оноо/streak шинэчлэлт одоо Firestore transaction дотор явагдна: серверийн
  // баталгаажсан points утга дээр суурилж delta нэмэх/хасахаар тооцоолно —
  // хоёр төхөөрөмж зэрэг хадгалахад сүүлийн бичилт анхны утгыг дарж алдах
  // (lost update) асуудал арилна. Streak нь клиент дээр өдрүүдийн логаас
  // тооцоологдоохороо хэвээр (семантик өөрчлөгдөөгүй). Transaction callback
  // дотор ямар ч side effect (setState, feedback) хийхгүй.
  const commitMemberStats = async (uid, pointsDelta, streak) => {
    if (!isFirebaseConfigured || !db || !familyId || !uid) return;
    await runTransaction(db, async (transaction) => {
      const memberRef = doc(db, 'families', familyId, 'members', uid);
      const snap = await transaction.get(memberRef);
      const currentPoints = Number(snap.exists() ? snap.data()?.points : 0) || 0;
      const nextPoints = Math.max(0, currentPoints + pointsDelta);
      transaction.set(memberRef, { points: nextPoints, streak, updatedAt: serverTimestamp() }, { merge: true });
      return nextPoints;
    });
  };

  const canWriteMemberLogs = (targetUid) => Boolean(targetUid)
    && (targetUid === user?.uid || canManage);

  // P2.2: ирээдүйн огноо (+1..+14) зөвхөн ХАРАХ боломжтой — бичилт хориулах
  // guard-ийг БҮХ task mutation замд нэг дор шалгана (UI disabled-аас гадна
  // backstop). dateKey string харьцуулалт chronologically зөв ажиллана.
  const isFutureSelection = () => Boolean(selectedDate && todayKey && selectedDate > todayKey);
  const rejectFutureWrite = () => {
    onSaveError?.('Ирээдүйн өдөр дээр дадал тэмдэглэх боломжгүй. Өнөөдөр, эсвэл өнгөрсөн өдрийг сонгоно уу.');
  };

  // Амжилтгүй persistence-ийн дараа optimistic state-г буцаана. Хэрэв завсар
  // дамжин серверийн шинэ snapshot ирсэн бол (ref identity таарахгүй) revert
  // хийхгүй — snapshot аль хэдийн үнэнийг сэргээсэн.
  const revertFailedTaskSave = (dateKey, uid, prevUserLog, writtenUserLog, prevStats, writtenStats) => {
    const currentLogs = dailyLogsRef.current || {};
    if (currentLogs?.[dateKey]?.[uid] === writtenUserLog) {
      const restoredLogs = {
        ...currentLogs,
        [dateKey]: { ...(currentLogs[dateKey] || {}), [uid]: prevUserLog },
      };
      dailyLogsRef.current = restoredLogs;
      setDailyLogs(restoredLogs);
    }
    const currentMembers = membersRef.current || {};
    const currentMemberEntry = currentMembers[uid];
    if (currentMemberEntry && currentMemberEntry.points === writtenStats.points && currentMemberEntry.streak === writtenStats.streak) {
      const restoredMembers = {
        ...currentMembers,
        [uid]: { ...currentMemberEntry, points: prevStats.points, streak: prevStats.streak },
      };
      membersRef.current = restoredMembers;
      setMembers(restoredMembers);
    }
  };

  // БҮХ log бичилтийн цөм. Done/points төлөвийг ЗААВАЛ dailyLogsRef.current
  // (sync ref)-ээс уншдаг — render-scope React state нь double-tap race-д
  // хуучирч, оноог хоёр удаа өгдөг байсан. Persistence амжилтгүй бол
  // optimistic state-г буцаагаад onSaveError-гоор мэдэгдэнэ.
  const applyTaskLogUpdate = (taskId, updates, pointsChange, celebrateOnPoints = true) => {
    if (!selectedMemberId) return;
    const currentDailyLogs = dailyLogsRef.current || {};
    const dayLogs = currentDailyLogs?.[selectedDate] || {};
    const existingUserLog = dayLogs?.[selectedMemberId] || { tasks: {}, mood: null };
    const existingTaskLog = existingUserLog.tasks?.[taskId] || { done: false, inputValue: '', selectedOptions: [] };
    const nextUserLog = {
      ...existingUserLog,
      tasks: {
        ...(existingUserLog.tasks || {}),
        [taskId]: { ...existingTaskLog, ...updates },
      },
    };
    const nextDailyLogs = {
      ...currentDailyLogs,
      [selectedDate]: { ...dayLogs, [selectedMemberId]: nextUserLog },
    };
    dailyLogsRef.current = nextDailyLogs;
    setDailyLogs(nextDailyLogs);

    const currentMembers = membersRef.current || {};
    const memberForStats = currentMembers[selectedMemberId] || {};
    const epochKey = memberForStats.streakResetKey || null;
    const recalculatedStreak = calculateStreak(nextDailyLogs, baseTasks, selectedMemberId, todayKey, epochKey);
    const prevStats = { points: memberForStats.points || 0, streak: memberForStats.streak || 0 };
    const nextPoints = Math.max(0, prevStats.points + pointsChange);
    const nextMembers = { ...currentMembers, [selectedMemberId]: { ...(currentMembers[selectedMemberId] || {}), points: nextPoints, streak: recalculatedStreak } };
    membersRef.current = nextMembers;
    setMembers(nextMembers);

    // ЗАСВАР: өмнө нь шинэ дарлт бүр өмнөх timeout-ийг ЦУЦАЛДАГ байсан тул
    //  (1) 350ms дотор 2 дадал тэмдэглэвэл эхнийх нь оноо серверт ОРДОГГҮЙ,
    //  (2) тэмдэглээд шууд буцаавал серверт зөвхөн -оноо очиж оноо БУУРДАГ,
    //  (3) гишүүн/өдөр солимогц өмнөх лог бүхэлдээ АЛГА болдог байв.
    // Одоо ижил (гишүүн+өдөр) бичилтийн оноог хуримтлуулна, түлхүүр
    // өөрчлөгдвөл өмнөх бичилтийг ШУУД хадгална.
    const saveKey = `${selectedMemberId}|${selectedDate}`;
    if (pendingSaveRef.current && pendingSaveRef.current.key !== saveKey) flushPendingSave();
    const samePending = pendingSaveRef.current;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    pendingSaveRef.current = {
      key: saveKey,
      generation: saveGenerationRef.current,
      memberId: selectedMemberId,
      dateKey: selectedDate,
      userLog: nextUserLog,
      pointsDelta: (samePending?.pointsDelta || 0) + pointsChange,
      streak: recalculatedStreak,
      prevUserLog: samePending ? samePending.prevUserLog : existingUserLog,
      prevStats: samePending ? samePending.prevStats : prevStats,
      writtenStats: { points: nextPoints, streak: recalculatedStreak },
      lastPointsChange: pointsChange,
      celebrate: celebrateOnPoints,
    };
    saveTimeoutRef.current = setTimeout(flushPendingSave, 350);
  };

  const runPendingSave = async (pending) => {
    const { generation, memberId, dateKey, userLog, pointsDelta, streak, prevUserLog, prevStats, writtenStats, lastPointsChange, celebrate } = pending;
    // Generation check: reset/logout аль хэдийн шинэ үе эхлүүлсэн бол хуучин төлөвөө бичихгүй
    if (generation !== saveGenerationRef.current) return;
    try {
      await persistDailyLog(memberId, dateKey, userLog, 'tasks');
      if (generation !== saveGenerationRef.current) return;
      await commitMemberStats(memberId, pointsDelta, streak);
      if (generation !== saveGenerationRef.current) return;
      // Feedback зөвхөн persistence АМЖИЛТТАЙ болсны ДАРАА.
      if (lastPointsChange !== 0 && celebrate) {
        if (lastPointsChange > 0) {
          successFeedback();
          onTaskCompleted?.(lastPointsChange);
        } else {
          selectionFeedback();
          onTaskUncompleted?.();
        }
      }
    } catch (e) {
      if (generation !== saveGenerationRef.current) return;
      console.error('Task save error:', e.code, e.message);
      revertFailedTaskSave(dateKey, memberId, prevUserLog, userLog, prevStats, writtenStats);
      onSaveError?.('Дадлын мэдээллийг хадгалж чадсангүй. Интернэт холболтоо шалгаад дахин оролдоно уу.');
    }
  };

  function flushPendingSave() {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const pending = pendingSaveRef.current;
    pendingSaveRef.current = null;
    if (pending) runPendingSave(pending);
  }
  flushOnUnmountRef.current = flushPendingSave;

  const toggleTask = (id, forceState = null) => {
    if (!selectedMemberId || isFutureSelection()) {
      if (isFutureSelection()) rejectFutureWrite();
      return;
    }
    // Ownership guard: гишүүн зөвхөн ӨӨРИЙН лог бичих эрхтэй (Firestore rules
    // dailyLogs.uid == auth.uid эсвэл isAdmin). UI болон write logic хоёуланд
    // нь ижил invariant-ыг шалгана.
    if (!canWriteMemberLogs(selectedMemberId)) {
      onSaveError?.('Энэ гишүүний дадлыг зөвхөн өөрөө, эсвэл эцэг эх/админ удирдаж чадна.');
      return;
    }
    // Existence guard: зорилтот гишүүний ЖИНХЭЭР task жагсаалтаас хайх.
    // Render-scope baseTasks нь гишүүн солигдох мөчид хуучирч, swipe animation
    // дуусахад phantom бичилт өөр хүний лог рүү ордог байсан.
    const task = (tasksByMember[selectedMemberId] || []).find((item) => item.id === id);
    if (!task) return;

    // Single source of truth: одоогийн done төлөвийг sync ref-ээс уншина.
    const currentLog = dailyLogsRef.current?.[selectedDate]?.[selectedMemberId]?.tasks?.[id] || { done: false };
    const isNowDone = forceState !== null ? Boolean(forceState) : !currentLog.done;
    if (Boolean(currentLog.done) === isNowDone) return; // давхар даралт → idempotent
    const points = Number(task.points || 10);
    const updates = { done: isNowDone };
    // Эхний цаг нь "яг одоогийн цаг" (хэрэглэгчийн хүсэлт №6). Зөвхөн:
    //   - дадлыг ДУУСГАЖ байгаа үед (буцаахад биш),
    //   - урьд нь цаг тэмдэглэгдээгүй бол (дахин дарахад дарж бичихгүй),
    //   - сонгосон өдөр нь ӨНӨӨДӨР бол — өчигдрийн логийг өнөөдрийн цагаар
    //     тамгалах нь худал бичлэг үүсгэнэ.
    if (isNowDone && task.trackTime !== false && !currentLog.startedAt && selectedDate === todayKey) {
      const now = new Date();
      updates.startedAt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
    applyTaskLogUpdate(id, updates, isNowDone ? points : -points);
  };

  const toggleOption = (taskId, optionStr) => {
    if (!selectedMemberId) return;
    if (isFutureSelection()) { rejectFutureWrite(); return; }
    if (!canWriteMemberLogs(selectedMemberId)) {
      onSaveError?.('Энэ гишүүний дадлыг зөвхөн өөрөө, эсвэл эцэг эх/админ удирдаж чадна.');
      return;
    }
    const task = (tasksByMember[selectedMemberId] || []).find((item) => item.id === taskId);
    if (!task) return;
    const currentLog = dailyLogsRef.current?.[selectedDate]?.[selectedMemberId]?.tasks?.[taskId]
      || { done: false, selectedOptions: [] };
    const currentOptions = Array.isArray(currentLog.selectedOptions) ? currentLog.selectedOptions : [];
    const newOptions = currentOptions.includes(optionStr) ? currentOptions.filter((item) => item !== optionStr) : [...currentOptions, optionStr];
    const wasDone = Boolean(currentLog.done);
    const isNowDone = newOptions.length > 0;
    const points = Number(task.points || 10);
    const pointsChange = wasDone === isNowDone ? 0 : isNowDone ? points : -points;
    // Option сонголтоор гүйцэтгэх үед өмнө нь celebration хийдэггүй байсан —
    // семантикийг хадгалахын тулд celebrateOnPoints=false.
    applyTaskLogUpdate(taskId, { selectedOptions: newOptions, done: isNowDone }, pointsChange, false);
  };

  // Input бичих зам (pointsChange хэрэглэхгүй) — ижил ownership/existence
  // guard-уудтай, оноо өөрчлөхгүй.
  const updateTaskLog = (taskId, updates) => {
    if (!selectedMemberId || !canWriteMemberLogs(selectedMemberId)) return;
    if (isFutureSelection()) return;
    if (!(tasksByMember[selectedMemberId] || []).some((item) => item.id === taskId)) return;
    applyTaskLogUpdate(taskId, updates, 0);
  };

  const handleMoodSelect = async (mood) => {
    if (!selectedMemberId) return;
    if (isFutureSelection()) { rejectFutureWrite(); return; }
    if (!canWriteMemberLogs(selectedMemberId)) {
      onSaveError?.('Сэтгэл зүйг зөвхөн өөрөө, эсвэл эцэг эх/админ тэмдэглэж чадна.');
      return;
    }
    // Sync ref-ээс уншиж, ref-ээ шинэчилнэ — эс тэгвэл дараагийн task
    // бичилт хуучин mood-той лог дээр суурилна.
    const memberId = selectedMemberId;
    const dateKey = selectedDate;
    const currentLogs = dailyLogsRef.current || {};
    const dayLogs = currentLogs[dateKey] || {};
    const prevMood = dayLogs[memberId]?.mood || null;
    const nextUserLog = { ...(dayLogs[memberId] || { tasks: {}, mood: null }), mood };
    const nextLogs = { ...currentLogs, [dateKey]: { ...dayLogs, [memberId]: nextUserLog } };
    dailyLogsRef.current = nextLogs;
    setDailyLogs(nextLogs);
    try { await persistDailyLog(memberId, dateKey, nextUserLog, 'mood'); }
    catch (e) {
      console.error('Mood save error:', e.code, e.message);
      // Optimistic утгыг буцаана (хооронд өөр утга сонгогдоогүй бол).
      const latest = dailyLogsRef.current || {};
      const latestUserLog = latest?.[dateKey]?.[memberId];
      if (latestUserLog && latestUserLog.mood === mood) {
        const restored = { ...latest, [dateKey]: { ...(latest[dateKey] || {}), [memberId]: { ...latestUserLog, mood: prevMood } } };
        dailyLogsRef.current = restored;
        setDailyLogs(restored);
      }
      onSaveError?.('Сэтгэл зүйг хадгалж чадсангүй. Дахин оролдоно уу.');
    }
  };

  // ── Зураг: гишүүний аватар ба гэр бүлийн нүүрний зураг ────────────────
  // Зургийг Firebase Storage руу эхлээд байршуулаад (services/photos.js),
  // ЗӨВХӨН гарч ирсэн URL-ыг энд Firestore-д бичнэ. Storage-ийн upload
  // амжилтгүй бол Firestore огт хөндөгдөхгүй — "зураг байхгүй URL" үүсэхгүй.
  const saveMemberPhoto = async (uid, photoURL) => {
    if (!isFirebaseConfigured || !db || !familyId || !uid) return { ok: true, local: true };
    // Optimistic: listener эргэж ирэхээс өмнө шинэ зураг харагдана.
    const prevMembers = membersRef.current || {};
    const nextMembers = { ...prevMembers, [uid]: { ...(prevMembers[uid] || {}), photoURL } };
    membersRef.current = nextMembers;
    setMembers(nextMembers);
    try {
      await setDoc(doc(db, 'families', familyId, 'members', uid), { photoURL, updatedAt: serverTimestamp() }, { merge: true });
      return { ok: true };
    } catch (e) {
      console.error('Save member photo error:', e.code, e.message);
      membersRef.current = prevMembers;
      setMembers(prevMembers);
      // Дүрэм дээр 'photoURL' нь өөрийн гишүүний засварлаж болох талбарын
      // жагсаалтад байх ёстой (FIRESTORE_RULES.txt, members/{uid} update).
      return { ok: false, message: 'Зургийг хадгалж чадсангүй. Firestore дүрмээ шинэчилсэн эсэхээ шалгана уу.' };
    }
  };

  const saveFamilyCover = async (photoURL) => {
    if (!isFirebaseConfigured || !db || !familyId) return { ok: true, local: true };
    if (!canManage) return { ok: false, message: 'Нүүрний зургийг зөвхөн эцэг эх/админ солино.' };
    try {
      await setDoc(doc(db, 'families', familyId), { coverPhotoURL: photoURL, updatedAt: serverTimestamp() }, { merge: true });
      return { ok: true };
    } catch (e) {
      console.error('Save family cover error:', e.code, e.message);
      return { ok: false, message: 'Нүүрний зургийг хадгалж чадсангүй. Дахин оролдоно уу.' };
    }
  };

  // Архивын жагсаалт — LIVE listener БИШ, зөвхөн хэрэглэгч "Архив" товч
  // дарах үед НЭГ удаа татна (PLAN_V2.md §4.2). Сар бүр ганцхан жижиг
  // баримт нэмэгддэг тул хуудаслалт (pagination) одоохондоо хэрэггүй.
  // Хувь хүний илчлэгийн зорилтод хэрэглэгдэх СОНГОЛТТОЙ биеийн үзүүлэлт.
  // ЗӨВХӨН нэвтэрсэн хүн ӨӨРИЙНХӨӨ баримтыг засна — Firestore дүрэм ч
  // яг үүнийг л зөвшөөрдөг тул UI болон дүрэм нэг invariant баримтална.
  // Хоосон утга дамжуулбал талбарыг цэвэрлэнэ (null) — хэрэглэгч мэдээллээ
  // буцааж устгах боломжтой байх ёстой.
  const saveMemberProfile = useCallback(async (profile) => {
    if (!db || !familyId || !user?.uid) return { ok: false, message: 'Нэвтэрч орно уу.' };
    const toNumOrNull = (value) => {
      if (value === '' || value === null || value === undefined) return null;
      const num = Number(value);
      return Number.isFinite(num) && num > 0 ? num : null;
    };
    const payload = {
      birthYear: toNumOrNull(profile?.birthYear),
      heightCm: toNumOrNull(profile?.heightCm),
      weightKg: toNumOrNull(profile?.weightKg),
      sex: profile?.sex === 'male' || profile?.sex === 'female' ? profile.sex : null,
      activityLevel: profile?.activityLevel || null,
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, 'families', familyId, 'members', user.uid), payload, { merge: true });
      return { ok: true };
    } catch (e) {
      console.error('Save member profile error:', e.code, e.message);
      return { ok: false, message: 'Мэдээллийг хадгалж чадсангүй. Дахин оролдоно уу.' };
    }
  }, [familyId, user?.uid]);

  const listArchives = useCallback(async () => {
    if (!isFirebaseConfigured || !db || !familyId) return { ok: true, archives: [] };
    try {
      const snap = await getDocs(query(collection(db, 'families', familyId, 'archives'), orderBy('monthKey', 'desc')));
      const archives = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      // Нэг сард хэд хэдэн архив байж болно (id нь мөчлөгөөр давтагдашгүй) —
      // хамгийн сүүлд дууссан мөчлөгийг эхэнд.
      archives.sort((a, b) => String(b.periodEnd || b.monthKey || '').localeCompare(String(a.periodEnd || a.monthKey || '')));
      return { ok: true, archives };
    } catch (e) {
      console.error('List archives error:', e.code, e.message);
      return { ok: false, message: 'Архивыг ачаалж чадсангүй. Дахин оролдоно уу.', archives: [] };
    }
  }, [familyId]);

  // Гэрээ: { ok:true } эсвэл { ok:false, message }. Өмнө нь setDoc унахад
  // барьдаггүй байсан тул unhandled rejection болж, UI "хадгалсан" мэт
  // харагдан засварын горим/модал гацдаг байв.
  const saveTasksForMember = async (uid, tasks) => {
    if (!uid) return { ok: false, message: 'Гишүүн сонгоогүй байна.' };
    const normalized = (Array.isArray(tasks) ? tasks : []).map(normalizeTask);
    const prevTasks = tasksByMember[uid] || [];
    setTasksByMember((prev) => ({ ...prev, [uid]: normalized }));
    if (!isFirebaseConfigured || !db || !familyId) return { ok: true, local: true };
    try {
      await setDoc(doc(db, 'families', familyId, 'tasks', uid), { uid, tasks: normalized, updatedAt: serverTimestamp() }, { merge: true });
      return { ok: true };
    } catch (e) {
      console.error('Save tasks error:', e.code, e.message);
      setTasksByMember((prev) => ({ ...prev, [uid]: prevTasks }));
      return { ok: false, message: 'Дадлын жагсаалтыг хадгалж чадсангүй. Интернэт холболтоо шалгаад дахин оролдоно уу.' };
    }
  };

  // Гэрээ: { ok:true } эсвэл { ok:false, message }. Batch commit амжилтгүй
  // бол дуудагч (Meals/Rewards screen) optimistic state-ээ буцаагаад алдааг
  // харуулах ЁСТОЙ — өмнө нь commit унасан ч UI "хадгалсан" гэж харагдаж,
  // local/cloud байнгын зөрүүтэй үлддэг байв. Demo горимд (Firebase тохиргоогүй)
  // локал засвар хэвийн ажиллах ёстой тул ok:true-гоор буцна.
  const saveToCloud = async (updates) => {
    if (!isFirebaseConfigured || !db || !familyId) return { ok: true, local: true };
    const batch = writeBatch(db);
    if (updates.meals) batch.set(doc(db, 'families', familyId, 'meals', 'current'), { meals: updates.meals, updatedAt: serverTimestamp() }, { merge: true });
    if (updates.foodLogs) batch.set(doc(db, 'families', familyId, 'nutrition', 'foodLogs'), { logs: updates.foodLogs, updatedAt: serverTimestamp() }, { merge: true });
    if (Array.isArray(updates.familyRewards)) {
      updates.familyRewards.forEach((reward, index) => batch.set(doc(db, 'families', familyId, 'rewards', reward.id), { ...reward, order: index, updatedAt: serverTimestamp() }, { merge: true }));
    }
    // P2.3-д userStats reset зам нь resetMonthlyProgress руу шилжсэн тул
    // энд хуучирсан салбар байхгүй.
    try {
      await batch.commit();
      return { ok: true };
    } catch (e) {
      console.error('saveToCloud error:', e.code, e.message);
      return { ok: false, message: 'Өөрчлөлтийг хадгалж чадсангүй. Интернэт холболтоо шалгаад дахин оролдоно уу.' };
    }
  };

  // Гэрээ saveToCloud-той адил: амжилтгүй бол { ok:false, message } буцаана,
  // local state-ээ хуучин утга руугаа буцаана — UI "хадгалсан" гэж худал
  // харагдахгүй байх зорилготой.
  const addFoodEntry = async (dateKey, entry) => {
    if (!dateKey || !entry) return { ok: false };
    const prevLogs = foodLogs;
    const dayEntries = [...(foodLogs?.[dateKey] || []), entry];
    const nextLogs = { ...(foodLogs || {}), [dateKey]: dayEntries };
    setFoodLogs(nextLogs);
    let result;
    try {
      result = await saveToCloud({ foodLogs: nextLogs });
    } catch {
      result = { ok: false };
    }
    if (!result?.ok) {
      setFoodLogs(prevLogs);
      return { ok: false, message: result?.message || 'Хоолны бүртгэл хадгалагдсангүй. Дахин оролдоно уу.' };
    }
    return { ok: true };
  };

  const removeFoodEntry = async (dateKey, entryId) => {
    if (!dateKey || !entryId) return { ok: false };
    const prevLogs = foodLogs;
    const dayEntries = (foodLogs?.[dateKey] || []).filter((item) => item.id !== entryId);
    const nextLogs = { ...(foodLogs || {}), [dateKey]: dayEntries };
    setFoodLogs(nextLogs);
    let result;
    try {
      result = await saveToCloud({ foodLogs: nextLogs });
    } catch {
      result = { ok: false };
    }
    if (!result?.ok) {
      setFoodLogs(prevLogs);
      return { ok: false, message: result?.message || 'Хоолны бүртгэл хадгалагдсангүй. Дахин оролдоно уу.' };
    }
    return { ok: true };
  };

  const handleRedeemReward = async (rewardId) => {
    if (!canManage || !rewardId || !familyId) return;
    const reward = familyRewards.find((item) => item.id === rewardId);
    if (!reward) return;
    const nextStatus = reward.status === 'redeemed' ? 'unlocked' : 'redeemed';
    // Энэ бол хамгийн сүүлд үлдсэн ХАМГААЛААГҮЙ Firestore бичилт байсан:
    // try/catch байхгүй тул сүлжээгүй эсвэл эрх дутуу үед `await setDoc` шидэж,
    // хэн ч барихгүй promise rejection болж, хэрэглэгч ямар ч мэдэгдэл авахгүй
    // байв. Одоо алдааг барьж toast-оор мэдэгдэнэ.
    try {
      await setDoc(doc(db, 'families', familyId, 'rewards', rewardId), {
        status: nextStatus,
        redeemedAt: nextStatus === 'redeemed' ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.error('Redeem reward error:', e.code, e.message);
      onSaveError?.('Урамшууллын төлөвийг хадгалж чадсангүй. Интернэт холболтоо шалгаад дахин оролдоно уу.');
      return;
    }
    if (nextStatus === 'redeemed') {
      successFeedback();
      onRewardRedeemed?.();
    }
  };

  // Агуулгын гэрээ: амжилтгүй бол { ok:false, message } буцаана бөгөөд ЯМААР
  // local state (setNotificationSettings) болон cloud-д enabled:true гэж
  // бичихгүй. Тиймээс scheduling-ийг state өөрчлөлтийн ӨМНӨ хийж, бүх алдааг
  // try/catch-аар барьна — эс тэгвэл UI switch "ON" харагдаад мэдэгдэл огт
  // ирэхгүй нөхцөл үүснэ.
  const saveNotificationSettings = async (nextSettings) => {
    const merged = { ...notificationSettings, ...nextSettings };
    const safe = {
      enabled: Boolean(merged.enabled),
      hour: Math.min(Math.max(Number(merged.hour ?? 20), 0), 23),
      minute: Math.min(Math.max(Number(merged.minute ?? 30), 0), 59),
      water: Boolean(merged.water),
    };

    let scheduleResult;
    try {
      scheduleResult = await applyNotificationSettings({
        habit: { enabled: safe.enabled, hour: safe.hour, minute: safe.minute },
        water: { enabled: safe.water },
      });
    } catch (e) {
      console.error('Failed to apply notification settings', e);
      return { ok: false, message: 'Мэдэгдэл товлох үед алдаа гарлаа. Дахин оролдоно уу.' };
    }
    if (!scheduleResult?.ok) {
      if (scheduleResult?.code === 'PERMISSION_DENIED') {
        return {
          ok: false,
          message: 'Мэдэгдлийн зөвшөөрөл олгогдсонгүй. Төхөөрөмжийн Settings → Notifications → Family Habit дотор зөвшөөрч, дахин идэвхжүүлнэ үү.',
        };
      }
      return { ok: false, message: 'Мэдэгдлийн модуль ажиллахгүй байна. Аппыг шинэчилж дахин оролдоно уу.' };
    }

    setNotificationSettings(safe);
    if (isFirebaseConfigured && db && familyId) {
      try {
        await setDoc(doc(db, 'families', familyId, 'settings', 'notifications'), { ...safe, updatedAt: serverTimestamp() }, { merge: true });
      } catch (e) {
        // Cloud write амжилтгүй бол local утга зөв хэвээр байгаа тул UX-г
        // боомилж болохгүй — зөвхөн логлоод амжилттай гэж үзнэ (дараагийн
        // save давтан бичнэ).
        console.error('Failed to persist notification settings', e);
      }
    }
    return { ok: true };
  };

  // P2.3: "Шинэ сар эхлүүлэх" — БОДИТ reset. Өмнө нь зөвхөн members/{uid}.points/
  // streak-ийг 0 болгодог байсан тул dailyLogs хэвээр үлдэж, дараагийн toggle дээр
  // calculateStreak хуучин түүхээс streak-ийг ДАХИН сэрээдэг байв. Одоо:
  //   1) энэ сарын (сарын эхнээс өнөөдөр хүртэл) бүх cached log-ийг tasks/mood-
  //      аар нь цэвэрлэнэ (delete биш write — rules delete permission шаардахгүй),
  //   2) redeemed rewards-ийг locked болгоно (нэр/target/order хэвээр),
  //   3) бүх гишүүний points/streak-ийг 0 болгоно.
  // БҮГДИЙГ НЭГ хуваагдсан batch дотор атомаар бичиж, амжилттай болсоор л
  // локал state-г шинэчилнэ — failure үед локал огт өөрчлөгдөхгүй (rollback
  // шаардлагагүй). Streak сэрэхгүй: цэвэрлэгдсэн өдрүүд isDayComplete=false
  // болохоор calculateStreak тэнд зогсоно.
  // Тухайн YYYY-MM-DD хоёр огнооны хоорондох (хамт орсон) хоногийн тоо.
  const daysBetweenInclusive = (startKey, endKey) => {
    const [sy, sm, sd] = startKey.split('-').map(Number);
    const [ey, em, ed] = endKey.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    return Math.round((end - start) / 86400000) + 1;
  };

  const resetMonthlyProgress = async () => {
    if (!isFirebaseConfigured || !db || !familyId) {
      return { ok: false, message: 'Firebase тохиргоогүй тул шинэ сар эхлүүлж чадсангүй.' };
    }
    if (!canManage) {
      return { ok: false, message: 'Шинэ сар эхлүүлэх эрх зөвхөн эцэг эх/админд байна.' };
    }
    // Pending debounced бичилтүүдийг хүчингүй болгоно — clearTimeout дангаараа хангалтгүй,
    // аль хэдийн эхэлсэн async promise нь reset-ийн дараа хуучин төлөвөө бичих эрсдэлтэй.
    saveGenerationRef.current += 1;
    pendingSaveRef.current = null;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    // ЗАСВАР: өмнө нь хугацааг КАЛЕНДАРИЙН сарын 1-нээс тооцдог байсан тул
    // 30 хоногийн мөчлөг (жишээ нь 9/7 → 10/7) дуусахад 10/1-10/7-г л
    // архивлаж, 9 сарын хувийг тооцдоггүй байв. Мөн архивын id нь "YYYY-MM"
    // байсан тул нэг сард 2 удаа reset хийвэл эхний архив ДАРАГДАЖ устдаг байв.
    // Одоо мөчлөгийн эхлэлээс (cycleStartKey) тооцож, id-г давтагдашгүй болгоно.
    // Ачаалсан лог зөвхөн DAILY_LOG_LOOKBACK_DAYS хоногийнх тул түүнээс
    // өмнөх огноог тооцвол хувь худал бага гарна — хязгаарлана.
    const lookbackKey = formatDateKey(new Date(Date.now() - (DAILY_LOG_LOOKBACK_DAYS - 1) * 24 * 60 * 60 * 1000));
    const cycleStartKey = getCycleStartKey(familyProfile, todayKey) || todayKey;
    let periodStartKey = cycleStartKey > todayKey ? todayKey : cycleStartKey;
    if (periodStartKey < lookbackKey) periodStartKey = lookbackKey;
    const inPeriod = (dateKey) => dateKey >= periodStartKey && dateKey <= todayKey;

    // ── АЮУЛГҮЙ БАЙДЛЫН ЗАСВАР (2026-09-12): ХАМГИЙН ЭХЭНД snapshot бичнэ ──
    // Өмнө нь энэ функц тухайн сарын БҮХ dailyLog-ийг шууд {tasks:{}}
    // болгож УСТГАДАГ байсан — "шинэ сар эхлүүлэх" товчийг дарсан хүн
    // өнгөрсөн сарынхаа бүх түүхийг эргэлт буцалтгүй алддаг байв. Одоо
    // устгахаас ӨМНӨ families/{id}/archives/{YYYY-MM} баримтад дүнг
    // хадгална. Энэ бичилт АМЖИЛТГҮЙ бол доорх устгах алхам огт хийгдэхгүй
    // — "архивгүйгээр устгах" боломжгүй болгосон.
    const dayCount = Math.max(daysBetweenInclusive(periodStartKey, todayKey), 1);
    const completionByUid = {};
    memberList.forEach((member) => {
      const required = (tasksByMember[member.uid] || []).filter((task) => task.required !== false);
      let completed = 0;
      Object.keys(dailyLogsRef.current || {}).forEach((dateKey) => {
        if (!inPeriod(dateKey)) return;
        const taskLogs = dailyLogsRef.current[dateKey]?.[member.uid]?.tasks || {};
        completed += required.filter((task) => taskLogs?.[task.id]?.done).length;
      });
      const possible = required.length * dayCount;
      completionByUid[member.uid] = possible > 0 ? Math.round((completed / possible) * 100) : 0;
    });
    const archiveId = `${periodStartKey}_${todayKey}`; // давтагдашгүй
    const archiveData = {
      monthKey: periodStartKey.slice(0, 7), // "YYYY-MM" — ArchiveModal-ын шошго/эрэмбэ
      periodStart: periodStartKey,
      periodEnd: todayKey,
      dayCount,
      totalPoints: memberList.reduce((sum, member) => sum + (member.points || 0), 0),
      members: memberList.map((member) => ({
        uid: member.uid,
        name: member.name || '',
        avatar: member.avatar || '🙂',
        points: member.points || 0,
        streak: member.streak || 0,
        completionPct: completionByUid[member.uid] || 0,
      })),
      rewards: (familyRewards || []).map((reward) => ({
        id: reward.id,
        name: reward.name || '',
        target: reward.target || 0,
        status: reward.status || 'locked',
        redeemedAt: reward.redeemedAt || null,
      })),
      archivedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, 'families', familyId, 'archives', archiveId), archiveData, { merge: true });
    } catch (e) {
      console.error('Monthly archive snapshot error:', e.code, e.message);
      // ЗОГСООНО — архивлаагүй өгөгдлийг устгахгүй. Хэрэглэгчид тодорхой
      // тайлбар өгнө: юу ч устаагүй, дараа дахин оролдож болно.
      return { ok: false, message: 'Архивлаж чадсангүй тул шинэ сар эхлүүлээгүй — өгөгдөл хэвээрээ. Дахин оролдоно уу.' };
    }

    // Шинэ 30 хоногийн мөчлөг ЭНЭ өдрөөс эхэлнэ. Архив амжилттай хадгалагдсаны
    // ДАРАА л бичнэ — архивлаж чадаагүй бол дээр функц аль хэдийн зогссон.
    try {
      await setDoc(doc(db, 'families', familyId), { cycleStartKey: todayKey, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      // Эгзэгтэй биш: аялалын тоолуур хуучин огноогоор үргэлжилнэ, бусад
      // бүх зүйл хэвийн. Тиймээс reset-ийг ЗОГСООХГҮЙ.
      console.warn('Cycle start update error:', e?.code, e?.message);
    }

    const ops = [];
    // Streak epoch: энэ өдрөөс өмнөх түүх рүү streak тооцохгүй (сарын эхлэл).
    // Өмнөх сарын complete логууд хэвээр үлдэнэ ч streak дахин сэрэхгүй.
    memberList.forEach((member) => {
      ops.push({ ref: doc(db, 'families', familyId, 'members', member.uid), data: { points: 0, streak: 0, streakResetKey: todayKey, updatedAt: serverTimestamp() } });
    });
    familyRewards.forEach((reward) => {
      if (reward.status === 'redeemed' || reward.redeemedAt) {
        ops.push({ ref: doc(db, 'families', familyId, 'rewards', reward.id), data: { status: 'locked', redeemedAt: null, updatedAt: serverTimestamp() } });
      }
    });
    Object.keys(dailyLogsRef.current || {}).forEach((dateKey) => {
      if (!inPeriod(dateKey)) return;
      Object.keys(dailyLogsRef.current[dateKey] || {}).forEach((uid) => {
        ops.push({ ref: doc(db, 'families', familyId, 'dailyLogs', `${dateKey}_${uid}`), data: { tasks: {}, mood: null, updatedAt: serverTimestamp() } });
      });
    });

    try {
      // Rules-ийн 10-document access хязгаараас сэргийлж жижиг batch-уудаар
      // илгээнэ (create-family-ийн адил).
      for (let start = 0; start < ops.length; start += 5) {
        const batch = writeBatch(db);
        ops.slice(start, start + 5).forEach((op) => batch.set(op.ref, op.data, { merge: true }));
        await batch.commit();
      }
    } catch (e) {
      console.error('Reset monthly progress error:', e.code, e.message);
      // Архив АЛЬ ХЭДИЙН бичигдсэн тул түүх алдагдаагүй — гэхдээ points/
      // dailyLogs хэсэгчлэн устсан байж болзошгүйг хэрэглэгчид хэлнэ.
      return { ok: false, message: 'Шинэ сарыг эхлүүлэхэд алдаа гарлаа (архив хадгалагдсан, гэхдээ дахин оролдоно уу).' };
    }

    const resetMembers = {};
    memberList.forEach((member) => { resetMembers[member.uid] = { ...member, points: 0, streak: 0, streakResetKey: todayKey }; });
    membersRef.current = resetMembers;
    setMembers(resetMembers);

    const clearedLogs = { ...(dailyLogsRef.current || {}) };
    Object.keys(clearedLogs).forEach((dateKey) => {
      if (!inPeriod(dateKey)) return;
      const day = { ...(clearedLogs[dateKey] || {}) };
      Object.keys(day).forEach((uid) => { day[uid] = { tasks: {}, mood: null }; });
      clearedLogs[dateKey] = day;
    });
    dailyLogsRef.current = clearedLogs;
    setDailyLogs(clearedLogs);
    return { ok: true };
  };

  // P2.4: Доод handler-ууд render бүрт шинэ identity-тэй байдаг тул memoized
  // DashboardTaskCard/DashboardScreen-ийн props тогтворгүй болно. Хамгийн
  // сүүлийн хувилбарыг ref-д хадгалаад ТОГТВОРТОЙ useCallback wrapper-уудыг
  // export хийнэ — behavior яг ижил, identity хэзээ ч өөрчлөгдөхгүй.
  const handlersRef = useRef({});
  handlersRef.current = {
    toggleTask,
    toggleOption,
    updateTaskLog,
    handleMoodSelect,
    saveTasksForMember,
  };

  return {
    familyId,
    familyProfile,
    familySetupError,
    familySetupLoading,
    familyMissing,
    members,
    memberList,
    displayStats,
    defaultStatsForDisplay,
    selectedMemberId,
    setSelectedMemberId,
    tasksByMember,
    dailyLogs,
    meals,
    setMeals,
    foodLogs,
    addFoodEntry,
    removeFoodEntry,
    familyRewards,
    setFamilyRewards,
    notificationSettings,
    todayKey,
    currentMember,
    selectedUserName,
    currentUserMember,
    canManage,
    totalFamilyPoints,
    baseTasks,
    logsForSelectedDate,
    currentDisplayTasks,
    completedCount,
    requiredCount,
    remainingCount,
    progress,
    currentMood,
    weeklyReport,
    weeklyTrend,
    saveMemberPhoto,
    saveFamilyCover,
    listArchives,
    saveMemberProfile,
    handleCreateFamily,
    handleJoinFamily,
    resetFamilyState,
    toggleTask: useCallback((id, forceState) => handlersRef.current.toggleTask(id, forceState), []),
    toggleOption: useCallback((taskId, optionStr) => handlersRef.current.toggleOption(taskId, optionStr), []),
    updateTaskLog: useCallback((taskId, updates) => handlersRef.current.updateTaskLog(taskId, updates), []),
    handleMoodSelect: useCallback((mood) => handlersRef.current.handleMoodSelect(mood), []),
    saveTasksForMember: useCallback((uid, tasks) => handlersRef.current.saveTasksForMember(uid, tasks), []),
    saveToCloud,
    handleRedeemReward,
    saveNotificationSettings,
    resetMonthlyProgress,
  };
}
