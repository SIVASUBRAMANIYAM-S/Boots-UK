import { memo } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { FavouriteButton } from '@/components/FavouriteButton';
import { PLACEHOLDER_RATING, PLACEHOLDER_REVIEW_COUNT } from '@/constants/catalog';
import { Colors } from '@/constants/colors';
import type { Product } from '@/types/catalog';
import { formatPrice } from '@/utils/format';

export const PRODUCT_CARD_HEIGHT = 282;
export const PRODUCT_CARD_MARGIN = 8;
const CARD_PADDING = 12;

/** Horizontal padding for a 2-column grid so outer cards line up with 16px screen gutters. */
export const PRODUCT_GRID_PADDING = 8;
export const PRODUCT_GRID_COLUMNS = 2;
export const PRODUCT_ROW_HEIGHT = PRODUCT_CARD_HEIGHT + PRODUCT_CARD_MARGIN * 2;

export function getGridCardWidth(screenWidth: number): number {
  return (
    (screenWidth - PRODUCT_GRID_PADDING * 2 - PRODUCT_CARD_MARGIN * 2 * PRODUCT_GRID_COLUMNS) /
    PRODUCT_GRID_COLUMNS
  );
}

// With numColumns, FlatList passes the row index here, not the item index.
export function getProductRowLayout(_data: ArrayLike<Product> | null | undefined, index: number) {
  return { length: PRODUCT_ROW_HEIGHT, offset: PRODUCT_ROW_HEIGHT * index, index };
}

export const productKeyExtractor = (product: Product) => product.id;

type ProductCardProps = {
  product: Product;
  width: number;
  placeholderEmoji: string;
  isFavourite: boolean;
  isAddingToCart: boolean;
  onPress: (product: Product) => void;
  onToggleFavourite: (productId: string) => void;
  onAddToCart: (product: Product) => void;
};

export const ProductCard = memo(function ProductCard({
  product,
  width,
  placeholderEmoji,
  isFavourite,
  isAddingToCart,
  onPress,
  onToggleFavourite,
  onAddToCart,
}: ProductCardProps) {
  const isOutOfStock = product.stock_quantity <= 0;
  const isAddDisabled = isOutOfStock || isAddingToCart;

  // The heart and Add button sit outside the details Pressable so screen readers
  // can reach them as separate controls.
  return (
    <View style={[styles.card, { width }]}>
      <Pressable
        onPress={() => onPress(product)}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${formatPrice(product.price)}`}
        accessibilityHint="Opens product details"
        style={({ pressed }) => pressed && styles.detailsPressed}
      >
        <View style={styles.imageWrapper}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              resizeMode="cover"
              style={styles.image}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Text style={styles.placeholderEmoji}>{placeholderEmoji}</Text>
          )}
        </View>

        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.rating} numberOfLines={1}>
          ⭐ {PLACEHOLDER_RATING} <Text style={styles.reviews}>({PLACEHOLDER_REVIEW_COUNT} reviews)</Text>
        </Text>
        <Text style={styles.price}>{formatPrice(product.price)}</Text>
      </Pressable>

      <FavouriteButton
        isFavourite={isFavourite}
        productName={product.name}
        onPress={() => onToggleFavourite(product.id)}
        style={styles.favourite}
      />

      <Pressable
        onPress={() => onAddToCart(product)}
        disabled={isAddDisabled}
        accessibilityRole="button"
        accessibilityLabel={isOutOfStock ? `${product.name} is out of stock` : `Add ${product.name} to cart`}
        accessibilityState={{ busy: isAddingToCart, disabled: isAddDisabled }}
        style={({ pressed }) => [
          styles.addButton,
          isOutOfStock && styles.addButtonDisabled,
          pressed && styles.addButtonPressed,
        ]}
      >
        {isAddingToCart ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={styles.addLabel}>{isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</Text>
        )}
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
    height: PRODUCT_CARD_HEIGHT,
    margin: PRODUCT_CARD_MARGIN,
    padding: CARD_PADDING,
  },
  detailsPressed: {
    opacity: 0.75,
  },
  imageWrapper: {
    alignItems: 'center',
    backgroundColor: Colors.lightBlue,
    borderRadius: 12,
    height: 110,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  placeholderEmoji: {
    fontSize: 40,
  },
  favourite: {
    position: 'absolute',
    right: CARD_PADDING + 8,
    top: CARD_PADDING + 8,
  },
  name: {
    color: Colors.darkText,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 10,
    minHeight: 36,
  },
  rating: {
    color: Colors.darkText,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  reviews: {
    color: Colors.mutedText,
    fontWeight: '400',
  },
  price: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    marginTop: 'auto',
  },
  addButtonDisabled: {
    backgroundColor: Colors.disabled,
  },
  addButtonPressed: {
    opacity: 0.85,
  },
  addLabel: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
