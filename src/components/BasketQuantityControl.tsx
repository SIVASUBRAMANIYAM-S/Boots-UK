import { useRef, useState, type RefObject } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { useCartCountContext } from '@/context/CartCountContext';
import { useCartAnimation } from '@/context/CartAnimationContext';

type Props = {
  productId: string;
  productName: string;
  stockQuantity: number;
  active: boolean;
  onAdd: () => Promise<boolean>;
  addLabel?: string;
  imageRef?: RefObject<View | null>;
  imageUrl?: string | null;
  emoji?: string;
};

export function BasketQuantityControl({
  productId,
  productName,
  stockQuantity,
  active,
  onAdd,
  addLabel = 'Add to Cart',
  imageRef,
  imageUrl,
  emoji,
}: Props) {
  const source = useRef<View>(null);
  const { flyToCart } = useCartAnimation();
  const {
    quantities,
    pendingProductIds,
    cartLoading,
    cartError,
    changeProductQuantity,
    refreshCartCount,
  } = useCartCountContext();
  const quantity = quantities[productId] ?? 0;
  const busy = pendingProductIds.has(productId);
  const [error, setError] = useState(false);
  const unavailable = !active || stockQuantity <= 0;
  const max = Math.min(99, stockQuantity);
  const change = async (next: number) => {
    setError(false);
    try {
      await changeProductQuantity(productId, next);
      if (next > quantity)
        flyToCart(
          imageRef?.current ?? source.current,
          { imageUrl, emoji },
          source.current,
        );
    } catch {
      setError(true);
    }
  };
  const add = async () => {
    if (await onAdd())
      flyToCart(
        imageRef?.current ?? source.current,
        { imageUrl, emoji },
        source.current,
      );
  };
  return (
    <View ref={source} collapsable={false} style={styles.container}>
      {cartError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void refreshCartCount()}
          style={styles.retry}
        >
          <Text style={styles.retryLabel}>Basket unavailable · Retry</Text>
        </Pressable>
      ) : quantity > 0 ? (
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Decrease ${productName} quantity`}
            accessibilityHint={
              quantity === 1
                ? 'Removes this product from your basket'
                : undefined
            }
            disabled={busy || cartLoading}
            onPress={() => void change(quantity - 1)}
            style={styles.step}
          >
            <Text style={styles.minus}>−</Text>
          </Pressable>
          <View style={styles.quantityArea}>
            {busy ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text accessibilityLiveRegion="polite" style={styles.quantity}>
                {quantity}
              </Text>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Increase ${productName} quantity`}
            disabled={busy || cartLoading || unavailable || quantity >= max}
            accessibilityState={{
              disabled: busy || cartLoading || unavailable || quantity >= max,
            }}
            onPress={() => void change(quantity + 1)}
            style={[
              styles.step,
              styles.plusStep,
              (unavailable || quantity >= max) && styles.disabled,
            ]}
          >
            <Text style={styles.plus}>+</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            unavailable
              ? `${productName} is out of stock`
              : `Add ${productName} to cart`
          }
          disabled={busy || cartLoading || unavailable}
          accessibilityState={{
            busy: busy || cartLoading,
            disabled: busy || cartLoading || unavailable,
          }}
          onPress={() => void add()}
          style={[styles.add, unavailable && styles.disabled]}
        >
          {busy || cartLoading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.addLabel}>
              {unavailable ? 'Out of Stock' : addLabel}
            </Text>
          )}
        </Pressable>
      )}
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          Could not update basket. Please retry.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 40 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
    minHeight: 40,
    overflow: 'hidden',
  },
  step: {
    width: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minus: { fontSize: 23, color: Colors.white, fontWeight: '700' },
  plusStep: { backgroundColor: Colors.primary },
  plus: { fontSize: 23, color: Colors.white, fontWeight: '700' },
  quantityArea: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  quantity: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  add: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  addLabel: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  disabled: { backgroundColor: Colors.disabled },
  error: { color: Colors.error, fontSize: 10, marginTop: 4 },
  retry: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff1f0',
    borderRadius: 10,
  },
  retryLabel: { color: Colors.error, fontSize: 10, fontWeight: '700' },
});
