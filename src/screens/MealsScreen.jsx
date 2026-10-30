import React, { useMemo, useState } from 'react';
import { ActivityIndicator, View, Text, ScrollView, TouchableOpacity, TextInput, ImageBackground } from 'react-native';
import { ChevronDown, ChevronRight, Edit, Save, Sparkles, Sun, Coffee, Moon, CalendarDays } from 'lucide-react-native';
import { getGroupTypeMeta } from '../constants/groupTypes';
import { MEAL_PLANS, applyMealPlan } from '../constants/mealPlans';
import FoodLogSection from '../components/FoodLogSection';
import { BasketEditor, TodayMeals, WeekPlans, useTodayFallbackMeals } from '../components/MealPlanner';
import { BRAND_BLUE } from '../constants/theme';

const SECTIONS = [
  { key: 'products', label: 'Бүтээгдэхүүн' },
  { key: 'today', label: 'Өнөөдөр' },
  { key: 'week', label: '7 хоног' },
];

const mealTypes = [
  { key: 'breakfast', label: 'Өглөөний хоол', emoji: '🌅', Icon: Sun, accent: '#f97316', image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=900&q=75' },
  { key: 'lunch', label: 'Өдрийн хоол', emoji: '☀️', Icon: Coffee, accent: '#f97316', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=75' },
  { key: 'dinner', label: 'Оройн хоол', emoji: '🌙', Icon: Moon, accent: '#f97316', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=75' },
];

const dayKeys = ['day1', 'day2', 'day3', 'day4', 'day5', 'day6', 'day7'];
const dayNames = ['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'];

const getMonday = () => {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - day + 1);
  return monday;
};

export default function MealsScreen({
  groupType = 'family',
  canEdit = true,
  meals,
  setMeals,
  selectedMealDay,
  setSelectedMealDay,
  isEditingMeals,
  setIsEditingMeals,
  tempMeals,
  setTempMeals,
  saveToCloud,
  // Идсэн хоолны бүртгэл — Нүүр дэлгэц дээрх FoodLogSection-той ЯГ ижил
  // өгөгдөл дээр ажиллана (App.jsx-ээс сонгосон өдрөөр). Хэрэглэгч "Хоол"
  // таб руу орохдоо төлөвлөгөө биш, идсэн хоолоо оруулахыг хүсдэг тул
  // хоёуланг нь энд харуулна.
  foodEntries = [],
  dailyCalorieTarget,
  dailyMacroTarget,
  onAddFoodEntry,
  onRemoveFoodEntry,
  foodLogDateLabel = '',
  // Хоолны сагс (useMealPlans)
  mealPlanDateKeys = [],
  mealPlans = {},
  onSaveMealPlan,
  peopleCount = 1,
}) {
  const [section, setSection] = useState('today');
  const [basketDateKey, setBasketDateKey] = useState(null);
  const fallbackMeals = useTodayFallbackMeals(meals);
  const groupMeta = getGroupTypeMeta(groupType);
  const [mealNotice, setMealNotice] = useState('');
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [applyingPlanId, setApplyingPlanId] = useState(null);
  const currentDayMeals = (isEditingMeals ? tempMeals : meals?.[selectedMealDay]) || { breakfast: '', lunch: '', dinner: '' };
  const selectedIndex = Math.max(dayKeys.indexOf(selectedMealDay), 0);
  const weekDates = useMemo(() => {
    const monday = getMonday();
    return dayKeys.map((_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date;
    });
  }, []);

  // Хадгалах амжилтгүй бол optimistic state-г буцаагаад ЗАСВАРЛАХ горимд
  // ҮЛДЭЭНЭ — бичсэн текст алга болдоггүй, алдааны мессеж харагдана.
  const toggleMealEdit = async () => {
    if (isEditingMeals) {
      const prevMeals = meals;
      const newMeals = { ...(meals || {}), [selectedMealDay]: tempMeals || {} };
      setMeals(newMeals);
      let result;
      try {
        result = await saveToCloud({ meals: newMeals });
      } catch {
        result = { ok: false };
      }
      if (!result?.ok) {
        setMeals(prevMeals);
        setMealNotice(result?.message || 'Хоолны төлөвлөгөөг хадгалж чадсангүй. Дахин оролдоно уу.');
        return;
      }
      setMealNotice('');
    } else {
      setTempMeals(meals?.[selectedMealDay] || { breakfast: '', lunch: '', dinner: '' });
      setMealNotice('');
    }
    setIsEditingMeals(!isEditingMeals);
  };

  // Бэлэн дэглэм сонгох — 7 хоногийн БҮХ өдрийг дарж бичнэ. Хадгалалт
  // амжилтгүй бол хуучин төлөвлөгөөг нь буцааж тавина (toggleMealEdit-тэй
  // ижил optimistic-revert загвар).
  const choosePlan = async (planId) => {
    if (applyingPlanId) return;
    setApplyingPlanId(planId);
    const prevMeals = meals;
    const nextMeals = applyMealPlan(planId, meals || {});
    setMeals(nextMeals);
    let result;
    try {
      result = await saveToCloud({ meals: nextMeals });
    } catch {
      result = { ok: false };
    }
    setApplyingPlanId(null);
    if (!result?.ok) {
      setMeals(prevMeals);
      setMealNotice(result?.message || 'Дэглэмийг хадгалж чадсангүй. Дахин оролдоно уу.');
      return;
    }
    setMealNotice('');
    setShowPlanPicker(false);
  };

  const handleMealInputChange = (type, value) => setTempMeals({ ...(tempMeals || {}), [type]: value });
  const selectedDate = weekDates[selectedIndex];

  const sectionTabs = (
    <View className="bg-white rounded-2xl p-1 flex-row border border-gray-200 mb-5">
      {SECTIONS.map((item) => {
        const selected = section === item.key;
        return (
          <TouchableOpacity key={item.key} onPress={() => setSection(item.key)} accessibilityRole="tab" accessibilityState={{ selected }} className="flex-1 py-3 rounded-xl items-center" style={{ backgroundColor: selected ? BRAND_BLUE : 'transparent' }}>
            <Text className="text-xs font-black" style={{ color: selected ? '#fff' : '#64748b' }}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const foodLog = (
    <View className="mt-6">
      <Text className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: '#64748b' }}>Бүртгэл</Text>
      <Text className="text-2xl font-black mb-1" style={{ color: '#1e293b' }}>Идсэн хоол</Text>
      <Text className="text-xs font-semibold text-gray-500 mb-4 leading-5">
        {foodLogDateLabel ? `${foodLogDateLabel} — юу идсэнээ нэмээрэй` : 'Юу идсэнээ нэмэхэд калори, шим тэжээл автоматаар задарна'}
      </Text>
      <FoodLogSection entries={foodEntries} onAdd={onAddFoodEntry} onRemove={onRemoveFoodEntry} dailyTarget={dailyCalorieTarget} nutritionTarget={dailyMacroTarget} title="Өдрийн дүн" />
    </View>
  );

  if (section === 'products') {
    return (
      <View className="p-5 pb-32">
        {sectionTabs}
        <BasketEditor dateKeys={mealPlanDateKeys} plans={mealPlans} initialDateKey={basketDateKey} canEdit={canEdit} people={peopleCount} onSave={onSaveMealPlan} />
      </View>
    );
  }

  if (section === 'today') {
    return (
      <View className="p-5 pb-32">
        {sectionTabs}
        <TodayMeals plan={mealPlans[mealPlanDateKeys[0]]} fallbackMeals={fallbackMeals} people={peopleCount} />
        {foodLog}
      </View>
    );
  }

  return (
    <View className="p-5 pb-32">
      {sectionTabs}
      <WeekPlans dateKeys={mealPlanDateKeys} plans={mealPlans} onOpenDay={(key) => { setBasketDateKey(key); setSection('products'); }} />
      <Text className="text-[11px] font-black uppercase tracking-widest mt-8 mb-3" style={{ color: '#64748b' }}>Текст цэс</Text>
        <View className="flex-row justify-between items-center mb-5">
        <View className="flex-1 pr-3"><Text className="text-[11px] font-black uppercase tracking-widest" style={{ color: '#64748b' }}>Долоо хоног</Text><Text className="text-2xl font-black" style={{ color: '#1e293b' }}>Хоолны төлөвлөгөө</Text></View>
        {canEdit ? (
          <TouchableOpacity
            onPress={toggleMealEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={isEditingMeals ? 'Хоолны төлөвлөгөө хадгалах' : 'Хоолны төлөвлөгөө засах'}
            className={`flex-row items-center gap-2 px-5 py-3 rounded-2xl ${isEditingMeals ? 'bg-orange-500' : 'bg-white border border-gray-200'}`}
            style={{ minHeight: 44 }}
          >
            {isEditingMeals ? <Save size={15} color="#fff" /> : <Edit size={15} color="#1e293b" />}
            <Text className="text-xs font-black" style={{ color: isEditingMeals ? '#fff' : '#1e293b' }}>{isEditingMeals ? 'Хадгалах' : 'Засах'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {mealNotice ? <Text className="text-xs font-bold text-red-500 mb-3 leading-5">{mealNotice}</Text> : null}

      {/* Бэлэн дэглэм — 7 хоногийн цэсийг гараар бичихгүйгээр нэг дарахад
          дүүргэнэ. Зөвхөн эрхтэй хүнд харагдана, засварын горимд нуугдана
          (хоёр зэрэг явбал бичиж байсан текст дарагдах эрсдэлтэй). */}
      {canEdit && !isEditingMeals ? (
        <View className="mb-4">
          <TouchableOpacity
            onPress={() => setShowPlanPicker((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel="Бэлэн дэглэм сонгох"
            className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex-row items-center justify-between"
            style={{ minHeight: 44 }}
          >
            <View className="flex-row items-center gap-2 flex-1 pr-2">
              <Sparkles size={16} color="#f97316" />
              <Text className="text-xs font-black" style={{ color: '#1e293b' }}>Бэлэн дэглэмээс сонгох</Text>
            </View>
            <ChevronDown size={16} color="#64748b" style={{ transform: [{ rotate: showPlanPicker ? '180deg' : '0deg' }] }} />
          </TouchableOpacity>

          {showPlanPicker ? (
            <View className="mt-2 gap-2">
              {MEAL_PLANS.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  onPress={() => choosePlan(plan.id)}
                  disabled={Boolean(applyingPlanId)}
                  accessibilityRole="button"
                  accessibilityLabel={`${plan.name} дэглэмийг тавих`}
                  className="bg-white border border-gray-200 rounded-2xl p-4 flex-row items-center gap-3"
                  style={{ opacity: applyingPlanId && applyingPlanId !== plan.id ? 0.5 : 1 }}
                >
                  <Text className="text-2xl">{plan.emoji}</Text>
                  <View className="flex-1">
                    <Text className="text-sm font-black" style={{ color: '#1e293b' }}>{plan.name}</Text>
                    <Text className="text-[11px] font-semibold text-gray-500 mt-0.5">{plan.summary}</Text>
                  </View>
                  {applyingPlanId === plan.id ? <ActivityIndicator size="small" color="#f97316" /> : <ChevronRight size={16} color="#94a3b8" />}
                </TouchableOpacity>
              ))}
              <Text className="text-[10px] font-bold text-gray-400 leading-4 mt-1">
                Дэглэм сонгоход 7 хоногийн цэс бүхэлдээ солигдоно. Дараа нь өдөр бүрийг гараар засаж болно. Эдгээр нь ерөнхий санал болохоос эмчийн зөвлөгөө биш.
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9, paddingBottom: 10 }} className="mb-4">
        {dayKeys.map((day, index) => {
          const selected = selectedMealDay === day;
          const disabled = isEditingMeals && !selected;
          const date = weekDates[index];
          return <TouchableOpacity key={day} disabled={disabled} onPress={() => setSelectedMealDay(day)} className="items-center justify-center border" style={{ width: 62, height: 76, borderRadius: 22, backgroundColor: selected ? '#f97316' : '#fff', borderColor: selected ? '#f97316' : '#e5e7eb', opacity: disabled ? 0.35 : 1 }}><Text className={`text-[10px] font-black uppercase ${selected ? 'text-white' : 'text-gray-400'}`}>{dayNames[index]}</Text><Text className={`text-xl font-black mt-1 ${selected ? 'text-white' : 'text-gray-900'}`}>{date.getDate()}</Text><View className="w-1.5 h-1.5 rounded-full mt-1" style={{ backgroundColor: selected ? '#fff' : '#fed7aa' }} /></TouchableOpacity>;
        })}
      </ScrollView>

      <View className="rounded-3xl p-5 mb-5 flex-row items-center justify-between" style={{ backgroundColor: '#1e293b' }}><View><Text className="text-white/60 text-xs font-black uppercase">Сонгосон өдөр</Text><Text className="text-white text-2xl font-black mt-1">{selectedDate ? `${selectedDate.getMonth() + 1} сарын ${selectedDate.getDate()}` : 'Энэ долоо хоног'}</Text></View><View className="w-14 h-14 rounded-2xl bg-white/10 items-center justify-center"><CalendarDays size={28} color="#fff" /></View></View>

      {(() => {
        const allEmpty = !currentDayMeals.breakfast && !currentDayMeals.lunch && !currentDayMeals.dinner;
        if (allEmpty && !isEditingMeals) {
          return (
            <View className="bg-white border border-gray-200 rounded-[28px] p-8 items-center">
              <Text className="text-3xl mb-3">🍽️</Text>
              <Text className="font-black text-gray-900 text-base">Хоолны төлөвлөгөө хараахан байхгүй</Text>
              <Text className="text-sm font-semibold text-gray-500 text-center mt-2 leading-5">Энэ өдрийн хоолоо төлөвлөөд гэр бүлээрээ хуваалцаарай.</Text>
              {canEdit ? (
                <TouchableOpacity
                  onPress={toggleMealEdit}
                  className="mt-4 bg-orange-500 rounded-2xl px-6 py-3 flex-row items-center gap-2"
                  style={{ minHeight: 44 }}
                  accessibilityRole="button"
                  accessibilityLabel="Хоолны төлөвлөгөө нэмэх"
                >
                  <Text className="text-white font-black text-sm">Төлөвлөгөө нэмэх</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        }
        return null;
      })()}
      <View className="gap-4">
        {mealTypes.map((meal) => {
          const Icon = meal.Icon;
          return (
            <View key={meal.key} className="rounded-[28px] overflow-hidden bg-white border border-gray-100">
              {/* backgroundColor нь ЗУРАГ АЧААЛАГДААГҮЙ үед (офлайн, удаан сүлжээ,
                  тасарсан холбоос) картыг цайвар хоосон биш, зориуд хийсэн шиг
                  харуулна — өмнө нь зураг унавал бичвэр уншигдахгүй болдог байв. */}
              <ImageBackground source={{ uri: meal.image }} resizeMode="cover" style={{ minHeight: 185, backgroundColor: isEditingMeals ? '#f8fafc' : '#1e293b' }} imageStyle={{ opacity: isEditingMeals ? 0.28 : 0.88 }}>
                <View className="flex-1 p-5 justify-between" style={{ backgroundColor: isEditingMeals ? '#ffffffd9' : '#00000055' }}>
                  <View className="flex-row items-center justify-between"><View className="flex-row items-center gap-2"><View className="w-11 h-11 rounded-2xl bg-white/90 items-center justify-center"><Icon size={21} color={meal.accent} /></View><View><Text className={`text-[10px] font-black uppercase ${isEditingMeals ? 'text-gray-400' : 'text-white/80'}`}>{meal.emoji} {meal.label}</Text><Text className={`text-xs font-semibold mt-1 ${isEditingMeals ? 'text-gray-500' : 'text-white/80'}`}>{groupMeta.possessive} меню</Text></View></View></View>
                  {isEditingMeals ? <TextInput value={currentDayMeals[meal.key] || ''} onChangeText={(value) => handleMealInputChange(meal.key, value)} multiline placeholder={`${meal.label}...`} placeholderTextColor="#94a3b8" className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-sm font-black text-gray-800 min-h-[88px] mt-4" /> : <Text className="text-white text-xl font-black leading-7 mt-8" numberOfLines={3}>{currentDayMeals[meal.key] || 'Одоогоор төлөвлөгөө алга'}</Text>}
                </View>
              </ImageBackground>
            </View>
          );
        })}
      </View>

    </View>
  );
}
