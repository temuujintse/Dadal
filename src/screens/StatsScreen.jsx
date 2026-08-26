import React from 'react';
import { Dimensions, Text, View } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Crown, Flame, Medal, TrendingUp, Trophy } from 'lucide-react-native';

const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#fff7ed' },
  propsForBackgroundLines: { stroke: '#f1f5f9' },
};

export default function StatsScreen({ userStats, selectedUser, progress, weeklyReport, weeklyTrend = [], completedCount = 0, totalTasks = 0 }) {
  const width = Math.max(Dimensions.get('window').width - 40, 300);
  const sortedUsers = Object.entries(userStats || {})
    .map(([name, stats]) => ({ name, points: stats?.points || 0, streak: stats?.streak || 0, avatar: stats?.avatar }))
    .sort((a, b) => b.points - a.points);
  const selectedStats = sortedUsers.find((item) => item.name === selectedUser) || { points: 0, streak: 0 };
  const trend = weeklyTrend.length ? weeklyTrend : [{ label: '-', rate: 0 }];
  const remaining = Math.max(totalTasks - completedCount, 0);
  const pieData = [
    { name: 'Дууссан', population: completedCount, color: '#22c55e', legendFontColor: '#475569', legendFontSize: 12 },
    { name: 'Үлдсэн', population: remaining, color: '#fed7aa', legendFontColor: '#475569', legendFontSize: 12 },
  ];
  if (completedCount === 0 && remaining === 0) pieData[1].population = 1;

  return (
    <View className="px-5 pt-2 pb-32">
      <View className="mb-5"><Text className="text-[11px] font-black uppercase text-orange-500 tracking-widest">Family Insights</Text><Text className="text-2xl font-black text-gray-950">Статистик</Text></View>

      <View className="bg-gray-950 rounded-[30px] p-5 mb-5 overflow-hidden"><View className="absolute w-44 h-44 rounded-full bg-orange-500/20 -right-16 -top-20" /><View className="flex-row items-center gap-2"><TrendingUp size={17} color="#fdba74" /><Text className="text-orange-200 text-[10px] font-black uppercase">{selectedUser}</Text></View><View className="flex-row items-end justify-between mt-3"><View><Text className="text-white text-5xl font-black">{progress}%</Text><Text className="text-gray-400 text-xs font-semibold mt-1">Өнөөдрийн биелэлт</Text></View><View className="flex-row gap-2"><View className="bg-white/10 rounded-2xl px-3 py-2"><Text className="text-white font-black text-xl">{selectedStats.points}</Text><Text className="text-gray-400 text-[9px] font-black">ОНОО</Text></View><View className="bg-white/10 rounded-2xl px-3 py-2"><Text className="text-white font-black text-xl">🔥{selectedStats.streak}</Text><Text className="text-gray-400 text-[9px] font-black">STREAK</Text></View></View></View></View>

      <View className="bg-white border border-orange-100 rounded-[28px] p-3 mb-5"><Text className="font-black text-gray-950 text-base px-2 pt-2">7 хоногийн биелэлт</Text><Text className="text-xs font-semibold text-gray-400 px-2 mt-1 mb-2">Өдөр бүрийн required дадлын хувь</Text><LineChart data={{ labels: trend.map((item) => item.label), datasets: [{ data: trend.map((item) => item.rate) }] }} width={width - 26} height={220} yAxisSuffix="%" fromZero bezier chartConfig={chartConfig} style={{ borderRadius: 20 }} /></View>

      <View className="bg-white border border-emerald-100 rounded-[28px] p-3 mb-5"><Text className="font-black text-gray-950 text-base px-2 pt-2">Өнөөдрийн бүтэц</Text><PieChart data={pieData} width={width - 26} height={190} chartConfig={chartConfig} accessor="population" backgroundColor="transparent" paddingLeft="8" absolute /></View>

      {weeklyReport ? <View className="bg-orange-50 border border-orange-100 rounded-3xl p-5 mb-5"><Text className="text-xs font-black text-orange-500 uppercase">Гэр бүлийн 7 хоногийн тайлан</Text><Text className="text-4xl font-black text-orange-600 mt-2">{weeklyReport.rate}%</Text><Text className="text-xs font-bold text-gray-600 mt-2">{weeklyReport.completed}/{weeklyReport.possible} required дадал дууссан</Text><Text className="text-xs font-bold text-gray-400 mt-1">Хамгийн идэвхтэй: {weeklyReport.bestMemberName}</Text></View> : null}

      <View className="flex-row items-center gap-3 mb-3"><View className="w-11 h-11 rounded-2xl bg-yellow-50 items-center justify-center"><Trophy size={22} color="#eab308" /></View><View><Text className="font-black text-gray-950 text-lg">Гэр бүлийн жагсаалт</Text><Text className="text-[11px] font-bold text-gray-400">Оноо ба дараалсан өдрөөр</Text></View></View>

      <View className="gap-3">{sortedUsers.map((item, index) => <View key={item.name} className="bg-white border border-gray-100 rounded-3xl p-4 flex-row items-center"><View className="w-10 items-center">{index === 0 ? <Crown size={24} color="#eab308" fill="#eab308" /> : index < 3 ? <Medal size={22} color={index === 1 ? '#94a3b8' : '#fb923c'} /> : <Text className="font-black text-gray-400">{index + 1}</Text>}</View><View className="w-12 h-12 rounded-2xl bg-orange-50 items-center justify-center ml-2"><Text className="text-2xl">{item.avatar || item.name.substring(0, 1)}</Text></View><View className="flex-1 ml-3"><Text numberOfLines={1} className="font-black text-gray-950">{item.name}</Text><View className="flex-row items-center gap-1 mt-1"><Flame size={12} color="#f97316" /><Text className="text-[10px] font-bold text-gray-400">{item.streak} өдөр дараалан</Text></View></View><View className="items-end"><Text className="text-xl font-black text-orange-600">{item.points}</Text><Text className="text-[9px] font-black text-gray-400">ОНОО</Text></View></View>)}</View>
    </View>
  );
}
