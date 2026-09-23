import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartButton } from '@/components/CartButton';
import { ErrorState } from '@/components/ErrorState';
import { FavouriteButton } from '@/components/FavouriteButton';
import { IconButton } from '@/components/IconButton';
import { PRODUCT_CARD_MARGIN, ProductCard, productKeyExtractor } from '@/components/ProductCard';
import { SkeletonBox, useSkeletonPulse } from '@/components/Skeleton';
import { Toast, useToast } from '@/components/Toast';
import {
  ADVANTAGE_POINTS_PER_POUND,
  LOW_STOCK_THRESHOLD,
  PLACEHOLDER_RATING,
  PLACEHOLDER_REVIEW_COUNT,
  getCategoryEmoji,
} from '@/constants/catalog';
import { Colors } from '@/constants/colors';
import { useSession } from '@/context/SessionContext';
import { useCartCount } from '@/hooks/useCartCount';
import { useProductActions } from '@/hooks/useProductActions';
import { useProductDetail } from '@/hooks/useProductDetail';
import type { Product } from '@/types/catalog';
import { formatPrice } from '@/utils/format';

import { ProductDescription } from './ProductDescription';
import { QuantitySelector } from './QuantitySelector';

const IMAGE_HEIGHT = 280;
const ADD_BUTTON_HEIGHT = 52;
const BOTTOM_BAR_PADDING = 12;
const RELATED_CARD_WIDTH = 160;
const RELATED_LIST_PADDING = 8;
const RELATED_ITEM_LENGTH = RELATED_CARD_WIDTH + PRODUCT_CARD_MARGIN * 2;

const DELIVERY_INFO = [
  { icon: '🚚', text: 'Free delivery on orders over £25' },
  { icon: '📦', text: 'Estimated delivery: 2-3 working days' },
  { icon: '🔄', text: 'Free returns within 28 days' },
] as const;

type StockStatus = { label: string; color: string };

function getStockStatus(stockQuantity: number): StockStatus {
  if (stockQuantity <= 0) return { label: '❌ Out of Stock', color: Colors.error };
  if (stockQuantity <= LOW_STOCK_THRESHOLD) {
    return { label: `⚠️ Only ${stockQuantity} left`, color: Colors.warning };
  }
  return { label: '✅ In Stock', color: Colors.success };
}

const getRelatedItemLayout = (_data: ArrayLike<Product> | null | undefined, index: number) => ({
  length: RELATED_ITEM_LENGTH,
  offset: RELATED_LIST_PADDING + RELATED_ITEM_LENGTH * index,
  index,
});

function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.navigate('/');
  }
}

export default function ProductDetailScreen() {
  const { session } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!session || !id) return null;
  return <ProductDetailContent key={id} userId={session.user.id} productId={id} />;
}

type ProductDetailContentProps = {
  userId: string;
  productId: string;
};

