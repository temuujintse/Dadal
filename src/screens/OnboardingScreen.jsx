import React, { useRef, useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, Animated } from 'react-native';
import LottieView from 'lottie-react-native';
import { CalendarCheck, CircleCheckBig, Gift, Utensils, ArrowRight } from 'lucide-react-native';

const slides = [
  {
    eyebrow: 'Өдөр тутмын дадал',
    title: 'Өдөр бүрийн жижиг ялалтаа бүтээ',
    desc: 'Өнөөдрийн хийх зүйлсээ нэг дор харж, баруун тийш шудраад шууд дуусгана.',
    Icon: CircleCheckBig,
    accent: '#f97316',
    soft: '#fff7ed',
    animation: require('../../assets/lottie/habits.json'),
  },
  {
    eyebrow: 'Хоолны төлөвлөгөө',
    title: 'Долоо хоногийн хоолоо амархан төлөвлө',
    desc: 'Өглөө, өдөр, оройн хоолыг өдөр бүрээр нь гүйлгэж хараад хамтдаа тохирно.',
    Icon: Utensils,
    accent: '#f97316',
    soft: '#fff7ed',
    animation: require('../../assets/lottie/meals.json'),
  },
  {
    eyebrow: 'Урамшуулал',
    title: 'Оноогоо зорилго болго',
    desc: 'Дадал бүр оноо нэмнэ. Ахицын мөр дүүрэх тусам урамшуулал нээгдэнэ.',
    Icon: Gift,
    accent: '#f97316',
    soft: '#fff7ed',
    animation: require('../../assets/lottie/rewards.json'),
  },
  {
    eyebrow: '30 хоногийн хөтөлбөр',
    title: 'Нэг сарын аялал болгон хөтөлнө',
    desc: 'Апп 30 хоногийн мөчлөгөөр явна. Өдөр бүр дадлаа чагтлан оноо цуглуулж, сарын эцэст дүнгээ хараад урамшуулалаа авна. Дараа нь шинэ мөчлөг эхэлж, өмнөх сар архивт хадгалагдана.',
    Icon: CalendarCheck,
    accent: '#f97316',
    soft: '#fff7ed',
    animation: require('../../assets/lottie/habits.json'),
  },
];

export default function OnboardingScreen({ onFinish }) {
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const slide = slides[index];
  const SlideIcon = slide.Icon;
  const isLast = index === slides.length - 1;

  const goTo = (nextIndex) => {
    Animated.timing(fade, { toValue: 0, duration: 130, useNativeDriver: true }).start(() => {
      setIndex(nextIndex);
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
  };

  const next = () => {
    if (isLast) onFinish?.();
    else goTo(index + 1);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#fffaf5]">
      <View className="pt-3 px-6 flex-row justify-between items-center">
        <Text className="text-[11px] font-black uppercase text-orange-500 tracking-widest">Family Habit</Text>
        <TouchableOpacity onPress={onFinish} className="px-4 py-2 rounded-full bg-white border border-orange-100">
          <Text className="text-xs font-black text-gray-500">Алгасах</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={{ opacity: fade }} className="flex-1 justify-center px-6">
        <View className="items-center">
          <View className="w-[250px] h-[250px] items-center justify-center mb-5">
            <LottieView source={slide.animation} autoPlay loop style={{ width: 250, height: 250 }} />
            <View className="absolute w-24 h-24 rounded-[32px] items-center justify-center" style={{ backgroundColor: slide.accent }}>
              <SlideIcon size={46} color="#fff" strokeWidth={2.4} />
            </View>
          </View>

          <Text className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: slide.accent }}>{slide.eyebrow}</Text>
          <Text className="text-[32px] font-black text-gray-950 text-center leading-[38px]">{slide.title}</Text>
          <Text className="text-[15px] font-semibold text-gray-500 text-center mt-4 leading-6 px-2">{slide.desc}</Text>
        </View>
      </Animated.View>

      <View className="pb-6 px-6">
        <View className="flex-row justify-center gap-2 mb-6">
          {slides.map((item, i) => (
            <TouchableOpacity key={item.title} onPress={() => goTo(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View className="h-2 rounded-full" style={{ width: i === index ? 30 : 8, backgroundColor: i === index ? slide.accent : '#fed7aa' }} />
            </TouchableOpacity>
          ))}
        </View>
        <View className="px-4">
          <TouchableOpacity
            onPress={next}
            activeOpacity={0.85}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Эхлэх' : 'Дараах'}
            className="py-4 rounded-3xl items-center flex-row justify-center gap-2 shadow-sm"
            style={{ backgroundColor: slide.accent, minHeight: 52 }}
          >
            <Text className="text-white font-black text-base">{isLast ? 'Эхлэх' : 'Дараах'}</Text>
            <ArrowRight size={19} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
