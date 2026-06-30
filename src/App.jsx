import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import {
  CheckCircle, Calendar as CalendarIcon, Utensils, Plus,
  Sun, Coffee, Moon, TrendingUp, Award,
  Clock, Flame, Smile, Meh, Frown, Gift, Sparkles, Ticket, Loader2,
  Edit, Save, Trash, RotateCcw, Check, Play, Pause, Square, Bell, BarChart2,
  Trophy, Medal, Crown
} from 'lucide-react';
import { firebaseConfig, appId } from './firebaseConfig';

// --- Firebase Init ---
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase init failed", e);
}

// --- Default Data ---
const defaultUserStats = {
  'Бат-Очир': { streak: 0, points: 0 },
  'Сараа': { streak: 0, points: 0 },
  'Мөнхтүшиг': { streak: 0, points: 0 },
  'Энхтулга': { streak: 0, points: 0 },
  'Эрдэмсайхан': { streak: 0, points: 0 },
};

const getBaseTasks = (isKid) => [
  { id: 1, text: 'Эрт сэрэх, нойр сайн авах', note: isKid ? '10-11 цагийн нойр авах' : '7-8 цагийн нойр авах', hasInput: true, inputValue: '', inputPlaceholder: 'Сэрсэн цаг?', frequency: 'Өдөр бүр' },
  { id: 2, text: 'Өглөө бүр 3-5 аяга бүлээн ус уух', hasInput: true, inputValue: '', inputPlaceholder: 'Уусан цаг?', frequency: 'Өдөр бүр' },
  { id: 3, text: 'Ном унших (Англи хэл)', note: '10-15 минут', timerMinutes: 15, hasInput: true, inputValue: '', inputPlaceholder: 'Хэдэн минут?' },
  { id: 4, text: 'Ном унших (Монгол ном)', note: '10-15 минут', timerMinutes: 15, hasInput: true, inputValue: '', inputPlaceholder: 'Хэдэн минут?' },
  { id: 5, text: 'Дасгал хийх 15-20 минут', options: ['Алхах', 'Гүйх', 'Дугуй унах'], timerMinutes: 20 },
  { id: 6, text: 'Өглөөний цай сайн уух, бэлдэх', note: 'Ислэг, уураглаг бүтээгдэхүүн хэрэглэх', hasInput: true, inputValue: '', inputPlaceholder: 'Цаг?' },
  { id: 7, text: 'Өөртөө хэрэгтэй эрдэс витамин хэрэглэх', hasInput: true, inputValue: '', inputPlaceholder: 'Тэмдэглэл' },
  { id: 8, text: 'Хоол хийх / Бэлдэх', options: ['Өдрийн хоол хийх', 'Оройн хоол бэлдэх', 'Маргаашийн хоолоо бэлдэх'], hasInput: true, inputValue: '', inputPlaceholder: 'Цаг?' },
  { id: 9, text: 'IELTS Band 9 сонсох', note: 'Давтаж унших, цээжлэх', timerMinutes: 30 },
  { id: 10, text: 'Түүх сонсох, уншиж судлах', note: 'Машинд эсвэл алхах үед тохиромжтой', timerMinutes: 20 },
  { id: 11, text: 'Уурлахгүй байх тал дээр тулж ажиллах', note: 'Тэвчээртэй байх', hasInput: true, inputValue: '', inputPlaceholder: 'Сэтгэл зүйгээ бичих' },
  { id: 12, text: 'Ажлаа хийх', note: 'Ажилласан цагаа бүртгэх', hasInput: true, inputValue: '', inputPlaceholder: 'Зарцуулсан цаг?', inputSuffix: 'цаг' },
  { id: 13, text: 'Өдөрт 2 литр ус уух', hasInput: true, inputValue: '', inputPlaceholder: 'Хэмжээ?' },
  { id: 14, text: 'Хувьцаа судлах', note: '20-30 минут', timerMinutes: 20 },
  { id: 15, text: 'Спортоор хичээллэх', options: ['Сагс тоглох', 'Бокс', 'Усанд сэлэх'], frequency: '7 хоногт 3 удаа' },
  { id: 16, text: 'Орой гэр бүлээрээ тоглох / Цаг өнгөрүүлэх', options: ['Хөзөр тоглох', 'Спорт тоглоом', 'Кино үзэх', 'Алхах', 'Салхилах'], frequency: 'Сард 4 удаа' },
  { id: 17, text: 'Оройн арчилгаа, ариун цэвэр', options: ['Нүүрээ цэвэрлэх', 'Шүд угаах', 'Усанд орох'] },
  { id: 18, text: 'Орой эрт унтах', note: '21:40-23:00 өмнө', hasInput: true, inputValue: '', inputPlaceholder: 'Унтсан цаг?' },
];

const defaultUserTasks = {
  'Бат-Очир': getBaseTasks(false),
  'Сараа': getBaseTasks(false).filter(t => t.id !== 14),
  'Мөнхтүшиг': getBaseTasks(true),
  'Энхтулга': getBaseTasks(true),
  'Эрдэмсайхан': [
    { id: 1, text: 'Эрт сэрэх, нойр сайн авах', note: '10-11 цаг', hasInput: true, inputValue: '', inputPlaceholder: 'Сэрсэн цаг?' },
    { id: 2, text: 'Шүдээ угаах, нүүрээ угаах', timerMinutes: 2 },
    { id: 3, text: 'Өглөөний цайгаа сайн идэх', hasInput: true, inputValue: '', inputPlaceholder: 'Цаг?' },
    { id: 4, text: 'Цэцэрлэгтээ явах', hasInput: true, inputValue: '', inputPlaceholder: 'Цаг?' },
    { id: 5, text: 'Цэцэрлэгтээ сайн унтах, хоолоо идэх', hasInput: true, inputValue: '', inputPlaceholder: 'Тэмдэглэл' },
    { id: 6, text: 'Орой гэр бүлээрээ тоглох', options: ['Хөзөр тоглох', 'Гэр бүлээрээ спорт тоглоом', 'Кино үзэх'] },
    { id: 7, text: 'Үлгэр сонсож унтах', note: '21:30-аас өмнө', timerMinutes: 15 },
    { id: 17, text: 'Орой эрт унтах', note: '21:30-аас өмнө', hasInput: true, inputValue: '', inputPlaceholder: 'Унтсан цаг?' },
  ]
};

