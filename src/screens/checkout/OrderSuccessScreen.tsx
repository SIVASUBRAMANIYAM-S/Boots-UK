import { useCallback, useEffect, useRef } from 'react';
import { Animated, BackHandler, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DELIVERY_DAYS } from '@/constants/checkout';
import { Colors } from '@/constants/colors';
import { showMessage } from '@/utils/dialogs';
import { formatDeliveryDate, formatUKPrice } from '@/utils/orderUtils';

type OrderSuccessParams = {
  orderNumber?: string;
  total?: string;
  itemCount?: string;
  pointsEarned?: string;
  firstName?: string;
  deliveryDays?: string;
};

function toNumber(value: string | undefined, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function SummaryRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryIcon}>{icon}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

export default function OrderSuccessScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<OrderSuccessParams>();
  const scale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  const itemCount = toNumber(params.itemCount);
  const pointsEarned = toNumber(params.pointsEarned);
  const deliveryDays = toNumber(params.deliveryDays, DELIVERY_DAYS.standard);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, scale]);

  const handleContinueShopping = useCallback(() => {
    // Pops back to the tabs, then shows Home.
    router.dismissTo('/');
  }, []);

  const handleTrackOrder = useCallback(() => {
    showMessage('Coming soon', 'Order tracking will be available in a future update.');
  }, []);

  // Android back leaves for Home rather than returning to a finished checkout.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleContinueShopping();
        return true;
      });
      return () => subscription.remove();
    }, [handleContinueShopping]),
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Animated.View style={[styles.badge, { transform: [{ scale }] }]} accessibilityElementsHidden>
          <Text style={styles.badgeIcon}>✓</Text>
        </Animated.View>

        <Animated.View style={[styles.textBlock, { opacity: contentOpacity }]}>
          <Text style={styles.title} accessibilityRole="header">
            Order Placed!
          </Text>
          <Text style={styles.thanks}>Thank you{params.firstName ? `, ${params.firstName}` : ''}! 🎉</Text>
          {params.orderNumber ? <Text style={styles.orderNumber}>Order #{params.orderNumber}</Text> : null}
        </Animated.View>

        <Animated.View style={[styles.summaryCard, { opacity: contentOpacity }]}>
          <SummaryRow icon="📦" label="Estimated delivery" value={formatDeliveryDate(deliveryDays)} />
          <View style={styles.divider} />
          <SummaryRow icon="🛍️" label="Items ordered" value={String(itemCount)} />
          <View style={styles.divider} />
          <SummaryRow icon="💷" label="Total paid" value={formatUKPrice(toNumber(params.total))} />
          <View style={styles.divider} />
          <SummaryRow icon="💳" label="Points earned" value={`+${pointsEarned.toLocaleString('en-GB')}`} />
        </Animated.View>

        <Animated.View style={[styles.actions, { opacity: contentOpacity }]}>
          <Pressable
            onPress={handleTrackOrder}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, styles.outlineButton, pressed && styles.pressed]}
          >
            <Text style={[styles.buttonLabel, styles.outlineLabel]}>Track Order</Text>
          </Pressable>
          <Pressable
            onPress={handleContinueShopping}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, styles.filledButton, pressed && styles.pressed]}
          >
            <Text style={[styles.buttonLabel, styles.filledLabel]}>Continue Shopping</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const BADGE_SIZE = 120;

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    flex: 1,
  },
  content: {
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 24,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: Colors.success,
    borderRadius: BADGE_SIZE / 2,
    boxShadow: '0 0 0 14px rgba(31, 122, 61, 0.12), 0 12px 28px rgba(31, 122, 61, 0.35)',
    height: BADGE_SIZE,
    justifyContent: 'center',
    marginTop: 12,
    width: BADGE_SIZE,
  },
  badgeIcon: {
    color: Colors.white,
    fontSize: 64,
    fontWeight: '900',
    lineHeight: 72,
  },
  textBlock: {
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: Colors.darkText,
    fontSize: 32,
    fontWeight: '800',
  },
  thanks: {
    color: Colors.accent,
    fontSize: 18,
    fontWeight: '700',
  },
  orderNumber: {
    color: Colors.mutedText,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  summaryCard: {
    alignSelf: 'stretch',
    backgroundColor: Colors.white,
    borderRadius: 16,
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.08)',
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
  },
  summaryIcon: {
    fontSize: 20,
  },
  summaryLabel: {
    color: Colors.mutedText,
    flex: 1,
    fontSize: 15,
  },
  summaryValue: {
    color: Colors.darkText,
    fontSize: 16,
    fontWeight: '800',
  },
  divider: {
    backgroundColor: Colors.lightGrey,
    height: 1,
  },
  actions: {
    alignSelf: 'stretch',
    gap: 12,
  },
  button: {
    alignItems: 'center',
    borderRadius: 28,
    height: 54,
    justifyContent: 'center',
  },
  outlineButton: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  filledButton: {
    backgroundColor: Colors.primary,
  },
  pressed: {
    opacity: 0.8,
  },
  buttonLabel: {
    fontSize: 17,
    fontWeight: '800',
  },
  outlineLabel: {
    color: Colors.primary,
  },
  filledLabel: {
    color: Colors.white,
  },
});
