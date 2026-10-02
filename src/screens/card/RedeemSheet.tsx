import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { showMessage } from '@/utils/dialogs';

const OPEN_MS = 250;
const CLOSE_MS = 200;
const SHEET_OFFSET = 320;

type RedeemSheetProps = {
  visible: boolean;
  loyaltyPoints: number;
  onClose: () => void;
};

export function RedeemSheet({ visible, loyaltyPoints, onClose }: RedeemSheetProps) {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  // Stay mounted through the close animation, then unmount the Modal.
  const [isMounted, setIsMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      Animated.timing(progress, { toValue: 1, duration: OPEN_MS, useNativeDriver: true }).start();
      return;
    }
    Animated.timing(progress, { toValue: 0, duration: CLOSE_MS, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) setIsMounted(false);
      },
    );
  }, [visible, progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [SHEET_OFFSET, 0] });
  const poundsAvailable = Math.floor(loyaltyPoints / 400);

  const handlePlaceholder = () => {
    onClose();
    showMessage('Coming soon', 'Coming soon');
  };

  return (
    <Modal visible={isMounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable
          style={styles.backdropPressable}
          onPress={onClose}
          accessibilityLabel="Close redemption options"
        />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY }] }]}
        accessibilityViewIsModal
      >
        <View style={styles.handle} />
        <Text style={styles.title} accessibilityRole="header">
          Redeem your points
        </Text>

        <Pressable
          onPress={handlePlaceholder}
          accessibilityRole="button"
          style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
        >
          <Text style={styles.optionIcon}>💷</Text>
          <View style={styles.optionText}>
            <Text style={styles.optionLabel}>Use £{poundsAvailable} off next order</Text>
            <Text style={styles.optionCaption}>Applied automatically at checkout</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={handlePlaceholder}
          accessibilityRole="button"
          style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
        >
          <Text style={styles.optionIcon}>❤️</Text>
          <View style={styles.optionText}>
            <Text style={styles.optionLabel}>Donate to charity</Text>
            <Text style={styles.optionCaption}>Turn your points into good causes</Text>
          </View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  backdropPressable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    bottom: 0,
    gap: 10,
    left: 0,
    paddingHorizontal: 20,
    position: 'absolute',
    right: 0,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: Colors.border,
    borderRadius: 2,
    height: 4,
    marginBottom: 4,
    marginTop: 10,
    width: 40,
  },
  title: {
    color: Colors.darkText,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  option: {
    alignItems: 'center',
    backgroundColor: Colors.lightGrey,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  optionPressed: {
    opacity: 0.7,
  },
  optionIcon: {
    fontSize: 26,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    color: Colors.darkText,
    fontSize: 15,
    fontWeight: '700',
  },
  optionCaption: {
    color: Colors.mutedText,
    fontSize: 12,
  },
});
