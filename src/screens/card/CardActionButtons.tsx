import { memo, useCallback } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { showMessage } from '@/utils/dialogs';

type CardActionButtonsProps = {
  onScrollToStatements: () => void;
};

type ActionButtonProps = {
  icon: string;
  label: string;
  subtitle: string;
  onPress: () => void;
};

function ActionButton({ icon, label, subtitle, onPress }: ActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Pressable>
  );
}

export const CardActionButtons = memo(function CardActionButtons({
  onScrollToStatements,
}: CardActionButtonsProps) {
  const handleAddToWallet = useCallback(() => {
    showMessage('Coming soon', 'Coming soon — Wallet integration');
  }, []);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message:
          'Join Boots Advantage Card! Collect points on every purchase and redeem them for real savings. 💙',
      });
    } catch {
      showMessage('Unable to share', "Sharing isn't available right now. Please try again later.");
    }
  }, []);

  return (
    <View style={styles.row}>
      <ActionButton icon="📲" label="Add to Wallet" subtitle="Apple/Google Pay" onPress={handleAddToWallet} />
      <ActionButton icon="🔗" label="Share Card" subtitle="Refer a friend" onPress={handleShare} />
      <ActionButton icon="📊" label="Statements" subtitle="View history" onPress={onScrollToStatements} />
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 20,
  },
  button: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    flex: 1,
    gap: 2,
    paddingVertical: 14,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  icon: {
    fontSize: 28,
  },
  label: {
    color: Colors.darkText,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.mutedText,
    fontSize: 11,
    textAlign: 'center',
  },
});
