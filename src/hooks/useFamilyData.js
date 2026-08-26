import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
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
import { formatDateKey, getTodayDateKey, getWeekAgoKeys, dayNamesShort } from '../utils/dates';
import { calculateStreak } from '../utils/streak';
import { sanitizeInviteCode, generateInviteCode } from '../utils/invite';
import { scheduleDailyHabitReminder, cancelHabitReminders } from '../services/notifications';
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
  const [familyRewards, setFamilyRewards] = useState(defaultFamilyRewards);
  const [notificationSettings, setNotificationSettings] = useState(defaultNotificationSettings);

  const saveTimeoutRef = useRef(null);
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
    const unsubMeals = onSnapshot(mealRef, (snap) => setMeals(snap.exists() ? (snap.data()?.meals || defaultMeals) : defaultMeals));
    const unsubNotifications = onSnapshot(notificationRef, (snap) => setNotificationSettings(snap.exists() ? { ...defaultNotificationSettings, ...(snap.data() || {}) } : defaultNotificationSettings));
    return () => { unsubMeals(); unsubNotifications(); };
  }, [familyId]);

  const memberList = useMemo(() => Object.values(members || {}).sort((a, b) => (a.joinedAt || '').localeCompare(b.joinedAt || '')), [members]);
  const displayStats = useMemo(() => {
    const out = {};
    memberList.forEach((member) => {
      out[member.name || member.uid] = { points: member.points || 0, streak: member.streak || 0, uid: member.uid, role: member.role, avatar: member.avatar || '🙂' };
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
    const bestUid = Object.entries(perMember).sort((a, b) => b[1] - a[1])?.[0]?.[0];
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

  const handleCreateFamily = async ({ familyName, displayName, avatar = '🙂', extraMembers = [] }) => {
    if (!isFirebaseConfigured || !user || !db) return setFamilySetupError('Firebase config болон login шаардлагатай.');
    const safeFamilyName = (familyName || '').trim() || 'Миний гэр бүл';
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
          inviteCode,
          ownerUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        transaction.set(memberRef, {
          uid: user.uid,
          name: safeDisplayName,
          avatar,
          role: 'parent',
          points: 0,
          streak: 0,
          joinedAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        });
        transaction.set(taskRef, { uid: user.uid, tasks: getBaseTasks(false), updatedAt: serverTimestamp() });
        transaction.set(inviteRef, { code: inviteCode, familyId: familyRef.id, familyName: safeFamilyName, ownerUid: user.uid, active: true, createdAt: serverTimestamp() });
        transaction.set(userRef, { uid: user.uid, familyId: familyRef.id, displayName: safeDisplayName, avatar, role: 'parent', updatedAt: serverTimestamp() }, { merge: true });
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
              role: 'child',
              points: 0,
              streak: 0,
              joinedAt: new Date().toISOString(),
              managedByUid: user.uid,
              updatedAt: serverTimestamp(),
            });
            memberBatch.set(doc(db, 'families', familyRef.id, 'tasks', member.uid), {
              uid: member.uid,
              tasks: getBaseTasks(true),
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
    try {
      await runTransaction(db, async (transaction) => {
        const inviteRef = doc(db, 'inviteCodes', cleanCode);
        const inviteSnap = await transaction.get(inviteRef);
        if (!inviteSnap.exists() || inviteSnap.data()?.active === false) throw new Error('invite-code-not-found');
        const targetFamilyId = inviteSnap.data()?.familyId;
        if (!targetFamilyId) throw new Error('invite-code-broken');

        const familyRef = doc(db, 'families', targetFamilyId);
        const familySnap = await transaction.get(familyRef);
        if (!familySnap.exists()) throw new Error('family-not-found');

        const memberRef = doc(db, 'families', targetFamilyId, 'members', user.uid);
        const taskRef = doc(db, 'families', targetFamilyId, 'tasks', user.uid);
        const taskSnap = await transaction.get(taskRef);
        const userRef = doc(db, 'users', user.uid);

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
        if (!taskSnap.exists()) transaction.set(taskRef, { uid: user.uid, tasks: getBaseTasks(false), updatedAt: serverTimestamp() });
        transaction.set(userRef, { uid: user.uid, familyId: targetFamilyId, displayName: safeDisplayName, avatar, role: 'member', joinedWithInviteCode: cleanCode, updatedAt: serverTimestamp() }, { merge: true });
      });
    } catch (e) {
      console.error('Join family error:', e.code, e.message);
      const reason = e.message === 'invite-code-not-found' ? 'Ийм invite code-той гэр бүл олдсонгүй.' : 'Гэр бүлд нэгдэхэд алдаа гарлаа.';
      setFamilySetupError(`${e.code || e.message || 'unknown'}: ${reason}`);
    } finally {
      setFamilySetupLoading(false);
    }
  };

  const resetFamilyState = () => {
    // Гараас товчоос хамаарахгүй бүх family-хамаатай state-г цэвэрлэнэ —
    // logout эсвэл өөр account руу шилжих үед өмнөх гишүүний meals/rewards/
    // логууд дэлгэцэн дээр цацрагддаг (cross-account bleed) байсан.
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

  useEffect(() => () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  }, []);

  const persistDailyLog = async (uid, dateKey, nextLog) => {
    if (!isFirebaseConfigured || !db || !familyId || !uid) return;
    await setDoc(doc(db, 'families', familyId, 'dailyLogs', `${dateKey}_${uid}`), {
      uid,
      dateKey,
      tasks: nextLog.tasks || {},
      mood: nextLog.mood || null,
      updatedAt: serverTimestamp(),
    }, { merge: true });
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

    const recalculatedStreak = calculateStreak(nextDailyLogs, baseTasks, selectedMemberId, todayKey);
    const currentMembers = membersRef.current || {};
    const member = currentMembers[selectedMemberId] || {};
    const prevStats = { points: member.points || 0, streak: member.streak || 0 };
    const nextPoints = Math.max(0, prevStats.points + pointsChange);
    const nextMembers = { ...currentMembers, [selectedMemberId]: { ...(currentMembers[selectedMemberId] || {}), points: nextPoints, streak: recalculatedStreak } };
    membersRef.current = nextMembers;
    setMembers(nextMembers);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await persistDailyLog(selectedMemberId, selectedDate, nextUserLog);
        await commitMemberStats(selectedMemberId, pointsChange, recalculatedStreak);
        saveTimeoutRef.current = null;
        // Тэмдэглэсэн амжилтын feedback зөвхөн persistence АМЖИЛТТАЙ
        // болсны ДАРАА гардаг — сүлжээ уналаа гэхэд confetti/haptic хийж,
        // дараа нь completion алга болдог байсан.
        if (pointsChange !== 0 && celebrateOnPoints) {
          if (pointsChange > 0) {
            successFeedback();
            onTaskCompleted?.(pointsChange);
          } else {
            selectionFeedback();
            onTaskUncompleted?.();
          }
        }
      } catch (e) {
        console.error('Task save error:', e.code, e.message);
        saveTimeoutRef.current = null;
        revertFailedTaskSave(selectedDate, selectedMemberId, existingUserLog, nextUserLog, prevStats, { points: nextPoints, streak: recalculatedStreak });
        onSaveError?.('Дадлын мэдээллийг хадгалж чадсангүй. Интернэт холболтоо шалгаад дахин оролдоно уу.');
      }
    }, 350);
  };

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
    applyTaskLogUpdate(id, { done: isNowDone }, isNowDone ? points : -points);
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
    const dayLogs = dailyLogs?.[selectedDate] || {};
    const nextUserLog = { ...(dayLogs?.[selectedMemberId] || { tasks: {}, mood: null }), mood };
    setDailyLogs((prev) => ({ ...(prev || {}), [selectedDate]: { ...(prev?.[selectedDate] || {}), [selectedMemberId]: nextUserLog } }));
    try { await persistDailyLog(selectedMemberId, selectedDate, nextUserLog); }
    catch (e) {
      console.error('Mood save error:', e.code, e.message);
      onSaveError?.('Сэтгэл зүйг хадгалж чадсангүй. Дахин оролдоно уу.');
    }
  };

  const saveTasksForMember = async (uid, tasks) => {
    if (!isFirebaseConfigured || !db || !familyId || !uid) return;
    const normalized = tasks.map(normalizeTask);
    setTasksByMember((prev) => ({ ...prev, [uid]: normalized }));
    await setDoc(doc(db, 'families', familyId, 'tasks', uid), { uid, tasks: normalized, updatedAt: serverTimestamp() }, { merge: true });
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
    const safe = {
      enabled: Boolean(nextSettings.enabled),
      hour: Math.min(Math.max(Number(nextSettings.hour ?? 20), 0), 23),
      minute: Math.min(Math.max(Number(nextSettings.minute ?? 30), 0), 59),
    };

    if (safe.enabled) {
      let scheduleResult;
      try {
        scheduleResult = await scheduleDailyHabitReminder(safe);
      } catch (e) {
        console.error('Failed to schedule habit reminders', e);
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
    } else {
      // Унтраахад: цуцлах амжилттай болохоор state-ээ солино — эс тэгвэл
      // UI "OFF" харагдаад санамж ирсээр байх эрсдэлтэй.
      try {
        await cancelHabitReminders();
      } catch (e) {
        console.error('Failed to cancel habit reminders', e);
        return { ok: false, message: 'Мэдэгдэл цуцлах үед алдаа гарлаа. Дахин оролдоно уу.' };
      }
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
  const resetMonthlyProgress = async () => {
    if (!isFirebaseConfigured || !db || !familyId) {
      return { ok: false, message: 'Firebase тохиргоогүй тул шинэ сар эхлүүлж чадсангүй.' };
    }
    if (!canManage) {
      return { ok: false, message: 'Шинэ сар эхлүүлэх эрх зөвхөн эцэг эх/админд байна.' };
    }
    const monthStartKey = `${todayKey.split('-')[0]}-${todayKey.split('-')[1]}-01`;
    const inPeriod = (dateKey) => dateKey >= monthStartKey && dateKey <= todayKey;
    const ops = [];
    memberList.forEach((member) => {
      ops.push({ ref: doc(db, 'families', familyId, 'members', member.uid), data: { points: 0, streak: 0, updatedAt: serverTimestamp() } });
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
      return { ok: false, message: 'Шинэ сарыг эхлүүлэхэд алдаа гарлаа. Өөрчлөлт хийгдээгүй — дахин оролдоно уу.' };
    }

    const resetMembers = {};
    memberList.forEach((member) => { resetMembers[member.uid] = { ...member, points: 0, streak: 0 }; });
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
