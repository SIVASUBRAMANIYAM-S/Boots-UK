import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';

type PlaceholderScreenProps = PropsWithChildren<{
  emoji: string;
  title: string;
  subtitle?: string;
}>;

export function PlaceholderScreen({ emoji, title, subtitle, children }: PlaceholderScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <StatusBar style="dark" />
      <View style={styles.body}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <Text style={styles.comingSoon}>Coming soon</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.lightGrey,
    flex: 1,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  body: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    color: Colors.primary,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.darkText,
    fontSize: 16,
    textAlign: 'center',
  },
  comingSoon: {
    color: Colors.mutedText,
    fontSize: 14,
  },
});
