import { useCallback, useMemo, type ReactNode } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import type { Session } from '@supabase/supabase-js';

import { ErrorState } from '@/components/ErrorState';
import {
  PRODUCT_CARD_MARGIN,
  PRODUCT_GRID_COLUMNS,
  PRODUCT_GRID_PADDING,
  ProductCard,
  getGridCardWidth,
  getProductRowLayout,
  productKeyExtractor,
} from '@/components/ProductCard';
import { Toast, useToast } from '@/components/Toast';
import { getCategoryEmoji } from '@/constants/catalog';
import { Colors } from '@/constants/colors';
import { useSession } from '@/context/SessionContext';
import { useCartCount } from '@/hooks/useCartCount';
import { useHomeData } from '@/hooks/useHomeData';
import { useProductActions } from '@/hooks/useProductActions';
import type { Category, Product } from '@/types/catalog';

import { AdvantageCardBanner } from './AdvantageCardBanner';
import { CategoryList } from './CategoryList';
import { HeroBanner } from './HeroBanner';
import { HomeHeader } from './HomeHeader';
import { HomeSkeleton } from './HomeSkeleton';

function getTimeOfDayGreeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getFirstName(fullName: unknown): string | null {
  if (typeof fullName !== 'string') return null;
  const firstName = fullName.trim().split(/\s+/)[0];
  return firstName ? firstName : null;
}

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="link">
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function HomeScreen() {
  const { session } = useSession();
  // The (app) route group is only mounted while signed in.
  if (!session) return null;
  return <HomeContent session={session} />;
}

function HomeContent({ session }: { session: Session }) {
  const userId = session.user.id;
  const { width } = useWindowDimensions();
  const { toast, showToast, hideToast } = useToast();
  const { data, isLoading, isRefreshing, retry, refresh } = useHomeData(userId);
  const { cartCount, refreshCartCount, increaseCartCount } = useCartCount(userId);
  const { favouriteIds, addingIds, openProduct, toggleFavourite, addToCart } = useProductActions({
    userId,
    showToast,
    onAddedToCart: increaseCartCount,
  });

  const greeting = useMemo(() => {
    const firstName =
      getFirstName(data?.profile?.full_name) ?? getFirstName(session.user.user_metadata?.full_name);
    return `${getTimeOfDayGreeting(new Date().getHours())}, ${firstName ?? 'there'}!`;
  }, [data?.profile?.full_name, session.user.user_metadata]);

  const productCardWidth = useMemo(() => getGridCardWidth(width), [width]);

  const emojiByCategoryId = useMemo(
    () =>
      new Map((data?.categories ?? []).map((category) => [category.id, getCategoryEmoji(category.name)])),
    [data?.categories],
  );

  const handleCartPress = useCallback(() => router.navigate('/cart'), []);
  const handleViewCard = useCallback(() => router.navigate('/card'), []);
  const handleSeeAll = useCallback(() => router.navigate('/shop'), []);

  const handleSearch = useCallback((query: string) => {
    if (query) router.navigate({ pathname: '/shop', params: { q: query } });
  }, []);

  const handleCategoryPress = useCallback((category: Category) => {
    router.navigate({
      pathname: '/shop',
      params: { category_id: category.id, name: category.name },
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    const [succeeded] = await Promise.all([refresh(), refreshCartCount()]);
    if (!succeeded) showToast("Couldn't refresh. Please try again.", 'error');
  }, [refresh, refreshCartCount, showToast]);

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
  if (!data && isLoading) {
    content = <HomeSkeleton />;
  } else if (!data) {
    content = (
      <ErrorState
        message="We couldn't load the latest products. Check your connection and try again."
        onAction={retry}
      />
    );
  } else {
    content = (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
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
      >
        <HeroBanner />

        <SectionHeader title="Shop by Category" />
        <CategoryList categories={data.categories} onCategoryPress={handleCategoryPress} />

        <SectionHeader title="Featured Products" actionLabel="See All" onAction={handleSeeAll} />
        <FlatList
          data={data.products}
          renderItem={renderProduct}
          keyExtractor={productKeyExtractor}
          getItemLayout={getProductRowLayout}
          numColumns={PRODUCT_GRID_COLUMNS}
          scrollEnabled={false}
          style={styles.grid}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No featured products right now. Check back soon!</Text>
          }
        />

        <AdvantageCardBanner
          loyaltyPoints={data.profile?.loyalty_points ?? null}
          onViewCard={handleViewCard}
        />
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <HomeHeader
        greeting={greeting}
        cartCount={cartCount}
        onCartPress={handleCartPress}
        onSearch={handleSearch}
      />
      {content}
      <Toast toast={toast} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.lightGrey,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
    paddingTop: 16,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 28,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: Colors.darkText,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionAction: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  grid: {
    marginBottom: 20,
    marginTop: -PRODUCT_CARD_MARGIN,
  },
  gridContent: {
    paddingHorizontal: PRODUCT_GRID_PADDING,
  },
  emptyText: {
    color: Colors.mutedText,
    fontSize: 14,
    paddingHorizontal: PRODUCT_CARD_MARGIN,
    paddingVertical: 16,
  },
});
