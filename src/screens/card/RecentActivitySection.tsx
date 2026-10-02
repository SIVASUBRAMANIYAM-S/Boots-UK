import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { router } from 'expo-router';

import { Colors } from '@/constants/colors';
import { ADVANTAGE_POINTS_PER_POUND } from '@/constants/catalog';
import type { LoyaltyTransaction } from '@/services/loyaltyService';
import { formatPrice } from '@/utils/format';

import { CardSectionHeader } from './CardSectionHeader';

type RecentActivitySectionProps = {
  transactions: readonly LoyaltyTransaction[];
  onLayout?: (event: LayoutChangeEvent) => void;
};

function formatTransactionDate(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function pointsEarned(transaction: LoyaltyTransaction): number {
  if (transaction.points_earned > 0) return transaction.points_earned;
  return Math.floor(transaction.total_amount * ADVANTAGE_POINTS_PER_POUND);
}

function TransactionRow({ transaction }: { transaction: LoyaltyTransaction }) {
  const reference = transaction.order_number ?? transaction.id.slice(0, 8).toUpperCase();
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Text style={styles.rowIconText}>🛍️</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          Order #{reference}
        </Text>
        <Text style={styles.rowDate}>{formatTransactionDate(transaction.created_at)}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowPoints}>+{pointsEarned(transaction)} pts</Text>
        <Text style={styles.rowAmount}>{formatPrice(transaction.total_amount)}</Text>
      </View>
    </View>
  );
}

function EmptyActivity({ onShopNow }: { onShopNow: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>🎯</Text>
      <Text style={styles.emptyTitle}>No activity yet</Text>
      <Text style={styles.emptySubtitle}>Start shopping to earn points!</Text>
      <Pressable
        onPress={onShopNow}
        accessibilityRole="button"
        style={({ pressed }) => [styles.shopButton, pressed && styles.shopButtonPressed]}
      >
        <Text style={styles.shopButtonLabel}>Shop Now</Text>
      </Pressable>
    </View>
  );
}

export const RecentActivitySection = memo(function RecentActivitySection({
  transactions,
  onLayout,
}: RecentActivitySectionProps) {
  const handleShopNow = useCallback(() => router.navigate('/shop'), []);
  const handleViewAll = useCallback(() => router.navigate('/shop'), []);

  return (
    <View onLayout={onLayout} style={styles.container}>
      <CardSectionHeader
        title="Recent Activity"
        actionLabel={transactions.length > 0 ? 'View All' : undefined}
        onAction={transactions.length > 0 ? handleViewAll : undefined}
      />
      {transactions.length === 0 ? (
        <EmptyActivity onShopNow={handleShopNow} />
      ) : (
        <View style={styles.list}>
          {transactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 28,
  },
  list: {
    paddingHorizontal: 12,
  },
  row: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    flexDirection: 'row',
    gap: 12,
    margin: 8,
    padding: 12,
  },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  rowIconText: {
    fontSize: 18,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: Colors.darkText,
    fontSize: 14,
    fontWeight: '700',
  },
  rowDate: {
    color: Colors.mutedText,
    fontSize: 12,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  rowPoints: {
    color: Colors.success,
    fontSize: 14,
    fontWeight: '700',
  },
  rowAmount: {
    color: Colors.mutedText,
    fontSize: 12,
  },
  empty: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    color: Colors.darkText,
    fontSize: 17,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: Colors.mutedText,
    fontSize: 14,
  },
  shopButton: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    marginTop: 10,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  shopButtonPressed: {
    opacity: 0.85,
  },
  shopButtonLabel: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
