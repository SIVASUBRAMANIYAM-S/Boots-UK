import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';

type CardSectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Shared "Title + optional subtitle/action" header used by every section on the card screen. */
export const CardSectionHeader = memo(function CardSectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: CardSectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.titleColumn}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="link">
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  titleColumn: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: Colors.darkText,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.mutedText,
    fontSize: 12,
  },
  action: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
});
