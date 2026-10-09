import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Colors } from '@/constants/colors';
import type { ProfileStats } from '@/services/profileService';

function Stat({
  icon,
  label,
  count,
  gold = false,
}: {
  icon: string;
  label: string;
  count: number;
  gold?: boolean;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let active = true;
    const listener = progress.addListener(({ value }) =>
      setDisplay(Math.round(value)),
    );
    const animation = Animated.timing(progress, {
      toValue: count,
      duration: 750,
      useNativeDriver: false,
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active) return;
      if (reduced) progress.setValue(count);
      else animation.start();
    });
    return () => {
      active = false;
      animation.stop();
      progress.removeListener(listener);
    };
  }, [count, progress]);
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${count} ${label}`}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text
        style={[styles.count, gold && styles.gold]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {display.toLocaleString('en-GB')}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export function ProfileStatsRow({ stats }: { stats: ProfileStats }) {
  return (
    <View style={styles.row}>
      <Stat icon="📦" label="Orders" count={stats.orders} />
      <Stat icon="❤️" label="Saved" count={stats.favourites} />
      <Stat icon="💳" label="Points" count={stats.points} gold />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: -20 },
  card: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: Colors.white,
    boxShadow: '0 6px 20px rgba(0,94,184,0.12)',
    gap: 4,
  },
  icon: { fontSize: 22 },
  count: { color: Colors.primary, fontSize: 24, fontWeight: '800' },
  gold: { color: Colors.goldText },
  label: { color: Colors.mutedText, fontSize: 12 },
});
