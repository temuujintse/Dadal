import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ImageBackground, Text, TouchableOpacity, View } from 'react-native';
import { Minus, Plus, ShoppingBasket, Trash2 } from 'lucide-react-native';
import { PRODUCTS, PRODUCT_BY_ID, MEAL_SLOTS } from '../constants/products';
import { EMPTY_PLAN, describeItems, isPlanEmpty, roundTotals, sumItems, sumPlan } from '../utils/basket';
import { dayNamesShort } from '../utils/dates';
import { BRAND_BLUE } from '../constants/theme';

const MEAL_IMAGES = {
  breakfast: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=900&q=75',
  lunch: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=75',
  dinner: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=75',
};

const keyToDate = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export function NutritionRow({ totals, label, people }) {
  const t = roundTotals(totals);
  return (
    <View className="bg-white border border-gray-100 rounded-2xl p-4">
      {label ? <Text className="text-[11px] font-black uppercase text-gray-400 mb-2">{label}</Text> : null}
      <View className="flex-row justify-between">
        {[['ккал', t.kcal, '#f97316'], ['Уураг', `${t.protein}г`, BRAND_BLUE], ['Өөх', `${t.fat}г`, '#f59e0b'], ['Нүүрс ус', `${t.carbs}г`, '#16a34a']].map(([name, value, color]) => (
          <View key={name} className="items-center flex-1">
            <Text className="text-base font-black" style={{ color }}>{value}</Text>
            <Text className="text-[10px] font-bold text-gray-400 mt-0.5">{name}</Text>
          </View>
        ))}
      </View>
      {people > 1 ? <Text className="text-[10px] font-bold text-gray-400 mt-2 text-center">Нэг хүнд · гэр бүл нийт ({people} хүн): ~{Math.round(t.kcal * people)} ккал</Text> : null}
    </View>
  );
}

