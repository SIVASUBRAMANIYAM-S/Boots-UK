import { memo, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { getPointsValue, getTierInfo, type TierInfo } from '@/services/loyaltyService';
import { calculatePointsToNextPound } from '@/utils/cardUtils';

type PointsSummaryCardsProps = {
  loyaltyPoints: number;
};

const TIER_BACKGROUND: Readonly<Record<TierInfo['tier'], string>> = {
  member: Colors.lightGrey,
  silver: '#fff8e7',
  gold: Colors.lightBlue,
};

function AnimatedProgressBar({ progress, trackColor, fillColor }: { progress: number; trackColor: string; fillColor: string }) {
  const animated = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animated, { toValue: progress, duration: 600, useNativeDriver: false }).start();
  }, [animated, progress]);

  const width = animated.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={[styles.track, { backgroundColor: trackColor }]}>
      <Animated.View style={[styles.fill, { width, backgroundColor: fillColor }]} />
    </View>
  );
}

export const PointsSummaryCards = memo(function PointsSummaryCards({ loyaltyPoints }: PointsSummaryCardsProps) {
  const pointsValue = getPointsValue(loyaltyPoints);
  const pointsToNextPound = calculatePointsToNextPound(loyaltyPoints);
  const pointsValueProgress = (loyaltyPoints % 400) / 400;

  const tierInfo = getTierInfo(loyaltyPoints);
  const tierBackground = TIER_BACKGROUND[tierInfo.tier];

  return (
    <View style={styles.row}>
      <View style={[styles.card, styles.pointsValueCard]}>
        <Text style={styles.cardHeading}>💰 Points Value</Text>
        <Text style={styles.pointsValueText}>£{pointsValue}</Text>
        <Text style={styles.caption}>(400 points = £1)</Text>
        <AnimatedProgressBar progress={pointsValueProgress} trackColor="rgba(0, 94, 184, 0.15)" fillColor={Colors.primary} />
        <Text style={styles.caption}>{pointsToNextPound} points to next £1</Text>
      </View>

      <View style={[styles.card, { backgroundColor: tierBackground }]}>
        <Text style={styles.tierEmoji}>{tierInfo.emoji}</Text>
        <Text style={styles.tierName}>{tierInfo.label}</Text>
        <Text style={styles.caption}>
          {loyaltyPoints.toLocaleString('en-GB')}
          {tierInfo.nextTier ? ` / ${tierInfo.nextTier.threshold.toLocaleString('en-GB')} pts` : ' pts · Top tier'}
        </Text>
        <AnimatedProgressBar
          progress={tierInfo.progress}
          trackColor="rgba(0, 0, 0, 0.08)"
          fillColor={Colors.gold}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 16,
    flex: 1,
    gap: 6,
    padding: 16,
  },
  pointsValueCard: {
    backgroundColor: Colors.lightBlue,
  },
  cardHeading: {
    color: Colors.darkText,
    fontSize: 13,
    fontWeight: '700',
  },
  pointsValueText: {
    color: Colors.primary,
    fontSize: 24,
    fontWeight: '800',
  },
  caption: {
    color: Colors.mutedText,
    fontSize: 11,
  },
  tierEmoji: {
    fontSize: 36,
  },
  tierName: {
    color: Colors.darkText,
    fontSize: 18,
    fontWeight: '800',
  },
  track: {
    borderRadius: 4,
    height: 8,
    marginTop: 2,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 4,
    height: '100%',
  },
});
