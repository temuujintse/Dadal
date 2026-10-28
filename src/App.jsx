import '../global.css';
// SafeAreaView / Animated.View дээр className ажиллуулахын тулд ЗААВАЛ хэрэгтэй.
// Тайлбарыг ./nativewind-interop.js дотроос уншина уу. Бусад import-оос өмнө байх ёстой.
import './nativewind-interop';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChartNoAxesColumn,
  CircleCheck,
  Gift,
  Home,
  Settings,
  Utensils,
} from 'lucide-react-native';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useOnboarding } from './hooks/useOnboarding';
import { useInviteLinkCode } from './hooks/useInviteLinkCode';
import { useTaskTimer } from './hooks/useTaskTimer';
import { useDailyTip } from './hooks/useDailyTip';
import { useAppUpdates } from './hooks/useAppUpdates';
import { useFamilyData } from './hooks/useFamilyData';
import { defaultMeals, defaultFamilyRewards } from './data';
import { getTodayDateKey, dayNamesFull, mealKeyByWeekday } from './utils/dates';
import { normalizeTask } from './constants/tasks';
import { allHabitSuggestions } from './constants/habitSuggestions';
import RewardsScreen from './screens/RewardsScreen';
import MealsScreen from './screens/MealsScreen';
import StatsScreen from './screens/StatsScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import AuthScreen from './screens/AuthScreen';
import FamilySetupScreen from './screens/FamilySetupScreen';
import DashboardScreen from './screens/DashboardScreen';
import SettingsScreen from './screens/SettingsScreen';
import { calcDailyCalories, macroTargetsFromCalories } from './utils/nutrition';
import { PHOTO_UPLOAD_ENABLED } from './constants/features';
import { getJourneyState } from './utils/journey';
import { GENERIC_DAILY_CALORIE_TARGET, DAILY_NUTRITION_TARGET } from './constants/foodCalories';
import ConfettiBurst from './components/ConfettiBurst';
import ErrorBoundary from './components/ErrorBoundary';
import DailyTipModal from './components/DailyTipModal';

// P2.4: DashboardScreen нь memo()-той тул props бүр ТОГТВОРТОЙ identity-тэй
// байх ёстой. `foodLogs?.[selectedDate] || []` гэж шууд бичвэл өдрийн
// бүртгэл хоосон үед РЕНДЕР БҮРТ шинэ array literal үүсгээд memo-г эвдэнэ
// (timer tick бүрт Dashboard дахин render болох хуучин bug-ыг сэргээнэ).
const EMPTY_FOOD_ENTRIES = [];

