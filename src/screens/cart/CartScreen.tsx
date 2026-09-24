import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ErrorState';
import { Toast, useToast } from '@/components/Toast';
import { getPromoDiscountRate, normalisePromoCode } from '@/constants/checkout';
import { Colors } from '@/constants/colors';
import { useCartCountContext } from '@/context/CartCountContext';
import { useSession } from '@/context/SessionContext';
import {
  calculateTotal,
  clearCart,
  getCartItems,
  removeItem,
  updateQuantity,
  type CartItem,
} from '@/services/cart';
import { confirmAsync } from '@/utils/dialogs';

import { CartItemCard } from './CartItemCard';
import { DeliveryProgressBanner } from './DeliveryProgressBanner';
import { EmptyCart } from './EmptyCart';
import { OrderSummary, type PromoStatus } from './OrderSummary';

// Rapid +/− taps are coalesced into one write per item.
const QUANTITY_SAVE_DELAY_MS = 400;

const keyExtractor = (item: CartItem) => item.id;

function animateNextLayout() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

export default function CartScreen() {
  const { session } = useSession();
  if (!session) return null;
  return <CartContent userId={session.user.id} />;
}

function CartContent({ userId }: { userId: string }) {
  const insets = useSafeAreaInsets();
  const { toast, showToast, hideToast } = useToast();
  const { setCartCount } = useCartCountContext();

  const [items, setItems] = useState<CartItem[] | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [promoStatus, setPromoStatus] = useState<PromoStatus>(null);

  const latestLoadId = useRef(0);
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingQuantities = useRef(new Map<string, number>());
  const inFlightSaves = useRef(new Map<string, Promise<void>>());
  const [summaryHeight, setSummaryHeight] = useState(0);

  const load = useCallback(async (): Promise<boolean> => {
    const loadId = ++latestLoadId.current;
    try {
      const nextItems = await getCartItems(userId);
      if (loadId === latestLoadId.current) {
        setItems(nextItems);
        setHasError(false);
      }
      return true;
    } catch {
      if (loadId === latestLoadId.current) setHasError(true);
      return false;
    }
  }, [userId]);

  const saveQuantity = useCallback(
    (cartId: string): Promise<void> => {
      saveTimers.current.delete(cartId);
      const quantity = pendingQuantities.current.get(cartId);
      const previous = inFlightSaves.current.get(cartId) ?? Promise.resolve();
      if (quantity === undefined) return previous;
      pendingQuantities.current.delete(cartId);

      // Chain saves per item so an older quantity can never land after a newer one.
      const request = previous
        .then(() => updateQuantity(cartId, quantity))
        .catch(async () => {
          showToast("Couldn't update quantity. Please try again.", 'error');
          await load();
        })
        .finally(() => {
          if (inFlightSaves.current.get(cartId) === request) inFlightSaves.current.delete(cartId);
        });
      inFlightSaves.current.set(cartId, request);
      return request;
    },
    [load, showToast],
  );

  /** Sends any debounced quantity changes immediately and waits for every save to land. */
  const flushPendingSaves = useCallback(async () => {
    for (const [cartId, timer] of saveTimers.current) {
      clearTimeout(timer);
      void saveQuantity(cartId);
    }
    await Promise.all(inFlightSaves.current.values());
  }, [saveQuantity]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        void flushPendingSaves();
      };
    }, [load, flushPendingSaves]),
  );

  // Keep the tab badge in step with what the customer sees here.
  useEffect(() => {
    if (items) setCartCount(items.reduce((count, item) => count + item.quantity, 0));
  }, [items, setCartCount]);

  const totals = useMemo(
    () => calculateTotal(items ?? [], { promoCode: appliedPromoCode }),
    [items, appliedPromoCode],
  );

  const handleChangeQuantity = useCallback(
    (cartId: string, quantity: number) => {
      if (quantity < 1) return;
      // A newer load would overwrite this optimistic change.
      latestLoadId.current += 1;
      setItems((current) => current?.map((item) => (item.id === cartId ? { ...item, quantity } : item)) ?? null);
      pendingQuantities.current.set(cartId, quantity);
      clearTimeout(saveTimers.current.get(cartId));
      saveTimers.current.set(
        cartId,
        setTimeout(() => void saveQuantity(cartId), QUANTITY_SAVE_DELAY_MS),
      );
    },
    [saveQuantity],
  );

  const handleRemove = useCallback(
    async (item: CartItem) => {
      clearTimeout(saveTimers.current.get(item.id));
      saveTimers.current.delete(item.id);
      pendingQuantities.current.delete(item.id);
      latestLoadId.current += 1;

      animateNextLayout();
      setItems((current) => current?.filter((row) => row.id !== item.id) ?? null);
      try {
        await removeItem(item.id);
        showToast(`Removed ${item.product.name}`);
      } catch {
        showToast("Couldn't remove item. Please try again.", 'error');
        await load();
      }
    },
    [load, showToast],
  );

  const handleClearAll = useCallback(async () => {
    const confirmed = await confirmAsync({
      title: 'Clear your basket?',
      message: 'All items will be removed from your basket.',
      confirmLabel: 'Clear All',
      destructive: true,
    });
    if (!confirmed) return;

    saveTimers.current.forEach((timer) => clearTimeout(timer));
    saveTimers.current.clear();
    pendingQuantities.current.clear();
    latestLoadId.current += 1;

    animateNextLayout();
    setItems([]);
    try {
      await clearCart(userId);
    } catch {
      showToast("Couldn't clear your basket. Please try again.", 'error');
      await load();
    }
  }, [load, showToast, userId]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await flushPendingSaves();
    const succeeded = await load();
    setIsRefreshing(false);
    if (!succeeded) showToast("Couldn't refresh. Please try again.", 'error');
  }, [flushPendingSaves, load, showToast]);

  const handleApplyPromo = useCallback((input: string) => {
    const code = normalisePromoCode(input);
    const rate = getPromoDiscountRate(code);
    if (rate === null) {
      setPromoStatus({ kind: 'error', message: '❌ Invalid code' });
      return;
    }
    setAppliedPromoCode(code);
    setPromoStatus({ kind: 'success', message: `✅ ${Math.round(rate * 100)}% discount applied!` });
  }, []);

  const handleRemovePromo = useCallback(() => {
    setAppliedPromoCode(null);
    setPromoStatus(null);
  }, []);

  const handleCheckout = useCallback(async () => {
    setIsCheckingOut(true);
    // Checkout reads the cart from the server, so make sure it's up to date.
    await flushPendingSaves();
    setIsCheckingOut(false);
    router.push({ pathname: '/checkout', params: appliedPromoCode ? { promo: appliedPromoCode } : {} });
  }, [appliedPromoCode, flushPendingSaves]);

  const handleStartShopping = useCallback(() => router.navigate('/shop'), []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<CartItem>) => (
      <CartItemCard item={item} onChangeQuantity={handleChangeQuantity} onRemove={handleRemove} />
    ),
    [handleChangeQuantity, handleRemove],
  );

  const hasItems = (items?.length ?? 0) > 0;

  let content: ReactNode;
  if (!items && !hasError) {
    content = (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  } else if (!items) {
    content = (
      <ErrorState message="We couldn't load your basket. Check your connection and try again." onAction={load} />
    );
  } else if (!hasItems) {
    content = <EmptyCart onStartShopping={handleStartShopping} />;
  } else {
    content = (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          style={styles.flex}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={<DeliveryProgressBanner subtotal={totals.subtotal} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
        <View onLayout={(event) => setSummaryHeight(event.nativeEvent.layout.height)}>
          <OrderSummary
            totals={totals}
            appliedPromoCode={appliedPromoCode}
            promoStatus={promoStatus}
            onApplyPromo={handleApplyPromo}
            onRemovePromo={handleRemovePromo}
            onCheckout={handleCheckout}
            isCheckingOut={isCheckingOut}
          />
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.flex}>
          <Text style={styles.title} accessibilityRole="header">
            My Basket
          </Text>
          {items ? (
            <Text style={styles.subtitle}>
              {totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'}
            </Text>
          ) : null}
        </View>
        {hasItems ? (
          <Pressable
            onPress={handleClearAll}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear all items from basket"
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.clearAll}>Clear All</Text>
          </Pressable>
        ) : null}
      </View>

      {content}

      <Toast toast={toast} onHide={hideToast} bottomOffset={hasItems ? summaryHeight + 12 : 20} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.lightGrey,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    alignItems: 'flex-end',
    backgroundColor: Colors.white,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    flexDirection: 'row',
    paddingBottom: 14,
    paddingHorizontal: 20,
    zIndex: 1,
  },
  title: {
    color: Colors.darkText,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.accent,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  clearAll: {
    color: Colors.error,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  pressed: {
    opacity: 0.6,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 16,
  },
});
