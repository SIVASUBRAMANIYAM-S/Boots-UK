import { memo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/constants/colors';

import { CardSectionHeader } from './CardSectionHeader';

type Offer = {
  icon: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  gradient: readonly [string, string];
};

// Hardcoded for this POC — a real implementation would fetch active offers.
const OFFERS: readonly Offer[] = [
  {
    icon: '🎁',
    title: 'Double Points Weekend',
    subtitle: 'Earn 8pts per £1 this weekend',
    badge: 'LIMITED',
    badgeColor: Colors.gold,
    gradient: ['#f0a500', '#f7c948'],
  },
  {
    icon: '💄',
    title: 'Beauty Bonus',
    subtitle: '500 extra points on Beauty',
    badge: 'NEW',
    badgeColor: Colors.primary,
    gradient: [Colors.primary, Colors.accent],
  },
  {
    icon: '👶',
    title: 'Baby Club',
    subtitle: 'Extra points on Baby products',
    badge: 'MEMBER',
    badgeColor: Colors.success,
    gradient: ['#1f7a3d', '#3fae66'],
  },
];

export const OffersSection = memo(function OffersSection() {
  return (
    <View style={styles.container}>
      <CardSectionHeader title="Exclusive Offers" subtitle="For Advantage Card members only" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {OFFERS.map((offer) => (
          <View key={offer.title} style={styles.card}>
            <LinearGradient
              colors={offer.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.imageArea}
            >
              <Text style={styles.imageIcon}>{offer.icon}</Text>
            </LinearGradient>
            <View style={[styles.badge, { backgroundColor: offer.badgeColor }]}>
              <Text style={styles.badgeLabel}>{offer.badge}</Text>
            </View>
            <Text style={styles.title}>{offer.title}</Text>
            <Text style={styles.subtitle}>{offer.subtitle}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

const CARD_WIDTH = 200;

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
    gap: 4,
    padding: 14,
    width: CARD_WIDTH,
  },
  imageArea: {
    alignItems: 'center',
    borderRadius: 12,
    height: 80,
    justifyContent: 'center',
    marginBottom: 4,
  },
  imageIcon: {
    fontSize: 36,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeLabel: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    color: Colors.darkText,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  subtitle: {
    color: Colors.mutedText,
    fontSize: 12,
  },
});
