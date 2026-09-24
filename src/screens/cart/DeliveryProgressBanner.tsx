import { memo, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { FREE_DELIVERY_THRESHOLD } from '@/constants/checkout';
import { Colors } from '@/constants/colors';
import { formatUKPrice } from '@/utils/orderUtils';

type DeliveryProgressBannerProps = {
  subtotal: number;
};

export const DeliveryProgressBanner = memo(function DeliveryProgressBanner({
  subtotal,
}: DeliveryProgressBannerProps) {
  const ratio = Math.min(1, subtotal / FREE_DELIVERY_THRESHOLD);
  const hasFreeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: ratio, duration: 500, useNativeDriver: false }).start();
  }, [progress, ratio]);

  if (hasFreeDelivery) {
    return (
      <View style={[styles.card, styles.unlocked]} accessibilityRole="summary">
        <Text style={styles.unlockedText}>✅ You&apos;ve unlocked FREE delivery!</Text>
      </View>
    );
  }

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const remaining = FREE_DELIVERY_THRESHOLD - subtotal;

  return (
    <LinearGradient
      colors={[Colors.primary, Colors.accent]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <Text style={styles.text} accessibilityRole="summary">
        🎉 You&apos;re {formatUKPrice(remaining)} away from FREE delivery!
      </Text>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
      >
        <Animated.View style={[styles.fill, { width }]} />
      </View>
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
  },
  text: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  track: {
    backgroundColor: Colors.lightBlue,
    borderRadius: 5,
    height: 10,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: Colors.primary,
    borderRadius: 5,
    height: '100%',
  },
  unlocked: {
    backgroundColor: '#e6f6ec',
    borderColor: Colors.success,
    borderWidth: 1,
  },
  unlockedText: {
    color: Colors.success,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
