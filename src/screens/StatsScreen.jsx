import React from 'react';
import { Dimensions, Text, View } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Crown, Flame, Medal, TrendingUp, Trophy } from 'lucide-react-native';
import { getGroupTypeMeta } from '../constants/groupTypes';
import { formatHours } from '../utils/sleep';
import Leaderboard from '../components/Leaderboard';

const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#fff7ed' },
  propsForBackgroundLines: { stroke: '#f1f5f9' },
};

export default function StatsScreen({ userStats, selectedUser, progress, weeklyReport, weeklyTrend = [], completedCount = 0, totalTasks = 0, groupType = 'family', sleepSummary = null, dailyLogs = {}, tasksByMember = {}, memberList = [] }) {
  // Бүлгийн төрлөөс хамаарсан угтвар — "Гэр бүлийн" / "Найзуудын" / "Миний".
  const groupMeta = getGroupTypeMeta(groupType);
  const isSolo = groupMeta.id === 'personal';
  const width = Math.max(Dimensions.get('window').width - 40, 300);
  const sortedUsers = Object.entries(userStats || {})
    .map(([name, stats]) => ({ name, points: stats?.points || 0, streak: stats?.streak || 0, avatar: stats?.avatar }))
    .sort((a, b) => b.points - a.points);
  const selectedStats = sortedUsers.find((item) => item.name === selectedUser) || { points: 0, streak: 0 };
  const trend = weeklyTrend.length ? weeklyTrend : [{ label: '-', rate: 0 }];
  const remaining = Math.max(totalTasks - completedCount, 0);
  const isEmptyStats = totalTasks === 0;
  const pieData = [
    { name: 'Дууссан', population: completedCount, color: '#16a34a', legendFontColor: '#475569', legendFontSize: 12 },
    { name: 'Үлдсэн', population: remaining, color: '#fed7aa', legendFontColor: '#475569', legendFontSize: 12 },
  ];
  if (completedCount === 0 && remaining === 0) pieData[1].population = 1;

  return (
    <View className="px-5 pt-2 pb-32">
      {!isSolo ? <Leaderboard dailyLogs={dailyLogs} tasksByMember={tasksByMember} memberList={memberList} /> : null}
      <View className="mb-5"><Text className="text-[11px] font-black uppercase tracking-widest" style={{ color: '#64748b' }}>{groupMeta.possessive} тойм</Text><Text className="text-2xl font-black" style={{ color: '#1e293b' }}>Статистик</Text></View>

      <View className="bg-gray-950 rounded-[30px] p-5 mb-5 overflow-hidden"><View className="absolute w-44 h-44 rounded-full bg-orange-500/20 -right-16 -top-20" /><View className="flex-row items-center gap-2"><TrendingUp size={17} color="#fdba74" /><Text className="text-orange-200 text-[10px] font-black uppercase">{selectedUser}</Text></View><View className="flex-row items-end justify-between mt-3"><View><Text className="text-white text-5xl font-black">{progress}%</Text><Text className="text-gray-400 text-xs font-semibold mt-1">Өнөөдрийн биелэлт</Text></View><View className="flex-row gap-2"><View className="bg-white/10 rounded-2xl px-3 py-2"><Text className="text-white font-black text-xl">{selectedStats.points}</Text><Text className="text-gray-400 text-[9px] font-black">Оноо</Text></View><View className="bg-white/10 rounded-2xl px-3 py-2"><Text className="text-white font-black text-xl">🔥{selectedStats.streak}</Text><Text className="text-gray-400 text-[9px] font-black">өдөр</Text></View></View></View></View>

      {isEmptyStats ? (
        <View className="bg-white border border-gray-200 rounded-[28px] p-6 mb-5 items-center">
          <Text className="text-3xl mb-2">📊</Text>
          <Text className="font-black text-gray-900 text-base">Одоогоор статистик алга</Text>
          <Text className="text-sm font-semibold text-gray-500 text-center mt-2 leading-5">Анхны дадлаа нэмээд биелүүлснээр энд ахиц гарч ирнэ.</Text>
        </View>
      ) : null}

      <View className="bg-white border border-orange-100 rounded-[28px] p-3 mb-5"><Text className="font-black text-gray-950 text-base px-2 pt-2">7 хоногийн биелэлт</Text><Text className="text-xs font-semibold text-gray-400 px-2 mt-1 mb-2">Өдөр бүрийн заавал хийх дадлын хувь</Text><LineChart data={{ labels: trend.map((item) => item.label), datasets: [{ data: trend.map((item) => item.rate) }] }} width={width - 26} height={220} yAxisSuffix="%" fromZero bezier chartConfig={chartConfig} style={{ borderRadius: 20 }} /></View>

      {!isEmptyStats ? (
        <View className="bg-white border border-gray-200 rounded-[28px] p-3 mb-5"><Text className="font-black text-gray-950 text-base px-2 pt-2">Өнөөдрийн бүтэц</Text><PieChart data={pieData} width={width - 26} height={190} chartConfig={chartConfig} accessor="population" backgroundColor="transparent" paddingLeft="8" absolute /></View>
      ) : null}

      {sleepSummary ? (
        <View className="bg-white border border-green-100 rounded-[28px] p-5 mb-5">
          <Text className="font-black text-gray-950 text-base">😴 30 хоногийн нойр</Text>
          {sleepSummary.nights ? (
            <>
              <Text className="text-xs font-semibold text-gray-500 mt-1">{sleepSummary.nights} шөнө бүртгэсэн · зорилт {sleepSummary.goodRange[0]}-{sleepSummary.goodRange[1]} цаг</Text>
              <View className="flex-row gap-2 mt-4">
                <View className="flex-1 bg-slate-50 rounded-2xl p-3"><Text className="font-black text-gray-900">{formatHours(sleepSummary.average)}</Text><Text className="text-[10px] font-bold text-gray-400 mt-0.5">дундаж</Text></View>
                <View className="flex-1 bg-green-50 rounded-2xl p-3"><Text className="font-black text-green-700">{sleepSummary.goodNights}</Text><Text className="text-[10px] font-bold text-gray-400 mt-0.5">сайн унтсан шөнө</Text></View>
                <View className={`flex-1 rounded-2xl p-3 ${sleepSummary.debt > 0 ? 'bg-orange-50' : 'bg-green-50'}`}><Text className={`font-black ${sleepSummary.debt > 0 ? 'text-orange-700' : 'text-green-700'}`}>{sleepSummary.debt > 0 ? formatHours(sleepSummary.debt) : '0'}</Text><Text className="text-[10px] font-bold text-gray-400 mt-0.5">нойр алдагдал</Text></View>
              </View>
              <Text className="text-xs font-bold text-gray-500 mt-3">{sleepSummary.debt === 0 ? 'Маш сайн нойртой байна 🌿' : sleepSummary.debt <= 5 ? 'Бага зэрэг нойр дутсан — эрт унтахыг хичээгээрэй.' : `Нийт ${formatHours(sleepSummary.debt)} нойр алдсан байна. Орой эрт унтаарай.`}</Text>
            </>
          ) : <Text className="text-xs font-semibold text-gray-500 mt-1">Нүүр хуудсанд унтсан, сэрсэн цагаа оруулахад энд гарна.</Text>}
        </View>
      ) : null}

      {weeklyReport ? <View className="bg-orange-50 border border-orange-100 rounded-3xl p-5 mb-5"><Text className="text-xs font-black text-orange-500 uppercase">{groupMeta.possessive} 7 хоногийн тайлан</Text><Text className="text-4xl font-black text-orange-600 mt-2">{weeklyReport.rate}%</Text><Text className="text-xs font-bold text-gray-600 mt-2">{weeklyReport.completed}/{weeklyReport.possible} заавал хийх дадал дууссан</Text><Text className="text-xs font-bold text-gray-400 mt-1">Хамгийн идэвхтэй: {weeklyReport.bestMemberName}</Text></View> : null}

      <View className="flex-row items-center gap-3 mb-3"><View className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-100 items-center justify-center"><Trophy size={22} color="#f97316" /></View><View><Text className="font-black text-gray-950 text-lg">{isSolo ? 'Миний ахиц' : `${groupMeta.possessive} жагсаалт`}</Text><Text className="text-[11px] font-bold text-gray-400">Оноо ба дараалсан өдрөөр</Text></View></View>

      <View className="gap-3">{sortedUsers.map((item, index) => <View key={item.name} className="bg-white border border-gray-100 rounded-3xl p-4 flex-row items-center"><View className="w-10 items-center">{index === 0 ? <Crown size={24} color="#eab308" fill="#eab308" /> : index < 3 ? <Medal size={22} color={index === 1 ? '#94a3b8' : '#fb923c'} /> : <Text className="font-black text-gray-400">{index + 1}</Text>}</View><View className="w-12 h-12 rounded-2xl bg-orange-50 items-center justify-center ml-2"><Text className="text-2xl">{item.avatar || item.name.substring(0, 1)}</Text></View><View className="flex-1 ml-3"><Text numberOfLines={1} className="font-black text-gray-950">{item.name}</Text><View className="flex-row items-center gap-1 mt-1"><Flame size={12} color="#f97316" /><Text className="text-[10px] font-bold text-gray-400">{item.streak} өдөр дараалан</Text></View></View><View className="items-end"><Text className="text-xl font-black text-orange-600">{item.points}</Text><Text className="text-[9px] font-black text-gray-400">ОНОО</Text></View></View>)}</View>
    </View>
  );
}
