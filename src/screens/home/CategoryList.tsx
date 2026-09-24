import { memo, useCallback } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View, type ListRenderItemInfo } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { getCategoryEmoji } from '@/constants/catalog';
import { Colors } from '@/constants/colors';
import type { Category } from '@/types/catalog';

const CARD_WIDTH = 108;
const CARD_HEIGHT = 128;
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
      {category.image_url ? (
        <Image
          source={{ uri: category.image_url }}
          resizeMode="cover"
          style={styles.image}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={[styles.image, styles.imageFallback]}>
          <Text style={styles.fallbackEmoji}>{getCategoryEmoji(category.name)}</Text>
        </View>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0, 0, 0, 0.75)']}
        locations={[0.35, 1]}
        style={styles.overlay}
      >
        <Text style={styles.badge}>{getCategoryEmoji(category.name)}</Text>
        <Text style={styles.name} numberOfLines={2}>
          {category.name}
        </Text>
      </LinearGradient>
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
    backgroundColor: Colors.lightBlue,
    borderRadius: 16,
    height: CARD_HEIGHT,
    marginRight: CARD_GAP,
    overflow: 'hidden',
    width: CARD_WIDTH,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  image: {
    ...StyleSheet.absoluteFill,
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackEmoji: {
    fontSize: 32,
  },
  overlay: {
    bottom: 0,
    justifyContent: 'flex-end',
    left: 0,
    padding: 8,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  badge: {
    fontSize: 18,
    marginBottom: 2,
  },
  name: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  empty: {
    color: Colors.mutedText,
    fontSize: 14,
  },
});
