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
import { useFamilyData } from './hooks/useFamilyData';
import { defaultMeals, defaultFamilyRewards } from './data';
import { getTodayDateKey, dayNamesFull, mealKeyByWeekday } from './utils/dates';
import { normalizeTask } from './constants/tasks';
import RewardsScreen from './screens/RewardsScreen';
import MealsScreen from './screens/MealsScreen';
import StatsScreen from './screens/StatsScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import AuthScreen from './screens/AuthScreen';
import FamilySetupScreen from './screens/FamilySetupScreen';
import DashboardScreen from './screens/DashboardScreen';
import SettingsScreen from './screens/SettingsScreen';
import ConfettiBurst from './components/ConfettiBurst';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
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
    familyRewards,
    setFamilyRewards,
    notificationSettings,
    currentMember,
    selectedUserName,
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
      await saveTasksForMember(selectedMemberId, tempUserTasks || []);
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
  const handleOpenAddModal = useCallback(() => setShowAddModal(true), []);

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

  const handleAddTask = async () => {
    if (!newTaskText.trim() || !selectedMemberId) return;
    const task = normalizeTask({ id: `task_${Date.now()}`, text: newTaskText.trim(), hasInput: true, inputPlaceholder: 'Тэмдэглэл', points: Number(newTaskPoints || 10), required: newTaskRequired, category: 'general' });
    await saveTasksForMember(selectedMemberId, [...baseTasks, task]);
    setNewTaskText('');
    setNewTaskPoints('10');
    setNewTaskRequired(true);
    setShowAddModal(false);
  };

  const renderLoading = (message = 'Апп ачааллаж байна...') => (
    <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-8">
      <View className="w-16 h-16 rounded-3xl bg-blue-600 items-center justify-center mb-5"><CircleCheck size={32} color="#fff" /></View>
      <ActivityIndicator size="large" color="#2563eb" />
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
            onGoSettings={handleGoSettings}

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

            currentMood={currentMood}
            onSelectMood={handleMoodSelect}

            tasks={currentDisplayTasks}
            onToggleTask={toggleTask}
            expandedTaskId={expandedTaskId}
            onToggleExpand={handleToggleExpand}
            onToggleOption={toggleOption}
            onChangeTaskInput={handleChangeTaskInput}
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

            totalFamilyPoints={totalFamilyPoints}
            activeReward={activeReward}
            mealsToday={mealsToday}
            onGoRewards={handleGoRewards}
            onGoMeals={handleGoMeals}
          />
        )}

        {activeTab === 'habits' && <RewardsScreen canEdit={canManage} familyRewards={familyRewards} setFamilyRewards={setFamilyRewards} isEditingRewards={isEditingRewards} setIsEditingRewards={setIsEditingRewards} tempRewards={tempRewards} setTempRewards={setTempRewards} selectedRewardIdx={selectedRewardIdx} setSelectedRewardIdx={setSelectedRewardIdx} totalFamilyPoints={totalFamilyPoints} saveToCloud={saveToCloud} showResetConfirm={showResetConfirm} setShowResetConfirm={setShowResetConfirm} onResetMonth={resetMonthlyProgress} onRedeemReward={handleRedeemReward} />}
        {activeTab === 'meals' && <MealsScreen canEdit={canManage} meals={meals} setMeals={setMeals} selectedMealDay={selectedMealDay} setSelectedMealDay={setSelectedMealDay} isEditingMeals={isEditingMeals} setIsEditingMeals={setIsEditingMeals} tempMeals={tempMeals} setTempMeals={setTempMeals} saveToCloud={saveToCloud} />}
        {activeTab === 'stats' && <StatsScreen userStats={displayStats} selectedUser={selectedUserName} progress={progress} weeklyReport={weeklyReport} weeklyTrend={weeklyTrend} completedCount={completedCount} totalTasks={currentDisplayTasks.length} />}
        {activeTab === 'settings' && <SettingsScreen familyProfile={familyProfile} selectedUser={selectedUserName} currentMember={currentUserMember} members={memberList} notificationSettings={notificationSettings} onSaveNotificationSettings={saveNotificationSettings} onLogout={handleLogout} onResetOnboarding={handleResetOnboarding} />}
      </ScrollView>

      <ConfettiBurst key={confettiKey} active={confettiKey > 0} />

      {toastMessage ? <View className="absolute top-14 left-5 right-5 bg-gray-950 rounded-2xl px-4 py-3"><Text className="text-white font-black text-center">{toastMessage}</Text></View> : null}
      </SafeAreaView>

      {/* Доод таб бар — SafeAreaView-ээс ГАДНА тул бодит доод ирмэгээс 24px */}
      <View className="absolute bottom-6 left-5 right-5 bg-white border border-gray-100 rounded-[28px] p-2 flex-row justify-around shadow-lg">
        {[{ id: 'dashboard', label: 'Нүүр', Icon: Home }, { id: 'meals', label: 'Хоол', Icon: Utensils }, { id: 'habits', label: 'Шагнал', Icon: Gift }, { id: 'stats', label: 'Стат', Icon: ChartNoAxesColumn }, { id: 'settings', label: 'Тохиргоо', Icon: Settings }].map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.Icon;
          return <TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)} className={`items-center justify-center rounded-2xl px-3 py-2 ${active ? 'bg-orange-50' : ''}`}><Icon size={20} color={active ? '#f97316' : '#94a3b8'} /><Text className={`text-[9px] font-black mt-1 ${active ? 'text-orange-600' : 'text-gray-400'}`}>{tab.label}</Text><View className="w-1.5 h-1.5 rounded-full mt-1" style={{ backgroundColor: active ? '#f97316' : 'transparent' }} /></TouchableOpacity>;
        })}
      </View>

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <Pressable className="flex-1 bg-black/30 justify-end" onPress={() => setShowAddModal(false)}>
          <Pressable className="bg-white rounded-t-[32px] p-6 gap-4" onPress={() => {}}>
            <Text className="text-2xl font-black text-gray-950">Шинэ дадал нэмэх</Text>
            <TextInput value={newTaskText} onChangeText={setNewTaskText} placeholder="Жишээ: 20 минут алхах" placeholderTextColor="#94a3b8" className="bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-gray-900" />
            <TextInput value={newTaskPoints} onChangeText={setNewTaskPoints} keyboardType="number-pad" placeholder="Оноо" className="bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-gray-900" />
            <View className="flex-row items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3"><Text className="font-black text-gray-700">Required task</Text><Switch value={newTaskRequired} onValueChange={setNewTaskRequired} /></View>
            <TouchableOpacity onPress={handleAddTask} className="bg-blue-600 rounded-2xl py-4 items-center"><Text className="text-white font-black">Нэмэх</Text></TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
