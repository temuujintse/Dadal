import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Edit, Save, RotateCcw, Check, Sparkles, Target, Lock, Unlock, CircleCheckBig } from 'lucide-react-native';
import { defaultFamilyRewards, rewardVisuals } from '../data';
import { getGroupTypeMeta } from '../constants/groupTypes';

export default function RewardsScreen({
  groupType = 'family',
  canEdit = true,
  onRedeemReward,
  familyRewards,
  setFamilyRewards,
  isEditingRewards,
  setIsEditingRewards,
  tempRewards,
  setTempRewards,
  selectedRewardIdx,
  setSelectedRewardIdx,
  totalFamilyPoints,
  saveToCloud,
  showResetConfirm,
  setShowResetConfirm,
  onResetMonth,
  // 1 сарын аялал (PLAN_V2 §6) — 30 хоног дуусахад дүгнэлт харуулна.
  journey = null,
  members = [],
}) {
  const [rewardNotice, setRewardNotice] = useState('');
  // Дүгнэлтийн жагсаалт — оноогоор эрэмбэлсэн. 30 хоног дуусмагц харагдана.
  const ranked = [...(members || [])].sort((a, b) => (b.points || 0) - (a.points || 0));
  const topMember = ranked[0] || null;
  const safeRewards = Array.isArray(familyRewards) && familyRewards.length ? familyRewards : defaultFamilyRewards;
  const activeList = isEditingRewards ? tempRewards : safeRewards;
  const activeData = activeList?.[selectedRewardIdx] || activeList?.[0] || defaultFamilyRewards[0];
  const visual = rewardVisuals[activeData?.id] || rewardVisuals.reward_1;
  const ActiveIcon = visual.icon;
  const progressPct = Math.min(Math.round((totalFamilyPoints / Math.max(activeData?.target || 1, 1)) * 100), 100);
  const remainingPoints = Math.max((activeData?.target || 0) - totalFamilyPoints, 0);
  const remainingHabits = Math.ceil(remainingPoints / 10);
  const isGoalReached = progressPct >= 100;
  // PLAN_V2.md §3.5(б): 'personal' горимд "гэр бүлийн урамшуулал" гэсэн
  // хамтын өнгө аяс тохирохгүй тул текстийг "өөртөө амласан шагнал" болгож
  // өөрчилнө. Оноо/логик ЯГ ХЭВЭЭР — зөвхөн харагдах бичвэр солигдоно.
  const isSolo = getGroupTypeMeta(groupType).id === 'personal';
  const goalLabel = isSolo ? 'Миний зорилго' : 'Гэр бүлийн зорилго';
  const pointsLabel = isSolo ? 'Миний оноо' : 'Гэр бүлийн оноо';
  const footerNote = isSolo
    ? 'Таны оноо цугларч урамшуулал нээнэ. Locked картууд бүдгэрч харагдана.'
    : 'Бүх гишүүний оноо нийлж урамшуулал нээнэ. Locked картууд бүдгэрч харагдана.';

  // Хадгалах амжилтгүй бол optimistic state-г буцаагаад засварлах горимд
  // үлдэнэ — алдааны мессеж харагдана.
  const toggleRewardEdit = async () => {
    if (isEditingRewards) {
      const rewards = Array.isArray(tempRewards) && tempRewards.length ? tempRewards : defaultFamilyRewards;
      const prevRewards = familyRewards;
      setFamilyRewards(rewards);
      let result;
      try {
        result = await saveToCloud({ familyRewards: rewards });
      } catch {
        result = { ok: false };
      }
      if (!result?.ok) {
        setFamilyRewards(prevRewards);
        setRewardNotice(result?.message || 'Урамшууллыг хадгалж чадсангүй. Дахин оролдоно уу.');
        return;
      }
      setShowResetConfirm(false);
      setRewardNotice('');
    } else {
      setTempRewards(safeRewards.map((item) => ({ ...item })));
      setRewardNotice('');
    }
    setIsEditingRewards(!isEditingRewards);
  };

  const handleRewardInputChange = (index, field, value) => {
    const updated = [...(tempRewards || [])];
    if (!updated[index]) return;
    updated[index] = { ...updated[index], [field]: field === 'target' ? Number(value) || 0 : value };
    setTempRewards(updated);
  };

  // P2.3: "Шинэ сар эхлүүлэх" одоо hook-ийн БОДИТ resetMonthlyProgress-ийг
  // дуудна — энэ сарын логууд цэвэрлэгдэж, redeemed шагнал locked болж, бүх
  // гишүүний оноо/streak тэглэнэ (стreak дахин сэрэхгүй). Амжилтгүй бол локал
  // огт өөрчлөгдөхгүй, зөвхөн мессеж харагдана.
  const handleResetPoints = async () => {
    if (!showResetConfirm) return setShowResetConfirm(true);
    let result;
    try {
      result = await onResetMonth?.();
    } catch {
      result = { ok: false };
    }
    if (!result?.ok) {
      setRewardNotice(result?.message || 'Шинэ сарыг эхлүүлж чадсангүй. Дахин оролдоно уу.');
      setShowResetConfirm(false);
      return;
    }
    setRewardNotice('');
    setShowResetConfirm(false);
    setIsEditingRewards(false);
  };

  return (
    <View className="p-5 pb-32">
      {/* ── 30 хоногийн дүгнэлт ─────────────────────────────────────────
          Мөчлөг дуусахад ЛЕ харагдана: хэн хамгийн их оноо авсан, гишүүн
          бүрийн оноо/дараалсан өдөр. Доор нь засварын горим руу орж "шинэ
          сар эхлүүлэх" товчийг дарна (тэр нь архивыг хадгалаад тэглэдэг). */}
      {journey?.complete ? (
        <View className="bg-gray-950 rounded-[30px] p-5 mb-5 overflow-hidden">
          <View className="absolute w-40 h-40 rounded-full bg-orange-500/20 -right-12 -top-16" />
          <Text className="text-orange-200 text-[10px] font-black uppercase">30 хоногийн дүн</Text>
          <Text className="text-white text-xl font-black mt-1">{journey.day} дэх өдөр — аялал дууслаа 🎉</Text>
          {topMember ? (
            <Text className="text-gray-400 text-xs font-bold mt-1">
              Хамгийн идэвхтэй: {topMember.name} · {topMember.points || 0} оноо
            </Text>
          ) : null}
          <View className="mt-4 gap-2">
            {ranked.slice(0, 8).map((member, position) => (
              <View key={member.uid} className="flex-row items-center bg-white/10 border border-white/15 rounded-2xl px-3 py-2.5">
                <Text className="text-white font-black text-xs w-5">{position + 1}.</Text>
                <Text className="text-lg mr-2">{member.avatar || '🙂'}</Text>
                <Text className="text-white font-bold text-xs flex-1" numberOfLines={1}>{member.name}</Text>
                <Text className="text-orange-200 font-black text-xs mr-3">{member.points || 0} оноо</Text>
                <Text className="text-gray-400 font-bold text-[11px]">🔥{member.streak || 0}</Text>
              </View>
            ))}
          </View>
          <Text className="text-gray-400 text-[10px] font-bold mt-3 leading-4">
            Шинэ мөчлөг эхлүүлэхэд энэ дүн архивт хадгалагдаж, оноо тэглэгдэнэ. Доорх {canEdit ? '"Засах" → "Шинэ сар эхлүүлэх"' : 'админаар дамжуулан'} үйлдлийг хийнэ.
          </Text>
        </View>
      ) : null}

      <View className="flex-row justify-between items-center mb-5"><View className="flex-1 pr-3"><Text className="text-[11px] font-black uppercase tracking-widest" style={{ color: '#64748b' }}>{goalLabel}</Text><Text className="text-2xl font-black" style={{ color: '#1e293b' }}>Урамшуулал</Text></View>{canEdit ? (
        <TouchableOpacity
          onPress={toggleRewardEdit}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={isEditingRewards ? 'Урамшуулал хадгалах' : 'Урамшуулал засах'}
          className={`flex-row items-center gap-2 px-5 py-3 rounded-2xl ${isEditingRewards ? 'bg-orange-500' : 'bg-white border border-gray-200'}`}
          style={{ minHeight: 44 }}
        >
          {isEditingRewards ? <Save size={15} color="#fff" /> : <Edit size={15} color="#1e293b" />}
          <Text className="text-xs font-black" style={{ color: isEditingRewards ? '#fff' : '#1e293b' }}>{isEditingRewards ? 'Хадгалах' : 'Засах'}</Text>
        </TouchableOpacity>
      ) : null}</View>

      <View className="rounded-[30px] p-6 mb-5 overflow-hidden" style={{ backgroundColor: visual.bg }}>
        <View className="absolute w-44 h-44 rounded-full bg-white/10 -right-16 -top-20" />
        {isEditingRewards ? (
          <View className="gap-4"><Text className="text-white text-xl font-black">Сонгосон урамшуулал</Text><TextInput value={activeData?.name || ''} onChangeText={(value) => handleRewardInputChange(selectedRewardIdx, 'name', value)} placeholder="Нэр" placeholderTextColor="#ffffff99" className="bg-black/20 rounded-2xl px-4 py-3 text-white font-black" /><TextInput value={activeData?.desc || ''} onChangeText={(value) => handleRewardInputChange(selectedRewardIdx, 'desc', value)} placeholder="Тайлбар" placeholderTextColor="#ffffff99" className="bg-black/20 rounded-2xl px-4 py-3 text-white font-bold" /><TextInput value={String(activeData?.target || 0)} onChangeText={(value) => handleRewardInputChange(selectedRewardIdx, 'target', value)} keyboardType="numeric" placeholder="Оноо" placeholderTextColor="#ffffff99" className="bg-black/20 rounded-2xl px-4 py-3 text-white font-black" /></View>
        ) : (
          <>
            <View className="flex-row items-start justify-between"><View className="flex-1 pr-4"><View className="flex-row items-center gap-2"><Sparkles size={15} color="#fde047" /><Text className="text-white/75 text-[10px] font-black uppercase">{activeData?.status === 'redeemed' ? 'Ашигласан' : isGoalReached ? 'Нээгдсэн' : 'Дараагийн зорилго'}</Text></View><Text className="text-3xl font-black text-white mt-2 leading-9">{activeData?.name}</Text><Text className="text-white/75 text-xs font-semibold mt-2 leading-5">{activeData?.desc}</Text></View><View className="w-16 h-16 rounded-3xl bg-white/15 items-center justify-center"><ActiveIcon size={31} color="#fff" /></View></View>
            <View className="bg-black/15 rounded-3xl p-4 mt-6"><View className="flex-row justify-between items-end"><View><Text className="text-white/60 text-[10px] font-black uppercase">{pointsLabel}</Text><Text className="text-white text-4xl font-black">{totalFamilyPoints}</Text></View><Text className="text-white text-2xl font-black">{progressPct}%</Text></View><View className="h-4 bg-black/30 rounded-full overflow-hidden mt-3"><View className="h-4 rounded-full" style={{ width: `${progressPct}%`, backgroundColor: visual.bar }} /></View><Text className="text-white/80 text-xs font-black mt-3">{activeData?.status === 'redeemed' ? '✅ Энэ урамшууллыг ашигласан' : isGoalReached ? '🎉 Урамшуулал нээгдлээ!' : `Дахин ойролцоогоор ${remainingHabits} дадал биелүүлэхэд нээгдэнэ`}</Text>{canEdit && isGoalReached ? <TouchableOpacity onPress={() => onRedeemReward?.(activeData?.id)} className="mt-4 bg-white/20 border border-white/20 rounded-2xl py-3 items-center"><Text className="text-white font-black">{activeData?.status === 'redeemed' ? 'Ашиглаагүй болгох' : 'Урамшууллаа авах'}</Text></TouchableOpacity> : null}</View>
          </>
        )}
      </View>

      <View className="flex-row items-center gap-2 mb-3"><Target size={18} color="#f97316" /><Text className="text-lg font-black" style={{ color: '#1e293b' }}>Бүх урамшуулал</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 10 }}>
        {activeList.map((reward, index) => {
          const itemVisual = rewardVisuals[reward.id] || rewardVisuals.reward_1;
          const ItemIcon = itemVisual.icon;
          const unlocked = totalFamilyPoints >= Number(reward.target || 0);
          const redeemed = reward.status === 'redeemed';
          const itemProgress = Math.min(Math.round((totalFamilyPoints / Math.max(Number(reward.target || 1), 1)) * 100), 100);
          return <TouchableOpacity key={reward.id || index} onPress={() => setSelectedRewardIdx(index)} className="border rounded-[26px] p-4 overflow-hidden" style={{ width: 190, minHeight: 190, backgroundColor: selectedRewardIdx === index ? itemVisual.tabBg : '#fff', borderColor: selectedRewardIdx === index ? itemVisual.tabColor : '#e5e7eb', opacity: unlocked || isEditingRewards ? 1 : 0.48 }}><View className="flex-row items-center justify-between"><View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: itemVisual.bg }}><ItemIcon size={23} color="#fff" /></View>{redeemed ? <CircleCheckBig size={22} color="#2563eb" /> : unlocked ? <Unlock size={21} color="#f97316" /> : <Lock size={21} color="#94a3b8" />}</View><Text numberOfLines={2} className="font-black text-gray-950 text-base mt-4 leading-5">{reward.name}</Text><Text className="text-[10px] font-bold text-gray-400 mt-2">{totalFamilyPoints}/{reward.target} оноо</Text><View className="h-2 bg-black/5 rounded-full mt-3 overflow-hidden"><View className="h-2 rounded-full" style={{ width: `${itemProgress}%`, backgroundColor: itemVisual.bar }} /></View>{!unlocked && !isEditingRewards ? <Text className="text-[10px] font-black text-gray-500 mt-3">🔒 {Math.ceil(Math.max(Number(reward.target || 0) - totalFamilyPoints, 0) / 10)} дадал дутуу</Text> : null}</TouchableOpacity>;
        })}
      </ScrollView>

      <View className="bg-white border border-gray-200 rounded-3xl p-4 mt-4"><Text className="text-xs font-semibold leading-5" style={{ color: '#64748b' }}>{footerNote}</Text></View>

      {rewardNotice ? <Text className="text-xs font-bold text-red-500 mt-3 leading-5">{rewardNotice}</Text> : null}

      {isEditingRewards ? <TouchableOpacity onPress={handleResetPoints} className={`mt-5 w-full py-4 rounded-3xl items-center flex-row justify-center gap-2 ${showResetConfirm ? 'bg-red-500' : 'bg-white border border-red-100'}`}>{showResetConfirm ? <Check size={20} color="#fff" /> : <RotateCcw size={20} color="#ef4444" />}<Text className={`font-black ${showResetConfirm ? 'text-white' : 'text-red-500'}`}>{showResetConfirm ? 'Тийм, оноог тэглэх' : 'Шинэ сар эхлүүлэх'}</Text></TouchableOpacity> : null}
    </View>
  );
}
