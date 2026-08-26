import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Edit, Save, RotateCcw, Check, Sparkles, Target, Lock, Unlock, CircleCheckBig } from 'lucide-react-native';
import { defaultFamilyRewards, rewardVisuals } from '../data';

export default function RewardsScreen({
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
}) {
  const [rewardNotice, setRewardNotice] = useState('');
  const safeRewards = Array.isArray(familyRewards) && familyRewards.length ? familyRewards : defaultFamilyRewards;
  const activeList = isEditingRewards ? tempRewards : safeRewards;
  const activeData = activeList?.[selectedRewardIdx] || activeList?.[0] || defaultFamilyRewards[0];
  const visual = rewardVisuals[activeData?.id] || rewardVisuals.reward_1;
  const ActiveIcon = visual.icon;
  const progressPct = Math.min(Math.round((totalFamilyPoints / Math.max(activeData?.target || 1, 1)) * 100), 100);
  const remainingPoints = Math.max((activeData?.target || 0) - totalFamilyPoints, 0);
  const remainingHabits = Math.ceil(remainingPoints / 10);
  const isGoalReached = progressPct >= 100;

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
      <View className="flex-row justify-between items-center mb-5"><View><Text className="text-[11px] font-black uppercase text-purple-500 tracking-widest">Reward Journey</Text><Text className="text-2xl font-black text-gray-950">Урамшуулал</Text></View>{canEdit ? <TouchableOpacity onPress={toggleRewardEdit} className={`flex-row items-center gap-2 px-4 py-2 rounded-2xl ${isEditingRewards ? 'bg-emerald-500' : 'bg-white border border-purple-100'}`}>{isEditingRewards ? <Save size={15} color="#fff" /> : <Edit size={15} color="#7c3aed" />}<Text className={`text-xs font-black ${isEditingRewards ? 'text-white' : 'text-purple-600'}`}>{isEditingRewards ? 'Хадгалах' : 'Засах'}</Text></TouchableOpacity> : null}</View>

      <View className="rounded-[30px] p-6 mb-5 overflow-hidden" style={{ backgroundColor: visual.bg }}>
        <View className="absolute w-44 h-44 rounded-full bg-white/10 -right-16 -top-20" />
        {isEditingRewards ? (
          <View className="gap-4"><Text className="text-white text-xl font-black">Сонгосон урамшуулал</Text><TextInput value={activeData?.name || ''} onChangeText={(value) => handleRewardInputChange(selectedRewardIdx, 'name', value)} placeholder="Нэр" placeholderTextColor="#ffffff99" className="bg-black/20 rounded-2xl px-4 py-3 text-white font-black" /><TextInput value={activeData?.desc || ''} onChangeText={(value) => handleRewardInputChange(selectedRewardIdx, 'desc', value)} placeholder="Тайлбар" placeholderTextColor="#ffffff99" className="bg-black/20 rounded-2xl px-4 py-3 text-white font-bold" /><TextInput value={String(activeData?.target || 0)} onChangeText={(value) => handleRewardInputChange(selectedRewardIdx, 'target', value)} keyboardType="numeric" placeholder="Оноо" placeholderTextColor="#ffffff99" className="bg-black/20 rounded-2xl px-4 py-3 text-white font-black" /></View>
        ) : (
          <>
            <View className="flex-row items-start justify-between"><View className="flex-1 pr-4"><View className="flex-row items-center gap-2"><Sparkles size={15} color="#fde047" /><Text className="text-white/75 text-[10px] font-black uppercase">{activeData?.status === 'redeemed' ? 'Ашигласан' : isGoalReached ? 'Нээгдсэн' : 'Дараагийн зорилго'}</Text></View><Text className="text-3xl font-black text-white mt-2 leading-9">{activeData?.name}</Text><Text className="text-white/75 text-xs font-semibold mt-2 leading-5">{activeData?.desc}</Text></View><View className="w-16 h-16 rounded-3xl bg-white/15 items-center justify-center"><ActiveIcon size={31} color="#fff" /></View></View>
            <View className="bg-black/15 rounded-3xl p-4 mt-6"><View className="flex-row justify-between items-end"><View><Text className="text-white/60 text-[10px] font-black uppercase">Гэр бүлийн оноо</Text><Text className="text-white text-4xl font-black">{totalFamilyPoints}</Text></View><Text className="text-white text-2xl font-black">{progressPct}%</Text></View><View className="h-4 bg-black/30 rounded-full overflow-hidden mt-3"><View className="h-4 rounded-full" style={{ width: `${progressPct}%`, backgroundColor: visual.bar }} /></View><Text className="text-white/80 text-xs font-black mt-3">{activeData?.status === 'redeemed' ? '✅ Энэ урамшууллыг ашигласан' : isGoalReached ? '🎉 Урамшуулал нээгдлээ!' : `Дахин ойролцоогоор ${remainingHabits} дадал биелүүлэхэд нээгдэнэ`}</Text>{canEdit && isGoalReached ? <TouchableOpacity onPress={() => onRedeemReward?.(activeData?.id)} className="mt-4 bg-white/20 border border-white/20 rounded-2xl py-3 items-center"><Text className="text-white font-black">{activeData?.status === 'redeemed' ? 'Ашиглаагүй болгох' : 'Урамшууллаа авах'}</Text></TouchableOpacity> : null}</View>
          </>
        )}
      </View>

      <View className="flex-row items-center gap-2 mb-3"><Target size={18} color="#7c3aed" /><Text className="text-lg font-black text-gray-950">Бүх урамшуулал</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 10 }}>
        {activeList.map((reward, index) => {
          const itemVisual = rewardVisuals[reward.id] || rewardVisuals.reward_1;
          const ItemIcon = itemVisual.icon;
          const unlocked = totalFamilyPoints >= Number(reward.target || 0);
          const redeemed = reward.status === 'redeemed';
          const itemProgress = Math.min(Math.round((totalFamilyPoints / Math.max(Number(reward.target || 1), 1)) * 100), 100);
          return <TouchableOpacity key={reward.id || index} onPress={() => setSelectedRewardIdx(index)} className="border rounded-[26px] p-4 overflow-hidden" style={{ width: 190, minHeight: 190, backgroundColor: selectedRewardIdx === index ? itemVisual.tabBg : '#fff', borderColor: selectedRewardIdx === index ? itemVisual.tabColor : '#e5e7eb', opacity: unlocked || isEditingRewards ? 1 : 0.48 }}><View className="flex-row items-center justify-between"><View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: itemVisual.bg }}><ItemIcon size={23} color="#fff" /></View>{redeemed ? <CircleCheckBig size={22} color="#16a34a" /> : unlocked ? <Unlock size={21} color="#7c3aed" /> : <Lock size={21} color="#94a3b8" />}</View><Text numberOfLines={2} className="font-black text-gray-950 text-base mt-4 leading-5">{reward.name}</Text><Text className="text-[10px] font-bold text-gray-400 mt-2">{totalFamilyPoints}/{reward.target} оноо</Text><View className="h-2 bg-black/5 rounded-full mt-3 overflow-hidden"><View className="h-2 rounded-full" style={{ width: `${itemProgress}%`, backgroundColor: itemVisual.bar }} /></View>{!unlocked && !isEditingRewards ? <Text className="text-[10px] font-black text-gray-500 mt-3">🔒 {Math.ceil(Math.max(Number(reward.target || 0) - totalFamilyPoints, 0) / 10)} дадал дутуу</Text> : null}</TouchableOpacity>;
        })}
      </ScrollView>

      <View className="bg-purple-50 border border-purple-100 rounded-3xl p-4 mt-4"><Text className="text-xs font-semibold text-purple-700 leading-5">Бүх гишүүний оноо нийлж урамшуулал нээнэ. Locked картууд бүдгэрч харагдана.</Text></View>

      {rewardNotice ? <Text className="text-xs font-bold text-red-500 mt-3 leading-5">{rewardNotice}</Text> : null}

      {isEditingRewards ? <TouchableOpacity onPress={handleResetPoints} className={`mt-5 w-full py-4 rounded-3xl items-center flex-row justify-center gap-2 ${showResetConfirm ? 'bg-red-500' : 'bg-white border border-red-100'}`}>{showResetConfirm ? <Check size={20} color="#fff" /> : <RotateCcw size={20} color="#ef4444" />}<Text className={`font-black ${showResetConfirm ? 'text-white' : 'text-red-500'}`}>{showResetConfirm ? 'Тийм, оноог тэглэх' : 'Шинэ сар эхлүүлэх'}</Text></TouchableOpacity> : null}
    </View>
  );
}
