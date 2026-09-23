import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type DimensionValue } from 'react-native';

import { Colors } from '@/constants/colors';

/** One shared pulse so every box on a screen animates in sync. */
export function useSkeletonPulse(): Animated.Value {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return opacity;
}

type SkeletonBoxProps = {
  opacity: Animated.Value;
  width: DimensionValue;
  height: DimensionValue;
  radius?: number;
};

export function SkeletonBox({ opacity, width, height, radius = 12 }: SkeletonBoxProps) {
  return <Animated.View style={[styles.box, { opacity, width, height, borderRadius: radius }]} />;
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: Colors.skeleton,
  },
});