export default function App() {
  // EAS Update-ийг апп нээгдэх / арын дэвсгэрээс буцах бүрд шалгаж, байвал
  // татаад шууд суулгана. Dev горимд огт ажиллахгүй (доторх __DEV__ шалгалт).
  // ErrorBoundary-аас ГАДНА биш, дотор нь дуудвал алдааны үед шинэчлэлт ирэх
  // боломж хаагдах тул хамгийн гадна талд байрлуулав.
  useAppUpdates();

  return (
    // ErrorBoundary нь AuthProvider-ээс ГАДНА байна — ингэснээр auth болон
    // Firebase-ийн эхлэлийн үе шатанд гарсан алдааг ч барина.
    <ErrorBoundary>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}

function MainApp() {
  const { user, authReady, firebaseError, authError, handleLogin, handleRegister, handleGuestLogin, handleGoogleLogin, handleAppleLogin, handleSignOut } = useAuth();
  const { bootLoading, hasSeenOnboarding, finishOnboarding, resetOnboarding } = useOnboarding();
  const pendingInviteCode = useInviteLinkCode();

  const [activeTab, setActiveTab] = useState('dashboard');
  // Home дээр аль дадлын дэлгэрэнгүй нээлттэй байгаа. null = бүгд хаалттай.
  // (Өмнө нь дадал дээр дархад 'today' гэсэн тусдаа дэлгэц рүү үсэрдэг байсан.)
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getTodayDateKey());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPoints, setNewTaskPoints] = useState('10');
  const [newTaskRequired, setNewTaskRequired] = useState(true);

  const [isEditingTasks, setIsEditingTasks] = useState(false);
  const [tempUserTasks, setTempUserTasks] = useState([]);
  const [selectedMealDay, setSelectedMealDay] = useState(() => mealKeyByWeekday[new Date().getDay()]);
  const [isEditingMeals, setIsEditingMeals] = useState(false);
  const [tempMeals, setTempMeals] = useState({});
  const [selectedRewardIdx, setSelectedRewardIdx] = useState(0);
  const [isEditingRewards, setIsEditingRewards] = useState(false);
  const [tempRewards, setTempRewards] = useState([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const toastTimeoutRef = useRef(null);

  // Бүх toast нэг цэгээр гарна. Өмнө нь setTimeout бүр тусдаа байсан тул хоёр
  // toast дараалан гарахад эхнийхийнх нь timer хоёр дахийг эрт унтраадаг байв.
  const showToast = (message, durationMs = 3200) => {
    if (!message) return;
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, durationMs);
  };

  useEffect(() => () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  }, []);

  // P2.5: Midnight rollover. Өмнө нь todayKey нь render бүрт дахин тооцоологддог
  // ч ШИНЭ render дуудах юмгүй бол төхөөрөмж өдөр ирж хоногилсон ч апп
  // "өчигдөр" дээрээ наалдсаар байв (completion өчигдрийн лог руу бичигдэнэ).
  // AppState active + 30s interval ашиглан өдрийн солигдолтыг илрүүлж:
  //   - todayKey-г шинэчилнэ (бүх date-хамаатай тооцоолол дахин ажиллана),
  //   - хэрэглэгч яг "өнөөдөр"-ийг сонгоод байсан бол шинэ өдөр рүү авто шилжүүлнэ
  //     (өнгөрсөн огноог харж байгаа бол сонголтыг нь хүндэтгэнэ),
  //   - datesArray мөн адил шинэ өдрийн эргэн тойронд дахин үүснэ.
  const [todayKey, setTodayKey] = useState(getTodayDateKey());
  const selectedDateRef = useRef(selectedDate);
  const todayKeyRef = useRef(todayKey);
  useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);
  // Updater дотор side effect хийхгүй (React 19 dev горимд updater ХОЁР удаа
  // дуудагдана) — ref mirror ашиглан цэвэр байдлаар шийднэ.
  const checkMidnightRollover = useCallback(() => {
    const nextKey = getTodayDateKey();
    const prevKey = todayKeyRef.current;
    if (prevKey === nextKey) return;
    todayKeyRef.current = nextKey;
    setTodayKey(nextKey);
    if (selectedDateRef.current === prevKey) setSelectedDate(nextKey);
  }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') checkMidnightRollover();
    });
    const intervalId = setInterval(checkMidnightRollover, 30 * 1000);
    return () => {
      subscription?.remove();
      clearInterval(intervalId);
    };
  }, [checkMidnightRollover]);

  const {
    familyId,
    familyProfile,
    familySetupError,
    familySetupLoading,
    familyMissing,
    memberList,
    displayStats,
    selectedMemberId,
    setSelectedMemberId,
    meals,
    setMeals,
    foodLogs,
    addFoodEntry,
    removeFoodEntry,
    familyRewards,
    setFamilyRewards,
    notificationSettings,
    currentMember,
    selectedUserName,
    sleepSummary,
    currentUserMember,
    canManage,
    totalFamilyPoints,
    baseTasks,
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
    updateTaskLog,
    toggleTask,
    toggleOption,
    handleMoodSelect,
    saveTasksForMember,
    saveToCloud,
    handleRedeemReward,
    saveNotificationSettings,
    resetMonthlyProgress,
    saveMemberPhoto,
    saveMemberPhotoData,
    transferAdmin,
    saveFamilyCover,
    listArchives,
    saveMemberProfile,
  } = useFamilyData({
    user,
    selectedDate,
    onTaskCompleted: (points) => {
      setConfettiKey((value) => value + 1);
      showToast(`+${points} оноо · Гайхалтай! 🎉`, 2200);
    },
    onRewardRedeemed: () => {
      setConfettiKey((value) => value + 1);
      showToast('Урамшууллаа авлаа! 🏆', 2600);
    },
    // Persistence амжилтгүй болсон үед hook-оос ирэх мэдэгдлийг toast дээр
    // харуулна (зөвшөөрөл/ownership/persist алдаа г.м.).
    onSaveError: (message) => showToast(message),
  });

  const handleTimerFinish = (taskId) => {
    showToast('Цаг дууслаа! Гоё байна 🎉', 3500);
    const task = currentDisplayTasks.find((item) => item.id === taskId);
    if (task && !task.done) toggleTask(taskId, true);
  };
  const { activeTimer, startTimer, stopTimer, formatTime } = useTaskTimer(handleTimerFinish);
  const { tip: dailyTip, visible: dailyTipVisible, dismiss: dismissDailyTip } = useDailyTip();

  // P2.5: өдөр солигдоход strip мөн шинэчлэгдэнэ (anchor = todayKey)
  const datesArray = useMemo(() => {
    const arr = [];
    const [y, m, d] = todayKey.split('-').map(Number);
    const today = new Date(y, m - 1, d);
    for (let i = -14; i <= 14; i += 1) {
      const day = new Date(today);
      day.setDate(today.getDate() + i);
      arr.push(day);
    }
    return arr;
  }, [todayKey]);

  const [year, month, day] = selectedDate.split('-');
  const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
  const headerDateStr = `${year} оны ${parseInt(month, 10)} сарын ${parseInt(day, 10)}, ${dayNamesFull[dateObj.getDay()]}`;

  const activeReward = familyRewards?.[selectedRewardIdx] || familyRewards?.[0] || defaultFamilyRewards[0];

  // P2.4: memoized derived values — hooks бүх early-return gate-ийн ӨМНӨ
  // дуудагдах ЁСТОЙ (rules-of-hooks).
  const todayMealKey = mealKeyByWeekday[new Date().getDay()];
  const mealsToday = useMemo(() => meals?.[todayMealKey] || defaultMeals[todayMealKey] || defaultMeals.day1, [meals, todayMealKey]);
  const selectedUserStats = useMemo(() => currentMember || { points: 0, streak: 0 }, [currentMember]);

  const handleLogout = async () => {
    // АЛДАРТ ЗААВАЛ: эхлээд signOut амжилттай болохыг хүлээнэ. Өмнө нь эсрэгээр
    // байсан тул signOut сүлжээний шалтгаанаар унасан үед хэрэглэгч НЭВТЭРСЭН
    // хэвээрээ "гэр бүл байхгүй" дэлгэцэд орж, дахин гэр бүл үүсгэснээр
    // хуучинхоо зэрэгцээд duplicate family үүсдэг байв.
    try {
      await handleSignOut();
    } catch (e) {
      console.error('Sign out failed:', e.code, e.message);
      return; // локал state-г цэвэрлэхгүй — хэрэглэгч нэвтэрсэн хэвээр, дахин оролдоно
    }
    resetFamilyState();
    setActiveTab('dashboard');
  };

  const handleResetOnboarding = async () => {
    await resetOnboarding();
    setActiveTab('dashboard');
  };

  const toggleTaskEdit = useCallback(async () => {
    if (!canManage && selectedMemberId !== user?.uid) return;
    if (isEditingTasks) {
      const result = await saveTasksForMember(selectedMemberId, tempUserTasks || []);
      // Хадгалж чадаагүй бол засварын горимоос ГАРАХГҮЙ — хэрэглэгчийн өөрчлөлт алдагдахгүй.
      if (result && !result.ok) {
        showToast(result.message);
        return;
      }
    } else {
      setTempUserTasks([...baseTasks]);
    }
    setIsEditingTasks(!isEditingTasks);
  }, [canManage, selectedMemberId, user?.uid, isEditingTasks, tempUserTasks, baseTasks, saveTasksForMember]);

  // ── P2.4: Dashboard-д дамжих callback-уудыг тогтвортой (stable) болгох ──
  // Memoized DashboardScreen/TaskCard-ийн props identity секунд бүр
  // өөрчлөгдөхөөс сэргийлнэ.
  const handleSelectMember = useCallback((uid) => {
    setSelectedMemberId(uid);
    setIsEditingTasks(false);
    setExpandedTaskId(null);
  }, [setSelectedMemberId]);
  const handleGoSettings = useCallback(() => setActiveTab('settings'), []);
  const handleGoRewards = useCallback(() => setActiveTab('habits'), []);
  const handleGoMeals = useCallback(() => setActiveTab('meals'), []);
  const handleSelectDate = useCallback((key) => { setSelectedDate(key); setExpandedTaskId(null); }, []);
  const handleToggleExpand = useCallback((id) => setExpandedTaskId((prev) => (prev === id ? null : id)), []);
  const handleChangeTaskInput = useCallback((id, value) => updateTaskLog(id, { inputValue: value }), [updateTaskLog]);
  // detailType-ийн бүх талбарыг (hoursValue, countValue, endedAt) нэг замаар
  // бичнэ. updateTaskLog нь оноо өөрчлөхгүй, зөвхөн логоо шинэчилнэ.
  const handleUpdateTaskLog = useCallback((id, updates) => updateTaskLog(id, updates), [updateTaskLog]);
  const handleOpenAddModal = useCallback(() => setShowAddModal(true), []);

  // ── Зураг оруулах ──────────────────────────────────────────────────────
  // Facebook-ээс зураг татахын ОРОНД утасны зургийн сангаас сонгоно.
  // (Facebook Login нь зөвхөн нэвтэрсэн хүний ӨӨРИЙНХ нь зургийг өгдөг тул
  //  гэр бүлийн бусад гишүүдийн зургийг татах боломжгүй — PLAN_V2.md үзнэ үү.)
  // photos.js бүх алдааг { ok:false, message } болгон буцаадаг тул энд
  // try/catch хэрэггүй; хэрэглэгч болгонд ойлгомжтой toast гарна.
  const [photoUploading, setPhotoUploading] = useState(false);

  // ЗУРГИЙН МОДУЛИЙГ ДИНАМИКААР ачаална. `expo-image-picker` /
  // `expo-image-manipulator` нь NATIVE модулиуд — тэдгээрийг агуулаагүй
  // (өмнө нь хийсэн) build рүү OTA update ирэхэд статик импорт нь
  // "Cannot find native module" алдаа өгч аппыг УНАГААНА. Флаг унтраалттай
  // үед энэ мөр хэзээ ч ажиллахгүй тул хуучин build ч аюулгүй үлдэнэ.
  const loadPhotoService = () => import('./services/photos');

  const handleChangeMemberPhoto = useCallback(async (uid) => {
    if (!familyId || !uid || photoUploading) return;
    setPhotoUploading(true);
    try {
      // Storage (Blaze) унтраалттай үед жижиг зургийг Firestore-д шууд хадгална.
      if (!PHOTO_UPLOAD_ENABLED) {
        const { pickAvatarAsDataUrl } = await loadPhotoService();
        const picked = await pickAvatarAsDataUrl();
        if (!picked.ok) {
          if (picked.code !== 'CANCELED') showToast(picked.message);
          return;
        }
        const savedData = await saveMemberPhotoData(uid, picked.dataUrl);
        showToast(savedData.ok ? 'Зураг шинэчлэгдлээ 📸' : savedData.message);
        return;
      }
      const { pickAndUploadMemberPhoto } = await loadPhotoService();
      const uploaded = await pickAndUploadMemberPhoto({ familyId, uid });
      // CANCELED — хэрэглэгч өөрөө буцсан, алдаа биш тул чимээгүй өнгөрнө.
      if (!uploaded.ok) {
        if (uploaded.code !== 'CANCELED') showToast(uploaded.message);
        return;
      }
      const saved = await saveMemberPhoto(uid, uploaded.url);
      showToast(saved.ok ? 'Зураг шинэчлэгдлээ 📸' : saved.message);
    } finally {
      setPhotoUploading(false);
    }
  }, [familyId, photoUploading, saveMemberPhoto, saveMemberPhotoData]);

  const handleChangeCoverPhoto = useCallback(async () => {
    if (!PHOTO_UPLOAD_ENABLED || !familyId || photoUploading) return;
    setPhotoUploading(true);
    try {
      const { pickAndUploadFamilyCover } = await loadPhotoService();
      const uploaded = await pickAndUploadFamilyCover({ familyId });
      if (!uploaded.ok) {
        if (uploaded.code !== 'CANCELED') showToast(uploaded.message);
        return;
      }
      const saved = await saveFamilyCover(uploaded.url);
      showToast(saved.ok ? 'Нүүрний зураг шинэчлэгдлээ 🖼️' : saved.message);
    } finally {
      setPhotoUploading(false);
    }
  }, [familyId, photoUploading, saveFamilyCover]);

  // Timer мэдээллийг primitive болгон задалж дамжуулна — activeTimer объектын
  // identity tick бүрт өөрчлөгдвөл memo утга учргүй болно.
  const timerTaskId = activeTimer?.taskId ?? null;
  const timerRemaining = activeTimer?.timeRemaining ?? 0;
  const timerRunning = Boolean(activeTimer?.isRunning);

  const handleTempTaskChange = useCallback((id, field, value) => {
    setTempUserTasks((prev) => (prev || []).map((task) => {
      if (task.id !== id) return task;
      if (field === 'points') return { ...task, points: Number(value) || 0 };
      return { ...task, [field]: value };
    }));
  }, []);
  const handleTempTaskDelete = useCallback((id) => setTempUserTasks((prev) => (prev || []).filter((task) => task.id !== id)), []);
  const handleTempTaskAdd = useCallback(() => setTempUserTasks((prev) => [...(prev || []), normalizeTask({ id: `task_${Date.now()}`, text: '', hasInput: true, points: 10, required: true })]), []);

  const foodEntriesForSelectedDate = useMemo(() => foodLogs?.[selectedDate] || EMPTY_FOOD_ENTRIES, [foodLogs, selectedDate]);

  // Хувь хүний өдрийн илчлэгийн зорилт. Гишүүн биеийн үзүүлэлтээ бөглөөгүй
  // (эсвэл 18-аас доош настай) бол ерөнхий 2000 ккал хэвээр — тооцоолол нь
  // ЗӨВХӨН нэмэлт боломж болохоос шаардлага биш.
  const selectedMemberProfile = selectedMemberId ? memberList.find((m) => m.uid === selectedMemberId) : null;
  const dailyCalorieTarget = useMemo(() => {
    const result = calcDailyCalories(selectedMemberProfile);
    return result.ok ? result.calories : GENERIC_DAILY_CALORIE_TARGET;
  }, [selectedMemberProfile]);
  // 1 сарын аялалын төлөв — Нүүр дэлгэцийн полос болон Шагналын дүгнэлт
  // хоёулаа ЭНЭ нэг эх сурвалжаас утга авна.
  const journeyState = useMemo(() => getJourneyState(familyProfile, todayKey), [familyProfile, todayKey]);
  const dailyMacroTarget = useMemo(
    () => macroTargetsFromCalories(dailyCalorieTarget) || DAILY_NUTRITION_TARGET,
    [dailyCalorieTarget]
  );
  const handleAddFoodEntry = useCallback((entry) => addFoodEntry(selectedDate, entry), [addFoodEntry, selectedDate]);
  const handleRemoveFoodEntry = useCallback((entryId) => removeFoodEntry(selectedDate, entryId), [removeFoodEntry, selectedDate]);

  const handleAddTask = async () => {
    if (!newTaskText.trim() || !selectedMemberId) return;
    const task = normalizeTask({ id: `task_${Date.now()}`, text: newTaskText.trim(), hasInput: true, inputPlaceholder: 'Тэмдэглэл', points: Number(newTaskPoints || 10), required: newTaskRequired, category: 'general' });
    const result = await saveTasksForMember(selectedMemberId, [...baseTasks, task]);
    if (result && !result.ok) {
      showToast(result.message);
      return; // модал нээлттэй үлдэнэ, бичсэн текст алдагдахгүй
    }
    setNewTaskText('');
    setNewTaskPoints('10');
    setNewTaskRequired(true);
    setShowAddModal(false);
  };

  const handleAddSuggestedTasks = useCallback(async (ids) => {
    if (!selectedMemberId || !Array.isArray(ids) || ids.length === 0) return;
    const selected = allHabitSuggestions.filter((item) => ids.includes(item.id));
    if (!selected.length) return;
    const newTasks = selected.map((item, idx) =>
      normalizeTask({
        id: `task_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 5)}`,
        text: item.text,
        note: item.note || '',
        category: item.category || 'general',
        points: item.points || 10,
        timerMinutes: item.timerMinutes || 0,
        required: true,
      })
    );
    const result = await saveTasksForMember(selectedMemberId, [...baseTasks, ...newTasks]);
    if (result && !result.ok) {
      showToast(result.message);
      return;
    }
    showToast(`${newTasks.length} дадал нэмэгдлээ ✨`, 2500);
  }, [selectedMemberId, baseTasks, saveTasksForMember]);

  const renderLoading = (message = 'Апп ачааллаж байна...') => (
    <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-8">
      <View className="w-16 h-16 rounded-3xl items-center justify-center mb-5" style={{ backgroundColor: '#f97316' }}><CircleCheck size={32} color="#fff" /></View>
      <ActivityIndicator size="large" color="#f97316" />
      <Text className="text-base font-black text-gray-900 mt-4">{message}</Text>
      <Text className="text-xs text-gray-500 text-center mt-1">Firebase, account, family state шалгаж байна</Text>
      {firebaseError ? <Text className="text-xs text-red-500 mt-3 text-center">{firebaseError}</Text> : null}
    </SafeAreaView>
  );

  if (bootLoading || !authReady) return renderLoading();
  if (!hasSeenOnboarding) return <OnboardingScreen onFinish={finishOnboarding} />;
  if (!user) return <AuthScreen onLogin={handleLogin} onRegister={handleRegister} onGuest={handleGuestLogin} onGoogle={handleGoogleLogin} onApple={handleAppleLogin} error={authError || firebaseError} />;
  if (familyId && !familyProfile) {
    // P2.1: family документ бодитоор байхгүй (owner устгасан) эсвэл listener
    // алдаа гарсан бол МӨНХ ачаалжих дэлгэцэнд боомилж болохгүй — setup руу
    // буцаагаад шалтгааныг нь харуулна.
    if (familyMissing || familySetupError) {
      return <FamilySetupScreen initialInviteCode={pendingInviteCode} onCreateFamily={handleCreateFamily} onJoinFamily={handleJoinFamily} loading={familySetupLoading} error={familySetupError || 'Гэр бүлийн дата олдсонгүй.'} onLogout={handleLogout} />;
    }
    return renderLoading('Гэр бүлийн датаг уншиж байна...');
  }
  if (!familyId || !familyProfile) {
    return <FamilySetupScreen initialInviteCode={pendingInviteCode} onCreateFamily={handleCreateFamily} onJoinFamily={handleJoinFamily} loading={familySetupLoading} error={familySetupError} onLogout={handleLogout} />;
  }

  return (
    // Гадна талын View нь дэлгэцийн БҮХ талбайг эзэлнэ. Доод таб бар үүний шууд
    // хүү учраас "bottom" нь утасны бодит доод ирмэгээс тоологдоно.
    // (Өмнө нь бар SafeAreaView дотор байсан тул home indicator-ийн inset (~34pt)
    //  дээр нэмээд 20px гарч, нийт ~54pt өндөрт хөвж харагддаг байсан.)
    <View className="flex-1 bg-slate-50">
      <SafeAreaView className="flex-1">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 112 }}>
        {activeTab === 'dashboard' && (
          <DashboardScreen
            selectedUser={selectedUserName}
            selectedMemberId={selectedMemberId}
            members={memberList}
            onSelectMember={handleSelectMember}
            familyProfile={familyProfile}
            groupType={familyProfile?.groupType || 'family'}
            onGoSettings={handleGoSettings}

            currentUserId={user.uid}
            coverPhotoURL={familyProfile?.coverPhotoURL || null}
            canEditCover={canManage}
            photoUploading={photoUploading}
            onChangeMemberPhoto={handleChangeMemberPhoto}
            onChangeCoverPhoto={handleChangeCoverPhoto}

            progress={progress}
            completedCount={completedCount}
            totalTasks={currentDisplayTasks.length}
            remainingCount={remainingCount}
            requiredCount={requiredCount}
            streak={selectedUserStats.streak || 0}

            datesArray={datesArray}
            selectedDate={selectedDate}
            todayKey={todayKey}
            headerDateStr={headerDateStr}
            onSelectDate={handleSelectDate}
            onFetchArchives={listArchives}

            currentMood={currentMood}
            onSelectMood={handleMoodSelect}

            tasks={currentDisplayTasks}
            onToggleTask={toggleTask}
            expandedTaskId={expandedTaskId}
            onToggleExpand={handleToggleExpand}
            onToggleOption={toggleOption}
            onChangeTaskInput={handleChangeTaskInput}
            onUpdateTaskLog={handleUpdateTaskLog}
            timerTaskId={timerTaskId}
            timerRemaining={timerRemaining}
            timerRunning={timerRunning}
            onStartTimer={startTimer}
            onStopTimer={stopTimer}
            formatTime={formatTime}

            canEditTasks={canManage || selectedMemberId === user.uid}
            isEditingTasks={isEditingTasks}
            onToggleEditTasks={toggleTaskEdit}
            tempUserTasks={tempUserTasks}
            onTempTaskChange={handleTempTaskChange}
            onTempTaskAdd={handleTempTaskAdd}
            onTempTaskDelete={handleTempTaskDelete}
            onOpenAddModal={handleOpenAddModal}
            onAddSuggestedTasks={handleAddSuggestedTasks}

            totalFamilyPoints={totalFamilyPoints}
            activeReward={activeReward}
            mealsToday={mealsToday}
            onGoRewards={handleGoRewards}
            onGoMeals={handleGoMeals}

            foodEntries={foodEntriesForSelectedDate}
            dailyCalorieTarget={dailyCalorieTarget}
            dailyMacroTarget={dailyMacroTarget}
            onAddFoodEntry={handleAddFoodEntry}
            onRemoveFoodEntry={handleRemoveFoodEntry}
          />
        )}

        {activeTab === 'habits' && <RewardsScreen groupType={familyProfile?.groupType || 'family'} journey={journeyState} members={memberList} canEdit={canManage} familyRewards={familyRewards} setFamilyRewards={setFamilyRewards} isEditingRewards={isEditingRewards} setIsEditingRewards={setIsEditingRewards} tempRewards={tempRewards} setTempRewards={setTempRewards} selectedRewardIdx={selectedRewardIdx} setSelectedRewardIdx={setSelectedRewardIdx} totalFamilyPoints={totalFamilyPoints} saveToCloud={saveToCloud} showResetConfirm={showResetConfirm} setShowResetConfirm={setShowResetConfirm} onResetMonth={resetMonthlyProgress} onRedeemReward={handleRedeemReward} />}
        {activeTab === 'meals' && (
          <MealsScreen
            groupType={familyProfile?.groupType || 'family'}
            canEdit={canManage}
            meals={meals}
            setMeals={setMeals}
            selectedMealDay={selectedMealDay}
            setSelectedMealDay={setSelectedMealDay}
            isEditingMeals={isEditingMeals}
            setIsEditingMeals={setIsEditingMeals}
            tempMeals={tempMeals}
            setTempMeals={setTempMeals}
            saveToCloud={saveToCloud}
            foodEntries={foodEntriesForSelectedDate}
            dailyCalorieTarget={dailyCalorieTarget}
            dailyMacroTarget={dailyMacroTarget}
            onAddFoodEntry={handleAddFoodEntry}
            onRemoveFoodEntry={handleRemoveFoodEntry}
            foodLogDateLabel={headerDateStr}
          />
        )}
        {activeTab === 'stats' && <StatsScreen sleepSummary={sleepSummary} groupType={familyProfile?.groupType || 'family'} userStats={displayStats} selectedUser={selectedUserName} progress={progress} weeklyReport={weeklyReport} weeklyTrend={weeklyTrend} completedCount={completedCount} totalTasks={currentDisplayTasks.length} />}
        {activeTab === 'settings' && <SettingsScreen familyProfile={familyProfile} selectedUser={selectedUserName} currentMember={currentUserMember} members={memberList} notificationSettings={notificationSettings} onSaveNotificationSettings={saveNotificationSettings} onLogout={handleLogout} onResetOnboarding={handleResetOnboarding} onSaveMemberProfile={saveMemberProfile} onTransferAdmin={async (uid, options) => { const result = await transferAdmin(uid, options); showToast(result.ok ? 'Админ эрх шинэчлэгдлээ' : result.message); }} />}
      </ScrollView>

      <ConfettiBurst key={confettiKey} active={confettiKey > 0} />
      <DailyTipModal visible={dailyTipVisible} tip={dailyTip} onClose={dismissDailyTip} />

      {toastMessage ? <View className="absolute top-14 left-5 right-5 bg-gray-950 rounded-2xl px-4 py-3"><Text className="text-white font-black text-center">{toastMessage}</Text></View> : null}
      </SafeAreaView>

      {/* Доод таб бар — SafeAreaView-ээс ГАДНА тул бодит доод ирмэгээс 24px */}
      <View className="absolute bottom-6 left-5 right-5 bg-white border border-gray-100 rounded-[28px] p-2 flex-row justify-around shadow-lg">
        {[{ id: 'dashboard', label: 'Нүүр', Icon: Home }, { id: 'meals', label: 'Хоол', Icon: Utensils }, { id: 'habits', label: 'Шагнал', Icon: Gift }, { id: 'stats', label: 'Стат', Icon: ChartNoAxesColumn }, { id: 'settings', label: 'Тохиргоо', Icon: Settings }].map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.Icon;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              className={`items-center justify-center rounded-2xl px-3 py-2.5 ${active ? 'bg-orange-50 border border-orange-100' : ''}`}
              style={{ minHeight: 56, minWidth: 56 }}
            >
              <Icon size={20} color={active ? '#f97316' : '#94a3b8'} />
              <Text className={`text-[10px] font-bold mt-1 ${active ? 'text-orange-600' : 'text-gray-400'}`}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <Pressable className="flex-1 bg-black/30 justify-end" onPress={() => setShowAddModal(false)}>
          <Pressable className="bg-white rounded-t-[32px] p-6 gap-4" onPress={() => {}} style={{ paddingBottom: 32 }}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xl font-black text-gray-900">Шинэ дадал нэмэх</Text>
                <Text className="text-xs font-semibold text-gray-500 mt-1">Жижиг алхмаас эхлээрэй</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Хаах"
                className="w-11 h-11 rounded-2xl bg-slate-100 items-center justify-center"
                style={{ minHeight: 44, minWidth: 44 }}
              >
                <Text className="text-slate-500 font-black text-lg">✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              value={newTaskText}
              onChangeText={setNewTaskText}
              placeholder="Жишээ: Өглөө ном 10 минут унших"
              placeholderTextColor="#94a3b8"
              className="bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-gray-900"
              style={{ minHeight: 52 }}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[11px] font-black text-gray-500 mb-1.5 ml-1">Оноо</Text>
                <TextInput
                  value={newTaskPoints}
                  onChangeText={setNewTaskPoints}
                  keyboardType="number-pad"
                  placeholder="10"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-gray-900 text-center"
                  style={{ minHeight: 52 }}
                />
              </View>
              <View className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 justify-center" style={{ minHeight: 52 }}>
                <Text className="text-xs font-black text-gray-700">Өдөр бүр хийх</Text>
                <Text className="text-[10px] font-semibold text-gray-400">Алгасаж болно — унтраавал сонголт</Text>
              </View>
              <View className="justify-center">
                <Switch value={newTaskRequired} onValueChange={setNewTaskRequired} />
              </View>
            </View>
            <TouchableOpacity
              onPress={handleAddTask}
              activeOpacity={0.85}
              className="bg-orange-500 rounded-2xl py-4 items-center shadow-sm"
              style={{ minHeight: 52 }}
            >
              <Text className="text-white font-black text-base">Нэмэх</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
