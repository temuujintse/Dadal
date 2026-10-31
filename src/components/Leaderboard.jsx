import React, { useMemo, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Target, Trophy, Crown } from 'lucide-react-native';
import { LEADERBOARD_PERIODS, computeLeaderboard } from '../utils/leaderboard';
import { BRAND_BLUE } from '../constants/theme';

// Байр бүрийн өнгө (зурган загвар шиг ягаан, цэнхэр, ...).
const RANK_COLORS = ['#ec4899', '#06b6d4', '#8b5cf6', '#f97316', '#16a34a', '#eab308'];

function SummaryCard({ icon: Icon, tint, bg, value, label }) {
  return (
    <View className="flex-1 bg-white rounded-3xl p-3.5 overflow-hidden" style={{ shadowColor: '#0f172a', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
      <View style={{ position: 'absolute', right: -10, top: -6, opacity: 0.08 }}><Icon size={64} color={tint} /></View>
      <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: bg }}><Icon size={18} color={tint} /></View>
      <Text className="text-xl font-black text-gray-950 mt-3" numberOfLines={1}>{value}</Text>
      <Text className="text-[10px] font-bold text-gray-500 mt-0.5" numberOfLines={1}>{label}</Text>
    </View>
  );
}

export default function Leaderboard({ dailyLogs, tasksByMember, memberList = [] }) {
  const [periodId, setPeriodId] = useState('week');
  const board = useMemo(
    () => computeLeaderboard({ periodId, dailyLogs, tasksByMember, memberList }),
    [periodId, dailyLogs, tasksByMember, memberList]
  );
  const maxPoints = Math.max(1, ...board.rows.map((row) => row.points));

  return (
    <View className="mb-6">
      <View className="flex-row items-center gap-2">
        <Trophy size={26} color="#f97316" />
        <Text className="text-2xl font-black text-gray-950">Тэргүүлэгчид</Text>
      </View>
      <Text className="text-xs font-semibold text-gray-500 mt-1 mb-4">Гэр бүлийнхээ ахицыг хамтдаа тэмдэглэе!</Text>

      <View className="bg-white rounded-2xl p-1 flex-row border border-gray-100 mb-4">
        {LEADERBOARD_PERIODS.map((period) => {
          const selected = period.id === periodId;
          return (
            <TouchableOpacity key={period.id} onPress={() => setPeriodId(period.id)} accessibilityRole="tab" accessibilityState={{ selected }} className="flex-1 py-2.5 rounded-xl items-center" style={{ backgroundColor: selected ? '#f97316' : 'transparent' }}>
              <Text className="text-xs font-black" style={{ color: selected ? '#fff' : '#64748b' }}>{period.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View className="flex-row gap-2.5 mb-4">
        <SummaryCard icon={Trophy} tint="#8b5cf6" bg="#ede9fe" value={board.totalPoints} label="Цуглуулсан оноо" />
        <SummaryCard icon={Target} tint="#f59e0b" bg="#fef3c7" value={`${board.completionRate}%`} label="Биелэлт" />
        <SummaryCard icon={Crown} tint="#ec4899" bg="#fce7f3" value={board.top?.name || '—'} label="Тэргүүлэгч" />
      </View>

      <View className="bg-white rounded-[28px] p-5" style={{ shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
        <View className="flex-row items-center gap-2 mb-4">
          <Target size={20} color="#f97316" />
          <Text className="text-base font-black text-gray-950">Гэр бүлийн байр</Text>
        </View>
        {board.rows.length ? board.rows.map((row, index) => {
          const color = RANK_COLORS[index % RANK_COLORS.length];
          return (
            <View key={row.uid} className="flex-row items-center gap-3 mb-5">
              <View className="w-11 h-11 rounded-2xl items-center justify-center overflow-hidden" style={{ backgroundColor: color }}>
                {row.photo ? <Image source={{ uri: row.photo }} style={{ width: 44, height: 44 }} /> : <Text className="text-white text-base font-black">{index + 1}</Text>}
              </View>
              <View className="flex-1">
                <View className="flex-row justify-between items-baseline">
                  <Text className="text-sm font-black text-gray-900" numberOfLines={1}>{index === 0 && row.points > 0 ? '👑 ' : ''}{row.name}</Text>
                  <Text className="text-[11px] font-black" style={{ color: BRAND_BLUE }}>{row.points} оноо</Text>
                </View>
                <View className="h-2.5 rounded-full mt-1.5 overflow-hidden" style={{ backgroundColor: '#fdf2ec' }}>
                  <View className="h-2.5 rounded-full" style={{ width: `${Math.round((row.points / maxPoints) * 100)}%`, backgroundColor: color }} />
                </View>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-[10px] font-bold text-gray-500"><Text style={{ color }}>● </Text>{row.rate}% биелсэн</Text>
                  <Text className="text-[10px] font-bold text-gray-400">Зорилго: {row.goal} дадал</Text>
                </View>
              </View>
            </View>
          );
        }) : <Text className="text-xs font-semibold text-gray-400">Гишүүд алга байна.</Text>}
      </View>
    </View>
  );
}