function ProductDetailContent({ userId, productId }: ProductDetailContentProps) {
  const insets = useSafeAreaInsets();
  const skeletonOpacity = useSkeletonPulse();
  const { toast, showToast, hideToast } = useToast();
  const { data, isLoading, retry } = useProductDetail(productId);
  const { cartCount, increaseCartCount } = useCartCount(userId);
  const { favouriteIds, addingIds, addProductToCart, openProduct, toggleFavourite, addToCart } =
    useProductActions({ userId, showToast, onAddedToCart: increaseCartCount });
  const [quantity, setQuantity] = useState(1);

  const product = data?.product ?? null;
  const relatedProducts = data?.relatedProducts ?? [];
  const categoryName = product?.category?.name ?? null;
  const categoryEmoji = getCategoryEmoji(categoryName);
  const stockQuantity = product?.stock_quantity ?? 0;
  const isOutOfStock = stockQuantity <= 0;
  const maxQuantity = Math.max(1, stockQuantity);
  const selectedQuantity = Math.min(quantity, maxQuantity);
  const isAdding = product ? addingIds.has(product.id) : false;

  const stockStatus = useMemo(() => getStockStatus(stockQuantity), [stockQuantity]);
  const lineTotal = (product?.price ?? 0) * selectedQuantity;
  const pointsToEarn = Math.floor(lineTotal * ADVANTAGE_POINTS_PER_POUND);

  const bottomBarHeight = BOTTOM_BAR_PADDING * 2 + ADD_BUTTON_HEIGHT + insets.bottom;

  const handleCartPress = useCallback(() => router.navigate('/cart'), []);

  const handleShare = useCallback(async () => {
    if (!product) return;
    try {
      await Share.share({
        title: product.name,
        message: `${product.name} – ${formatPrice(product.price)} at Boots`,
      });
    } catch {
      showToast("Couldn't open sharing on this device.", 'error');
    }
  }, [product, showToast]);

  const handleAddToCart = useCallback(() => {
    if (!product || isOutOfStock) return;
    void addProductToCart(product.id, selectedQuantity, 'Added to cart! 🎉');
  }, [product, isOutOfStock, addProductToCart, selectedQuantity]);

  const renderRelatedProduct = useCallback(
    ({ item }: ListRenderItemInfo<Product>) => (
      <ProductCard
        product={item}
        width={RELATED_CARD_WIDTH}
        placeholderEmoji={categoryEmoji}
        isFavourite={favouriteIds.has(item.id)}
        isAddingToCart={addingIds.has(item.id)}
        onPress={openProduct}
        onToggleFavourite={toggleFavourite}
        onAddToCart={addToCart}
      />
    ),
    [categoryEmoji, favouriteIds, addingIds, openProduct, toggleFavourite, addToCart],
  );

  let content: ReactNode;
  if (!data && isLoading) {
    content = (
      <View style={styles.skeleton} accessible accessibilityLabel="Loading product">
        <SkeletonBox opacity={skeletonOpacity} width="100%" height={IMAGE_HEIGHT} radius={0} />
        <View style={styles.skeletonBody}>
          <SkeletonBox opacity={skeletonOpacity} width="80%" height={24} radius={6} />
          <SkeletonBox opacity={skeletonOpacity} width="35%" height={28} radius={6} />
          <SkeletonBox opacity={skeletonOpacity} width="55%" height={16} radius={6} />
          <SkeletonBox opacity={skeletonOpacity} width="100%" height={80} radius={12} />
        </View>
      </View>
    );
  } else if (!data) {
    content = (
      <ErrorState
        message="We couldn't load this product. Check your connection and try again."
        onAction={retry}
      />
    );
  } else if (!product) {
    content = (
      <ErrorState
        emoji="🔍"
        title="Product not found"
        message="This product may no longer be available."
        actionLabel="Go back"
        onAction={goBack}
      />
    );
  } else {
    content = (
      <ScrollView contentContainerStyle={{ paddingBottom: bottomBarHeight + 16 }}>
        <View style={styles.imageArea}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              resizeMode="cover"
              style={styles.image}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Text style={styles.imageEmoji}>{categoryEmoji}</Text>
          )}
          <FavouriteButton
            isFavourite={favouriteIds.has(product.id)}
            productName={product.name}
            onPress={() => toggleFavourite(product.id)}
            size={40}
            style={styles.favourite}
          />
          {categoryName ? (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillLabel}>{categoryName}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.infoSection}>
            <Text style={styles.name} accessibilityRole="header">
              {product.name}
            </Text>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            <Text style={styles.rating}>
              ⭐⭐⭐⭐⭐ {PLACEHOLDER_RATING}
              <Text style={styles.ratingMuted}> · {PLACEHOLDER_REVIEW_COUNT} reviews</Text>
            </Text>
            <Text style={[styles.stock, { color: stockStatus.color }]}>{stockStatus.label}</Text>
          </View>

          <View style={styles.quantityRow}>
            <Text style={styles.quantityLabel}>Quantity</Text>
            <QuantitySelector
              quantity={selectedQuantity}
              min={1}
              max={maxQuantity}
              disabled={isOutOfStock}
              onChange={setQuantity}
            />
          </View>

          <ProductDescription description={product.description} />

          <View style={styles.deliveryCard}>
            {DELIVERY_INFO.map((item) => (
              <View key={item.text} style={styles.deliveryRow}>
                <Text style={styles.deliveryIcon}>{item.icon}</Text>
                <Text style={styles.deliveryText}>{item.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.pointsCard}>
            <Text style={styles.pointsIcon}>💳</Text>
            <Text style={styles.pointsText}>
              Earn <Text style={styles.pointsValue}>{pointsToEarn}</Text> Advantage Card points
            </Text>
          </View>
        </View>

        {relatedProducts.length > 0 ? (
          <View style={styles.related}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              You may also like
            </Text>
            <FlatList
              data={relatedProducts}
              renderItem={renderRelatedProduct}
              keyExtractor={productKeyExtractor}
              getItemLayout={getRelatedItemLayout}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relatedList}
            />
          </View>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="←" accessibilityLabel="Back" onPress={goBack} />
        <Text style={styles.headerTitle} numberOfLines={1}>
          {product?.name ?? ''}
        </Text>
        <CartButton count={cartCount} onPress={handleCartPress} />
        <IconButton
          icon="📤"
          accessibilityLabel="Share product"
          onPress={handleShare}
          disabled={!product}
        />
      </View>

      {content}

      {product ? (
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: BOTTOM_BAR_PADDING + insets.bottom },
          ]}
        >
          <Pressable
            onPress={handleAddToCart}
            disabled={isOutOfStock || isAdding}
            accessibilityRole="button"
            accessibilityState={{ disabled: isOutOfStock || isAdding, busy: isAdding }}
            style={({ pressed }) => [
              styles.addButton,
              isOutOfStock && styles.addButtonDisabled,
              pressed && styles.addButtonPressed,
            ]}
          >
            {isAdding ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.addLabel}>
                {isOutOfStock ? 'Out of Stock' : `Add to Cart — ${formatPrice(lineTotal)}`}
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}

      <Toast toast={toast} onHide={hideToast} bottomOffset={product ? bottomBarHeight + 12 : 20} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.lightGrey,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    flexDirection: 'row',
    gap: 4,
    paddingBottom: 6,
    paddingHorizontal: 8,
    zIndex: 1,
  },
  headerTitle: {
    color: Colors.darkText,
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  skeleton: {
    flex: 1,
  },
  skeletonBody: {
    gap: 14,
    padding: 16,
  },
  imageArea: {
    alignItems: 'center',
    backgroundColor: Colors.lightBlue,
    height: IMAGE_HEIGHT,
    justifyContent: 'center',
    width: '100%',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  imageEmoji: {
    fontSize: 120,
  },
  favourite: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  categoryPill: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    bottom: 16,
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.12)',
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    position: 'absolute',
  },
  categoryPillLabel: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    gap: 24,
    padding: 16,
  },
  infoSection: {
    gap: 6,
  },
  name: {
    color: Colors.darkText,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  price: {
    color: Colors.primary,
    fontSize: 26,
    fontWeight: '800',
  },
  rating: {
    color: Colors.darkText,
    fontSize: 14,
    fontWeight: '600',
  },
  ratingMuted: {
    color: Colors.mutedText,
    fontWeight: '400',
  },
  stock: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  quantityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quantityLabel: {
    color: Colors.darkText,
    fontSize: 16,
    fontWeight: '700',
  },
  deliveryCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
    gap: 12,
    padding: 16,
  },
  deliveryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  deliveryIcon: {
    fontSize: 20,
  },
  deliveryText: {
    color: Colors.darkText,
    flex: 1,
    fontSize: 14,
  },
  pointsCard: {
    alignItems: 'center',
    backgroundColor: Colors.lightBlue,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  pointsIcon: {
    fontSize: 24,
  },
  pointsText: {
    color: Colors.primary,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  pointsValue: {
    fontWeight: '800',
  },
  related: {
    gap: 4,
  },
  sectionTitle: {
    color: Colors.darkText,
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
  },
  relatedList: {
    paddingHorizontal: RELATED_LIST_PADDING,
  },
  bottomBar: {
    backgroundColor: Colors.white,
    bottom: 0,
    boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.08)',
    left: 0,
    paddingHorizontal: 16,
    paddingTop: BOTTOM_BAR_PADDING,
    position: 'absolute',
    right: 0,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: ADD_BUTTON_HEIGHT,
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: Colors.disabled,
  },
  addButtonPressed: {
    opacity: 0.85,
  },
  addLabel: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
