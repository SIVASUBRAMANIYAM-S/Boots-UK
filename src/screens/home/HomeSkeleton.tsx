import { StyleSheet, View } from 'react-native';

import { ProductGridSkeleton } from '@/components/ProductCardSkeleton';
import { SkeletonBox, useSkeletonPulse } from '@/components/Skeleton';

export function HomeSkeleton() {
  const opacity = useSkeletonPulse();

  return (
    <View style={styles.container} accessible accessibilityLabel="Loading">
      <View style={styles.section}>
        <SkeletonBox opacity={opacity} width="100%" height={160} radius={16} />
        <SkeletonBox opacity={opacity} width={160} height={20} radius={6} />
        <View style={styles.row}>
          {[0, 1, 2].map((key) => (
            <SkeletonBox key={key} opacity={opacity} width={100} height={90} />
          ))}
        </View>
        <SkeletonBox opacity={opacity} width={180} height={20} radius={6} />
      </View>
      <ProductGridSkeleton opacity={opacity} rows={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    paddingTop: 16,
  },
  section: {
    gap: 16,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
});
