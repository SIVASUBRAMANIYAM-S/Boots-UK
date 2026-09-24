import { StyleSheet, Text, View } from 'react-native';

import { DELIVERY_DAYS, type DeliveryMethod } from '@/constants/checkout';
import { Colors } from '@/constants/colors';
import type { CartItem, CartTotals } from '@/services/cart';
import type { ShippingAddress } from '@/services/orders';
import { calculateLoyaltyPoints, formatDeliveryDate, formatUKPrice } from '@/utils/orderUtils';
import { digitsOnly } from '@/utils/payment';

import { CheckoutCard, SectionTitle } from './CheckoutField';

type ReviewStepProps = {
  items: readonly CartItem[];
  totals: CartTotals;
  address: ShippingAddress;
  deliveryMethod: DeliveryMethod;
  promoCode: string | null;
  cardNumber: string;
  currentPoints: number;
};

function Row({ label, value, emphasis = false, positive = false }: { label: string; value: string; emphasis?: boolean; positive?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, emphasis && styles.totalLabel]}>{label}</Text>
      <Text style={[styles.rowValue, emphasis && styles.totalValue, positive && styles.positive]}>{value}</Text>
    </View>
  );
}

export function ReviewStep({
  items,
  totals,
  address,
  deliveryMethod,
  promoCode,
  cardNumber,
  currentPoints,
}: ReviewStepProps) {
  const earnedPoints = calculateLoyaltyPoints(totals.subtotal - totals.discount);
  const deliveryLabel = deliveryMethod === 'express' ? '⚡ Express Delivery' : '🚚 Standard Delivery';
  const addressLines = [address.fullName, address.line1, address.line2, `${address.city} ${address.postcode}`, address.phone]
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <View style={styles.container}>
      <SectionTitle>Review Your Order</SectionTitle>

      <CheckoutCard>
        <Text style={styles.cardTitle}>Order Summary</Text>
        {items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.product.name}
            </Text>
            <Text style={styles.itemQty}>×{item.quantity}</Text>
            <Text style={styles.itemPrice}>{formatUKPrice(item.product.price * item.quantity)}</Text>
          </View>
        ))}

        <View style={styles.divider} />

        <View style={styles.detailBlock}>
          <Text style={styles.detailTitle}>📍 Delivering to</Text>
          {addressLines.map((line, index) => (
            <Text key={`${index}-${line}`} style={styles.detailText}>
              {line}
            </Text>
          ))}
        </View>

        <View style={styles.detailBlock}>
          <Text style={styles.detailTitle}>{deliveryLabel}</Text>
          <Text style={styles.detailText}>
            Arrives by {formatDeliveryDate(DELIVERY_DAYS[deliveryMethod])}
          </Text>
        </View>

        <View style={styles.detailBlock}>
          <Text style={styles.detailTitle}>💳 Paying with</Text>
          <Text style={styles.detailText}>Card ending {digitsOnly(cardNumber).slice(-4)}</Text>
        </View>

        <View style={styles.divider} />

        <Row label="Subtotal" value={formatUKPrice(totals.subtotal)} />
        <Row
          label="Delivery"
          value={totals.delivery === 0 ? 'FREE' : formatUKPrice(totals.delivery)}
          positive={totals.delivery === 0}
        />
        {totals.discount > 0 ? (
          <Row label={`Promo (${promoCode})`} value={`-${formatUKPrice(totals.discount)}`} positive />
        ) : null}
        <View style={styles.divider} />
        <Row label="Total" value={formatUKPrice(totals.total)} emphasis />
      </CheckoutCard>

      <View style={styles.pointsCard}>
        <Text style={styles.pointsTitle}>
          💳 You&apos;ll earn {earnedPoints.toLocaleString('en-GB')} Advantage Card points!
        </Text>
        <Text style={styles.pointsMath}>
          {currentPoints.toLocaleString('en-GB')} + {earnedPoints.toLocaleString('en-GB')} ={' '}
          <Text style={styles.pointsTotal}>{(currentPoints + earnedPoints).toLocaleString('en-GB')} points</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  cardTitle: {
    color: Colors.darkText,
    fontSize: 17,
    fontWeight: '800',
  },
  itemRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  itemName: {
    color: Colors.darkText,
    flex: 1,
    fontSize: 14,
  },
  itemQty: {
    color: Colors.mutedText,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'right',
  },
  itemPrice: {
    color: Colors.darkText,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 64,
    textAlign: 'right',
  },
  divider: {
    backgroundColor: Colors.border,
    height: 1,
  },
  detailBlock: {
    gap: 2,
  },
  detailTitle: {
    color: Colors.darkText,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  detailText: {
    color: Colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
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
  totalLabel: {
    color: Colors.darkText,
    fontSize: 18,
    fontWeight: '800',
  },
  totalValue: {
    color: Colors.primary,
    fontSize: 22,
    fontWeight: '800',
  },
  pointsCard: {
    backgroundColor: Colors.lightBlue,
    borderColor: 'rgba(0, 94, 184, 0.2)',
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  pointsTitle: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  pointsMath: {
    color: Colors.darkText,
    fontSize: 14,
  },
  pointsTotal: {
    color: Colors.primary,
    fontWeight: '800',
  },
});
