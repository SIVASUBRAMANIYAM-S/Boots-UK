import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';

type AdvantageCardBannerProps = {
  loyaltyPoints: number | null;
  onViewCard: () => void;
};

export const AdvantageCardBanner = memo(function AdvantageCardBanner({
  loyaltyPoints,
  onViewCard,
}: AdvantageCardBannerProps) {
  const subtitle =
    loyaltyPoints === null
      ? 'Collect points every time you shop'
      : `You have ${loyaltyPoints.toLocaleString('en-GB')} ${loyaltyPoints === 1 ? 'point' : 'points'}`;

  return (
    <View style={styles.outer}>
      <View style={styles.innerGlow} />
      <View style={styles.innerGlowSmall} />
      <Text style={styles.cardEmoji}>💳</Text>
      <Text style={styles.title}>Boots Advantage Card</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Pressable
        onPress={onViewCard}
        accessibilityRole="button"
        accessibilityLabel="View Advantage Card"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonLabel}>View Card</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  outer: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: 'hidden',
    padding: 20,
  },
  innerGlow: {
    backgroundColor: Colors.accent,
    borderRadius: 140,
    height: 280,
    opacity: 0.85,
    position: 'absolute',
    right: -110,
    top: -90,
    width: 280,
  },
  innerGlowSmall: {
    backgroundColor: Colors.accent,
    borderRadius: 60,
    bottom: -70,
    height: 120,
    opacity: 0.4,
    position: 'absolute',
    right: 90,
    width: 120,
  },
  cardEmoji: {
    fontSize: 26,
  },
  title: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitle: {
    color: Colors.white,
    fontSize: 15,
    marginTop: 4,
    opacity: 0.92,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: 18,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  pressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
