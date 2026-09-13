import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Archive, ChevronLeft, Flame, Trophy, X } from 'lucide-react-native';

const MONTH_NAMES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

const formatMonthKey = (monthKey) => {
  const [year, month] = (monthKey || '').split('-');
  if (!year || !month) return monthKey || '';
  return `${year} оны ${MONTH_NAMES[Number(month) - 1] || month} сар`;
};

// Сар бүрийн архивыг харуулах модал. Өгөгдлийг ЭНД биш useFamilyData.
// listArchives()-ээр НЭГ удаа татна (App.jsx дамжуулна) — модал НЭЭГДЭХ
// БҮРД дахин уншина, live listener биш (PLAN_V2.md §4.2-ийн шаардлага:
// dailyLogs listener зөвхөн 35 хоног барьдаг тул архив тусдаа зам байх
// ёстой).
export default function ArchiveModal({ visible, onClose, onFetch }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [archives, setArchives] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!visible) {
      // Дараагийн удаа шинэ өгөгдөл харуулахын тулд сонголтоо цэвэрлэнэ.
      setSelected(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      const result = await onFetch?.();
      if (cancelled) return;
      if (result?.ok) setArchives(result.archives || []);
      else setError(result?.message || 'Архивыг ачаалж чадсангүй.');
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [visible, onFetch]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/35 justify-end" onPress={onClose}>
        <Pressable className="bg-white rounded-t-[32px] max-h-[85%] overflow-hidden" onPress={() => {}}>
          <View className="px-6 pt-5 pb-3 flex-row items-center justify-between border-b border-gray-100">
            <View className="flex-row items-center gap-2 flex-1 pr-3">
              {selected ? (
                <TouchableOpacity
                  onPress={() => setSelected(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Жагсаалт руу буцах"
                  className="w-9 h-9 rounded-xl bg-slate-100 items-center justify-center mr-1"
                >
                  <ChevronLeft size={18} color="#64748b" />
                </TouchableOpacity>
              ) : (
                <View className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 items-center justify-center">
                  <Archive size={20} color="#f97316" />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-base font-black text-gray-950">{selected ? formatMonthKey(selected.monthKey) : 'Сарын архив'}</Text>
                <Text className="text-xs font-semibold text-gray-400">{selected ? `${selected.dayCount} хоногийн дүн` : 'Өмнөх саруудын дүнг харах'}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Хаах"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="w-11 h-11 rounded-2xl bg-slate-100 items-center justify-center"
            >
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 14, paddingBottom: 24, gap: 10 }} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View className="items-center py-10"><ActivityIndicator color="#f97316" /></View>
            ) : error ? (
              <Text className="text-sm font-bold text-red-500 text-center py-6">{error}</Text>
            ) : !archives.length ? (
              <View className="items-center py-10 gap-2">
                <Text className="text-3xl">🗂️</Text>
                <Text className="text-sm font-bold text-gray-500 text-center">Архивласан сар алга.{'\n'}Сар дуусаад {'"'}Шинэ сар эхлүүлэх{'"'} дарахад энд харагдана.</Text>
              </View>
            ) : selected ? (
              <>
                <View className="bg-gray-950 rounded-3xl p-5 mb-1">
                  <Text className="text-orange-200 text-xs font-black uppercase">Нийт оноо</Text>
                  <Text className="text-white text-3xl font-black mt-1">{selected.totalPoints || 0}</Text>
                </View>
                {(selected.members || []).slice().sort((a, b) => (b.points || 0) - (a.points || 0)).map((member, index) => (
                  <View key={member.uid} className="flex-row items-center justify-between bg-slate-50 rounded-2xl px-4 py-3">
                    <View className="flex-row items-center gap-3 flex-1 pr-2">
                      {index === 0 ? <Trophy size={18} color="#f97316" /> : <Text className="text-sm font-black text-gray-400 w-[18px] text-center">{index + 1}</Text>}
                      <Text className="text-2xl">{member.avatar || '🙂'}</Text>
                      <View className="flex-1">
                        <Text className="text-sm font-black text-gray-900" numberOfLines={1}>{member.name}</Text>
                        <Text className="text-[10px] font-bold text-gray-400 mt-0.5">{member.completionPct || 0}% биелүүлсэн</Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-sm font-black text-orange-600">{member.points || 0} оноо</Text>
                      <View className="flex-row items-center gap-1 mt-0.5">
                        <Flame size={11} color="#f97316" />
                        <Text className="text-[10px] font-bold text-gray-400">{member.streak || 0}</Text>
                      </View>
                    </View>
                  </View>
                ))}
                {(selected.rewards || []).some((r) => r.status === 'redeemed') ? (
                  <View className="mt-2">
                    <Text className="text-[11px] font-black uppercase text-gray-400 mb-2">Авсан урамшуулал</Text>
                    {selected.rewards.filter((r) => r.status === 'redeemed').map((r) => (
                      <Text key={r.id} className="text-sm font-bold text-gray-700 mb-1">🏆 {r.name}</Text>
                    ))}
                  </View>
                ) : null}
              </>
            ) : (
              archives.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setSelected(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatMonthKey(item.monthKey)} архив харах`}
                  className="flex-row items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 py-4"
                >
                  <View>
                    <Text className="text-sm font-black text-gray-900">{formatMonthKey(item.monthKey)}</Text>
                    <Text className="text-[11px] font-semibold text-gray-400 mt-0.5">{(item.members || []).length} гишүүн · {item.dayCount} хоног</Text>
                  </View>
                  <Text className="text-base font-black text-orange-600">{item.totalPoints || 0} оноо</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