const defaultMeals = {
  day1: { breakfast: 'Өндөг помидор хуурга сүү', lunch: 'Карритай будаа, өндөгтэй хуурга', dinner: 'Тараг' },
  day2: { breakfast: 'Чанасан өндөг, сүү', lunch: 'Чөлөөт', dinner: 'Аяган хиам' },
  day3: { breakfast: 'Өндөг дүпү мөөгтэй хуурга', lunch: 'Ногоотой шөл будаа, мантуу', dinner: 'Жимс' },
  day4: { breakfast: 'Шарсан өндөг, салат, сүү', lunch: 'Цуйван, удон гоймон', dinner: 'Ясны шөлтэй гоймон' },
  day5: { breakfast: 'Тахиатай хуурга, салат', lunch: 'Тефтель, хучмал, бифштекс', dinner: 'Тараг' },
  day6: { breakfast: 'Сэндвич, чөлөөт', lunch: 'Ажлаас', dinner: 'Тахиа, бууз, хуушуур, загас' },
  day7: { breakfast: 'Будаатай цай', lunch: 'Будаатай хуурга, мантуун бууз', dinner: 'Мах чанах будаа, бантан, гурил' },
};

const defaultFamilyRewards = [
  { id: 'reward_1', name: 'Кино үзэх', desc: 'Гэр бүлээрээ кино театрт очих эрх', target: 2000 },
  { id: 'reward_2', name: 'Сагс тоглох', desc: 'Гэр бүлээрээ заал авч тоглох эрх', target: 2000 },
  { id: 'reward_3', name: 'Гадуур хооллох', desc: 'Дурсамжтай оройн зоог барих эрх', target: 2000 },
  { id: 'reward_4', name: 'Урамшуулал 4', desc: 'Дараа нэр өгнө...', target: 3000 },
  { id: 'reward_5', name: 'Урамшуулал 5', desc: 'Дараа нэр өгнө...', target: 4000 },
  { id: 'reward_6', name: 'Урамшуулал 6', desc: 'Дараа нэр өгнө...', target: 5000 }
];

const rewardVisuals = {
  reward_1: { icon: Ticket, bg: 'from-violet-500 to-purple-700', bar: 'from-pink-400 to-yellow-400', iconColor: 'text-purple-100', tabColor: 'text-purple-700', tabBg: 'bg-purple-100 border-purple-200' },
  reward_2: { icon: Award, bg: 'from-orange-500 to-red-600', bar: 'from-yellow-300 to-orange-400', iconColor: 'text-orange-100', tabColor: 'text-orange-700', tabBg: 'bg-orange-100 border-orange-200' },
  reward_3: { icon: Utensils, bg: 'from-teal-500 to-emerald-700', bar: 'from-green-300 to-emerald-400', iconColor: 'text-emerald-100', tabColor: 'text-emerald-700', tabBg: 'bg-emerald-100 border-emerald-200' },
  reward_4: { icon: Gift, bg: 'from-blue-500 to-cyan-600', bar: 'from-cyan-300 to-blue-400', iconColor: 'text-cyan-100', tabColor: 'text-blue-700', tabBg: 'bg-blue-100 border-blue-200' },
  reward_5: { icon: Sparkles, bg: 'from-fuchsia-500 to-pink-600', bar: 'from-pink-300 to-fuchsia-400', iconColor: 'text-pink-100', tabColor: 'text-pink-700', tabBg: 'bg-pink-100 border-pink-200' },
  reward_6: { icon: Flame, bg: 'from-rose-500 to-red-600', bar: 'from-red-300 to-rose-400', iconColor: 'text-rose-100', tabColor: 'text-rose-700', tabBg: 'bg-rose-100 border-rose-200' }
};

const playSuccessSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.log("Audio play failed", e);
  }
};

const sendBrowserNotification = (title, body) => {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "https://cdn-icons-png.flaticon.com/512/1041/1041883.png" });
  }
};

