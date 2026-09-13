import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Plus, Search, UtensilsCrossed, X } from 'lucide-react-native';
import { foodCalories, MACRO_META } from '../constants/foodCalories';

// SuggestionSheet-тэй ижил bottom-sheet хэлбэр, гэхдээ энд сонгомогц ШУУД
// нэмээд sheet-ээ НЭЭЛТТЭЙ үлдээнэ (олон зүйл дараалан нэмэхэд тохиромжтой),
// SuggestionSheet шиг эхлээд сонгоод дараа нь нэг товчоор batch нэмэхгүй.
export default function FoodLogPicker({ visible, onClose, onAdd }) {
  const [query, setQuery] = useState('');
  const [customName, setCustomName] = useState('');
  const [customKcal, setCustomKcal] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return foodCalories;
    return foodCalories.filter((item) => item.name.toLowerCase().includes(q));
  }, [query]);

  const handleClose = () => {
    setQuery('');
    setCustomName('');
    setCustomKcal('');
    onClose?.();
  };

  // Хоолыг нэмэхдээ ккал-аас гадна шим тэжээлийг нь ХАМТ хуулж авна.
  // Бүртгэл нь Firestore-д хадгалагдсаны дараа foodCalories.js өөрчлөгдсөн ч
  // хуучин өдрийн задаргаа хэвээр зөв үлдэхийн тулд lookup биш, snapshot.
  const addFromList = (item) => {
    onAdd?.({
      id: `${item.id}-${Date.now()}`,
      name: item.name,
      kcal: item.kcal,
      protein: item.protein ?? 0,
      fat: item.fat ?? 0,
      carbs: item.carbs ?? 0,
      source: item.id,
    });
  };

  const canAddCustom = customName.trim().length > 0 && Number(customKcal) > 0;
  const addCustom = () => {
    if (!canAddCustom) return;
    const kcal = Math.max(0, Math.round(Number(customKcal)));
    // Гараар нэмсэн хоолны шим тэжээл тодорхойгүй — 0 биш, null гэж бичнэ.
    // sumNutrition нь null-ийг 0 болгон уншина, харин UI нь "задаргаа дутуу"
    // гэдгийг ялгаж харуулж чадна.
    onAdd?.({ id: `custom-${Date.now()}`, name: customName.trim(), kcal, protein: null, fat: null, carbs: null, source: null });
    setCustomName('');
    setCustomKcal('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable className="flex-1 bg-black/35 justify-end" onPress={handleClose}>
        <Pressable className="bg-white rounded-t-[32px] max-h-[85%] overflow-hidden" onPress={() => {}}>
          <View className="px-6 pt-5 pb-3 flex-row items-center justify-between border-b border-gray-100">
            <View className="flex-row items-center gap-2 flex-1 pr-3">
              <View className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 items-center justify-center">
                <UtensilsCrossed size={20} color="#f97316" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-black text-gray-950">Юу идсэн бэ?</Text>
                <Text className="text-xs font-semibold text-gray-400">Жагсаалтаас сонго эсвэл гараар нэм</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Хаах"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="w-11 h-11 rounded-2xl bg-slate-100 items-center justify-center"
            >
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View className="px-6 pt-4">
            <View className="flex-row items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4" style={{ minHeight: 48 }}>
              <Search size={16} color="#94a3b8" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Хайх (жишээ: бууз)"
                placeholderTextColor="#94a3b8"
                className="flex-1 py-3 text-sm font-bold text-gray-800"
              />
            </View>
          </View>

          <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 12, paddingBottom: 12, gap: 8 }} showsVerticalScrollIndicator={false}>
            {filtered.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => addFromList(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.name} нэмэх`}
                activeOpacity={0.85}
                className="flex-row items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 py-3"
                style={{ minHeight: 56 }}
              >
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-black text-gray-900">{item.name}</Text>
                  <Text className="text-[11px] font-semibold text-gray-400 mt-0.5">{item.serving}</Text>
                  <View className="flex-row gap-2 mt-1">
                    {MACRO_META.map((macro) => (
                      <Text key={macro.key} className="text-[10px] font-bold" style={{ color: macro.color }}>
                        {macro.label} {item[macro.key]}г
                      </Text>
                    ))}
                  </View>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-black text-orange-600">~{item.kcal} ккал</Text>
                  <View className="w-8 h-8 rounded-xl bg-orange-50 items-center justify-center"><Plus size={16} color="#f97316" /></View>
                </View>
              </TouchableOpacity>
            ))}
            {!filtered.length ? <Text className="text-sm font-semibold text-gray-400 text-center py-6">Олдсонгүй — доороос гараар нэмнэ үү</Text> : null}
          </ScrollView>

          <View className="px-6 pt-4 pb-6 border-t border-gray-100 bg-white gap-3">
            <Text className="text-xs font-black uppercase text-gray-400">Жагсаалтад байхгүй бол гараар нэм</Text>
            <View className="flex-row gap-2">
              <TextInput
                value={customName}
                onChangeText={setCustomName}
                placeholder="Хоолны нэр"
                placeholderTextColor="#94a3b8"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-gray-800"
              />
              <TextInput
                value={customKcal}
                onChangeText={setCustomKcal}
                placeholder="Ккал"
                keyboardType="number-pad"
                placeholderTextColor="#94a3b8"
                className="w-24 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-gray-800 text-center"
              />
            </View>
            <TouchableOpacity
              onPress={addCustom}
              disabled={!canAddCustom}
              accessibilityRole="button"
              accessibilityLabel="Гараар нэмэх"
              activeOpacity={0.85}
              className="rounded-2xl py-3.5 items-center flex-row justify-center gap-2"
              style={{ backgroundColor: canAddCustom ? '#f97316' : '#e2e8f0' }}
            >
              <Plus size={18} color={canAddCustom ? '#fff' : '#94a3b8'} />
              <Text className="font-black" style={{ color: canAddCustom ? '#fff' : '#64748b' }}>Нэмэх</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
