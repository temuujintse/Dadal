import React, { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Plus, Salad, Trash2 } from 'lucide-react-native';
import FoodLogPicker from './FoodLogPicker';
import {
  DAILY_NUTRITION_TARGET,
  GENERIC_DAILY_CALORIE_TARGET,
  MACRO_META,
  sumNutrition,
} from '../constants/foodCalories';

// Тухайн (сонгосон) өдрийн идсэн хоолны бүртгэл + ккал болон шим тэжээлийн
// задаргаа. dailyTarget нь гишүүн Тохиргоо дээр биеийн үзүүлэлтээ БӨГЛӨСӨН
// бол Mifflin-St Jeor-оор тооцсон хувийн зорилт (App.jsx-ээс дамжина), эс
// бөгөөс ерөнхий GENERIC_DAILY_CALORIE_TARGET хэвээр. Аль ч тохиолдолд
// ОЙРОЛЦОО баримжаа — доорх тайлбарт үүнийг тодорхой бичсэн.
export default function FoodLogSection({
  entries = [],
  onAdd,
  onRemove,
  canEdit = true,
  dailyTarget = GENERIC_DAILY_CALORIE_TARGET,
  nutritionTarget = DAILY_NUTRITION_TARGET,
  title = 'Өнөөдрийн хооллолт',
}) {
  const [pickerVisible, setPickerVisible] = useState(false);

  const totals = useMemo(() => sumNutrition(entries), [entries]);
  const totalKcal = totals.kcal;
  const pct = dailyTarget ? Math.min(Math.round((totalKcal / dailyTarget) * 100), 100) : 0;
  const diff = dailyTarget - totalKcal;

  // Гараар нэмсэн хоолонд шим тэжээл байхгүй (null) — задаргаа ДУТУУ гэдгийг
  // хэрэглэгчид хэлэхгүй бол "уураг 20г" гэсэн тоо бүтэн мэт харагдана.
  const missingMacroCount = useMemo(
    () => entries.filter((item) => item?.protein === null || item?.protein === undefined).length,
    [entries]
  );

  const suggestion = useMemo(() => {
    if (!entries.length) return 'Өнөөдөр юу идснээ доороос нэмээд эхлээрэй.';
    const proteinGap = nutritionTarget.protein - totals.protein;
    if (diff > 500) return `Ойролцоогоор ~${diff} ккал дутуу байна — жимс, шош эсвэл дэлгэрэнгүй хоол нэмж болно.`;
    if (proteinGap > 25) return `Калори зүгээр байна, харин уураг ~${Math.round(proteinGap)}г дутуу — мах, өндөг, сүү, ааруул нэмээрэй.`;
    if (diff >= 0) return `Зорилтдоо ойртож байна — ойролцоогоор ${diff} ккал үлдлээ.`;
    return `Зорилтоо ойролцоогоор ${Math.abs(diff)} ккалаар давлаа — дараагийн хоолоо хөнгөн сонгож тэнцвэржүүлээрэй.`;
  }, [diff, entries.length, nutritionTarget.protein, totals.protein]);

  return (
    <View className="bg-white border border-gray-200 rounded-3xl p-5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1 pr-3">
          <View className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 items-center justify-center">
            <Salad size={20} color="#f97316" />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#64748b' }}>{title}</Text>
            <Text className="text-base font-black" style={{ color: '#1e293b' }}>{totalKcal} / {dailyTarget} ккал</Text>
          </View>
        </View>
        {canEdit ? (
          <TouchableOpacity
            onPress={() => setPickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Хоол нэмэх"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="w-11 h-11 rounded-2xl bg-orange-500 items-center justify-center"
            style={{ minHeight: 44, minWidth: 44 }}
          >
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View className="h-2.5 bg-gray-100 rounded-full overflow-hidden mt-4">
        <View className="h-2.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? '#ef4444' : '#f97316' }} />
      </View>

      {/* Шим тэжээлийн задаргаа — уураг / өөх тос / нүүрс ус */}
      <View className="gap-2.5 mt-4">
        {MACRO_META.map((macro) => {
          const value = Math.round(totals[macro.key] || 0);
          const target = nutritionTarget[macro.key] || 0;
          const macroPct = target ? Math.min(Math.round((value / target) * 100), 100) : 0;
          return (
            <View key={macro.key}>
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[11px] font-black" style={{ color: macro.color }}>{macro.label}</Text>
                <Text className="text-[11px] font-bold text-gray-400">{value}г / {target}г</Text>
              </View>
              <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <View className="h-1.5 rounded-full" style={{ width: `${macroPct}%`, backgroundColor: macro.color }} />
              </View>
            </View>
          );
        })}
      </View>

      <Text className="text-xs font-semibold text-gray-500 mt-4 leading-5">{suggestion}</Text>

      {entries.length ? (
        <View className="gap-2 mt-4">
          {entries.map((item) => {
            const hasMacros = item?.protein !== null && item?.protein !== undefined;
            return (
              <View key={item.id} className="bg-slate-50 rounded-2xl px-4 py-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-bold text-gray-800 flex-1 pr-2" numberOfLines={1}>{item.name}</Text>
                  <Text className="text-sm font-black text-orange-600 mr-2">~{item.kcal} ккал</Text>
                  {canEdit ? (
                    <TouchableOpacity
                      onPress={() => onRemove?.(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.name} устгах`}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                {hasMacros ? (
                  <View className="flex-row gap-3 mt-1">
                    {MACRO_META.map((macro) => (
                      <Text key={macro.key} className="text-[10px] font-bold" style={{ color: macro.color }}>
                        {macro.label} {Math.round(Number(item[macro.key]) || 0)}г
                      </Text>
                    ))}
                  </View>
                ) : (
                  <Text className="text-[10px] font-bold text-gray-400 mt-1">Шим тэжээлийн задаргаа оруулаагүй</Text>
                )}
              </View>
            );
          })}
        </View>
      ) : null}

      {missingMacroCount ? (
        <Text className="text-[10px] font-semibold text-gray-400 mt-3 leading-4">
          {missingMacroCount} бүртгэл гараар нэмэгдсэн тул шим тэжээлийн задаргаанд ороогүй байна.
        </Text>
      ) : null}

      <Text className="text-[10px] font-semibold text-gray-400 mt-2 leading-4">
        Калори болон шим тэжээл нь ойролцоо баримжаа — хувь хүний бодит хэрэгцээ (нас, жин, идэвх) үүнээс ялгаатай байж болно.
      </Text>

      <FoodLogPicker visible={pickerVisible} onClose={() => setPickerVisible(false)} onAdd={(item) => onAdd?.(item)} />
    </View>
  );
}
