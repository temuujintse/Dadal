import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle, Ellipse } from 'react-native-svg';

// "3D" mood товч: радиал градиенттай бөмбөлөг + дээд гэрэл тусгал + сүүдэр,
// дотор нь том emoji. Сонгогдоход пүрш шиг томорч, бусад нь бүдгэрнэ.
export default function MoodBubble({ mood, selected, dimmed, onPress, size = 64 }) {
  const scale = useRef(new Animated.Value(selected ? 1.12 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: selected ? 1.12 : 1, friction: 4, tension: 120, useNativeDriver: true }).start();
  }, [scale, selected]);

  const r = size / 2;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.92, friction: 5, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: selected ? 1.12 : 1, friction: 4, useNativeDriver: true }).start()}
      accessibilityRole="button"
      accessibilityLabel={`Сэтгэл зүй: ${mood.label}`}
      accessibilityState={{ selected }}
      className="items-center"
    >
      <Animated.View
        style={{
          width: size,
          height: size,
          opacity: dimmed ? 0.45 : 1,
          transform: [{ scale }],
          shadowColor: mood.shadow,
          shadowOpacity: selected ? 0.45 : 0.18,
          shadowRadius: selected ? 14 : 8,
          shadowOffset: { width: 0, height: selected ? 8 : 4 },
          elevation: selected ? 8 : 3,
        }}
      >
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Defs>
            <RadialGradient id={`g_${mood.id}`} cx="35%" cy="30%" r="75%">
              <Stop offset="0" stopColor={mood.light} />
              <Stop offset="1" stopColor={mood.dark} />
            </RadialGradient>
          </Defs>
          <Circle cx={r} cy={r} r={r} fill={`url(#g_${mood.id})`} />
          {/* Дээд гэрлийн тусгал — бөмбөлгийг гүдгэр харагдуулна */}
          <Ellipse cx={r * 0.72} cy={r * 0.5} rx={r * 0.42} ry={r * 0.22} fill="#ffffff" opacity={0.35} />
        </Svg>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: size * 0.55, textShadowColor: 'rgba(0,0,0,0.18)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3 }}>{mood.emoji}</Text>
        </View>
      </Animated.View>
      <Text className="text-[11px] font-black mt-2" style={{ color: selected ? mood.dark : '#94a3b8' }}>{mood.label}</Text>
    </Pressable>
  );
}
