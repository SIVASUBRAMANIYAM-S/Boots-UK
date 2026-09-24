import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ErrorState';
import { IconButton } from '@/components/IconButton';
import {
  PRODUCT_GRID_COLUMNS,
  PRODUCT_GRID_PADDING,
  ProductCard,
  getGridCardWidth,
  getProductRowLayout,
  productKeyExtractor,
} from '@/components/ProductCard';
import { ProductGridSkeleton } from '@/components/ProductCardSkeleton';
import { SearchBar } from '@/components/SearchBar';
import { useSkeletonPulse } from '@/components/Skeleton';
import { Toast, useToast } from '@/components/Toast';
import { getCategoryEmoji } from '@/constants/catalog';
import { Colors } from '@/constants/colors';
import { useCartCountContext } from '@/context/CartCountContext';
import { useSession } from '@/context/SessionContext';
import { useFetch } from '@/hooks/useFetch';
import { useProductActions } from '@/hooks/useProductActions';
import { fetchActiveProducts, fetchCategories } from '@/services/catalog';
import type { Product } from '@/types/catalog';

import { CategoryFilterChips } from './CategoryFilterChips';
import { SortSheet, sortProducts, type SortOption } from './SortSheet';

type ShopParams = {
  category_id?: string;
  name?: string;
  q?: string;
};

function matchesSearch(product: Product, query: string): boolean {
  return (
    product.name.toLowerCase().includes(query) ||
    (product.description?.toLowerCase().includes(query) ?? false)
  );
}

export default function ProductListScreen() {
  const { session } = useSession();
  const { category_id: categoryId, name, q } = useLocalSearchParams<ShopParams>();
  if (!session) return null;

  // Opening Shop from Home with a new category or search starts a fresh list.
  return (
    <ProductListContent
      key={`${categoryId ?? ''}|${q ?? ''}`}
      userId={session.user.id}
      initialCategoryId={categoryId ?? null}
      initialCategoryName={name ?? null}
      initialQuery={q ?? ''}
    />
  );
}

type ProductListContentProps = {
  userId: string;
  initialCategoryId: string | null;
  initialCategoryName: string | null;
  initialQuery: string;
};

