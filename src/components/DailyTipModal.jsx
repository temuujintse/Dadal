import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Sparkles, X } from 'lucide-react-native';

// Өглөөний "эрүүл мэндийн зөвлөмж" цонх. Дунд байрлалтай, оффлайн ажилладаг
// curated жагсаалтаас гардаг тул интернэт хэрэггүй, найдвартай ажиллана.
export default function DailyTipModal({ visible, tip, onClose }) {
  if (!tip) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 items-center justify-center px-6" onPress={onClose}>
        <Pressable className="w-full bg-white rounded-[28px] p-6" onPress={() => {}}>
          <View className="flex-row items-start justify-between mb-3">
            <View className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 items-center justify-center">
              <Sparkles size={22} color="#f97316" />
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Хаах"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="w-9 h-9 rounded-xl bg-slate-100 items-center justify-center"
            >
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          </View>
          <Text className="text-[11px] font-black uppercase tracking-widest" style={{ color: '#f97316' }}>Өнөөдрийн зөвлөмж</Text>
          <Text className="text-base font-bold text-gray-900 mt-2 leading-6">{tip}</Text>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Ойлголоо"
            activeOpacity={0.85}
            className="bg-orange-500 rounded-2xl py-3.5 items-center mt-5"
            style={{ minHeight: 48 }}
          >
            <Text className="text-white font-black">Ойлголоо</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
