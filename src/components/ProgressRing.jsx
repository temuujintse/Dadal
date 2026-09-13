import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

// Дугуй ахицын үзүүлэлт. Өмнө нь шулуун полос + том тоо хослуулж байсныг
// сольсон — ринг нь "хэдэн хувь дуусав" гэдгийг НЭГ харцаар илүү тод
// мэдрүүлдэг (шулуун полос нь ихэвчлэн текстийн доор нуугдаж анзаарагддаггүй
// байв). `react-native-svg` аль хэдийн суусан тул шинэ сан нэмээгүй.
// Ахицаас хамаарч өнгө нь өөрчлөгдөнө (PLAN_V2 §2.1.4):
//   0-39%   цэнхэр  — "дөнгөж эхэлж байна"
//   40-79%  зөөлөн улбар шар — "явцдаа орлоо"
//   80-100% дүүрэн улбар шар — "бараг/бүрэн дуусав"
// Ингэснээр тоо уншихгүйгээр зөвхөн өнгөөр нь өдрийн байдлаа мэдэрнэ.
export const progressColor = (progress) => {
  const value = Math.max(0, Math.min(100, Number(progress) || 0));
  if (value < 40) return '#3b82f6';
  if (value < 80) return '#fb923c';
  return '#f97316';
};

export default function ProgressRing({
  progress = 0,
  size = 104,
  strokeWidth = 10,
  trackColor = 'rgba(255,255,255,0.12)',
  // fillColor дамжуулаагүй бол ахицаас хамаарч автоматаар сонгоно.
  fillColor,
  children,
}) {
  const clamped = Math.max(0, Math.min(100, progress));
  const stroke = fillColor || progressColor(clamped);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={center} cy={center} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </Svg>
      {children}
    </View>
  );
}
