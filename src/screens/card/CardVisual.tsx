import { memo, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { formatCardNumber, formatMemberSince } from '@/utils/cardUtils';

type CardVisualProps = {
  loyaltyPoints: number;
  cardNumber: string | null;
  memberSince: string | null;
};

const COUNT_UP_DURATION_MS = 1100;
const NAVY = '#0a1628';

/** Counts up from 0 to `target` and returns the live value to render as text. */
function useCountUp(target: number): number {
  const animated = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const listenerId = animated.addListener(({ value }) => setDisplayValue(Math.round(value)));
    animated.setValue(0);
    Animated.timing(animated, {
      toValue: target,
      duration: COUNT_UP_DURATION_MS,
      useNativeDriver: false,
    }).start();
    return () => animated.removeListener(listenerId);
  }, [animated, target]);

  return displayValue;
}

export const CardVisual = memo(function CardVisual({ loyaltyPoints, cardNumber, memberSince }: CardVisualProps) {
  const displayPoints = useCountUp(loyaltyPoints);

  return (
    <View
      style={styles.outer}
      accessible
      accessibilityLabel={`Boots Advantage Card, ${loyaltyPoints.toLocaleString('en-GB')} points`}
    >
      <View style={styles.glow} pointerEvents="none" />
      <View style={styles.shine} pointerEvents="none" />

      <View style={styles.topRow}>
        <Text style={styles.logo}>boots</Text>
        <Text style={styles.cardTypeLabel}>advantage card</Text>
      </View>

      <View style={styles.pointsBlock}>
        <Text style={styles.pointsValue}>{displayPoints.toLocaleString('en-GB')}</Text>
        <Text style={styles.pointsLabel}>POINTS</Text>
      </View>

      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.metaLabel}>CARD NUMBER</Text>
          <Text style={styles.metaValue}>{formatCardNumber(cardNumber)}</Text>
        </View>
        <View style={styles.metaColumnRight}>
          <Text style={styles.metaLabel}>MEMBER SINCE</Text>
          <Text style={styles.metaValueSmall}>{formatMemberSince(memberSince)}</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  outer: {
    backgroundColor: NAVY,
    borderRadius: 20,
    boxShadow: '0 10px 24px rgba(0, 94, 184, 0.4)',
    height: 200,
    marginHorizontal: 20,
    overflow: 'hidden',
    padding: 20,
  },
  glow: {
    backgroundColor: Colors.primary,
    borderRadius: 130,
    height: 260,
    opacity: 0.3,
    position: 'absolute',
    right: -110,
    top: -110,
    width: 260,
  },
  shine: {
    backgroundColor: Colors.white,
    height: 400,
    left: '55%',
    opacity: 0.05,
    position: 'absolute',
    top: -100,
    transform: [{ rotate: '35deg' }],
    width: 60,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logo: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '800',
  },
  cardTypeLabel: {
    color: Colors.white,
    fontSize: 11,
    letterSpacing: 2,
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  pointsBlock: {
    alignItems: 'center',
    marginTop: 6,
  },
  pointsValue: {
    color: Colors.white,
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1,
  },
  pointsLabel: {
    color: Colors.white,
    fontSize: 12,
    letterSpacing: 4,
    marginTop: -4,
    opacity: 0.6,
    textTransform: 'uppercase',
  },
  bottomRow: {
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 20,
    position: 'absolute',
    right: 20,
  },
  metaColumnRight: {
    alignItems: 'flex-end',
  },
  metaLabel: {
    color: Colors.white,
    fontSize: 10,
    opacity: 0.5,
  },
  metaValue: {
    color: Colors.white,
    fontSize: 15,
    letterSpacing: 2,
    marginTop: 2,
  },
  metaValueSmall: {
    color: Colors.white,
    fontSize: 13,
    marginTop: 2,
  },
});
