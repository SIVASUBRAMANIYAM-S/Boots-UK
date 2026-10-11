import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/constants/colors';
import type { CartTotals } from '@/services/cart';
import { formatUKPrice } from '@/utils/orderUtils';

export type PromoStatus = { kind: 'success' | 'error'; message: string } | null;

type OrderSummaryProps = {
  totals: CartTotals;
  appliedPromoCode: string | null;
  promoStatus: PromoStatus;
  onApplyPromo: (code: string) => void;
  onRemovePromo: () => void;
  onCheckout: () => void;
  isCheckingOut: boolean;
  checkoutDisabled?: boolean;
};

type SummaryRowProps = {
  label: string;
  value: string;
  valueStyle?: StyleProp<TextStyle>;
};

function SummaryRow({ label, value, valueStyle }: SummaryRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueStyle]}>{value}</Text>
    </View>
  );
}

export const OrderSummary = memo(function OrderSummary({
  totals,
  appliedPromoCode,
  promoStatus,
  onApplyPromo,
  onRemovePromo,
  onCheckout,
  isCheckingOut,
  checkoutDisabled = false,
}: OrderSummaryProps) {
  const [promoInput, setPromoInput] = useState('');
  const canApply = promoInput.trim().length > 0;
  const [expanded, setExpanded] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const { height } = useWindowDimensions();
  const panelHeight = Math.min(260, height * 0.32);
  const setOpen = useCallback((next: boolean) => {
    if (!next) Keyboard.dismiss();
    setExpanded(next);
  }, []);
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: expanded ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [expanded, progress]);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > 10 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy < -25) setOpen(true);
          else if (gesture.dy > 25) setOpen(false);
        },
      }),
    [setOpen],
  );

  return (
    <View style={styles.card}>
      <View {...pan.panHandlers}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Order summary"
          aria-expanded={expanded}
          accessibilityState={{ expanded }}
          onPress={() => setOpen(!expanded)}
          style={styles.summaryHandle}
        >
          <View style={styles.grabber} />
          <View style={styles.summaryHeading}>
            <View>
              <Text style={styles.summaryTitle}>
                Order summary {expanded ? '⌄' : '⌃'}
              </Text>
              <Text style={styles.summaryHint}>
                {expanded
                  ? 'Swipe down to close'
                  : 'Swipe up for totals & promo'}
              </Text>
            </View>
            <Text style={styles.totalValue}>{formatUKPrice(totals.total)}</Text>
          </View>
        </Pressable>
      </View>
      <Animated.View
        aria-hidden={!expanded}
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
        style={[
          styles.panel,
          {
            height: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, panelHeight],
            }),
            opacity: progress,
            pointerEvents: expanded ? 'auto' : 'none',
          },
        ]}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.panelContent}
          showsVerticalScrollIndicator
        >
          <SummaryRow label="Subtotal" value={formatUKPrice(totals.subtotal)} />
          <SummaryRow
            label="Delivery"
            value={
              totals.delivery === 0 ? 'FREE' : formatUKPrice(totals.delivery)
            }
            valueStyle={totals.delivery === 0 ? styles.positive : undefined}
          />
          {totals.discount > 0 ? (
            <SummaryRow
              label="Discount"
              value={`-${formatUKPrice(totals.discount)}`}
              valueStyle={styles.positive}
            />
          ) : null}
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatUKPrice(totals.total)}</Text>
          </View>

          {appliedPromoCode ? (
            <View style={styles.appliedPromo}>
              <Text style={styles.appliedPromoText}>🏷️ {appliedPromoCode}</Text>
              <Pressable
                onPress={onRemovePromo}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Remove promo code"
              >
                <Text style={styles.removePromo}>Remove</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.promoRow}>
              <TextInput
                value={promoInput}
                onChangeText={setPromoInput}
                placeholder="Enter promo code"
                placeholderTextColor={Colors.inactive}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => canApply && onApplyPromo(promoInput)}
                style={styles.promoInput}
                accessibilityLabel="Promo code"
              />
              <Pressable
                onPress={() => onApplyPromo(promoInput)}
                disabled={!canApply}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canApply }}
                style={({ pressed }) => [
                  styles.applyButton,
                  !canApply && styles.applyDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.applyLabel}>Apply</Text>
              </Pressable>
            </View>
          )}
          {promoStatus ? (
            <Text
              style={[
                styles.promoStatus,
                promoStatus.kind === 'success'
                  ? styles.positive
                  : styles.negative,
              ]}
              accessibilityLiveRegion="polite"
            >
              {promoStatus.message}
            </Text>
          ) : null}
        </ScrollView>
      </Animated.View>

      <Pressable
        onPress={onCheckout}
        disabled={isCheckingOut || checkoutDisabled}
        accessibilityRole="button"
        accessibilityLabel="Proceed to checkout"
        accessibilityState={{
          busy: isCheckingOut,
          disabled: isCheckingOut || checkoutDisabled,
        }}
        style={({ pressed }) => [
          styles.checkoutButton,
          checkoutDisabled && styles.checkoutDisabled,
          pressed && styles.pressed,
        ]}
      >
        <LinearGradient
          colors={[Colors.accent, Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.checkoutGradient}
        >
          {isCheckingOut ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.checkoutLabel}>Proceed to Checkout →</Text>
          )}
        </LinearGradient>
      </Pressable>
      <Text style={styles.secure}>🔒 Secure checkout</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  panel: { overflow: 'hidden' },
  panelContent: { gap: 8, paddingBottom: 10 },
  summaryHandle: { minHeight: 54, paddingBottom: 4, gap: 8 },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
  },
  summaryHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryTitle: { color: Colors.darkText, fontSize: 15, fontWeight: '800' },
  summaryHint: { color: Colors.mutedText, fontSize: 11, marginTop: 3 },
  checkoutDisabled: { opacity: 0.5 },
  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)',
    gap: 8,
    paddingBottom: 14,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: Colors.mutedText,
    fontSize: 15,
  },
  rowValue: {
    color: Colors.darkText,
    fontSize: 15,
    fontWeight: '600',
  },
  positive: {
    color: Colors.success,
    fontWeight: '700',
  },
  negative: {
    color: Colors.error,
    fontWeight: '600',
  },
  divider: {
    backgroundColor: Colors.border,
    height: 1,
    marginVertical: 4,
  },
  totalLabel: {
    color: Colors.darkText,
    fontSize: 18,
    fontWeight: '800',
  },
  totalValue: {
    color: Colors.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  promoRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  promoInput: {
    backgroundColor: Colors.lightGrey,
    borderRadius: 12,
    color: Colors.darkText,
    flex: 1,
    fontSize: 15,
    height: 44,
    paddingHorizontal: 14,
  },
  applyButton: {
    alignItems: 'center',
    backgroundColor: Colors.darkText,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  applyDisabled: {
    backgroundColor: Colors.disabled,
  },
  applyLabel: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  appliedPromo: {
    alignItems: 'center',
    backgroundColor: '#e6f6ec',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  appliedPromoText: {
    color: Colors.success,
    fontSize: 15,
    fontWeight: '700',
  },
  removePromo: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  promoStatus: {
    fontSize: 13,
  },
  checkoutButton: {
    borderRadius: 28,
    marginTop: 8,
    overflow: 'hidden',
  },
  checkoutGradient: {
    alignItems: 'center',
    height: 56,
    justifyContent: 'center',
  },
  checkoutLabel: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  secure: {
    color: Colors.mutedText,
    fontSize: 12,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
