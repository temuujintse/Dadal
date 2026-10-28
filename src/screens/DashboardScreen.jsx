import React, { memo, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, ImageBackground, PanResponder, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import EmptyHabitState from '../components/EmptyHabitState';
import ProgressRing from '../components/ProgressRing';
import { getGroupTypeMeta } from '../constants/groupTypes';
import { PHOTO_UPLOAD_ENABLED } from '../constants/features';
import { getJourneyState } from '../utils/journey';
import { calcSleepHours, formatHours, formatTimeInput } from '../utils/sleep';
import SuggestionSheet from '../components/SuggestionSheet';
import ArchiveModal from '../components/ArchiveModal';
import FoodLogSection from '../components/FoodLogSection';
import {
  Archive,
  Check,
  ChevronDown,
  ChevronRight,
  Flame,
  Gift,
  Pause,
  Play,
  Plus,
  Save,
  Camera,
  Settings,
  SlidersHorizontal,
  Square,
  Trash,
  Utensils,
} from 'lucide-react-native';
import { moods } from '../constants/moods';
import { dayNamesShort, formatDateKey } from '../utils/dates';

// Нэг дадлын карт. React.memo — P2.4: timer tick бүрд БҮХ карт дахин render
// болохоор болгосон. Одоо timer-ийн мэдээллийг primitive props-аар (timerActive/
// timerRemaining/timerRunning) дамжуулдаг тул зөвхөн идэвхтэй таймертай КАРТ
// л секунд бүр render болно. Callback-ууд App/hook талаасаа тогтвортой (stable)
// identity-тэй тул memo хэрэгтэй шалгалтаа алдаагүй давна.
//
// Өмнө нь энэ карт дээр дархад activeTab-ийг 'today' болгож ӨӨР дэлгэц рүү
// шилждэг байсан бөгөөд тэр дэлгэц яг ижил дадлын жагсаалтыг дахин харуулдаг
// байв (зөвхөн илүү дэлгэрэнгүйгээр). "Дадал дээр дархаар дахиад дадал гарч
// ирдэг" ойлгомжгүй байдал үүсгэдэг байсан тул дэлгэрэнгүйг одоо ЭНД, картын
// дотор нээдэг болгов.
const TaskCard = memo(function TaskCard({
  task,
  index,
  expanded,
  onToggleDone,
  onToggleExpand,
  onToggleOption,
  onChangeInput,
  onUpdateLog,
  timerActive,
  timerRemaining,
  timerRunning,
  onStartTimer,
  onStopTimer,
  formatTime,
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const done = Boolean(task.done);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => !done && gesture.dx > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_, gesture) => translateX.setValue(Math.max(0, Math.min(gesture.dx, 120))),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > 75 && !done) {
        Animated.timing(translateX, { toValue: 125, duration: 150, useNativeDriver: true }).start(() => {
          onToggleDone?.(task.id, true);
          translateX.setValue(0);
        });
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 22, bounciness: 5 }).start();
      }
    },
    onPanResponderTerminate: () => Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start(),
    // P2.4: onToggleDone одоо hook-оос тогтвортой identity-тай ирдэг тул tick
    // бүр PanResponder ДАХИН үүсэхээ больсон (өмнө нь секунд бүр ~18 ширхэг
    // PanResponder.create() хийгдэж байв).
  }), [done, onToggleDone, task.id, translateX]);

  // Бүх дадал одоо эхэлсэн/дууссан цагаа бүртгэдэг (trackTime) тул
  // дэлгэрэнгүй хэсэг нь үргэлж агуулгатай — өмнө нь зарим карт дарагдахгүй
  // "үхсэн" байдалтай байсныг үүгээр арилгана.
  const isSleep = task.detailType === 'hours';
  const hasDetail = Boolean(
    task.trackTime !== false
    || task.tip
    || task.note
    || task.options?.length
    || task.detailType === 'hours'
    || task.detailType === 'count'
    || task.detailType === 'text'
    || task.timerMinutes
    || task.category
  );
  const nowHHMM = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <View className={`rounded-3xl border overflow-hidden ${done ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
      {/* Шудрах мөр — ногоон "Дуусгах" дэвсгэр зөвхөн энэ мөрийн ард байна */}
      <View className="overflow-hidden bg-green-600">
        <View className="absolute inset-0 px-5 flex-row items-center">
          <Check size={22} color="#fff" />
          <Text className="text-white font-black ml-2">Дуусгах</Text>
        </View>
        <Animated.View
          {...panResponder.panHandlers}
          style={{ transform: [{ translateX }] }}
          className={`p-4 flex-row items-center ${done ? 'bg-green-50' : 'bg-white'}`}
        >
          <TouchableOpacity
            onPress={() => onToggleDone?.(task.id)}
            accessibilityRole="button"
            accessibilityLabel={done ? `${task.text} — буцаах` : `${task.text} — дуусгах`}
            className={`w-12 h-12 rounded-2xl items-center justify-center ${done ? 'bg-green-600' : 'bg-orange-50'}`}
          >
            <Check size={24} color={done ? '#fff' : '#fdba74'} strokeWidth={3} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onToggleExpand?.(task.id)}
            disabled={!hasDetail}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Дэлгэрэнгүйг хаах' : 'Дэлгэрэнгүйг нээх'}
            className="flex-1 ml-3 pr-2"
          >
            <View className="flex-row items-center gap-2">
              {index ? (
                <Text className={`text-[11px] font-black ${done ? 'text-green-500' : 'text-gray-400'}`}>{index}.</Text>
              ) : null}
              <Text numberOfLines={2} className={`flex-1 text-[15px] leading-5 font-black ${done ? 'text-gray-400 line-through' : 'text-gray-950'}`}>{task.text}</Text>
              <Text className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-full">+{task.points}</Text>
            </View>
            <Text numberOfLines={1} className="text-xs font-semibold text-gray-400 mt-1">
              {done ? 'Амжилттай дууссан' : task.note || 'Баруун тийш шудраад дуусгана'}
            </Text>
          </TouchableOpacity>

          {hasDetail ? (
            <TouchableOpacity
              onPress={() => onToggleExpand?.(task.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              className="w-11 h-11 rounded-2xl items-center justify-center"
              style={{ minHeight: 44, minWidth: 44 }}
            >
              {expanded ? <ChevronDown size={18} color="#64748b" /> : <ChevronRight size={18} color="#94a3b8" />}
            </TouchableOpacity>
          ) : <View className="w-11" />}
        </Animated.View>
      </View>

      {/* Дэлгэрэнгүй — өмнө нь 'today' дэлгэц дээр байсан бүх зүйл энд орлоо */}
      {expanded && hasDetail ? (
        <View className="px-4 pb-4 pt-3 gap-3 border-t border-gray-100">
          {!isSleep ? (<>
          <View className="flex-row flex-wrap items-center gap-2">
            {task.required !== false
              ? <Text className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-full">Заавал</Text>
              : <Text className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Сонголтоор</Text>}
            {task.category ? <Text className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{task.category}</Text> : null}
            {task.frequency ? <Text className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{task.frequency}</Text> : null}
          </View>

          {task.note ? <Text className="text-xs font-bold text-gray-500">{task.note}</Text> : null}

          {/* Аппын өгөх ТОГТМОЛ зөвлөмж — хэрэглэгчийн бичих талбар биш */}
          {task.tip ? (
            <View className="bg-blue-50 border border-blue-100 rounded-2xl px-3 py-2.5">
              <Text className="text-xs font-bold text-blue-900 leading-5">{task.tip}</Text>
            </View>
          ) : null}

          {/* Эхэлсэн / дууссан цаг. Эхнийх нь check хийх мөчид автоматаар
              бичигдсэн байна (useFamilyData.toggleTask), хоёр дахийг нь
              хэрэглэгч өөрөө оруулна — "Одоо" товч эсвэл гараар. */}
          </>) : null}

          {task.trackTime !== false && !isSleep ? (
            <View className="flex-row gap-2">
              <View className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5">
                <Text className="text-[10px] font-black uppercase text-gray-400">Эхэлсэн</Text>
                <Text className="text-sm font-black text-gray-800 mt-0.5">{task.startedAt || '--:--'}</Text>
              </View>
              <View className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2">
                <Text className="text-[10px] font-black uppercase text-gray-400">Дууссан</Text>
                <View className="flex-row items-center gap-1">
                  <TextInput
                    value={task.endedAt || ''}
                    onChangeText={(value) => onUpdateLog?.(task.id, { endedAt: value.replace(/[^0-9:]/g, '').slice(0, 5) })}
                    placeholder="--:--"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numbers-and-punctuation"
                    accessibilityLabel="Дууссан цаг"
                    className="flex-1 text-sm font-black text-gray-800 py-1"
                  />
                  <TouchableOpacity
                    onPress={() => onUpdateLog?.(task.id, { endedAt: nowHHMM() })}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Дууссан цагийг одоогийн цагаар бөглөх"
                    className="px-2 py-1 rounded-xl bg-white border border-slate-200"
                  >
                    <Text className="text-[10px] font-black text-gray-500">Одоо</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}

          {/* detailType: hours — орой унтсан, өглөө сэрсэн цагаас нойрыг тооцно */}
          {isSleep ? (
            <View>
              <View className="flex-row gap-2">
                {[['bedTime', '🌙 Унтсан', '23:00'], ['wakeTime', '☀️ Сэрсэн', '07:00']].map(([key, label, placeholder]) => (
                  <View key={key} className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2">
                    <Text className="text-[11px] font-black text-gray-500">{label}</Text>
                    <TextInput
                      value={task[key] || ''}
                      onChangeText={(value) => {
                        const next = { ...task, [key]: formatTimeInput(value) };
                        onUpdateLog?.(task.id, { [key]: next[key], hoursValue: calcSleepHours(next.bedTime, next.wakeTime) });
                      }}
                      placeholder={placeholder}
                      placeholderTextColor="#94a3b8"
                      keyboardType="number-pad"
                      maxLength={5}
                      accessibilityLabel={label}
                      className="text-xl font-black text-gray-900 py-1"
                    />
                  </View>
                ))}
              </View>
              {task.bedTime && task.wakeTime && task.hoursValue && Array.isArray(task.goodRange) ? (
                <View className={`mt-2.5 rounded-2xl px-3 py-2.5 ${task.hoursValue >= task.goodRange[0] ? 'bg-green-50 border border-green-100' : 'bg-orange-50 border border-orange-100'}`}>
                  <Text className={`text-sm font-black ${task.hoursValue >= task.goodRange[0] ? 'text-green-700' : 'text-orange-700'}`}>
                    {formatHours(task.hoursValue)} унтлаа{task.hoursValue >= task.goodRange[0] ? ' 👍' : ` · ${formatHours(task.goodRange[0] - task.hoursValue)} дутуу`}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* detailType: count — аягын тоолуур (− N +) */}
          {task.detailType === 'count' ? (
            <View className="flex-row items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5">
              <Text className="text-xs font-black text-gray-600 flex-1 pr-2">
                Уусан тоо{task.countMax ? ` (дээд тал нь ${task.countMax})` : ''}
              </Text>
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={() => onUpdateLog?.(task.id, { countValue: Math.max(0, (task.countValue || 0) - 1) })}
                  disabled={(task.countValue || 0) <= 0}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel="Хасах"
                  className="w-11 h-11 rounded-2xl bg-white border border-slate-200 items-center justify-center"
                  style={{ minHeight: 44, minWidth: 44, opacity: (task.countValue || 0) <= 0 ? 0.4 : 1 }}
                >
                  <Text className="text-lg font-black text-gray-500">−</Text>
                </TouchableOpacity>
                <Text className="text-lg font-black text-gray-900 w-8 text-center">{task.countValue || 0}</Text>
                <TouchableOpacity
                  onPress={() => {
                    const next = (task.countValue || 0) + 1;
                    if (task.countMax && next > task.countMax) return;
                    onUpdateLog?.(task.id, { countValue: next });
                  }}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel="Нэмэх"
                  className="w-11 h-11 rounded-2xl bg-blue-500 items-center justify-center"
                  style={{ minHeight: 44, minWidth: 44 }}
                >
                  <Text className="text-lg font-black text-white">+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {task.options?.length ? (
            <View className="flex-row flex-wrap gap-2">
              {task.options.map((option) => {
                const selected = (task.selectedOptions || []).includes(option);
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => onToggleOption?.(task.id, option)}
                    className={`px-3 py-2 rounded-2xl ${selected ? 'bg-orange-500' : 'bg-slate-100'}`}
                  >
                    <Text className={`text-xs font-black ${selected ? 'text-white' : 'text-gray-500'}`}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {task.detailType === 'text' ? (
            <TextInput
              value={task.inputValue || ''}
              onChangeText={(value) => onChangeInput?.(task.id, value)}
              placeholder={task.inputPlaceholder || 'Тэмдэглэл'}
              placeholderTextColor="#94a3b8"
              className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-gray-700"
            />
          ) : null}

          {task.timerMinutes ? (
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => onStartTimer?.(task.id, task.timerMinutes)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel="Таймер эхлүүлэх"
                className="flex-row items-center gap-1.5 px-4 py-2.5 bg-gray-900 rounded-2xl"
                style={{ minHeight: 44 }}
              >
                {timerActive && timerRunning ? <Pause size={14} color="#fff" /> : <Play size={14} color="#fff" />}
                <Text className="text-white text-xs font-black">
                  {timerActive ? formatTime?.(timerRemaining) : `${task.timerMinutes} мин`}
                </Text>
              </TouchableOpacity>
              {timerActive ? (
                <TouchableOpacity
                  onPress={onStopTimer}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Таймер зогсоох"
                  className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 items-center justify-center"
                  style={{ minHeight: 44, minWidth: 44 }}
                >
                  <Square size={14} color="#ef4444" />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

// P2.4: БҮХЭЛДЭЭН дэлгэцийг memo — timer tick бүрт MainApp дахин render
// болох ч props бүгд primitive/stable тул энэ компонент (болон хүүхдүүд нь)
// алгасагдана. Зөвхөн идэвхтэй таймертай TaskCard л дахин render болно.
const DashboardScreen = memo(function DashboardScreen({
  // толгой
  selectedUser,
  selectedMemberId,
  members = [],
  onSelectMember,
  familyProfile,
  onGoSettings,
  groupType = 'family',

  // зураг
  currentUserId = null,
  coverPhotoURL = null,
  canEditCover = false,
  photoUploading = false,
  onChangeMemberPhoto,
  onChangeCoverPhoto,

  // ахиц
  progress,
  completedCount,
  totalTasks,
  remainingCount = 0,
  requiredCount = 0,
  streak = 0,

  // огноо
  datesArray = [],
  selectedDate,
  todayKey,
  headerDateStr,
  onSelectDate,
  onFetchArchives,

  // сэтгэл зүй
  currentMood,
  onSelectMood,

  // дадал
  tasks = [],
  onToggleTask,
  expandedTaskId,
  onToggleExpand,
  onToggleOption,
  onChangeTaskInput,
  onUpdateTaskLog,
  timerTaskId = null,
  timerRemaining = 0,
  timerRunning = false,
  onStartTimer,
  onStopTimer,
  formatTime,

  // засварын горим
  canEditTasks = false,
  isEditingTasks = false,
  onToggleEditTasks,
  tempUserTasks = [],
  onTempTaskChange,
  onTempTaskAdd,
  onTempTaskDelete,
  onOpenAddModal,
  onAddSuggestedTasks,

  // доод картууд
  totalFamilyPoints,
  activeReward,
  mealsToday,
  onGoRewards,
  onGoMeals,

  // хоолны бүртгэл
  foodEntries = [],
  dailyCalorieTarget,
  dailyMacroTarget,
  onAddFoodEntry,
  onRemoveFoodEntry,
}) {
  const [showSuggestionSheet, setShowSuggestionSheet] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const rewardPct = activeReward?.target ? Math.min(Math.round((totalFamilyPoints / activeReward.target) * 100), 100) : 0;
  // Дуусгасан дадлыг доош ТҮЛХЭХГҮЙ. Өмнө нь
  //   [...tasks].sort((a, b) => Number(a.done) - Number(b.done))
  // гэж эрэмбэлдэг байсан тул check хийх бүрт жагсаалт үсэрч, хэрэглэгч
  // дараагийн дадлаа нүдээрээ дахин хайх шаардлагатай болдог байв. Одоо
  // байрлал ТОГТМОЛ — зөвхөн өнгө нь өөрчлөгдөнө.
  const orderedTasks = tasks;
  const viewingPastDay = Boolean(selectedDate && todayKey && selectedDate !== todayKey);
  // "1 сарын аялал" — хэдэн дэх өдөртөө явааг харуулна (PLAN_V2 §6).
  const journey = getJourneyState(familyProfile, todayKey);
  const isEmpty = !isEditingTasks && orderedTasks.length === 0;

  return (
    <View className="px-5 pt-3 gap-5">
      {/* Гэр бүлийн нүүрний зураг. Зураг байхгүй бол — зөвхөн эрхтэй хүнд
          "зураг нэмэх" хоосон карт харагдана; бусдад огт харагдахгүй тул
          дэлгэц хоосон талбайгаар эхлэхгүй. */}
      {coverPhotoURL ? (
        <View className="rounded-[28px] overflow-hidden border border-gray-200">
          <ImageBackground source={{ uri: coverPhotoURL }} resizeMode="cover" style={{ height: 150, backgroundColor: '#1e293b' }}>
            <View className="flex-1 justify-end p-4" style={{ backgroundColor: '#00000040' }}>
              <Text className="text-white text-lg font-black" numberOfLines={1}>{familyProfile?.familyName || getGroupTypeMeta(groupType).label}</Text>
            </View>
            {canEditCover && PHOTO_UPLOAD_ENABLED ? (
              <TouchableOpacity
                onPress={onChangeCoverPhoto}
                disabled={photoUploading}
                accessibilityRole="button"
                accessibilityLabel="Нүүрний зураг солих"
                className="absolute right-3 top-3 w-11 h-11 rounded-2xl bg-black/50 items-center justify-center"
                style={{ minHeight: 44, minWidth: 44 }}
              >
                {photoUploading ? <ActivityIndicator size="small" color="#fff" /> : <Camera size={18} color="#fff" />}
              </TouchableOpacity>
            ) : null}
          </ImageBackground>
        </View>
      ) : canEditCover && PHOTO_UPLOAD_ENABLED ? (
        <TouchableOpacity
          onPress={onChangeCoverPhoto}
          disabled={photoUploading}
          accessibilityRole="button"
          accessibilityLabel="Нүүрний зураг нэмэх"
          className="rounded-[28px] border-2 border-dashed border-gray-300 bg-white items-center justify-center py-6 gap-2"
        >
          {photoUploading ? <ActivityIndicator size="small" color="#f97316" /> : <Camera size={22} color="#94a3b8" />}
          <Text className="text-xs font-black text-gray-500">{getGroupTypeMeta(groupType).possessive} зураг нэмэх</Text>
        </TouchableOpacity>
      ) : null}

      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[11px] font-black uppercase text-orange-500 tracking-widest mb-1">{familyProfile?.familyName || 'Family Habit'}</Text>
          <Text className="text-[26px] font-black text-gray-900 leading-7">Сайн уу, {selectedUser} 👋</Text>
          <Text className="text-xs font-semibold text-gray-500 mt-1">Өнөөдрийг хамтдаа бүтээцгээе</Text>
        </View>
        <TouchableOpacity
          onPress={onGoSettings}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Тохиргоо"
          className="w-11 h-11 rounded-2xl bg-white border border-gray-200 items-center justify-center shadow-sm"
          style={{ minHeight: 44, minWidth: 44 }}
        >
          <Settings size={20} color="#475569" />
        </TouchableOpacity>
      </View>

      {/* PLAN_V2.md §2.3: 'personal' горимд ганц хэрэглэгч байдаг тул
          гишүүдийн эгнээ (avatar strip) харуулах ямар ч ач холбогдолгүй. */}
      {getGroupTypeMeta(groupType).showMembersRow ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 4 }}>
        {members.map((member) => {
          const active = member.uid === selectedMemberId;
          return (
            <TouchableOpacity
              key={member.uid}
              onPress={() => onSelectMember?.(member.uid)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={`${member.name} сонгох`}
              accessibilityState={{ selected: active }}
              className="items-center"
              style={{ opacity: active ? 1 : 0.6, minWidth: 64 }}
            >
              <View className="w-14 h-14 rounded-[20px] items-center justify-center border-2 overflow-hidden" style={{ backgroundColor: active ? '#ffedd5' : '#fff', borderColor: active ? '#f97316' : '#e5e7eb' }}>
                {/* Зураг оруулсан бол зураг, эс бөгөөс хуучнаараа emoji.
                    Зураг ачаалагдахгүй байсан ч emoji руу автоматаар
                    буцахгүй тул дэвсгэр өнгө нь хоосон нүд харагдуулахгүй. */}
                {member.photoURL || member.photoData ? (
                  <Image source={{ uri: member.photoURL || member.photoData }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <Text className="text-3xl">{member.avatar || member.name?.substring(0, 1) || '🙂'}</Text>
                )}
                {member.streak > 0 ? <View className="absolute -right-1 -top-1 bg-slate-900 px-1.5 py-0.5 rounded-full"><Text className="text-[8px] text-white font-black">🔥{member.streak}</Text></View> : null}
              </View>
              <Text numberOfLines={1} className={`text-[11px] font-bold mt-1.5 max-w-[64px] text-center ${active ? 'text-orange-600' : 'text-gray-500'}`}>{member.name}</Text>
              {/* Зургаа солих — зөвхөн ӨӨРИЙН профайл дээр. Firestore дүрэм
                  ч гишүүнийг зөвхөн өөрийн документоо засахыг зөвшөөрдөг
                  тул UI болон дүрэм ижил invariant баримтална. */}
              {member.uid === currentUserId || (canEditCover && member.managedByUid) ? (
                <TouchableOpacity
                  onPress={() => onChangeMemberPhoto?.(member.uid)}
                  disabled={photoUploading}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Профайл зураг солих"
                  className="flex-row items-center gap-1 mt-1 px-2 py-1 rounded-xl bg-white border border-gray-200"
                >
                  {photoUploading ? <ActivityIndicator size="small" color="#f97316" /> : <Camera size={11} color="#64748b" />}
                  <Text className="text-[9px] font-black text-gray-500">Зураг</Text>
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      ) : null}

      <View className="rounded-[30px] bg-green-600 p-5 overflow-hidden">
        <View className="absolute w-40 h-40 rounded-full bg-white/15 -right-12 -top-16" />
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-green-100 text-xs font-black uppercase">{viewingPastDay ? 'Сонгосон өдрийн ахиц' : 'Өнөөдрийн ахиц'}</Text>
            <View className="mt-2">
              <Text className="text-white font-black text-lg">{completedCount}/{totalTasks}</Text>
              <Text className="text-green-100 text-[10px] font-bold mt-0.5">дадал дуусгасан</Text>
            </View>
          </View>
          {/* Шулуун полос + том тоо хосолсныг НЭГ дугуй ринг болгов — 100%
              харагдацыг нэг харцаар мэдрэх боломжтой (react-native-svg
              аль хэдийн суусан тул шинэ сан хэрэггүй). */}
          <ProgressRing progress={progress} size={92} strokeWidth={9} fillColor="#ffffff" trackColor="rgba(255,255,255,0.25)">
            <Text className="text-white text-[26px] font-black">{progress}%</Text>
          </ProgressRing>
        </View>

        <View className="flex-row gap-2 mt-4">
          <View className="flex-1 bg-white/10 border border-white/20 rounded-2xl p-3">
            <View className="flex-row items-center gap-1.5"><Flame size={15} color="#fed7aa" fill="#fed7aa" /><Text className="text-white font-black">{streak}</Text></View>
            <Text className="text-green-100 text-[10px] font-bold mt-0.5">өдөр дараалан</Text>
          </View>
          <View className="flex-1 bg-white/10 border border-white/20 rounded-2xl p-3">
            <Text className="text-white font-black">{remainingCount}</Text>
            <Text className="text-green-100 text-[10px] font-bold mt-0.5">үлдсэн дадал</Text>
          </View>
          <View className="flex-1 bg-white/10 border border-white/20 rounded-2xl p-3">
            <Text className="text-white font-black">{requiredCount}</Text>
            <Text className="text-green-100 text-[10px] font-bold mt-0.5">заавал хийх</Text>
          </View>
        </View>
      </View>

      {/* 1 сарын аялал — нимгэн полос. 30 хоног дуусахад дүгнэлтийн карт
          болж хувирч, "шинэ сар эхлүүлэх" хэсэг рүү чиглүүлнэ. */}
      {journey.complete ? (
        <View className="rounded-3xl bg-orange-50 border border-orange-200 p-4 gap-2">
          <View className="flex-row items-center gap-2">
            <Text className="text-lg">🎉</Text>
            <Text className="text-sm font-black text-orange-700 flex-1">30 хоногийн аялал дууслаа!</Text>
          </View>
          <Text className="text-[11px] font-bold text-orange-700 leading-4">
            {journey.day} дэх өдөр. Дүнгээ хараад шинэ мөчлөг эхлүүлэхэд бэлэн байна — өмнөх сарын түүх архивт хадгалагдана.
          </Text>
          {onGoRewards ? (
            <TouchableOpacity
              onPress={onGoRewards}
              accessibilityRole="button"
              accessibilityLabel="Дүн харах, шинэ сар эхлүүлэх"
              className="bg-orange-500 rounded-2xl py-3 items-center mt-1"
              style={{ minHeight: 44 }}
            >
              <Text className="text-white font-black text-xs">Дүн харах, шинэ сар эхлүүлэх</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <View className="rounded-3xl bg-white border border-gray-100 p-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-[11px] font-black uppercase text-gray-400">1 сарын аялал</Text>
            <Text className="text-[11px] font-black text-orange-500">{journey.day}/{journey.total} дахь өдөр</Text>
          </View>
          <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <View className="h-2 bg-orange-500 rounded-full" style={{ width: `${journey.percent}%` }} />
          </View>
          <Text className="text-[10px] font-bold text-gray-400 mt-2">Дуусахад {journey.remaining} хоног үлдлээ.</Text>
        </View>
      )}

      {/* Огноо сонгох — өмнө нь зөвхөн 'today' дэлгэц дээр байсан */}
      <View>
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-[11px] font-black uppercase text-gray-400 flex-1 pr-2">{headerDateStr || 'Өдөр сонгох'}</Text>
          <View className="flex-row items-center gap-1.5">
            {viewingPastDay ? (
              <TouchableOpacity onPress={() => onSelectDate?.(todayKey)} className="bg-orange-50 border border-orange-200 rounded-xl px-2.5 py-1">
                <Text className="text-[10px] font-black text-orange-600">Өнөөдөр рүү</Text>
              </TouchableOpacity>
            ) : null}
            {onFetchArchives ? (
              <TouchableOpacity onPress={() => setShowArchiveModal(true)} accessibilityRole="button" accessibilityLabel="Архив" className="bg-gray-100 border border-gray-200 rounded-xl px-2.5 py-1 flex-row items-center gap-1">
                <Archive size={12} color="#6b7280" />
                <Text className="text-[10px] font-black text-gray-500">Архив</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
          {datesArray.map((d) => {
            const key = formatDateKey(d);
            const isSelected = key === selectedDate;
            const isToday = key === todayKey;
            // P2.2: ирээдүйн өдрүүд (+1..+14) ХАРАГДАХГҮЙ болгож бүү устга —
            // бүдэгрүүлж, дарахыг хориглоно (view-only). Өнгөрсөн өдрүүд
            // хэвийн засагдсаар байна (makeup logging).
            const isFuture = Boolean(todayKey && key > todayKey);
            return (
              <TouchableOpacity
                key={key}
                onPress={() => onSelectDate?.(key)}
                disabled={isFuture}
                accessibilityRole="button"
                accessibilityLabel={isFuture ? `${d.getDate()} — ирээдүй, сонгох боломжгүй` : undefined}
                className={`w-[52px] h-[66px] rounded-3xl items-center justify-center ${isSelected ? 'bg-gray-950' : isToday ? 'bg-orange-50 border border-orange-200' : 'bg-white border border-gray-100'} ${isFuture ? 'opacity-40' : ''}`}
              >
                <Text className={`text-[10px] font-black uppercase mb-1 ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>{dayNamesShort[d.getDay()]}</Text>
                <Text className={`text-lg font-black ${isSelected ? 'text-white' : 'text-gray-900'}`}>{d.getDate()}</Text>
                {isToday && !isSelected ? <View className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1" /> : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <Text className="text-[10px] font-bold text-gray-400 mt-2">Ирээдүйн өдрүүд дээр дадал тэмдэглэх боломжгүй — зөвхөн өнөөдөр болон өнгөрсөн өдрийг сонгоно уу.</Text>
      </View>

      <View className="flex-row items-center justify-between mt-1">
        <View className="flex-1 pr-3">
          <Text className="text-[18px] font-black text-gray-950 leading-6">Өнөөдрийн хийх зүйлс</Text>
          <Text className="text-xs font-semibold text-gray-500 mt-1 leading-4">
            {isEditingTasks ? 'Дадлаа засаад хадгалах товч дар' : isEmpty ? 'Эхний дадлаа нэмээд эхлээрэй' : 'Шудрах, эсвэл дарж дэлгэрэнгүйг нээх'}
          </Text>
        </View>
        <View className="flex-row gap-2 items-center">
          <TouchableOpacity
            onPress={onOpenAddModal}
            accessibilityRole="button"
            accessibilityLabel="Дадал нэмэх"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="w-11 h-11 rounded-2xl bg-orange-500 items-center justify-center shadow-sm"
            style={{ minHeight: 44, minWidth: 44 }}
          >
            <Plus size={20} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
          {canEditTasks ? (
            <TouchableOpacity
              onPress={onToggleEditTasks}
              accessibilityRole="button"
              accessibilityLabel={isEditingTasks ? 'Дадлын өөрчлөлтийг хадгалах' : 'Дадлаа засах'}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className={`w-11 h-11 rounded-2xl items-center justify-center border ${isEditingTasks ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-200'}`}
              style={{ minHeight: 44, minWidth: 44 }}
            >
              {isEditingTasks ? <Save size={18} color="#fff" /> : <SlidersHorizontal size={18} color="#64748b" />}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {isEditingTasks ? (
        <View className="gap-3">
          {(tempUserTasks || []).map((task, index) => {
            // Админы сонгосон үндсэн дадлыг энгийн гишүүн засаж/устгаж чадахгүй.
            const locked = Boolean(task.core) && !canEditCover;
            return (
            <View key={task.id || index} className="p-4 rounded-3xl border border-orange-200 bg-orange-50 gap-2" pointerEvents={locked ? 'none' : 'auto'} style={{ opacity: locked ? 0.7 : 1 }}>
              {task.core ? <Text className="text-[10px] font-black text-green-700">🔒 Үндсэн дадал{locked ? ' · админ л засна' : ''}</Text> : null}
              <View className="flex-row gap-3 items-start">
                <Text className="mt-3 font-black text-orange-400 text-xs w-4 text-center">{index + 1}</Text>
                <View className="flex-1 gap-2">
                  <TextInput value={task.text || ''} onChangeText={(v) => onTempTaskChange?.(task.id, 'text', v)} placeholder="Дадлын нэр..." placeholderTextColor="#94a3b8" className="w-full bg-white border border-gray-200 rounded-2xl p-3 text-sm font-bold text-gray-800" />
                  {/* "Жижиг тайлбар" талбарыг ХАСАВ — хэрэглэгчид тайлбар
                      бичих дургүй тул ихэнх дадал хоосон тайлбартай үлддэг
                      байв. Зөвлөмжийг одоо апп өөрөө (task.tip) өгнө. */}
                  <View className="flex-row gap-2">
                    <TextInput value={String(task.points ?? 0)} onChangeText={(v) => onTempTaskChange?.(task.id, 'points', v)} keyboardType="number-pad" placeholder="Оноо" placeholderTextColor="#94a3b8" className="flex-1 bg-white border border-gray-200 rounded-2xl p-3 text-xs font-black text-gray-800" />
                    <TextInput value={task.category || ''} onChangeText={(v) => onTempTaskChange?.(task.id, 'category', v)} placeholder="Ангилал" placeholderTextColor="#94a3b8" className="flex-1 bg-white border border-gray-200 rounded-2xl p-3 text-xs font-black text-gray-800" />
                  </View>
                  <View className="flex-row items-center justify-between bg-white rounded-2xl px-3 py-2 border border-gray-200">
                    <View>
                      <Text className="text-xs font-black text-gray-700">Өдөр бүр</Text>
                      <Text className="text-[10px] font-semibold text-gray-400">Заавал хийх үү?</Text>
                    </View>
                    <Switch value={task.required !== false} onValueChange={(v) => onTempTaskChange?.(task.id, 'required', v)} />
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => onTempTaskDelete?.(task.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Дадал устгах"
                  className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 items-center justify-center"
                  style={{ minHeight: 44, minWidth: 44 }}
                >
                  <Trash size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
            );
          })}
          <TouchableOpacity onPress={onTempTaskAdd} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-3xl items-center flex-row justify-center gap-2 bg-white">
            <Plus size={20} color="#64748b" /><Text className="font-black text-gray-500">Дадал нэмэх</Text>
          </TouchableOpacity>
        </View>
      ) : isEmpty ? (
        <EmptyHabitState
          onAddHabit={onOpenAddModal}
          onShowSuggestions={() => setShowSuggestionSheet(true)}
        />
      ) : (
        <View className="gap-3">
          {orderedTasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              index={index + 1}
              expanded={expandedTaskId === task.id}
              onToggleDone={onToggleTask}
              onToggleExpand={onToggleExpand}
              onToggleOption={onToggleOption}
              onChangeInput={onChangeTaskInput}
              onUpdateLog={onUpdateTaskLog}
              timerActive={timerTaskId === task.id}
              timerRemaining={timerRemaining}
              timerRunning={timerRunning}
              onStartTimer={onStartTimer}
              onStopTimer={onStopTimer}
              formatTime={formatTime}
            />
          ))}
        </View>
      )}

      <View className="flex-row gap-3 mt-1">
        <TouchableOpacity
          onPress={onGoRewards}
          activeOpacity={0.85}
          className="flex-1 bg-white border border-gray-200 rounded-3xl p-4 overflow-hidden"
          accessibilityRole="button"
          accessibilityLabel="Урамшуулал дэлгэрэнгүй"
        >
          <View className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 items-center justify-center">
            <Gift size={20} color="#f97316" />
          </View>
          <Text className="text-[10px] font-black uppercase mt-3 tracking-widest" style={{ color: '#64748b' }}>Урамшуулал</Text>
          <Text numberOfLines={1} className="text-base font-black mt-1 leading-5" style={{ color: '#1e293b' }}>{activeReward?.name || 'Зорилго'}</Text>
          <View className="h-2 bg-gray-100 rounded-full mt-3 overflow-hidden"><View className="h-2 rounded-full" style={{ width: `${rewardPct}%`, backgroundColor: '#f97316' }} /></View>
          <Text className="text-[10px] font-bold mt-2" style={{ color: '#64748b' }}>{rewardPct}% · {totalFamilyPoints}/{activeReward?.target || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onGoMeals}
          activeOpacity={0.85}
          className="flex-1 bg-white border border-gray-200 rounded-3xl p-4"
          accessibilityRole="button"
          accessibilityLabel="Хоолны төлөвлөгөө"
        >
          <View className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 items-center justify-center">
            <Utensils size={20} color="#f97316" />
          </View>
          <Text className="text-[10px] font-black uppercase mt-3 tracking-widest" style={{ color: '#64748b' }}>Өнөөдрийн хоол</Text>
          <Text numberOfLines={2} className="text-sm font-black mt-1 leading-5" style={{ color: '#1e293b' }}>{mealsToday?.dinner || mealsToday?.lunch || mealsToday?.breakfast || 'Төлөвлөөгүй'}</Text>
        </TouchableOpacity>
      </View>

      <FoodLogSection entries={foodEntries} onAdd={onAddFoodEntry} onRemove={onRemoveFoodEntry} dailyTarget={dailyCalorieTarget} nutritionTarget={dailyMacroTarget} />

      {/* Сэтгэл зүй — хэрэглэгчийн хүсэлтээр дэлгэцийн ХАМГИЙН ДООД хэсэгт.
          Өмнө нь огнооны strip-ийн шууд дараа, дадлын жагсаалтаас ӨМНӨ байсан
          тул өдрийн ажлаа хараахан хийгээгүй байхад "өнөөдөр ямар байна?" гэж
          асуудаг байв. Одоо өдрийн дүнгээ хараад хариулна. */}
      <View className="bg-white border border-gray-100 rounded-3xl p-4 flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[11px] font-black uppercase text-gray-400">Сэтгэл зүй</Text>
          <Text className="text-base font-black text-gray-900">Өнөөдөр ямар байна?</Text>
        </View>
        <View className="flex-row gap-2">
          {moods.map((m) => {
            const selected = currentMood === m.id;
            const MoodIcon = m.Icon;
            return (
              <TouchableOpacity key={m.id} onPress={() => onSelectMood?.(m.id)} accessibilityRole="button" accessibilityLabel={`Сэтгэл зүй: ${m.id}`}>
                <View className="w-11 h-11 rounded-2xl items-center justify-center" style={{ backgroundColor: selected ? m.bg : '#f8fafc' }}>
                  <MoodIcon size={23} color={selected ? m.color : '#cbd5e1'} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <SuggestionSheet
        visible={showSuggestionSheet}
        onClose={() => setShowSuggestionSheet(false)}
        onAddSelected={(ids) => {
          setShowSuggestionSheet(false);
          onAddSuggestedTasks?.(ids);
        }}
      />

      <ArchiveModal
        visible={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onFetch={onFetchArchives}
      />
    </View>
  );
});

export default DashboardScreen;
