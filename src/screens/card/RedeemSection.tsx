import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { getPointsValue, REDEMPTION_THRESHOLD } from '@/services/loyaltyService';

import { CardSectionHeader } from './CardSectionHeader';
import { RedeemSheet } from './RedeemSheet';

type RedeemSectionProps = {
  loyaltyPoints: number;
};

export const RedeemSection = memo(function RedeemSection({ loyaltyPoints }: RedeemSectionProps) {
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const canRedeem = loyaltyPoints >= REDEMPTION_THRESHOLD;

  return (
    <View style={styles.container}>
      <CardSectionHeader title="Redeem Your Points" />
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>💳 Current balance:</Text>
          <Text style={styles.rowValue}>{loyaltyPoints.toLocaleString('en-GB')} points</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>💰 Cash value:</Text>
          <Text style={styles.rowValue}>£{getPointsValue(loyaltyPoints)}</Text>
        </View>
        <View style={styles.divider} />
        <Text style={styles.hint}>Redeem at checkout</Text>

        {canRedeem ? (
          <Pressable
            onPress={() => setIsSheetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Redeem points"
            style={({ pressed }) => [styles.redeemButton, pressed && styles.redeemButtonPressed]}
          >
            <Text style={styles.redeemLabel}>Redeem Points →</Text>
          </Pressable>
        ) : (
          <View style={[styles.redeemButton, styles.redeemButtonDisabled]}>
            <Text style={styles.redeemLabelDisabled}>
              Need {REDEMPTION_THRESHOLD - loyaltyPoints} more points to redeem
            </Text>
          </View>
        )}
      </View>

      <RedeemSheet
        visible={isSheetVisible}
        loyaltyPoints={loyaltyPoints}
        onClose={() => setIsSheetVisible(false)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 28,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    gap: 10,
    marginHorizontal: 20,
    padding: 18,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: Colors.darkText,
    fontSize: 14,
  },
  rowValue: {
    color: Colors.darkText,
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    backgroundColor: Colors.border,
    height: 1,
  },
  hint: {
    color: Colors.mutedText,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  redeemButton: {
    alignItems: 'center',
    backgroundColor: Colors.gold,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
  },
  redeemButtonPressed: {
    opacity: 0.85,
  },
  redeemButtonDisabled: {
    backgroundColor: Colors.disabled,
  },
  redeemLabel: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  redeemLabelDisabled: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 12,
    textAlign: 'center',
  },
});
