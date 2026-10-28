import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';

// Хөвж орж ирдэг, дарахад жижиг "шахагддаг" карт (ppm32.mn-ийн лого шиг):
// зөөлөн сүүдэр + доор нь бүдэг сүүдрийн зураас. Сонгогдоход бага зэрэг
// өргөгдөнө. Reanimated-ийг төсөлд зориуд унтраасан тул (babel.config.js)
// React Native-ийн Animated API ашиглав.
export default function FloatCard({ index = 0, selected = false, onPress, disabled, style, className = '', children, accessibilityLabel }) {
  const enter = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(enter, { toValue: 1, delay: index * 60, friction: 7, tension: 60, useNativeDriver: true }).start();
  }, [enter, index]);

  useEffect(() => {
    Animated.spring(lift, { toValue: selected ? 1 : 0, friction: 6, useNativeDriver: true }).start();
  }, [lift, selected]);

  // Дарах үйлдэлгүй карт нь энгийн View — эс бөгөөс доторх товчнуудын даралтыг булаана.
  const Container = onPress ? Pressable : View;
  const pressTo = (value) => Animated.spring(press, { toValue: value, friction: 5, tension: 200, useNativeDriver: true }).start();

  const translateY = Animated.add(
    enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
    lift.interpolate({ inputRange: [0, 1], outputRange: [0, -4] })
  );

  return (
    <Animated.View style={{ opacity: enter, transform: [{ translateY }, { scale: press }] }}>
      <Container
        {...(onPress ? {
          onPress,
          disabled,
          onPressIn: () => pressTo(0.97),
          onPressOut: () => pressTo(1),
          accessibilityRole: 'button',
          accessibilityState: { selected },
        } : {})}
        accessibilityLabel={accessibilityLabel}
        className={className}
        style={[
          {
            backgroundColor: selected ? '#f0fdf4' : '#fff',
            borderWidth: 1,
            borderColor: selected ? '#16a34a' : '#eef0f3',
            borderRadius: 26,
            shadowColor: '#0f172a',
            shadowOpacity: selected ? 0.12 : 0.06,
            shadowRadius: selected ? 18 : 12,
            shadowOffset: { width: 0, height: selected ? 10 : 6 },
            elevation: selected ? 6 : 3,
          },
          style,
        ]}
      >
        {children}
      </Container>
      {/* Доод бүдэг сүүдрийн зураас — картыг "хөвж" байгаа мэт харагдуулна */}
      <View pointerEvents="none" style={{ alignSelf: 'center', width: '40%', height: 6, borderRadius: 6, backgroundColor: '#0f172a', opacity: 0.05, marginTop: 6 }} />
    </Animated.View>
  );
}
