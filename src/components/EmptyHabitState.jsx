import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Lightbulb, Plus, Sparkles } from 'lucide-react-native';

export default function EmptyHabitState({ onAddHabit, onShowSuggestions }) {
  return (
    <View className="bg-white border border-orange-100 rounded-[28px] p-6 items-center">
      <View className="w-20 h-20 rounded-[28px] bg-orange-50 border border-orange-100 items-center justify-center mb-4">
        <Sparkles size={34} color="#f97316" />
      </View>
      <Text className="text-xl font-black text-gray-950 text-center">Одоогоор дадал алга</Text>
      <Text className="text-sm font-semibold text-gray-500 text-center mt-2 leading-5 px-2">
        Өдөр тутмын жижиг дадлуудаас эхэлцгээе. Эхний дадлаа нэмээд гэр бүлээрээ ахицаа хамтдаа хэмжицгээе.
      </Text>

      <View className="w-full gap-3 mt-6">
        <TouchableOpacity
          onPress={onAddHabit}
          accessibilityRole="button"
          accessibilityLabel="Дадал нэмэх"
          activeOpacity={0.85}
          className="bg-orange-500 rounded-2xl py-4 items-center flex-row justify-center gap-2"
          style={{ minHeight: 52 }}
        >
          <Plus size={20} color="#fff" />
          <Text className="text-white font-black text-base">Дадал нэмэх</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onShowSuggestions}
          accessibilityRole="button"
          accessibilityLabel="Санал болгох дадлуудаас сонгох"
          activeOpacity={0.8}
          className="bg-white border border-gray-200 rounded-2xl py-4 items-center flex-row justify-center gap-2"
          style={{ minHeight: 52 }}
        >
          <Lightbulb size={18} color="#64748b" />
          <Text className="font-black text-sm" style={{ color: '#1e293b' }}>Санал болгох дадлуудаас сонгох</Text>
        </TouchableOpacity>
      </View>

      <Text className="text-[11px] font-bold text-gray-400 mt-4 text-center">
        Жишээ: Шүдээ угаах · Ном унших · Ус уух
      </Text>
    </View>
  );
}
