import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  FlatList,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ErrorState';
import { IconButton } from '@/components/IconButton';
import { ProductCard, getGridCardWidth } from '@/components/ProductCard';
import { ProductGridSkeleton } from '@/components/ProductCardSkeleton';
import { useSkeletonPulse } from '@/components/Skeleton';
import { Toast, useToast } from '@/components/Toast';
import { Colors } from '@/constants/colors';
import { getCategoryEmoji } from '@/constants/catalog';
import { useCartCount } from '@/hooks/useCartCount';
import { useFavourites } from '@/context/FavouritesContext';
import { useSession } from '@/context/SessionContext';
import { useProductActions } from '@/hooks/useProductActions';
import { getWishlist, type WishlistEntry } from '@/services/favourites';
import { confirmAsync } from '@/utils/dialogs';

function animateRemoval() {
  if (Platform.OS !== 'web')
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

function WishlistLoading() {
  const opacity = useSkeletonPulse();
  return (
    <View style={styles.skeleton}>
      <ProductGridSkeleton opacity={opacity} rows={3} />
    </View>
  );
}

export default function WishlistScreen() {
  const { session } = useSession();
  return session ? (
    <WishlistContent key={session.user.id} userId={session.user.id} />
  ) : null;
}

function WishlistContent({ userId }: { userId: string }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { toast, showToast, hideToast } = useToast();
  useCartCount();
  const {
    favouriteIds,
    refreshFavourites,
    clearAllFavourites,
    isMutating,
    hasError,
  } = useFavourites();
  const { openProduct, toggleFavourite, addingIds, addProductToCart } =
    useProductActions({
      userId,
      showToast,
    });
  const [entries, setEntries] = useState<WishlistEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const request = useRef(0);
  const confirming = useRef(false);

  const refresh = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setError(false);
    try {
      const [rows, synced] = await Promise.all([
        getWishlist(userId),
        refreshFavourites(),
      ]);
      if (id !== request.current) return;
      if (!synced) throw new Error('Could not synchronize wishlist');
      setEntries(rows);
    } catch {
      if (id === request.current) setError(true);
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [userId, refreshFavourites]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {
        request.current += 1;
      };
    }, [refresh]),
  );

  const remove = useCallback(
    (id: string) => {
      animateRemoval();
      void toggleFavourite(id);
    },
    [toggleFavourite],
  );

  const clear = async () => {
    if (confirming.current || isMutating || loading) return;
    confirming.current = true;
    try {
      if (
        !(await confirmAsync({
          title: 'Clear your wishlist?',
          message: 'All saved products will be removed.',
          confirmLabel: 'Clear All',
          destructive: true,
        }))
      )
        return;
      animateRemoval();
      if (!(await clearAllFavourites()))
        showToast("Couldn't clear your wishlist. Please try again.", 'error');
      else showToast('Wishlist cleared');
    } finally {
      confirming.current = false;
    }
  };
  const visible =
    entries?.filter((entry) => favouriteIds.has(entry.product_id)) ?? [];

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.titleRow}>
          <IconButton
            icon="←"
            accessibilityLabel="Back"
            onPress={() =>
              router.canGoBack() ? router.back() : router.navigate('/shop')
            }
          />
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>
              My Wishlist
            </Text>
            <Text style={styles.subtitle}>
              {loading || hasError
                ? 'Your saved favourites'
                : `${favouriteIds.size} item${favouriteIds.size === 1 ? '' : 's'}`}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={loading || isMutating || hasError || !favouriteIds.size}
            onPress={clear}
            style={styles.clearButton}
          >
            <Text
              style={[
                styles.clearLabel,
                (loading || isMutating || hasError || !favouriteIds.size) &&
                  styles.disabled,
              ]}
            >
              Clear All
            </Text>
          </Pressable>
        </View>
        <Text style={styles.tagline}>
          A little inspiration, saved just for you.
        </Text>
      </View>
      {entries === null && loading ? (
        <WishlistLoading />
      ) : entries === null ? (
        <ErrorState
          message="Couldn't load your wishlist. Please try again."
          onAction={() => void refresh()}
        />
      ) : (
        <FlatList
          data={visible}
          numColumns={2}
          keyExtractor={(entry) => entry.product_id}
          contentContainerStyle={styles.grid}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void refresh()}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          ListHeaderComponent={
            error || hasError ? (
              <View style={styles.error}>
                <Text accessibilityRole="alert" style={styles.errorLabel}>
                  Couldn&apos;t refresh your wishlist.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void refresh()}
                >
                  <Text style={styles.retry}>Retry</Text>
                </Pressable>
              </View>
            ) : null
          }
          renderItem={({ item }) =>
            item.product ? (
              <ProductCard
                product={item.product}
                width={getGridCardWidth(width)}
                placeholderEmoji={getCategoryEmoji(item.product.category?.name)}
                wishlistCategory={item.product.category?.name ?? ''}
                isFavourite
                isAddingToCart={addingIds.has(item.product.id)}
                onPress={openProduct}
                onToggleFavourite={remove}
                onAddToCart={(product) => {
                  if (!addingIds.has(product.id))
                    return addProductToCart(
                      product.id,
                      1,
                      'Added to basket! 🛒',
                    );
                  return Promise.resolve(false);
                }}
              />
            ) : (
              <View
                style={[styles.unavailable, { width: getGridCardWidth(width) }]}
              >
                <Text style={styles.unavailableTitle}>Product unavailable</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove unavailable product"
                  onPress={() => remove(item.product_id)}
                >
                  <Text style={styles.clearLabel}>Remove ❤️</Text>
                </Pressable>
              </View>
            )
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyHeart}>🤍</Text>
              <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
              <Text style={styles.emptySubtitle}>Save products you love</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.navigate('/shop')}
                style={styles.explore}
              >
                <Text style={styles.exploreLabel}>Explore Products</Text>
              </Pressable>
            </View>
          }
        />
      )}
      <Toast
        toast={toast}
        onHide={hideToast}
        bottomOffset={insets.bottom + 24}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGrey },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    boxShadow: '0 4px 14px rgba(0,94,184,0.06)',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heading: { flex: 1, gap: 4 },
  title: { color: Colors.darkText, fontSize: 24, fontWeight: '800' },
  subtitle: { color: Colors.accent, fontSize: 13 },
  tagline: {
    color: Colors.mutedText,
    fontSize: 12,
    marginTop: 14,
    marginHorizontal: 12,
  },
  clearButton: { paddingVertical: 12, paddingHorizontal: 6 },
  clearLabel: { color: '#e53935', fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  skeleton: { paddingHorizontal: 8, paddingTop: 16 },
  grid: {
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  error: {
    margin: 8,
    padding: 14,
    backgroundColor: '#fff1f0',
    borderRadius: 14,
    gap: 8,
  },
  errorLabel: { color: Colors.error, fontSize: 13 },
  retry: { color: Colors.primary, fontWeight: '700' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 12,
    paddingVertical: 56,
  },
  emptyHeart: { fontSize: 72, color: Colors.mutedText },
  emptyTitle: {
    color: Colors.darkText,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: { color: Colors.mutedText, fontSize: 14 },
  explore: {
    backgroundColor: Colors.primary,
    width: 200,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  exploreLabel: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  unavailable: {
    margin: 8,
    padding: 12,
    backgroundColor: Colors.white,
    borderRadius: 16,
    gap: 16,
  },
  unavailableTitle: { color: Colors.mutedText, fontSize: 14 },
});
