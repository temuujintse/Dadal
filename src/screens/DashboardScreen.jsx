import React, { memo, useMemo, useRef } from 'react';
import { Animated, PanResponder, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Flame,
  Gift,
  Pause,
  Play,
  Plus,
  Save,
  Settings,
  SlidersHorizontal,
  Sparkles,
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
  expanded,
  onToggleDone,
  onToggleExpand,
  onToggleOption,
  onChangeInput,
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

  const hasDetail = Boolean(task.note || task.options?.length || task.hasInput || task.timerMinutes || task.category);

  return (
    <View className={`rounded-3xl border overflow-hidden ${done ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-orange-100'}`}>
      {/* Шудрах мөр — ногоон "Дуусгах" дэвсгэр зөвхөн энэ мөрийн ард байна */}
      <View className="overflow-hidden bg-emerald-500">
        <View className="absolute inset-0 px-5 flex-row items-center">
          <Check size={22} color="#fff" />
          <Text className="text-white font-black ml-2">Дуусгах</Text>
        </View>
        <Animated.View
          {...panResponder.panHandlers}
          style={{ transform: [{ translateX }] }}
          className={`p-4 flex-row items-center ${done ? 'bg-emerald-50' : 'bg-white'}`}
        >
          <TouchableOpacity
            onPress={() => onToggleDone?.(task.id)}
            accessibilityRole="button"
            accessibilityLabel={done ? `${task.text} — буцаах` : `${task.text} — дуусгах`}
            className={`w-12 h-12 rounded-2xl items-center justify-center ${done ? 'bg-emerald-500' : 'bg-orange-50'}`}
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
              <Text numberOfLines={1} className={`flex-1 text-[15px] font-black ${done ? 'text-gray-400 line-through' : 'text-gray-950'}`}>{task.text}</Text>
              <Text className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-full">+{task.points}</Text>
            </View>
            <Text numberOfLines={1} className="text-xs font-semibold text-gray-400 mt-1">
              {done ? 'Амжилттай дууссан' : task.note || 'Баруун тийш шудраад дуусгана'}
            </Text>
          </TouchableOpacity>

          {hasDetail ? (
            <TouchableOpacity onPress={() => onToggleExpand?.(task.id)} className="p-1">
              {expanded ? <ChevronDown size={18} color="#94a3b8" /> : <ChevronRight size={18} color="#cbd5e1" />}
            </TouchableOpacity>
          ) : <View className="w-5" />}
        </Animated.View>
      </View>

      {/* Дэлгэрэнгүй — өмнө нь 'today' дэлгэц дээр байсан бүх зүйл энд орлоо */}
      {expanded && hasDetail ? (
        <View className="px-4 pb-4 pt-3 gap-3 border-t border-gray-100">
          <View className="flex-row flex-wrap items-center gap-2">
            {task.required !== false
              ? <Text className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-full">Заавал</Text>
              : <Text className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Сонголтоор</Text>}
            {task.category ? <Text className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{task.category}</Text> : null}
            {task.frequency ? <Text className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{task.frequency}</Text> : null}
          </View>

          {task.note ? <Text className="text-xs font-bold text-gray-500">{task.note}</Text> : null}

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

          {task.hasInput ? (
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
                className="flex-row items-center gap-1.5 px-3 py-2 bg-gray-950 rounded-2xl"
              >
                {timerActive && timerRunning ? <Pause size={14} color="#fff" /> : <Play size={14} color="#fff" />}
                <Text className="text-white text-xs font-black">
                  {timerActive ? formatTime?.(timerRemaining) : `${task.timerMinutes} мин`}
                </Text>
              </TouchableOpacity>
              {timerActive ? (
                <TouchableOpacity onPress={onStopTimer} className="px-3 py-2 bg-red-50 rounded-2xl">
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

  // доод картууд
  totalFamilyPoints,
  activeReward,
  mealsToday,
  onGoRewards,
  onGoMeals,
}) {
  const rewardPct = activeReward?.target ? Math.min(Math.round((totalFamilyPoints / activeReward.target) * 100), 100) : 0;
  const sortedTasks = [...tasks].sort((a, b) => Number(a.done) - Number(b.done));
  const viewingPastDay = Boolean(selectedDate && todayKey && selectedDate !== todayKey);

  return (
    <View className="px-5 pt-2 gap-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[11px] font-black uppercase text-orange-500 tracking-widest">{familyProfile?.familyName || 'Family Habit'}</Text>
          <Text className="text-2xl font-black text-gray-950">Сайн уу, {selectedUser} 👋</Text>
        </View>
        <TouchableOpacity onPress={onGoSettings} className="w-11 h-11 rounded-2xl bg-white border border-orange-100 items-center justify-center">
          <Settings size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 2 }}>
        {members.map((member) => {
          const active = member.uid === selectedMemberId;
          return (
            <TouchableOpacity key={member.uid} onPress={() => onSelectMember?.(member.uid)} className="items-center" style={{ opacity: active ? 1 : 0.55 }}>
              <View className="w-14 h-14 rounded-[20px] items-center justify-center border-2" style={{ backgroundColor: active ? '#ffedd5' : '#fff', borderColor: active ? '#f97316' : '#e5e7eb' }}>
                <Text className="text-3xl">{member.avatar || member.name?.substring(0, 1) || '🙂'}</Text>
                {member.streak > 0 ? <View className="absolute -right-1 -top-1 bg-gray-950 px-1.5 py-0.5 rounded-full"><Text className="text-[8px] text-white font-black">🔥{member.streak}</Text></View> : null}
              </View>
              <Text numberOfLines={1} className={`text-[10px] font-black mt-1 max-w-[64px] ${active ? 'text-orange-600' : 'text-gray-400'}`}>{member.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View className="rounded-[30px] bg-gray-950 p-5 overflow-hidden">
        <View className="absolute w-40 h-40 rounded-full bg-orange-500/20 -right-12 -top-16" />
        <View className="flex-row justify-between items-start">
          <View>
            <Text className="text-orange-200 text-xs font-black uppercase">{viewingPastDay ? 'Сонгосон өдрийн ахиц' : 'Өнөөдрийн ахиц'}</Text>
            <Text className="text-white text-[44px] font-black mt-1">{progress}%</Text>
          </View>
          <View className="bg-white/10 px-3 py-2 rounded-2xl">
            <Text className="text-white font-black text-lg text-center">{completedCount}/{totalTasks}</Text>
            <Text className="text-gray-400 text-[9px] font-black">дадлын тоо</Text>
          </View>
        </View>
        <View className="h-3 bg-white/10 rounded-full overflow-hidden mt-3"><View className="h-3 bg-orange-400 rounded-full" style={{ width: `${progress}%` }} /></View>

        <View className="flex-row gap-2 mt-4">
          <View className="flex-1 bg-white/10 border border-white/20 rounded-2xl p-3">
            <View className="flex-row items-center gap-1.5"><Flame size={15} color="#fed7aa" fill="#fed7aa" /><Text className="text-white font-black">{streak}</Text></View>
            <Text className="text-gray-400 text-[10px] font-bold mt-0.5">өдөр дараалан</Text>
          </View>
          <View className="flex-1 bg-white/10 border border-white/20 rounded-2xl p-3">
            <Text className="text-white font-black">{remainingCount}</Text>
            <Text className="text-gray-400 text-[10px] font-bold mt-0.5">үлдсэн дадал</Text>
          </View>
          <View className="flex-1 bg-white/10 border border-white/20 rounded-2xl p-3">
            <Text className="text-white font-black">{requiredCount}</Text>
            <Text className="text-gray-400 text-[10px] font-bold mt-0.5">заавал хийх</Text>
          </View>
        </View>
      </View>

      {/* Огноо сонгох — өмнө нь зөвхөн 'today' дэлгэц дээр байсан */}
      <View>
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-[11px] font-black uppercase text-gray-400 flex-1 pr-2">{headerDateStr || 'Өдөр сонгох'}</Text>
          {viewingPastDay ? (
            <TouchableOpacity onPress={() => onSelectDate?.(todayKey)} className="bg-orange-50 border border-orange-200 rounded-xl px-2.5 py-1">
              <Text className="text-[10px] font-black text-orange-600">Өнөөдөр рүү</Text>
            </TouchableOpacity>
          ) : null}
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

      {/* Сэтгэл зүй — өмнө нь зөвхөн 'today' дэлгэц дээр байсан */}
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

      <View className="flex-row items-center justify-between mt-1">
        <View className="flex-1 pr-3">
          <Text className="text-xl font-black text-gray-950">Өнөөдрийн хийх зүйлс</Text>
          <Text className="text-xs font-semibold text-gray-400">
            {isEditingTasks ? 'Дадлаа засаад хадгалах товч дар' : 'Шудрах, эсвэл дарж дэлгэрэнгүйг нээх'}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity onPress={onOpenAddModal} className="w-11 h-11 rounded-2xl bg-orange-500 items-center justify-center">
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
          {canEditTasks ? (
            <TouchableOpacity
              onPress={onToggleEditTasks}
              accessibilityRole="button"
              accessibilityLabel={isEditingTasks ? 'Дадлын өөрчлөлтийг хадгалах' : 'Дадлаа засах'}
              className={`w-11 h-11 rounded-2xl items-center justify-center ${isEditingTasks ? 'bg-gray-950' : 'bg-white border border-orange-100'}`}
            >
              {isEditingTasks ? <Save size={19} color="#fff" /> : <SlidersHorizontal size={19} color="#f97316" />}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {isEditingTasks ? (
        <View className="gap-3">
          {(tempUserTasks || []).map((task, index) => (
            <View key={task.id || index} className="p-4 rounded-3xl border border-orange-200 bg-orange-50 gap-2">
              <View className="flex-row gap-3 items-start">
                <Text className="mt-3 font-black text-orange-400 text-xs w-4 text-center">{index + 1}</Text>
                <View className="flex-1 gap-2">
                  <TextInput value={task.text || ''} onChangeText={(v) => onTempTaskChange?.(task.id, 'text', v)} placeholder="Дадлын нэр..." placeholderTextColor="#94a3b8" className="w-full bg-white border border-gray-200 rounded-2xl p-3 text-sm font-bold text-gray-800" />
                  <TextInput value={task.note || ''} onChangeText={(v) => onTempTaskChange?.(task.id, 'note', v)} placeholder="Жижиг тайлбар" placeholderTextColor="#94a3b8" className="w-full bg-white border border-gray-200 rounded-2xl p-3 text-xs font-medium text-gray-500" />
                  <View className="flex-row gap-2">
                    <TextInput value={String(task.points ?? 0)} onChangeText={(v) => onTempTaskChange?.(task.id, 'points', v)} keyboardType="number-pad" placeholder="Оноо" placeholderTextColor="#94a3b8" className="flex-1 bg-white border border-gray-200 rounded-2xl p-3 text-xs font-black text-gray-800" />
                    <TextInput value={task.category || ''} onChangeText={(v) => onTempTaskChange?.(task.id, 'category', v)} placeholder="Ангилал" placeholderTextColor="#94a3b8" className="flex-1 bg-white border border-gray-200 rounded-2xl p-3 text-xs font-black text-gray-800" />
                  </View>
                  <View className="flex-row items-center justify-between bg-white rounded-2xl px-3 py-2 border border-gray-200">
                    <Text className="text-xs font-black text-gray-600">Заавал хийх</Text>
                    <Switch value={task.required !== false} onValueChange={(v) => onTempTaskChange?.(task.id, 'required', v)} />
                  </View>
                </View>
                <TouchableOpacity onPress={() => onTempTaskDelete?.(task.id)} className="p-2.5"><Trash size={18} color="#ef4444" /></TouchableOpacity>
              </View>
            </View>
          ))}
          <TouchableOpacity onPress={onTempTaskAdd} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-3xl items-center flex-row justify-center gap-2 bg-white">
            <Plus size={20} color="#64748b" /><Text className="font-black text-gray-500">Дадал нэмэх</Text>
          </TouchableOpacity>
        </View>
      ) : sortedTasks.length ? (
        <View className="gap-3">
          {sortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              expanded={expandedTaskId === task.id}
              onToggleDone={onToggleTask}
              onToggleExpand={onToggleExpand}
              onToggleOption={onToggleOption}
              onChangeInput={onChangeTaskInput}
              timerActive={timerTaskId === task.id}
              timerRemaining={timerRemaining}
              timerRunning={timerRunning}
              onStartTimer={onStartTimer}
              onStopTimer={onStopTimer}
              formatTime={formatTime}
            />
          ))}
        </View>
      ) : (
        <TouchableOpacity onPress={onOpenAddModal} className="bg-white border-2 border-dashed border-orange-200 rounded-3xl p-7 items-center">
          <Sparkles size={27} color="#f97316" />
          <Text className="font-black text-gray-900 mt-3">Анхны дадлаа нэмэх</Text>
        </TouchableOpacity>
      )}

      <View className="flex-row gap-3 mt-1">
        <TouchableOpacity onPress={onGoRewards} className="flex-1 bg-purple-600 rounded-3xl p-4 overflow-hidden">
          <Gift size={25} color="#fff" />
          <Text className="text-purple-200 text-[10px] font-black uppercase mt-3">Урамшуулал</Text>
          <Text numberOfLines={1} className="text-base font-black text-white mt-1">{activeReward?.name || 'Зорилго'}</Text>
          <View className="h-2 bg-white/20 rounded-full mt-3 overflow-hidden"><View className="h-2 bg-white rounded-full" style={{ width: `${rewardPct}%` }} /></View>
          <Text className="text-purple-100 text-[10px] font-bold mt-2">{rewardPct}% · {totalFamilyPoints}/{activeReward?.target || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onGoMeals} className="flex-1 bg-emerald-500 rounded-3xl p-4">
          <Utensils size={25} color="#fff" />
          <Text className="text-emerald-100 text-[10px] font-black uppercase mt-3">Өнөөдрийн хоол</Text>
          <Text numberOfLines={2} className="text-sm font-black text-white mt-1 leading-5">{mealsToday?.dinner || mealsToday?.lunch || mealsToday?.breakfast || 'Төлөвлөөгүй'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default DashboardScreen;
