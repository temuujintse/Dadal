import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Text, View } from 'react-native';

const symbols = ['●', '■', '▲', '★', '◆'];
const palette = ['#f97316', '#facc15', '#22c55e', '#38bdf8', '#a855f7', '#fb7185'];

export default function ConfettiBurst({ active }) {
  const progress = useRef(new Animated.Value(0)).current;
  const width = Dimensions.get('window').width;
  const particles = useMemo(() => Array.from({ length: 22 }, (_, index) => ({
    id: index,
    x: ((index * 67) % Math.max(width - 40, 240)) - (width / 2) + 20,
    y: 170 + ((index * 43) % 260),
    rotate: 180 + ((index * 71) % 420),
    symbol: symbols[index % symbols.length],
    color: palette[index % palette.length],
    delay: (index % 6) * 25,
  })), [width]);

  useEffect(() => {
    if (!active) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 1050,
      useNativeDriver: true,
    }).start();
  }, [active, progress]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000, overflow: 'hidden' }}>
      {particles.map((particle) => {
        const localProgress = progress.interpolate({
          inputRange: [0, Math.min(particle.delay / 1050, 0.3), 1],
          outputRange: [0, 0, 1],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={particle.id}
            style={{
              position: 'absolute',
              top: 90,
              left: width / 2,
              opacity: localProgress.interpolate({ inputRange: [0, 0.12, 0.78, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: localProgress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.x] }) },
                { translateY: localProgress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.y] }) },
                { rotate: localProgress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${particle.rotate}deg`] }) },
                { scale: localProgress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.2, 1, 0.75] }) },
              ],
            }}
          >
            <Text style={{ color: particle.color, fontSize: 14, fontWeight: '900' }}>{particle.symbol}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}
