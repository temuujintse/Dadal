import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Check, Lightbulb, Plus, X } from 'lucide-react-native';
import { habitSuggestionGroups } from '../constants/habitSuggestions';

export default function SuggestionSheet({ visible, onClose, onAddSelected }) {
  const [selected, setSelected] = useState({});

  const toggle = (id) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  const selectedIds = Object.keys(selected).filter((k) => selected[k]);
  const selectedCount = selectedIds.length;

  const handleAdd = () => {
    if (!selectedCount) return;
    const ids = [...selectedIds];
    setSelected({});
    onAddSelected?.(ids);
  };

  const handleClose = () => {
    setSelected({});
    onClose?.();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable className="flex-1 bg-black/35 justify-end" onPress={handleClose}>
        <Pressable className="bg-white rounded-t-[32px] max-h-[82%] overflow-hidden" onPress={() => {}}>
          <View className="px-6 pt-5 pb-3 flex-row items-center justify-between border-b border-gray-100">
            <View className="flex-row items-center gap-2 flex-1 pr-3">
              <View className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 items-center justify-center">
                <Lightbulb size={20} color="#f97316" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-black text-gray-950">Санал болгох дадлууд</Text>
                <Text className="text-xs font-semibold text-gray-400">Хүссэнээ сонгоод нэмнэ</Text>
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

          <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 16, gap: 18 }} showsVerticalScrollIndicator={false}>
            {habitSuggestionGroups.map((group) => (
              <View key={group.id}>
                <View className="flex-row items-center gap-2 mb-3">
                  <Text className="text-lg">{group.icon}</Text>
                  <Text className="text-sm font-black text-gray-800">{group.label}</Text>
                  <View className="flex-1 h-px bg-gray-100 ml-2" />
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {group.items.map((item) => {
                    const isSelected = Boolean(selected[item.id]);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => toggle(item.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.text} ${isSelected ? 'сонгосон' : ''}`}
                        activeOpacity={0.85}
                        className={`px-4 py-3 rounded-2xl border flex-row items-center gap-2 ${isSelected ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-200'}`}
                        style={{ minHeight: 44 }}
                      >
                        {isSelected ? <Check size={16} color="#fff" /> : null}
                        <Text className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-700'}`}>{item.text}</Text>
                        {item.points ? (
                          <Text className={`text-[10px] font-black px-2 py-1 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-600'}`}>+{item.points}</Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          <View className="px-6 pt-4 pb-6 border-t border-gray-100 bg-white">
            <TouchableOpacity
              onPress={handleAdd}
              disabled={selectedCount === 0}
              accessibilityRole="button"
              accessibilityLabel="Сонгосон дадлуудыг нэмэх"
              activeOpacity={0.85}
              className="rounded-2xl py-4 items-center flex-row justify-center gap-2"
              style={{ backgroundColor: selectedCount ? '#f97316' : '#e2e8f0', minHeight: 52, opacity: selectedCount ? 1 : 0.9 }}
            >
              <Plus size={20} color={selectedCount ? '#fff' : '#94a3b8'} />
              <Text className="font-black" style={{ color: selectedCount ? '#fff' : '#64748b' }}>
                {selectedCount ? `Сонгосон ${selectedCount} дадлыг нэмэх` : 'Дадлаа сонгоно уу'}
              </Text>
            </TouchableOpacity>
            <Text className="text-[11px] font-semibold text-gray-400 text-center mt-3">
              Нэмсний дараа Dashboard дээрээс засварлаж болно
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
