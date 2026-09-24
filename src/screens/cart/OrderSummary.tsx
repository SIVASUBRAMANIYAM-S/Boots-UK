import { memo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
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
}: OrderSummaryProps) {
  const [promoInput, setPromoInput] = useState('');
  const canApply = promoInput.trim().length > 0;

  return (
    <View style={styles.card}>
      <SummaryRow label="Subtotal" value={formatUKPrice(totals.subtotal)} />
      <SummaryRow
        label="Delivery"
        value={totals.delivery === 0 ? 'FREE' : formatUKPrice(totals.delivery)}
        valueStyle={totals.delivery === 0 ? styles.positive : undefined}
      />
      {totals.discount > 0 ? (
        <SummaryRow label="Discount" value={`-${formatUKPrice(totals.discount)}`} valueStyle={styles.positive} />
      ) : null}
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{formatUKPrice(totals.total)}</Text>
      </View>

      {appliedPromoCode ? (
        <View style={styles.appliedPromo}>
          <Text style={styles.appliedPromoText}>🏷️ {appliedPromoCode}</Text>
          <Pressable onPress={onRemovePromo} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove promo code">
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
            style={({ pressed }) => [styles.applyButton, !canApply && styles.applyDisabled, pressed && styles.pressed]}
          >
            <Text style={styles.applyLabel}>Apply</Text>
          </Pressable>
        </View>
      )}
      {promoStatus ? (
        <Text
          style={[styles.promoStatus, promoStatus.kind === 'success' ? styles.positive : styles.negative]}
          accessibilityLiveRegion="polite"
        >
          {promoStatus.message}
        </Text>
      ) : null}

      <Pressable
        onPress={onCheckout}
        disabled={isCheckingOut}
        accessibilityRole="button"
        accessibilityLabel="Proceed to checkout"
        accessibilityState={{ busy: isCheckingOut }}
        style={({ pressed }) => [styles.checkoutButton, pressed && styles.pressed]}
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
  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)',
    gap: 8,
    paddingBottom: 14,
    paddingHorizontal: 20,
    paddingTop: 18,
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