// ── 1. Бүтээгдэхүүн: сагс бүрдүүлэх ───────────────────────────────────────
export function BasketEditor({ dateKeys, plans, initialDateKey, canEdit, people, onSave }) {
  const [dateKey, setDateKey] = useState(initialDateKey || dateKeys[0]);
  const [slot, setSlot] = useState('breakfast');
  const [draft, setDraft] = useState(plans[dateKey] || EMPTY_PLAN);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => { if (initialDateKey) setDateKey(initialDateKey); }, [initialDateKey]);
  // Өдөр солигдох, эсвэл хадгалаагүй засвар байхгүй үед серверийн утгыг авна.
  useEffect(() => { if (!dirty) setDraft(plans[dateKey] || EMPTY_PLAN); }, [plans, dateKey, dirty]);

  const items = draft[slot] || [];
  const qtyOf = (productId) => items.find((item) => item.productId === productId)?.qty || 0;
  const setQty = (productId, qty) => {
    if (!canEdit) return;
    // Функцэн шинэчлэл — хурдан дараалсан даралтууд хуучин утга дээр бичигдэхгүй.
    setDraft((prev) => {
      const list = prev[slot] || [];
      const current = list.find((item) => item.productId === productId)?.qty || 0;
      const nextQty = typeof qty === 'function' ? qty(current) : qty;
      const next = nextQty <= 0
        ? list.filter((item) => item.productId !== productId)
        : list.some((item) => item.productId === productId)
          ? list.map((item) => (item.productId === productId ? { ...item, qty: nextQty } : item))
          : [...list, { productId, qty: nextQty }];
      return { ...prev, [slot]: next };
    });
    setDirty(true);
    setNotice('');
  };

  const changeDate = (key) => {
    if (dirty) { setNotice('Эхлээд хадгална уу.'); return; }
    setDateKey(key);
  };

  const save = async () => {
    setSaving(true);
    const result = await onSave(dateKey, draft);
    setSaving(false);
    if (result?.ok) { setDirty(false); setNotice('Хадгалагдлаа ✓'); } else setNotice(result?.message || 'Хадгалж чадсангүй.');
  };

  return (
    <View>
      <View className="flex-row gap-2 mb-3">
        {dateKeys.map((key, index) => {
          const date = keyToDate(key);
          const selected = key === dateKey;
          return (
            <TouchableOpacity key={key} onPress={() => changeDate(key)} className="flex-1 items-center rounded-2xl py-2 border" style={{ backgroundColor: selected ? BRAND_BLUE : '#fff', borderColor: selected ? BRAND_BLUE : '#e5e7eb' }}>
              <Text className="text-[9px] font-black uppercase" style={{ color: selected ? '#dbeafe' : '#94a3b8' }}>{index === 0 ? 'Өнөө' : dayNamesShort[date.getDay()]}</Text>
              <Text className="text-sm font-black" style={{ color: selected ? '#fff' : '#0f172a' }}>{date.getDate()}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View className="bg-white rounded-2xl p-1 flex-row border border-gray-200 mb-3">
        {MEAL_SLOTS.map((meal) => {
          const selected = slot === meal.key;
          const count = (draft[meal.key] || []).length;
          return (
            <TouchableOpacity key={meal.key} onPress={() => setSlot(meal.key)} className="flex-1 py-2.5 rounded-xl items-center" style={{ backgroundColor: selected ? '#f97316' : 'transparent' }}>
              <Text className="text-xs font-black" style={{ color: selected ? '#fff' : '#64748b' }}>{meal.emoji} {meal.label}{count ? ` · ${count}` : ''}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!canEdit ? <Text className="text-xs font-bold text-gray-500 mb-3">Цэсийг гэр бүлийн менежер сонгоно. Та харах боломжтой.</Text> : null}

      <View className="flex-row flex-wrap justify-between">
        {PRODUCTS.map((product) => {
          const qty = qtyOf(product.id);
          return (
            <View key={product.id} className="rounded-2xl border p-3 mb-2" style={{ width: '48.5%', backgroundColor: qty ? '#eff6ff' : '#fff', borderColor: qty ? BRAND_BLUE : '#eef0f3' }}>
              <View className="flex-row items-center gap-2">
                <Text style={{ fontSize: 24 }}>{product.emoji}</Text>
                <View className="flex-1">
                  <Text className="text-xs font-black text-gray-900" numberOfLines={1}>{product.name}</Text>
                  <Text className="text-[9px] font-bold text-gray-400" numberOfLines={1}>{product.unit} · {product.kcal} ккал</Text>
                </View>
              </View>
              {canEdit ? (
                <View className="flex-row items-center justify-between mt-2">
                  <TouchableOpacity onPress={() => setQty(product.id, (current) => Math.max(0, current - 1))} disabled={!qty} accessibilityLabel={`${product.name} хасах`} className="w-8 h-8 rounded-xl bg-slate-100 items-center justify-center" style={{ opacity: qty ? 1 : 0.4 }}><Minus size={14} color="#334155" /></TouchableOpacity>
                  <Text className="text-base font-black" style={{ color: qty ? BRAND_BLUE : '#cbd5e1' }}>{qty}</Text>
                  <TouchableOpacity onPress={() => setQty(product.id, (current) => current + 1)} accessibilityLabel={`${product.name} нэмэх`} className="w-8 h-8 rounded-xl items-center justify-center" style={{ backgroundColor: BRAND_BLUE }}><Plus size={14} color="#fff" /></TouchableOpacity>
                </View>
              ) : qty ? <Text className="text-xs font-black mt-2" style={{ color: BRAND_BLUE }}>× {qty}</Text> : null}
            </View>
          );
        })}
      </View>

      <View className="bg-white border border-gray-200 rounded-3xl p-4 mt-2">
        <View className="flex-row items-center gap-2 mb-2">
          <ShoppingBasket size={18} color="#f97316" />
          <Text className="text-base font-black text-gray-950">Сагс · {MEAL_SLOTS.find((m) => m.key === slot)?.label} (1 хүнд)</Text>
        </View>
        {items.length ? items.map((item) => {
          const product = PRODUCT_BY_ID[item.productId];
          return (
            <View key={item.productId} className="flex-row items-center justify-between py-1.5">
              <Text className="text-sm font-bold text-gray-800 flex-1">{product.emoji} {product.name} × {item.qty} <Text className="text-gray-400">{product.unit}</Text></Text>
              <Text className="text-xs font-black text-gray-500 mr-2">{Math.round(product.kcal * item.qty)} ккал</Text>
              {canEdit ? <TouchableOpacity onPress={() => setQty(item.productId, 0)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Trash2 size={15} color="#ef4444" /></TouchableOpacity> : null}
            </View>
          );
        }) : <Text className="text-xs font-semibold text-gray-400">Дээрээс бүтээгдэхүүн нэмнэ үү.</Text>}
      </View>

      <View className="mt-3 gap-2">
        <NutritionRow label={`${MEAL_SLOTS.find((m) => m.key === slot)?.label}ийн хоол`} totals={sumItems(items)} />
        <NutritionRow label="Өдрийн нийт" totals={sumPlan(draft)} people={people} />
      </View>

      {notice ? <Text className="text-xs font-bold mt-3" style={{ color: notice.endsWith('✓') ? '#16a34a' : '#ef4444' }}>{notice}</Text> : null}
      {canEdit ? (
        <TouchableOpacity onPress={save} disabled={!dirty || saving} className="mt-3 rounded-3xl py-4 items-center" style={{ backgroundColor: BRAND_BLUE, opacity: !dirty || saving ? 0.45 : 1 }}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-black">Цэс хадгалах</Text>}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── 2. Өнөөдөр ─────────────────────────────────────────────────────────────
export function TodayMeals({ plan, fallbackMeals, people }) {
  const hasPlan = !isPlanEmpty(plan);
  return (
    <View className="gap-4">
      {MEAL_SLOTS.map((meal) => {
        const items = plan?.[meal.key] || [];
        const text = hasPlan ? describeItems(items) : fallbackMeals?.[meal.key];
        const kcal = Math.round(sumItems(items).kcal);
        return (
          <View key={meal.key} className="rounded-[28px] overflow-hidden">
            <ImageBackground source={{ uri: MEAL_IMAGES[meal.key] }} resizeMode="cover" style={{ minHeight: 160, backgroundColor: '#1e293b' }} imageStyle={{ opacity: 0.88 }}>
              <View className="flex-1 p-5 justify-between" style={{ backgroundColor: '#00000059' }}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-white font-black text-base">{meal.emoji} {meal.label}ийн хоол</Text>
                  {hasPlan && kcal ? <Text className="text-white/90 text-xs font-black bg-black/30 px-2.5 py-1 rounded-full">~{kcal} ккал</Text> : null}
                </View>
                <Text className="text-white text-lg font-black leading-6 mt-6" numberOfLines={3}>{text || 'Төлөвлөөгүй'}</Text>
              </View>
            </ImageBackground>
          </View>
        );
      })}
      {hasPlan ? <NutritionRow label="Өнөөдрийн нийт (1 хүнд)" totals={sumPlan(plan)} people={people} /> : null}
    </View>
  );
}

// ── 3. 7 хоног ─────────────────────────────────────────────────────────────
export function WeekPlans({ dateKeys, plans, onOpenDay }) {
  return (
    <View className="gap-3">
      {dateKeys.map((key, index) => {
        const plan = plans[key] || EMPTY_PLAN;
        const date = keyToDate(key);
        const total = sumPlan(plan);
        const empty = isPlanEmpty(plan);
        return (
          <TouchableOpacity key={key} onPress={() => onOpenDay(key)} className="bg-white border border-gray-100 rounded-3xl p-4" accessibilityLabel={`${date.getDate()}-ны цэс`}>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-base font-black" style={{ color: index === 0 ? BRAND_BLUE : '#0f172a' }}>{index === 0 ? 'Өнөөдөр' : dayNamesShort[date.getDay()]} · {date.getMonth() + 1}/{date.getDate()}</Text>
              <Text className="text-xs font-black text-orange-600">{empty ? 'Төлөвлөөгүй' : `~${total.kcal} ккал`}</Text>
            </View>
            {empty ? <Text className="text-xs font-semibold text-gray-400">Дарж цэс бүрдүүлнэ үү.</Text> : MEAL_SLOTS.map((meal) => (
              <Text key={meal.key} className="text-xs font-bold text-gray-600 mt-0.5" numberOfLines={1}>{meal.emoji} {describeItems(plan[meal.key]) || '—'}</Text>
            ))}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function useTodayFallbackMeals(meals) {
  // Хуучин текст цэс (day1=Даваа ... day7=Ням) — өнөөдрийн өдрийнхийг авна.
  return useMemo(() => {
    const weekday = new Date().getDay() || 7;
    return meals?.[`day${weekday}`] || null;
  }, [meals]);
}
