import { StyleSheet, View } from 'react-native';

import { SkeletonBox, useSkeletonPulse } from '@/components/Skeleton';

export function CardSkeleton() {
  const opacity = useSkeletonPulse();

  return (
    <View style={styles.container} accessible accessibilityLabel="Loading">
      <SkeletonBox opacity={opacity} width="100%" height={200} radius={20} />

      <View style={styles.row}>
        {[0, 1, 2].map((key) => (
          <SkeletonBox key={key} opacity={opacity} width={100} height={78} radius={16} />
        ))}
      </View>

      <View style={styles.row}>
        <SkeletonBox opacity={opacity} width={165} height={120} radius={16} />
        <SkeletonBox opacity={opacity} width={165} height={120} radius={16} />
      </View>

      <SkeletonBox opacity={opacity} width={180} height={20} radius={6} />
      <View style={styles.row}>
        {[0, 1, 2].map((key) => (
          <SkeletonBox key={key} opacity={opacity} width={160} height={100} radius={16} />
        ))}
      </View>

      <SkeletonBox opacity={opacity} width={200} height={20} radius={6} />
      <SkeletonBox opacity={opacity} width="100%" height={160} radius={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
});