// --- Огноо туслах функцүүд ---
const formatDateKey = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayDateKey = () => formatDateKey(new Date());

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('today');
  const [selectedUser, setSelectedUser] = useState('Бат-Очир');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [userMoods, setUserMoods] = useState({});

  const familyMembers = ['Бат-Очир', 'Сараа', 'Мөнхтүшиг', 'Энхтулга', 'Эрдэмсайхан'];

  const [userStats, setUserStats] = useState(defaultUserStats);
  const [userTasks, setUserTasks] = useState(defaultUserTasks); // Only defines the HABIT TEMPLATES
  const [dailyLogs, setDailyLogs] = useState({}); // Stores completions by date { '2026-03-28': { 'Бат-Очир': { 'taskId': { done: true, ... } } } }

  const [meals, setMeals] = useState(defaultMeals);
  const [familyRewards, setFamilyRewards] = useState(defaultFamilyRewards);

  const saveTimeoutRef = useRef(null);

  const [isEditingTasks, setIsEditingTasks] = useState(false);
  const [tempUserTasks, setTempUserTasks] = useState([]);
  const [selectedMealDay, setSelectedMealDay] = useState('day1');
  const [isEditingMeals, setIsEditingMeals] = useState(false);
  const [tempMeals, setTempMeals] = useState({});
  const [selectedRewardIdx, setSelectedRewardIdx] = useState(0);
  const [isEditingRewards, setIsEditingRewards] = useState(false);
  const [tempRewards, setTempRewards] = useState([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // --- Таймер болон Notification ---
  const [activeTimer, setActiveTimer] = useState(null);
  const timerIntervalRef = useRef(null);
  const [toastMessage, setToastMessage] = useState(null);

  // --- Хуанлийн огноо сонгогч ---
  const [selectedDate, setSelectedDate] = useState(getTodayDateKey());

  const datesArray = useMemo(() => {
    const arr = [];
    const today = new Date();
    for (let i = -360; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, []);

  const [year, month, day] = selectedDate.split('-');
  const dateObj = new Date(year, month - 1, day);
  const dayNamesFull = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
  const headerDateStr = `${year} оны ${parseInt(month)} сарын ${parseInt(day)}, ${dayNamesFull[dateObj.getDay()]}`;

  useEffect(() => {
    setIsEditingTasks(false);
  }, [selectedUser]);

  useEffect(() => {
    if (activeTab === 'today') {
      setTimeout(() => {
        const el = document.getElementById(`date-${selectedDate}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      }, 150);
    }
  }, [activeTab, selectedDate]);

  useEffect(() => {
    const safetyTimeout = setTimeout(() => setLoading(false), 2000);
    if (!auth) { setLoading(false); return; }

    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth error:", err);
        setLoading(false);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });

    return () => { clearTimeout(safetyTimeout); unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user || !db) { setLoading(false); return; }
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'family_app', 'main_state');
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (saveTimeoutRef.current) return;

        if (docSnap.exists()) {
          try {
            const data = docSnap.data() || {};
            setUserStats(data.userStats || defaultUserStats);
            setUserMoods(data.userMoods || {});
            setMeals((data.meals && typeof data.meals === 'object' && data.meals.day1) ? data.meals : defaultMeals);

            let fetchedRewards = data.familyRewards;
            if (Array.isArray(fetchedRewards) && fetchedRewards.length > 0) {
              const mergedRewards = defaultFamilyRewards.map(def => {
                const existing = fetchedRewards.find(r => r.id === def.id);
                return existing ? existing : def;
              });
              setFamilyRewards(mergedRewards);
            } else {
              setFamilyRewards(defaultFamilyRewards);
            }

            let fetchedTasks = data.userTasks;
            if (!fetchedTasks || typeof fetchedTasks !== 'object') {
              fetchedTasks = defaultUserTasks;
            } else {
              const safeTasks = {};
              familyMembers.forEach(member => {
                safeTasks[member] = Array.isArray(fetchedTasks[member]) ? fetchedTasks[member] : (defaultUserTasks[member] || []);
              });
              fetchedTasks = safeTasks;
            }
            setUserTasks(fetchedTasks);

            let fetchedLogs = data.dailyLogs;
            if (!fetchedLogs) {
              fetchedLogs = {};
              const todayKeyLocal = getTodayDateKey();
              fetchedLogs[todayKeyLocal] = {};
              familyMembers.forEach(m => {
                fetchedLogs[todayKeyLocal][m] = {};
                (fetchedTasks[m] || []).forEach(t => {
                  if (t.done || t.inputValue || (t.selectedOptions && t.selectedOptions.length > 0)) {
                    fetchedLogs[todayKeyLocal][m][t.id] = {
                      done: !!t.done,
                      inputValue: t.inputValue || '',
                      selectedOptions: t.selectedOptions || []
                    };
                  }
                });
              });
            }
            setDailyLogs(fetchedLogs);

          } catch (innerErr) {
            console.error("Parse error", innerErr);
          }
        } else {
          setDoc(docRef, { userTasks: defaultUserTasks, userStats: defaultUserStats, userMoods: {}, meals: defaultMeals, familyRewards: defaultFamilyRewards, dailyLogs: {} });
        }
        setLoading(false);
      }, (err) => { console.error("Snapshot error:", err); setLoading(false); });
      return () => unsubscribe();
    } catch (e) { console.error(e); setLoading(false); }
  }, [user]);

  // --- Таймерийн функцүүд ---
  useEffect(() => {
    if (activeTimer && activeTimer.isRunning) {
      timerIntervalRef.current = setInterval(() => {
        setActiveTimer(prev => {
          if (prev.timeRemaining <= 1) {
            clearInterval(timerIntervalRef.current);
            handleTimerFinish(prev.taskId);
            return null;
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        });
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [activeTimer?.isRunning]);

  const handleTimerFinish = (taskId) => {
    playSuccessSound();
    setToastMessage("Цаг дууслаа! Гоё байна 🎉");
    setTimeout(() => setToastMessage(null), 4000);

    const task = currentDisplayTasks.find(t => t.id === taskId);
    if (task) {
      sendBrowserNotification("Дадал биелэлээ!", `${task.text} цаг дууслаа.`);
      if (!task.done) toggleTask(taskId, true);
    }
  };

  const startTimer = (taskId, minutes) => {
    if (activeTimer && activeTimer.taskId === taskId) {
      setActiveTimer({ ...activeTimer, isRunning: !activeTimer.isRunning });
    } else {
      setActiveTimer({ taskId, timeRemaining: minutes * 60, total: minutes * 60, isRunning: true });
    }
  };

  const stopTimer = (e) => {
    e.stopPropagation();
    setActiveTimer(null);
  };

  const requestNotifications = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          setToastMessage("Мэдэгдэл асаалаа 🔔");
          setTimeout(() => setToastMessage(null), 3000);
        }
      });
    }
  };

  // --- Үндсэн функцүүд ---
  const saveToCloud = async (updates) => {
    if (!user || !db) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'family_app', 'main_state');
      await setDoc(docRef, updates, { merge: true });
    } catch (e) { console.error("Save error", e); }
  };

  const baseTasks = Array.isArray(userTasks[selectedUser]) ? userTasks[selectedUser] : (defaultUserTasks[selectedUser] || []);
  const logsForSelectedDate = dailyLogs[selectedDate]?.[selectedUser] || {};

  const currentDisplayTasks = baseTasks.map(t => {
    const log = logsForSelectedDate[t.id];
    return {
      ...t,
      done: log ? log.done : false,
      inputValue: log ? log.inputValue : '',
      selectedOptions: log ? log.selectedOptions : []
    };
  }).filter(t => t != null);

  const progressLength = currentDisplayTasks.length > 0 ? currentDisplayTasks.length : 1;
  const progress = currentDisplayTasks.length > 0
    ? Math.round((currentDisplayTasks.filter(t => t?.done).length / progressLength) * 100) : 0;

  const totalFamilyPoints = Object.values(userStats || {}).reduce((acc, curr) => acc + (curr?.points || 0), 0);

  const updateTaskLog = (taskId, updates, pointsChange = 0) => {
    const newDailyLogs = { ...dailyLogs };
    if (!newDailyLogs[selectedDate]) newDailyLogs[selectedDate] = {};
    if (!newDailyLogs[selectedDate][selectedUser]) newDailyLogs[selectedDate][selectedUser] = {};

    const existingLog = newDailyLogs[selectedDate][selectedUser][taskId] || { done: false, inputValue: '', selectedOptions: [] };
    newDailyLogs[selectedDate][selectedUser][taskId] = { ...existingLog, ...updates };

    setDailyLogs(newDailyLogs);

    let newStats = userStats || {};
    if (pointsChange !== 0) {
      newStats = {
        ...newStats,
        [selectedUser]: {
          ...(newStats[selectedUser] || {}),
          points: Math.max(0, (newStats[selectedUser]?.points || 0) + pointsChange)
        }
      };
      setUserStats(newStats);
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveToCloud({ dailyLogs: newDailyLogs, userStats: newStats });
      saveTimeoutRef.current = null;
    }, 500);
  };

  const toggleTask = (id, forceState = null) => {
    const taskLog = dailyLogs[selectedDate]?.[selectedUser]?.[id] || { done: false };
    const isNowDone = forceState !== null ? forceState : !taskLog.done;
    let pointsChange = 0;
    if (taskLog.done !== isNowDone) {
      pointsChange = isNowDone ? 10 : -10;
    }
    updateTaskLog(id, { done: isNowDone }, pointsChange);
  };

  const handleInputChange = (id, value) => {
    updateTaskLog(id, { inputValue: value });
  };

  const toggleOption = (taskId, optionStr, e) => {
    e.stopPropagation();
    const taskLog = dailyLogs[selectedDate]?.[selectedUser]?.[taskId] || { done: false, selectedOptions: [] };
    const currentOptions = taskLog.selectedOptions || [];
    const newOptions = currentOptions.includes(optionStr)
      ? currentOptions.filter(o => o !== optionStr)
      : [...currentOptions, optionStr];

    const wasDone = taskLog.done || false;
    const isNowDone = newOptions.length > 0;
    let pointsChange = 0;
    if (!wasDone && isNowDone) pointsChange = 10;
    if (wasDone && !isNowDone) pointsChange = -10;

    updateTaskLog(taskId, { selectedOptions: newOptions, done: isNowDone }, pointsChange);
  };

  const toggleTaskEdit = () => {
    if (isEditingTasks) {
      const newUserTasks = { ...(userTasks || {}), [selectedUser]: tempUserTasks || [] };
      setUserTasks(newUserTasks);
      saveToCloud({ userTasks: newUserTasks });
    } else {
      setTempUserTasks([...baseTasks]);
    }
    setIsEditingTasks(!isEditingTasks);
  };

  const handleTempTaskChange = (id, field, value) => setTempUserTasks((tempUserTasks || []).map(t => (t && t.id === id) ? { ...t, [field]: value } : t));
  const handleTempTaskDelete = (id) => setTempUserTasks((tempUserTasks || []).filter(t => t && t.id !== id));
  const handleTempTaskAdd = () => setTempUserTasks([...(tempUserTasks || []), { id: Date.now(), text: '', note: '', hasInput: true, inputValue: '', inputPlaceholder: 'Цаг/Тэмдэглэл...', inputSuffix: '', done: false }]);

  const handleAddTask = () => {
    if (newTaskText.trim() === '') return;
    const newTask = { id: Date.now(), text: newTaskText, hasInput: true, inputValue: '', inputPlaceholder: 'Тэмдэглэл', done: false };
    const newUserTasks = { ...(userTasks || {}), [selectedUser]: [...baseTasks, newTask] };
    setUserTasks(newUserTasks);
    saveToCloud({ userTasks: newUserTasks });
    setNewTaskText('');
    setShowAddModal(false);
  };

  const handleMoodSelect = (mood) => {
    const newMoods = { ...(userMoods || {}), [selectedUser]: mood };
    setUserMoods(newMoods);
    saveToCloud({ userMoods: newMoods });
  };

  const toggleMealEdit = () => {
    if (isEditingMeals) {
      const newMeals = { ...(meals || {}), [selectedMealDay]: tempMeals || {} };
      setMeals(newMeals);
      saveToCloud({ meals: newMeals });
    } else {
      setTempMeals(meals?.[selectedMealDay] || { breakfast: '', lunch: '', dinner: '' });
    }
    setIsEditingMeals(!isEditingMeals);
  };

  const handleMealInputChange = (type, value) => setTempMeals({ ...(tempMeals || {}), [type]: value });

  const toggleRewardEdit = () => {
    if (isEditingRewards) {
      const safeRewards = Array.isArray(tempRewards) && tempRewards.length > 0 ? tempRewards : defaultFamilyRewards;
      setFamilyRewards(safeRewards);
      saveToCloud({ familyRewards: safeRewards });
      setShowResetConfirm(false);
    } else {
      setTempRewards([...(Array.isArray(familyRewards) ? familyRewards : defaultFamilyRewards)]);
    }
    setIsEditingRewards(!isEditingRewards);
  };

  const handleRewardInputChange = (index, field, value) => {
    const updated = [...(tempRewards || [])];
    if (updated[index]) {
      updated[index] = { ...updated[index], [field]: field === 'target' ? Number(value) : value };
      setTempRewards(updated);
    }
  };

  const handleResetPoints = () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }
    const resetStats = { ...defaultUserStats };
    setUserStats(resetStats);
    saveToCloud({ userStats: resetStats });
    setShowResetConfirm(false);
    setIsEditingRewards(false);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <h2 className="text-lg font-bold text-gray-800">Түр хүлээнэ үү...</h2>
      </div>
    );
  }

  const renderUserSelector = () => (
    <div className="flex overflow-x-auto pb-4 pt-2 gap-3 no-scrollbar px-4 mb-2">
      {familyMembers.map(member => (
        <button
          key={member}
          onClick={() => setSelectedUser(member)}
          className={`whitespace-nowrap flex flex-col items-center gap-1.5 transition-all ${selectedUser === member ? 'transform scale-110' : 'opacity-70 hover:opacity-100'}`}
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shadow-sm border-2 ${selectedUser === member ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 text-white border-transparent shadow-blue-200/50' : 'bg-white text-gray-600 border-gray-100'}`}>
            {member.substring(0, 1)}
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-[11px] font-bold ${selectedUser === member ? 'text-gray-900' : 'text-gray-500'}`}>{member.split('-')[0]}</span>
            <span className="flex items-center text-[10px] font-bold text-orange-500">
              <Flame size={10} fill="currentColor" /> {userStats?.[member]?.streak || 0}
            </span>
          </div>
        </button>
      ))}
    </div>
  );

  const renderTodayScreen = () => {
    const currentMood = userMoods?.[selectedUser] || null;
    const todayKey = getTodayDateKey();

    return (
      <div className="animate-fade-in pb-32">
        <div className="bg-white px-5 py-4 border-b border-gray-100 flex items-center justify-between shadow-sm">
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Дадал</h2>
          <div className="flex items-center gap-3">
            <button onClick={requestNotifications} className="text-gray-400 hover:text-blue-500 transition-colors">
              <Bell size={20} />
            </button>
          </div>
        </div>

        <div className="bg-white border-b border-gray-100 mb-3 py-2 shadow-sm">
          <div className="px-5 mb-2 text-[11px] font-black uppercase text-blue-600 tracking-widest">{headerDateStr}</div>
          <div className="flex overflow-x-auto gap-2 px-4 no-scrollbar pb-2" id="calendar-container">
            {datesArray.map(d => {
              const key = formatDateKey(d);
              const isSelected = key === selectedDate;
              const isToday = key === todayKey;
              const dayNamesShort = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];
              return (
                <button
                  key={key}
                  id={`date-${key}`}
                  onClick={() => setSelectedDate(key)}
                  className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-[70px] rounded-2xl transition-all duration-300 ${isSelected ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200/50 transform scale-105 border-transparent' : isToday ? 'bg-blue-50 text-blue-600 border-2 border-blue-200' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
                >
                  <span className={`text-[10px] font-bold uppercase mb-1 ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>{dayNamesShort[d.getDay()]}</span>
                  <span className={`text-lg font-black ${isSelected ? 'text-white' : 'text-gray-800'}`}>{d.getDate()}</span>
                  {isToday && !isSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 absolute bottom-1.5"></span>}
                </button>
              )
            })}
          </div>
        </div>

        {renderUserSelector()}

        <div className="px-4">
          <div className="mb-6 bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700">Тухайн өдөр ямар байв?</span>
            <div className="flex gap-2">
              {[{ id: 'happy', icon: <Smile size={24} />, color: 'text-green-500', bg: 'bg-green-50' },
              { id: 'neutral', icon: <Meh size={24} />, color: 'text-yellow-500', bg: 'bg-yellow-50' },
              { id: 'stressed', icon: <Frown size={24} />, color: 'text-red-500', bg: 'bg-red-50' }
              ].map(m => (
                <button key={m.id} onClick={() => handleMoodSelect(m.id)} className={`p-2 rounded-full transition-all ${currentMood === m.id ? `${m.bg} ${m.color} scale-110 shadow-sm` : 'text-gray-300 hover:bg-gray-50'}`}>
                  {m.icon}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6 bg-white p-5 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-gray-100">
            <div className="flex justify-between items-end mb-3">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 p-1.5 rounded-lg"><TrendingUp size={16} className="text-blue-600" /></div>
                <span className="text-sm font-bold text-gray-700">Өдрийн гүйцэтгэл</span>
              </div>
              <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden shadow-inner">
              <div className="h-3.5 rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 relative overflow-hidden" style={{ width: `${progress}%` }}>
                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] -skew-x-12 translate-x-[-100%]"></div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-3 mt-4 px-1">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Дадлын жагсаалт</h3>
            <button onClick={toggleTaskEdit} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isEditingTasks ? 'bg-orange-500 text-white shadow-md shadow-orange-200/50' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              {isEditingTasks ? <><Save size={14} /> Хадгалах</> : <><Edit size={14} /> Засах</>}
            </button>
          </div>

          {isEditingTasks ? (
            <div className="space-y-3 animate-fade-in">
              {(tempUserTasks || []).map((task, index) => {
                if (!task) return null;
                return (
                  <div key={task.id || index} className="flex gap-3 p-4 rounded-2xl shadow-sm border border-orange-200 bg-orange-50/30 transition-all">
                    <div className="mt-2.5 font-bold text-orange-400 text-xs w-4 text-center">{index + 1}</div>
                    <div className="flex-1 flex flex-col gap-2">
                      <input type="text" value={task.text || ''} onChange={(e) => handleTempTaskChange(task.id, 'text', e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-orange-400" placeholder="Дадлын нэр..." />
                      <input type="text" value={task.note || ''} onChange={(e) => handleTempTaskChange(task.id, 'note', e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs font-medium text-gray-500 outline-none focus:ring-2 focus:ring-orange-400" placeholder="Жижиг тайлбар (заавал биш)" />
                    </div>
                    <button onClick={() => handleTempTaskDelete(task.id)} className="p-2.5 text-red-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors h-fit"><Trash size={18} /></button>
                  </div>
                )
              })}
              <button onClick={handleTempTaskAdd} className="w-full py-3.5 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 hover:text-orange-600 hover:border-orange-300 transition-colors mt-2">
                <Plus size={18} /> Шинэ дадал нэмэх
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {currentDisplayTasks.map((task, index) => {
                if (!task) return null;
                const isTimerActive = activeTimer?.taskId === task.id;

                return (
                  <div key={task.id || index} onClick={() => toggleTask(task.id)} className={`group flex items-start gap-3 p-4 rounded-2xl shadow-sm border transition-all duration-300 cursor-pointer ${task.done ? 'bg-green-50/60 border-green-200/50' : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-[0_4px_15px_-4px_rgba(0,0,0,0.05)]'} ${isTimerActive ? 'ring-2 ring-blue-400 bg-blue-50/20' : ''}`}>

                    <div className="mt-0.5 transition-transform duration-200 active:scale-75 flex-shrink-0">
                      {task.done ? (
                        <div className="bg-gradient-to-tr from-green-500 to-emerald-400 rounded-full p-0.5 shadow-md shadow-green-200 animate-[pop_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)]"><CheckCircle className="text-white w-5 h-5" strokeWidth={2.5} /></div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-gray-300 group-hover:border-blue-400 group-hover:text-blue-500 flex items-center justify-center font-bold text-[11px] text-gray-400 transition-colors bg-gray-50/50 group-hover:bg-blue-50">{index + 1}</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className={`text-[15px] font-bold leading-snug transition-all duration-300 ${task.done ? 'text-green-700/60 line-through decoration-2 decoration-green-500/40' : 'text-gray-800'}`}>{task.text}</p>
                        {task.frequency && (
                          <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md border border-purple-100 whitespace-nowrap">{task.frequency}</span>
                        )}
                      </div>

                      {task.note && <p className={`text-xs mt-1 font-medium leading-tight transition-colors duration-300 ${task.done ? 'text-green-600/50' : 'text-gray-500'}`}>• {task.note}</p>}

                      {task.timerMinutes && !task.done && (
                        <div className="mt-3" onClick={e => e.stopPropagation()}>
                          {isTimerActive ? (
                            <div className="flex items-center gap-3 bg-blue-100/50 p-2 rounded-xl border border-blue-200">
                              <div className="text-xl font-black text-blue-600 w-16 text-center tabular-nums">{formatTime(activeTimer.timeRemaining)}</div>
                              <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); startTimer(task.id, task.timerMinutes); }} className="p-2 rounded-lg bg-white text-blue-600 shadow-sm hover:bg-blue-50">
                                  {activeTimer.isRunning ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                                </button>
                                <button onClick={stopTimer} className="p-2 rounded-lg bg-white text-red-500 shadow-sm hover:bg-red-50">
                                  <Square size={16} fill="currentColor" />
                                </button>
                              </div>
                              <div className="flex-1 ml-2 h-1.5 bg-blue-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all duration-1000 linear" style={{ width: `${100 - (activeTimer.timeRemaining / activeTimer.total * 100)}%` }}></div>
                              </div>
                            </div>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); startTimer(task.id, task.timerMinutes); }} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors">
                              <Play size={14} fill="currentColor" /> {task.timerMinutes} мин эхлүүлэх
                            </button>
                          )}
                        </div>
                      )}

                      {task.options && Array.isArray(task.options) && (
                        <div className="flex flex-wrap gap-2 mt-2.5">
                          {task.options.map(opt => {
                            const isSelected = task.selectedOptions?.includes(opt);
                            return (
                              <button key={opt} onClick={(e) => toggleOption(task.id, opt, e)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${isSelected ? 'bg-green-100 border-green-400 text-green-700 shadow-sm animate-[pop_0.2s_ease-out]' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:border-green-300 hover:text-green-600'}`}>
                                {isSelected && <span className="mr-1">✓</span>}{opt}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {task.hasInput && (
                        <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Clock size={16} className={task.done ? 'text-green-400' : 'text-gray-400'} />
                          <input type="text" value={task.inputValue || ''} onChange={(e) => handleInputChange(task.id, e.target.value)} onClick={(e) => e.stopPropagation()} placeholder={task.inputPlaceholder || "Цаг/Тэмдэглэл..."} className={`text-sm py-1.5 px-3 rounded-xl border outline-none font-medium transition-colors w-36 shadow-sm ${task.done ? 'bg-green-50/50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white'}`} />
                          {task.inputValue && task.inputSuffix && <span className={`text-xs font-bold ${task.done ? 'text-green-500' : 'text-gray-400'}`}>{task.inputSuffix}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHabitScreen = () => {
    const safeFamilyRewards = Array.isArray(familyRewards) && familyRewards.length > 0 ? familyRewards : defaultFamilyRewards;
    const activeData = (isEditingRewards ? tempRewards[selectedRewardIdx] : safeFamilyRewards[selectedRewardIdx]) || defaultFamilyRewards[0];
    const visual = rewardVisuals[activeData?.id] || rewardVisuals['reward_1'];
    const ActiveRewardIcon = visual.icon;
    const progressPct = Math.min(Math.round((totalFamilyPoints / (activeData?.target || 1)) * 100), 100);
    const isGoalReached = progressPct >= 100;

    return (
      <div className="animate-fade-in p-4 pb-32">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-gray-800">Урамшуулал & Зорилго</h2>
          <button onClick={toggleRewardEdit} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isEditingRewards ? 'bg-green-500 text-white shadow-md shadow-green-200/50' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            {isEditingRewards ? <><Save size={14} /> Хадгалах</> : <><Edit size={14} /> Засах</>}
          </button>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2 pt-1 px-1 -mx-1">
          {(isEditingRewards ? tempRewards : safeFamilyRewards).map((r, idx) => {
            if (!r) return null;
            const rVis = rewardVisuals[r.id] || rewardVisuals['reward_1'];
            const isSelected = selectedRewardIdx === idx;
            return (
              <button key={r.id || idx} onClick={() => setSelectedRewardIdx(idx)}
                className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${isSelected ? `bg-gradient-to-r ${rVis.bg} text-white border-transparent shadow-lg transform scale-105` : `${rVis.tabBg} ${rVis.tabColor} hover:brightness-95 opacity-80`}`}>
                <rVis.icon size={14} className={isSelected ? 'text-white/80' : ''} /> {r.name}
              </button>
            )
          })}
        </div>

        <div className={`bg-gradient-to-br ${visual.bg} rounded-3xl p-6 shadow-xl text-white relative overflow-hidden mb-8 transition-all duration-500 ${isGoalReached && !isEditingRewards ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-[#F8F9FA]' : ''}`}>
          <div className="absolute top-0 right-0 p-4 opacity-20 transition-transform duration-500 transform scale-125 rotate-12"><ActiveRewardIcon size={120} /></div>

          <div className="relative z-10">
            {isEditingRewards ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-white/70 mb-1 block">Зорилгын нэр</label>
                  <input type="text" value={activeData?.name || ''} onChange={(e) => handleRewardInputChange(selectedRewardIdx, 'name', e.target.value)} className="w-full bg-black/20 border border-white/20 rounded-xl px-3 py-2 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-white/50" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-white/70 mb-1 block">Дэлгэрэнгүй тайлбар</label>
                  <input type="text" value={activeData?.desc || ''} onChange={(e) => handleRewardInputChange(selectedRewardIdx, 'desc', e.target.value)} className="w-full bg-black/20 border border-white/20 rounded-xl px-3 py-2 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-white/50" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-white/70 mb-1 block">Хүрэх оноо</label>
                  <input type="number" value={activeData?.target || 0} onChange={(e) => handleRewardInputChange(selectedRewardIdx, 'target', e.target.value)} className="w-1/2 bg-black/20 border border-white/20 rounded-xl px-3 py-2 text-lg font-black text-white outline-none focus:ring-2 focus:ring-white/50" />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-white/80 text-xs font-bold uppercase tracking-widest mb-2"><Sparkles size={14} className="text-yellow-300" /> {isGoalReached ? 'Баяр хүргэе' : 'Энэ сарын зорилго'}</div>
                <h3 className="text-2xl font-black mb-1 leading-tight">{activeData?.desc}</h3>

                {isGoalReached ? (
                  <div className="mt-4 mb-2 bg-white/20 backdrop-blur-md rounded-2xl p-3 border border-white/30 animate-[pop_0.5s_ease-out]">
                    <p className="text-center font-black text-lg text-yellow-300 flex items-center justify-center gap-2">🎉 ЗОРИЛГОДОО ХҮРЛЭЭ 🎉</p>
                  </div>
                ) : (
                  <p className="text-sm text-white/60 mb-8 font-medium">Сард 1 удаа авах эрх. Бүх гишүүдийн оноо нэгдэж нээгдэнэ.</p>
                )}

                <div className="mb-2 flex justify-between items-end mt-4">
                  <span className="text-4xl font-black drop-shadow-md">{totalFamilyPoints}<span className="text-base text-white/60 font-bold"> / {activeData?.target} оноо</span></span>
                  <span className={`font-black text-lg ${visual.iconColor} drop-shadow-md`}>{progressPct}%</span>
                </div>
                <div className="w-full bg-black/40 rounded-full h-4 overflow-hidden backdrop-blur-sm border border-white/10 p-0.5">
                  <div className={`bg-gradient-to-r ${visual.bar} h-full rounded-full transition-all duration-1000 relative shadow-[0_0_10px_rgba(255,255,255,0.3)]`} style={{ width: `${progressPct}%` }}>
                    {isGoalReached && <div className="absolute inset-0 bg-white/30 animate-[shimmer_1s_infinite] -skew-x-12 translate-x-[-100%]"></div>}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {isEditingRewards && (
          <div className="mb-8">
            <button onClick={handleResetPoints} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${showResetConfirm ? 'bg-red-500 text-white shadow-lg shadow-red-200 animate-[pop_0.2s_ease-out]' : 'bg-white text-red-500 border border-red-100 hover:bg-red-50'}`}>
              {showResetConfirm ? <><Check size={20} /> Тийм, шинэ сар эхлүүлж оноог тэглэх</> : <><RotateCcw size={20} /> Оноог 0 болгож шинэ сар эхлэх</>}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderMealScreen = () => {
    const currentDayMeals = (isEditingMeals ? tempMeals : meals?.[selectedMealDay]) || { breakfast: '', lunch: '', dinner: '' };
    return (
      <div className="animate-fade-in p-4 pb-32">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Гэр бүлийн хоол</h2>
          <button onClick={toggleMealEdit} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isEditingMeals ? 'bg-green-500 text-white shadow-md shadow-green-200/50' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            {isEditingMeals ? <><Save size={14} /> Хадгалах</> : <><Edit size={14} /> Засах</>}
          </button>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
          {['day1', 'day2', 'day3', 'day4', 'day5', 'day6', 'day7'].map((day, i) => (
            <button key={day} onClick={() => !isEditingMeals && setSelectedMealDay(day)} className={`whitespace-nowrap px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${selectedMealDay === day ? 'bg-orange-500 text-white shadow-md shadow-orange-200 transform scale-105' : 'bg-white border border-gray-200 text-gray-500 opacity-80'} ${isEditingMeals && selectedMealDay !== day ? 'opacity-30 cursor-not-allowed' : ''}`}>
              {i + 1} өдөр
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {[
            { key: 'breakfast', label: 'Өглөө', icon: Sun, bg: 'bg-yellow-50', iconBg: 'bg-yellow-100', text: 'text-yellow-600', ring: 'ring-yellow-400' },
            { key: 'lunch', label: 'Өдөр', icon: Coffee, bg: 'bg-orange-50', iconBg: 'bg-orange-100', text: 'text-orange-600', ring: 'ring-orange-400' },
            { key: 'dinner', label: 'Орой', icon: Moon, bg: 'bg-indigo-50', iconBg: 'bg-indigo-100', text: 'text-indigo-600', ring: 'ring-indigo-400' }
          ].map((mealItem) => {
            const Icon = mealItem.icon;
            return (
              <div key={mealItem.key} className={'bg-white p-5 rounded-3xl border shadow-sm relative overflow-hidden transition-all ' + (isEditingMeals ? 'ring-2 ' + mealItem.ring + ' border-transparent' : 'border-gray-100')}>
                <div className={`absolute top-0 right-0 w-24 h-24 ${mealItem.bg} rounded-bl-full -z-10`}></div>
                <div className="flex gap-4 items-start">
                  <div className={`${mealItem.iconBg} p-3.5 rounded-2xl ${mealItem.text} mt-1`}><Icon className="w-6 h-6" /></div>
                  <div className="flex-1 w-full">
                    <p className={`text-[11px] ${mealItem.text} font-bold uppercase tracking-widest mb-1`}>{mealItem.label}</p>
                    {isEditingMeals ? (
                      <textarea value={currentDayMeals[mealItem.key] || ''} onChange={(e) => handleMealInputChange(mealItem.key, e.target.value)} className={`w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:${mealItem.ring} focus:bg-white resize-none`} rows={2} />
                    ) : (
                      <p className="text-gray-800 font-semibold text-base leading-tight break-words">{currentDayMeals[mealItem.key] || ''}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStatsScreen = () => {
    const sortedUsers = Object.entries(userStats || {})
      .map(([name, stats]) => ({ name, points: stats?.points || 0, streak: stats?.streak || 0 }))
      .sort((a, b) => b.points - a.points);

    const maxPoints = Math.max(...sortedUsers.map(u => u.points), 1);

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className="animate-fade-in p-4 pb-32">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <BarChart2 className="text-blue-500" /> Нэгтгэл & Үр дүн
        </h2>

        <div className="bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 p-6 rounded-3xl shadow-xl mb-8 text-white relative overflow-hidden flex items-center justify-between">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-blue-500 rounded-full blur-3xl opacity-30"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500 rounded-full blur-3xl opacity-20"></div>

          <div className="relative z-10">
            <h3 className="text-blue-200 font-bold text-[10px] uppercase tracking-widest mb-1">{selectedUser}</h3>
            <p className="text-2xl font-black mb-1 leading-tight">Сонгосон өдрийн<br />гүйцэтгэл</p>
            <p className="text-xs text-blue-100/70 font-medium max-w-[140px]">
              {progress === 100 ? 'Гайхалтай! Бүгдийг дуусгалаа 🎉' : progress > 50 ? 'Сайн байна, улам хичээгээрэй! 💪' : 'Дадлаа хийж эхэлцгээе! 🚀'}
            </p>
          </div>

          <div className="relative z-10 flex items-center justify-center">
            <svg className="transform -rotate-90 w-28 h-28">
              <circle cx="56" cy="56" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
              <circle cx="56" cy="56" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="text-blue-400 transition-all duration-1000 ease-out" />
            </svg>
            <span className="absolute text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-300 to-purple-300">{progress}%</span>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between px-1">
          <h3 className="font-black text-lg text-gray-800 flex items-center gap-2">Тэргүүлэгчдийн самбар <Trophy size={20} className="text-yellow-500" /></h3>
          <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">Нийт оноо</span>
        </div>

        <div className="space-y-3">
          {sortedUsers.map((u, i) => {
            const isFirst = i === 0;
            const isSecond = i === 1;
            const isThird = i === 2;

            let cardStyle = "bg-white border-gray-100 shadow-sm";
            let rankIcon = <span className="font-black text-gray-400">{i + 1}</span>;
            let barColor = "from-blue-400 to-indigo-500";

            if (isFirst) {
              cardStyle = "bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200 shadow-md shadow-yellow-100/50 transform scale-[1.02] z-10";
              rankIcon = <Crown size={24} className="text-yellow-500 drop-shadow-sm" fill="currentColor" />;
              barColor = "from-yellow-400 to-orange-500";
            } else if (isSecond) {
              cardStyle = "bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200 shadow-sm";
              rankIcon = <Medal size={22} className="text-gray-400 drop-shadow-sm" fill="currentColor" />;
              barColor = "from-gray-400 to-slate-500";
            } else if (isThird) {
              cardStyle = "bg-gradient-to-br from-orange-50/50 to-amber-50/50 border-orange-200/50 shadow-sm";
              rankIcon = <Medal size={22} className="text-orange-400 drop-shadow-sm" fill="currentColor" />;
              barColor = "from-orange-300 to-amber-500";
            }

            return (
              <div key={u.name} className={`p-4 rounded-3xl border transition-all duration-300 relative overflow-hidden flex flex-col gap-3 ${cardStyle}`}>
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 flex justify-center items-center">{rankIcon}</div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${isFirst ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-100 text-gray-600'}`}>
                      {u.name.substring(0, 1)}
                    </div>
                    <div>
                      <div className={`font-bold text-[15px] ${isFirst ? 'text-yellow-900' : 'text-gray-800'}`}>{u.name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Flame size={12} className="text-orange-500" fill="currentColor" />
                        <span className="text-[10px] font-bold text-gray-500">{u.streak} өдөр дараалан</span>
                      </div>
                    </div>
                  </div>
                  <div className={`text-2xl font-black ${isFirst ? 'text-yellow-600' : 'text-gray-800'}`}>
                    {u.points}
                  </div>
                </div>

                <div className="w-full bg-black/5 rounded-full h-2 relative z-10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${barColor}`}
                    style={{ width: `${maxPoints > 0 ? (u.points / maxPoints) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden flex flex-col selection:bg-blue-100 selection:text-blue-900">

      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3">
            <Sparkles size={18} className="text-yellow-400" /> {toastMessage}
          </div>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-lg pt-14 pb-4 px-5 z-20 sticky top-0 border-b border-gray-100 flex justify-center items-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
        <h1 className="text-lg font-extrabold text-gray-900 tracking-tight">Гэр Бүлийн <span className="text-blue-600">Дадал</span></h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'today' && renderTodayScreen()}
        {activeTab === 'habits' && renderHabitScreen()}
        {activeTab === 'meals' && renderMealScreen()}
        {activeTab === 'stats' && renderStatsScreen()}
      </div>

      {activeTab === 'today' && !isEditingTasks && (
        <button onClick={() => setShowAddModal(true)} className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-200 flex items-center justify-center hover:bg-blue-700 transition-transform active:scale-90 z-30">
          <Plus size={28} strokeWidth={2.5} />
        </button>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowAddModal(false)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Шинэ дадал нэмэх</h3>
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Дадлын нэр..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-400 mb-4"
              autoFocus
            />
            <button onClick={handleAddTask} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">Нэмэх</button>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 w-full max-w-md bg-white/90 backdrop-blur-md border-t border-gray-200/60 px-6 py-4 flex justify-between items-center z-40 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <button onClick={() => setActiveTab('today')} className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'today' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
          <CalendarIcon size={24} strokeWidth={activeTab === 'today' ? 2.5 : 2} className={activeTab === 'today' ? 'drop-shadow-sm' : ''} />
          <span className="text-[10px] font-bold">Хуанли</span>
        </button>
        <button onClick={() => setActiveTab('habits')} className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'habits' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
          <CheckCircle size={24} strokeWidth={activeTab === 'habits' ? 2.5 : 2} className={activeTab === 'habits' ? 'drop-shadow-sm' : ''} />
          <span className="text-[10px] font-bold">Зорилго</span>
        </button>
        <button onClick={() => setActiveTab('meals')} className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'meals' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
          <Utensils size={24} strokeWidth={activeTab === 'meals' ? 2.5 : 2} className={activeTab === 'meals' ? 'drop-shadow-sm' : ''} />
          <span className="text-[10px] font-bold">Хоол</span>
        </button>
        <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'stats' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
          <BarChart2 size={24} strokeWidth={activeTab === 'stats' ? 2.5 : 2} className={activeTab === 'stats' ? 'drop-shadow-sm' : ''} />
          <span className="text-[10px] font-bold">Нэгтгэл</span>
        </button>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes slideUp { 0% { opacity: 0; transform: translate(-50%, -20px); } 100% { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes shimmer { 100% { transform: translateX(100%); } }
        @keyframes pop { 0% { transform: scale(0.8); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        .pb-safe { padding-bottom: max(1.5rem, env(safe-area-inset-bottom)); }
        input, textarea { -webkit-appearance: none; border-radius: 12px; }
      `}} />
    </div>
  );
};

export default App;
