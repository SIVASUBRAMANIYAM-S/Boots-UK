import { memo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';

import { CardSectionHeader } from './CardSectionHeader';

type EarnCard = {
  icon: string;
  title: string;
  subtitle: string;
  subtitleColor: string;
};

const EARN_CARDS: readonly EarnCard[] = [
  { icon: '🛍️', title: 'Shop in-store or online', subtitle: '4 points per £1 spent', subtitleColor: Colors.primary },
  { icon: '💊', title: 'Health & Pharmacy', subtitle: '8 points per £1 spent', subtitleColor: Colors.goldText },
  { icon: '🎂', title: 'Birthday Bonus', subtitle: '500 bonus points', subtitleColor: Colors.success },
];

export const EarnPointsSection = memo(function EarnPointsSection() {
  return (
    <View style={styles.container}>
      <CardSectionHeader title="How to Earn Points" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {EARN_CARDS.map((card) => (
          <View key={card.title} style={styles.card}>
            <Text style={styles.icon}>{card.icon}</Text>
            <Text style={styles.title}>{card.title}</Text>
            <Text style={[styles.subtitle, { color: card.subtitleColor }]}>{card.subtitle}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

const CARD_WIDTH = 160;

const styles = StyleSheet.create({
  container: {
    marginTop: 28,
  },
  scrollContent: {
    gap: 12,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    gap: 6,
    padding: 16,
    width: CARD_WIDTH,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    color: Colors.darkText,
    fontSize: 14,
    fontWeight: '700',
    minHeight: 36,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
  },
});
