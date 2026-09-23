import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import type { Product } from '@/types/catalog';

export type SortOption = 'recommended' | 'price-asc' | 'price-desc' | 'name-asc';

const SORT_OPTIONS: readonly { value: SortOption; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A to Z' },
];

export function sortProducts(products: readonly Product[], option: SortOption): Product[] {
  const sorted = [...products];
  switch (option) {
    case 'price-asc':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return sorted.sort((a, b) => b.price - a.price);
    case 'name-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));
    case 'recommended':
      return sorted;
  }
}

const OPEN_MS = 250;
const CLOSE_MS = 200;
const SHEET_OFFSET = 360;

type SortSheetProps = {
  visible: boolean;
  selected: SortOption;
  onSelect: (option: SortOption) => void;
  onClose: () => void;
};

export function SortSheet({ visible, selected, onSelect, onClose }: SortSheetProps) {
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

  return (
    <Modal visible={isMounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable style={styles.backdropPressable} onPress={onClose} accessibilityLabel="Close sort options" />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY }] }]}
        accessibilityViewIsModal
      >
        <View style={styles.handle} />
        <Text style={styles.title} accessibilityRole="header">
          Sort by
        </Text>
        {SORT_OPTIONS.map((option) => {
          const isSelected = option.value === selected;
          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            >
              <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                {option.label}
              </Text>
              {isSelected ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          );
        })}
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
    marginBottom: 12,
    marginTop: 10,
    width: 40,
  },
  title: {
    color: Colors.darkText,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  option: {
    alignItems: 'center',
    borderBottomColor: Colors.lightGrey,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  optionPressed: {
    opacity: 0.6,
  },
  optionLabel: {
    color: Colors.darkText,
    fontSize: 16,
  },
  optionLabelSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  check: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
});
