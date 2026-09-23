import { StyleSheet, View, useWindowDimensions, type Animated } from 'react-native';

import {
  PRODUCT_CARD_HEIGHT,
  PRODUCT_CARD_MARGIN,
  PRODUCT_GRID_PADDING,
  getGridCardWidth,
} from '@/components/ProductCard';
import { SkeletonBox } from '@/components/Skeleton';
import { Colors } from '@/constants/colors';

type ProductCardSkeletonProps = {
  opacity: Animated.Value;
  width: number;
};

export function ProductCardSkeleton({ opacity, width }: ProductCardSkeletonProps) {
  return (
    <View style={[styles.card, { width }]}>
      <SkeletonBox opacity={opacity} width="100%" height={110} />
      <View style={styles.lines}>
        <SkeletonBox opacity={opacity} width="90%" height={14} radius={4} />
        <SkeletonBox opacity={opacity} width="60%" height={14} radius={4} />
        <SkeletonBox opacity={opacity} width="55%" height={12} radius={4} />
        <SkeletonBox opacity={opacity} width="35%" height={18} radius={4} />
      </View>
      <SkeletonBox opacity={opacity} width="100%" height={36} radius={8} />
    </View>
  );
}

type ProductGridSkeletonProps = {
  opacity: Animated.Value;
  rows?: number;
};

export function ProductGridSkeleton({ opacity, rows = 3 }: ProductGridSkeletonProps) {
  const { width } = useWindowDimensions();
  const cardWidth = getGridCardWidth(width);

  return (
    <View style={styles.grid} accessible accessibilityLabel="Loading products">
      {Array.from({ length: rows }, (_, row) => (
        <View key={row} style={styles.row}>
          <ProductCardSkeleton opacity={opacity} width={cardWidth} />
          <ProductCardSkeleton opacity={opacity} width={cardWidth} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    height: PRODUCT_CARD_HEIGHT,
    margin: PRODUCT_CARD_MARGIN,
    padding: 12,
  },
  lines: {
    flex: 1,
    gap: 8,
    paddingTop: 12,
  },
  grid: {
    paddingHorizontal: PRODUCT_GRID_PADDING,
  },
  row: {
    flexDirection: 'row',
  },
});