function ProductListContent({
  userId,
  initialCategoryId,
  initialCategoryName,
  initialQuery,
}: ProductListContentProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const skeletonOpacity = useSkeletonPulse();
  const { toast, showToast, hideToast } = useToast();
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId);
  const [searchText, setSearchText] = useState(initialQuery);
  const [sortOption, setSortOption] = useState<SortOption>('recommended');
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);

  const { data: categories } = useFetch(fetchCategories);
  const fetchProducts = useCallback(
    () => fetchActiveProducts({ categoryId: selectedCategoryId ?? undefined }),
    [selectedCategoryId],
  );
  const { data: products, isLoading, isRefreshing, retry, refresh } = useFetch(fetchProducts);

  const { increaseCartCount } = useCartCountContext();
  const { favouriteIds, addingIds, openProduct, toggleFavourite, addToCart } = useProductActions({
    userId,
    showToast,
    onAddedToCart: increaseCartCount,
  });

  const title = useMemo(() => {
    if (!selectedCategoryId) return 'All Products';
    const category = categories?.find((item) => item.id === selectedCategoryId);
    return category?.name ?? initialCategoryName ?? 'Products';
  }, [categories, selectedCategoryId, initialCategoryName]);

  const visibleProducts = useMemo(() => {
    if (!products) return [];
    const query = searchText.trim().toLowerCase();
    const filtered = query ? products.filter((product) => matchesSearch(product, query)) : products;
    return sortProducts(filtered, sortOption);
  }, [products, searchText, sortOption]);

  const emojiByCategoryId = useMemo(
    () => new Map((categories ?? []).map((category) => [category.id, getCategoryEmoji(category.name)])),
    [categories],
  );

  const productCardWidth = useMemo(() => getGridCardWidth(width), [width]);

  const handleBack = useCallback(() => {
    // Clear the category so tapping the Shop tab later shows all products.
    router.setParams({ category_id: undefined, name: undefined });
    router.navigate('/');
  }, []);

  const openSortSheet = useCallback(() => setIsSortSheetOpen(true), []);
  const closeSortSheet = useCallback(() => setIsSortSheetOpen(false), []);
  const handleSortSelect = useCallback((option: SortOption) => {
    setSortOption(option);
    setIsSortSheetOpen(false);
  }, []);

  const handleRefresh = useCallback(async () => {
    const succeeded = await refresh();
    if (!succeeded) showToast("Couldn't refresh. Please try again.", 'error');
  }, [refresh, showToast]);

  const renderProduct = useCallback(
    ({ item }: ListRenderItemInfo<Product>) => (
      <ProductCard
        product={item}
        width={productCardWidth}
        placeholderEmoji={emojiByCategoryId.get(item.category_id ?? '') ?? getCategoryEmoji(null)}
        isFavourite={favouriteIds.has(item.id)}
        isAddingToCart={addingIds.has(item.id)}
        onPress={openProduct}
        onToggleFavourite={toggleFavourite}
        onAddToCart={addToCart}
      />
    ),
    [productCardWidth, emojiByCategoryId, favouriteIds, addingIds, openProduct, toggleFavourite, addToCart],
  );

  let content: ReactNode;
  if (!products && isLoading) {
    content = (
      <View style={styles.skeleton}>
        <ProductGridSkeleton opacity={skeletonOpacity} rows={3} />
      </View>
    );
  } else if (!products) {
    content = (
      <ErrorState
        message="We couldn't load products. Check your connection and try again."
        onAction={retry}
      />
    );
  } else {
    content = (
      <FlatList
        data={visibleProducts}
        renderItem={renderProduct}
        keyExtractor={productKeyExtractor}
        getItemLayout={getProductRowLayout}
        numColumns={PRODUCT_GRID_COLUMNS}
        contentContainerStyle={styles.gridContent}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            title="Pull to refresh"
            titleColor={Colors.mutedText}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptySubtitle}>Try a different search</Text>
          </View>
        }
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.titleRow}>
          {initialCategoryId ? (
            <IconButton icon="←" accessibilityLabel="Back" onPress={handleBack} />
          ) : null}
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          <Pressable
            onPress={openSortSheet}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Sort products"
            style={({ pressed }) => [
              styles.sortButton,
              sortOption !== 'recommended' && styles.sortButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.sortLabel}>Sort ↕</Text>
          </Pressable>
        </View>

        <View style={styles.search}>
          <SearchBar value={searchText} onChangeText={setSearchText} />
        </View>

        <CategoryFilterChips
          categories={categories ?? []}
          selectedCategoryId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
        />
      </View>

      {content}

      <SortSheet
        visible={isSortSheetOpen}
        selected={sortOption}
        onSelect={handleSortSelect}
        onClose={closeSortSheet}
      />
      <Toast toast={toast} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.lightGrey,
    flex: 1,
  },
  header: {
    backgroundColor: Colors.white,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    gap: 12,
    paddingBottom: 12,
    zIndex: 1,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  title: {
    color: Colors.darkText,
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    paddingHorizontal: 4,
  },
  sortButton: {
    borderColor: Colors.border,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  sortButtonActive: {
    backgroundColor: Colors.lightBlue,
    borderColor: Colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  sortLabel: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  search: {
    paddingHorizontal: 16,
  },
  skeleton: {
    flex: 1,
    overflow: 'hidden',
    paddingTop: 8,
  },
  gridContent: {
    flexGrow: 1,
    paddingBottom: 24,
    paddingHorizontal: PRODUCT_GRID_PADDING,
    paddingTop: 8,
  },
  empty: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyEmoji: {
    fontSize: 44,
  },
  emptyTitle: {
    color: Colors.darkText,
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: Colors.mutedText,
    fontSize: 15,
  },
});
