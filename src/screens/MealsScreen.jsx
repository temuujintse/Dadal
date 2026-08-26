import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ImageBackground } from 'react-native';
import { Edit, Save, Sun, Coffee, Moon, CalendarDays } from 'lucide-react-native';

const mealTypes = [
  { key: 'breakfast', label: 'Өглөөний хоол', emoji: '🌅', Icon: Sun, accent: '#f59e0b', image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=900&q=75' },
  { key: 'lunch', label: 'Өдрийн хоол', emoji: '☀️', Icon: Coffee, accent: '#f97316', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=75' },
  { key: 'dinner', label: 'Оройн хоол', emoji: '🌙', Icon: Moon, accent: '#6366f1', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=75' },
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

export default function MealsScreen({ canEdit = true, meals, setMeals, selectedMealDay, setSelectedMealDay, isEditingMeals, setIsEditingMeals, tempMeals, setTempMeals, saveToCloud }) {
  const [mealNotice, setMealNotice] = useState('');
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

  const handleMealInputChange = (type, value) => setTempMeals({ ...(tempMeals || {}), [type]: value });
  const selectedDate = weekDates[selectedIndex];

  return (
    <View className="p-5 pb-32">
      <View className="flex-row justify-between items-center mb-5">
        <View><Text className="text-[11px] font-black uppercase text-emerald-500 tracking-widest">Weekly Menu</Text><Text className="text-2xl font-black text-gray-950">Хоолны төлөвлөгөө</Text></View>
        {canEdit ? <TouchableOpacity onPress={toggleMealEdit} className={`flex-row items-center gap-2 px-4 py-2 rounded-2xl ${isEditingMeals ? 'bg-emerald-500' : 'bg-white border border-emerald-100'}`}>{isEditingMeals ? <Save size={15} color="#fff" /> : <Edit size={15} color="#10b981" />}<Text className={`text-xs font-black ${isEditingMeals ? 'text-white' : 'text-emerald-600'}`}>{isEditingMeals ? 'Хадгалах' : 'Засах'}</Text></TouchableOpacity> : null}
      </View>
      {mealNotice ? <Text className="text-xs font-bold text-red-500 mb-3 leading-5">{mealNotice}</Text> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9, paddingBottom: 10 }} className="mb-4">
        {dayKeys.map((day, index) => {
          const selected = selectedMealDay === day;
          const disabled = isEditingMeals && !selected;
          const date = weekDates[index];
          return <TouchableOpacity key={day} disabled={disabled} onPress={() => setSelectedMealDay(day)} className="items-center justify-center border" style={{ width: 62, height: 76, borderRadius: 22, backgroundColor: selected ? '#10b981' : '#fff', borderColor: selected ? '#10b981' : '#d1fae5', opacity: disabled ? 0.35 : 1 }}><Text className={`text-[10px] font-black uppercase ${selected ? 'text-emerald-100' : 'text-gray-400'}`}>{dayNames[index]}</Text><Text className={`text-xl font-black mt-1 ${selected ? 'text-white' : 'text-gray-900'}`}>{date.getDate()}</Text><View className="w-1.5 h-1.5 rounded-full mt-1" style={{ backgroundColor: selected ? '#fff' : '#a7f3d0' }} /></TouchableOpacity>;
        })}
      </ScrollView>

      <View className="bg-emerald-500 rounded-3xl p-5 mb-5 flex-row items-center justify-between"><View><Text className="text-emerald-100 text-xs font-black uppercase">Сонгосон өдөр</Text><Text className="text-white text-2xl font-black mt-1">{selectedDate ? `${selectedDate.getMonth() + 1} сарын ${selectedDate.getDate()}` : 'Энэ долоо хоног'}</Text></View><View className="w-14 h-14 rounded-2xl bg-white/15 items-center justify-center"><CalendarDays size={28} color="#fff" /></View></View>

      <View className="gap-4">
        {mealTypes.map((meal) => {
          const Icon = meal.Icon;
          return (
            <View key={meal.key} className="rounded-[28px] overflow-hidden bg-white border border-gray-100">
              <ImageBackground source={{ uri: meal.image }} resizeMode="cover" style={{ minHeight: 185 }} imageStyle={{ opacity: isEditingMeals ? 0.28 : 0.88 }}>
                <View className="flex-1 p-5 justify-between" style={{ backgroundColor: isEditingMeals ? '#ffffffd9' : '#00000055' }}>
                  <View className="flex-row items-center justify-between"><View className="flex-row items-center gap-2"><View className="w-11 h-11 rounded-2xl bg-white/90 items-center justify-center"><Icon size={21} color={meal.accent} /></View><View><Text className={`text-[10px] font-black uppercase ${isEditingMeals ? 'text-gray-400' : 'text-white/80'}`}>{meal.emoji} {meal.label}</Text><Text className={`text-xs font-semibold mt-1 ${isEditingMeals ? 'text-gray-500' : 'text-white/80'}`}>Гэр бүлийн меню</Text></View></View></View>
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
