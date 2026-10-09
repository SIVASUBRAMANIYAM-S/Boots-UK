import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Colors } from '@/constants/colors';
import type { OrderSummary } from '@/services/profileService';
import {
  formatOrderDate,
  orderReference,
  orderStatus,
} from '@/utils/profileUtils';

export function OrderHistorySection({
  orders,
  showAll,
  refreshing,
  onToggle,
  onDetails,
}: {
  orders: OrderSummary[];
  showAll: boolean;
  refreshing: boolean;
  onToggle: () => void;
  onDetails: (orderId: string) => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          My Orders
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={refreshing}
          onPress={onToggle}
          hitSlop={8}
        >
          <Text style={styles.link}>{showAll ? 'Show Less' : 'View All'}</Text>
        </Pressable>
      </View>
      {refreshing && (
        <ActivityIndicator color={Colors.primary} style={styles.spinner} />
      )}
      {!orders.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.title}>No orders yet</Text>
          <Text style={styles.caption}>
            Your order history will appear here
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate('/')}
            style={styles.shop}
          >
            <Text style={styles.shopLabel}>Start Shopping</Text>
          </Pressable>
        </View>
      ) : (
        orders.map((order) => {
          const status = orderStatus(order.status);
          return (
            <View key={order.id} style={styles.card}>
              <View style={styles.topRow}>
                <View style={styles.orderIcon}>
                  <Text style={styles.icon}>🛍️</Text>
                </View>
                <View style={styles.orderText}>
                  <Text style={styles.reference}>
                    Order #{orderReference(order)}
                  </Text>
                  <Text style={styles.caption}>
                    {order.item_count} item{order.item_count === 1 ? '' : 's'}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: status.color }]}>
                  <Text style={styles.badgeLabel}>{status.label}</Text>
                </View>
              </View>
              <View style={styles.middleRow}>
                <Text style={styles.caption}>
                  📅 {formatOrderDate(order.created_at)}
                </Text>
                <Text style={styles.total}>
                  {order.total_amount === null
                    ? '—'
                    : `£${Number(order.total_amount).toFixed(2)}`}
                </Text>
              </View>
              <View style={styles.bottomRow}>
                <Text style={styles.points}>
                  {order.points_earned === null
                    ? 'Points unavailable'
                    : `Points earned: +${order.points_earned} pts`}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View details for order ${orderReference(order)}`}
                  onPress={() => onDetails(order.id)}
                  hitSlop={8}
                >
                  <Text style={styles.details}>View Details →</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 26, paddingHorizontal: 20 },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { color: Colors.darkText, fontSize: 20, fontWeight: '800' },
  link: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  spinner: { marginBottom: 12 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    boxShadow: '0 4px 18px rgba(10,22,40,0.06)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  orderIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 21 },
  orderText: { flex: 1, minWidth: 120, gap: 4 },
  reference: { fontSize: 14, color: Colors.darkText, fontWeight: '700' },
  caption: { fontSize: 12, color: Colors.mutedText },
  badge: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 12 },
  badgeLabel: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGrey,
  },
  total: { color: Colors.primary, fontWeight: '800', fontSize: 16 },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  points: { color: Colors.goldText, fontSize: 12, fontWeight: '600' },
  details: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  empty: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyIcon: { fontSize: 40 },
  shop: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 6,
  },
  shopLabel: { color: Colors.white, fontWeight: '700' },
});
