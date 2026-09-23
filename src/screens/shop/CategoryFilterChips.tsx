import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/colors';
import type { Category } from '@/types/catalog';

type ChipProps = {
  label: string;
  isActive: boolean;
  onPress: () => void;
};

function Chip({ label, isActive, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      style={({ pressed }) => [
        styles.chip,
        isActive ? styles.chipActive : styles.chipInactive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>{label}</Text>
    </Pressable>
  );
}

type CategoryFilterChipsProps = {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
};

export const CategoryFilterChips = memo(function CategoryFilterChips({
  categories,
  selectedCategoryId,
  onSelect,
}: CategoryFilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      accessibilityRole="tablist"
    >
      <Chip label="All" isActive={selectedCategoryId === null} onPress={() => onSelect(null)} />
      {categories.map((category) => (
        <Chip
          key={category.id}
          label={category.name}
          isActive={category.id === selectedCategoryId}
          onPress={() => onSelect(category.id)}
        />
      ))}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  content: {
    gap: 8,
    paddingHorizontal: 16,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 16,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipInactive: {
    backgroundColor: Colors.white,
    borderColor: Colors.border,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  labelActive: {
    color: Colors.white,
  },
  labelInactive: {
    color: Colors.darkText,
  },
});
