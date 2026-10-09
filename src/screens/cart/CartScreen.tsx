import { useCallback, useMemo, useRef, useState } from 'react';
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
  type CartItem,
} from '@/services/cart';
import { confirmAsync } from '@/utils/dialogs';

import { CartItemCard } from './CartItemCard';
import { DeliveryProgressBanner } from './DeliveryProgressBanner';
import { EmptyCart } from './EmptyCart';
import { OrderSummary, type PromoStatus } from './OrderSummary';

export default function CartScreen() {
  const { session } = useSession();
  return session ? (
    <CartContent key={session.user.id} userId={session.user.id} />
  ) : null;
}

function CartContent({ userId }: { userId: string }) {
  const insets = useSafeAreaInsets();
  const { toast, showToast, hideToast } = useToast();
  const { syncCartItems, changeProductQuantity, pendingProductIds, cartError } =
    useCartCountContext();
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [hasError, setHasError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [promoStatus, setPromoStatus] = useState<PromoStatus>(null);
  const [summaryHeight, setSummaryHeight] = useState(0);
  const request = useRef(0);
  const busy = pendingProductIds.size > 0 || clearing || refreshing;

  const load = useCallback(async () => {
    const id = ++request.current;
    setRefreshing(true);
    try {
      const next = await getCartItems(userId);
      if (id === request.current) {
        setItems(next);
        syncCartItems(next);
        setHasError(false);
      }
    } catch {
      if (id === request.current) setHasError(true);
    } finally {
      if (id === request.current) setRefreshing(false);
    }
  }, [userId, syncCartItems]);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        request.current += 1;
      };
    }, [load]),
  );

  const changeQuantity = useCallback(
    async (cartId: string, quantity: number) => {
      const item = items?.find((row) => row.id === cartId);
      if (!item || busy) return;
      if (
        quantity < 1 ||
        quantity > Math.min(99, item.product.stock_quantity)
      ) {
        showToast('That quantity is not available.', 'error');
        return;
      }
      request.current += 1;
      const previous = items;
      setItems(
        (current) =>
          current?.map((row) =>
            row.id === cartId ? { ...row, quantity } : row,
          ) ?? null,
      );
      try {
        const total = (items ?? [])
          .filter((row) => row.product.id === item.product.id)
          .reduce((sum, row) => sum + row.quantity, 0);
        await changeProductQuantity(
          item.product.id,
          total - item.quantity + quantity,
        );
        await load();
      } catch {
        setItems(previous);
        showToast("Couldn't update quantity. Please retry.", 'error');
        await load();
      }
    },
    [items, busy, changeProductQuantity, load, showToast],
  );

  const remove = useCallback(
    async (item: CartItem) => {
      if (busy) return;
      request.current += 1;
      const previous = items;
      if (Platform.OS !== 'web')
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setItems(
        (current) =>
          current?.filter((row) => row.product.id !== item.product.id) ?? null,
      );
      try {
        await changeProductQuantity(item.product.id, 0);
        showToast(`Removed ${item.product.name}`);
        await load();
      } catch {
        setItems(previous);
        showToast("Couldn't remove this product. Please retry.", 'error');
        await load();
      }
    },
    [busy, items, changeProductQuantity, load, showToast],
  );

  const clear = async () => {
    if (busy) return;
    if (
      !(await confirmAsync({
        title: 'Clear your basket?',
        message: 'All items will be removed.',
        confirmLabel: 'Clear All',
        destructive: true,
      }))
    )
      return;
    setClearing(true);
    try {
      await clearCart(userId);
      setItems([]);
      syncCartItems([]);
    } catch {
      showToast("Couldn't clear your basket. Please retry.", 'error');
    } finally {
      setClearing(false);
    }
  };

  const totals = useMemo(
    () => calculateTotal(items ?? [], { promoCode: appliedPromoCode }),
    [items, appliedPromoCode],
  );
  const hasItems = !!items?.length;
  const checkout = () => {
    if (busy || hasError || cartError || !hasItems) return;
    router.push({
      pathname: '/checkout',
      params: appliedPromoCode ? { promo: appliedPromoCode } : {},
    });
  };
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.flex}>
          <Text accessibilityRole="header" style={styles.title}>
            My Basket
          </Text>
          {items && (
            <Text style={styles.subtitle}>
              {totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'}
            </Text>
          )}
        </View>
        {hasItems && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear all items from basket"
            disabled={busy}
            onPress={clear}
            hitSlop={8}
          >
            <Text style={[styles.clearAll, busy && styles.disabled]}>
              Clear All
            </Text>
          </Pressable>
        )}
      </View>
      {!items && !hasError ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : !items ? (
        <ErrorState
          message="Couldn't load your basket. Please try again."
          onAction={() => void load()}
        />
      ) : !hasItems ? (
        <EmptyCart onStartShopping={() => router.navigate('/shop')} />
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CartItemCard
                item={item}
                busy={busy}
                onChangeQuantity={changeQuantity}
                onRemove={remove}
              />
            )}
            style={styles.flex}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View>
                <DeliveryProgressBanner subtotal={totals.subtotal} />
                {(hasError || cartError) && (
                  <View style={styles.error}>
                    <Text accessibilityRole="alert" style={styles.errorLabel}>
                      Basket needs refreshing before checkout.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void load()}
                    >
                      <Text style={styles.retry}>Retry</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                enabled={!pendingProductIds.size && !clearing}
                onRefresh={() => {
                  if (!busy) void load();
                }}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            }
          />
          <View
            onLayout={(event) =>
              setSummaryHeight(event.nativeEvent.layout.height)
            }
          >
            <OrderSummary
              totals={totals}
              appliedPromoCode={appliedPromoCode}
              promoStatus={promoStatus}
              onApplyPromo={(input) => {
                const code = normalisePromoCode(input);
                const rate = getPromoDiscountRate(code);
                if (rate === null) {
                  setPromoStatus({ kind: 'error', message: '❌ Invalid code' });
                  return;
                }
                setAppliedPromoCode(code);
                setPromoStatus({
                  kind: 'success',
                  message: `✅ ${Math.round(rate * 100)}% discount applied!`,
                });
              }}
              onRemovePromo={() => {
                setAppliedPromoCode(null);
                setPromoStatus(null);
              }}
              onCheckout={checkout}
              isCheckingOut={busy}
              checkoutDisabled={hasError || cartError}
            />
          </View>
        </KeyboardAvoidingView>
      )}
      <Toast
        toast={toast}
        onHide={hideToast}
        bottomOffset={hasItems ? summaryHeight + 12 : 20}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.lightGrey, flex: 1 },
  flex: { flex: 1 },
  header: {
    alignItems: 'flex-end',
    backgroundColor: Colors.white,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    flexDirection: 'row',
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  title: { color: Colors.darkText, fontSize: 28, fontWeight: '800' },
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
  disabled: { opacity: 0.5 },
  centered: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  listContent: { paddingBottom: 16 },
  error: {
    margin: 16,
    padding: 14,
    backgroundColor: '#fff1f0',
    borderRadius: 14,
    gap: 8,
  },
  errorLabel: { color: Colors.error, fontSize: 13 },
  retry: { color: Colors.primary, fontWeight: '700' },
});
