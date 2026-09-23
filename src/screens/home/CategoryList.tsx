import { memo, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, type ListRenderItemInfo } from 'react-native';

import { getCategoryEmoji } from '@/constants/catalog';
import { Colors } from '@/constants/colors';
import type { Category } from '@/types/catalog';

const CARD_WIDTH = 100;
const CARD_GAP = 12;
const LIST_PADDING = 16;

const keyExtractor = (category: Category) => category.id;

const getItemLayout = (_data: ArrayLike<Category> | null | undefined, index: number) => ({
  length: CARD_WIDTH + CARD_GAP,
  offset: LIST_PADDING + (CARD_WIDTH + CARD_GAP) * index,
  index,
});

type CategoryCardProps = {
  category: Category;
  onPress: (category: Category) => void;
};

const CategoryCard = memo(function CategoryCard({ category, onPress }: CategoryCardProps) {
  return (
    <Pressable
      onPress={() => onPress(category)}
      accessibilityRole="button"
      accessibilityLabel={`Shop ${category.name}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.emoji}>{getCategoryEmoji(category.name)}</Text>
      <Text style={styles.name} numberOfLines={2}>
        {category.name}
      </Text>
    </Pressable>
  );
});

type CategoryListProps = {
  categories: Category[];
  onCategoryPress: (category: Category) => void;
};

export const CategoryList = memo(function CategoryList({
  categories,
  onCategoryPress,
}: CategoryListProps) {
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Category>) => (
      <CategoryCard category={item} onPress={onCategoryPress} />
    ),
    [onCategoryPress],
  );

  return (
    <FlatList
      data={categories}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      ListEmptyComponent={<Text style={styles.empty}>No categories available yet.</Text>}
    />
  );
});

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: LIST_PADDING,
  },
  card: {
    alignItems: 'center',
    backgroundColor: Colors.lightBlue,
    borderRadius: 12,
    gap: 4,
    height: 90,
    justifyContent: 'center',
    marginRight: CARD_GAP,
    paddingHorizontal: 8,
    width: CARD_WIDTH,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  emoji: {
    fontSize: 26,
  },
  name: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
    textAlign: 'center',
  },
  empty: {
    color: Colors.mutedText,
    fontSize: 14,
  },
});
