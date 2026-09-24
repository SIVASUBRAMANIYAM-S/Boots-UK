import { memo, useMemo, useRef } from 'react';
import { Animated, Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { getCategoryEmoji } from '@/constants/catalog';
import { Colors } from '@/constants/colors';
import type { CartItem } from '@/services/cart';
import { calculateLoyaltyPoints, formatUKPrice } from '@/utils/orderUtils';

const DELETE_ACTION_WIDTH = 96;
const SWIPE_ACTIVATION_DISTANCE = 10;
const MAX_QUANTITY = 99;

type CartItemCardProps = {
  item: CartItem;
  onChangeQuantity: (cartId: string, quantity: number) => void;
  onRemove: (item: CartItem) => void;
};

export const CartItemCard = memo(function CartItemCard({ item, onChangeQuantity, onRemove }: CartItemCardProps) {
  const { product, quantity } = item;
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const maxQuantity = Math.max(1, Math.min(MAX_QUANTITY, product.stock_quantity));
  const categoryName = product.category?.name ?? null;
  const lineTotal = product.price * quantity;

  const snapTo = (open: boolean) => {
    isOpen.current = open;
    Animated.spring(translateX, {
      toValue: open ? -DELETE_ACTION_WIDTH : 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Only claim clearly horizontal drags so the list still scrolls vertically.
        onMoveShouldSetPanResponder: (_event, { dx, dy }) =>
          Math.abs(dx) > SWIPE_ACTIVATION_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5,
        onPanResponderMove: (_event, { dx }) => {
          const base = isOpen.current ? -DELETE_ACTION_WIDTH : 0;
          translateX.setValue(Math.min(0, Math.max(-DELETE_ACTION_WIDTH * 1.2, base + dx)));
        },
        onPanResponderRelease: (_event, { dx, vx }) => {
          const base = isOpen.current ? -DELETE_ACTION_WIDTH : 0;
          const position = base + dx;
          snapTo(position < -DELETE_ACTION_WIDTH / 2 || vx < -0.5);
        },
        onPanResponderTerminate: () => snapTo(isOpen.current),
      }),
    // Created once: translateX and isOpen are refs, so the handlers never go stale.
    [],
  );

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => onRemove(item)}
        style={styles.swipeAction}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${product.name} from basket`}
      >
        <Text style={styles.swipeActionIcon}>🗑️</Text>
        <Text style={styles.swipeActionLabel}>Delete</Text>
      </Pressable>

      <Animated.View style={[styles.card, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <View style={styles.topRow}>
          <View style={styles.imageWrapper}>
            {product.image_url ? (
              <Image
                source={{ uri: product.image_url }}
                resizeMode="cover"
                style={styles.image}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <Text style={styles.emoji}>{getCategoryEmoji(categoryName)}</Text>
            )}
          </View>

          <View style={styles.details}>
            <Text style={styles.name} numberOfLines={2}>
              {product.name}
            </Text>
            {categoryName ? <Text style={styles.category}>{categoryName}</Text> : null}
            <Text style={styles.price}>{formatUKPrice(lineTotal)}</Text>
            {quantity > 1 ? (
              <Text style={styles.unitPrice}>{formatUKPrice(product.price)} each</Text>
            ) : null}
            <Text style={styles.points}>💳 Earns {calculateLoyaltyPoints(lineTotal)} points</Text>
          </View>
        </View>

        <View style={styles.quantityRow}>
          <View style={styles.stepper} accessibilityLabel={`Quantity ${quantity}`}>
            <Pressable
              onPress={() => onChangeQuantity(item.id, quantity - 1)}
              disabled={quantity <= 1}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Decrease quantity"
              accessibilityState={{ disabled: quantity <= 1 }}
              style={({ pressed }) => [
                styles.stepButton,
                styles.stepButtonOutline,
                quantity <= 1 && styles.stepButtonDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.stepLabel, styles.stepLabelOutline, quantity <= 1 && styles.stepLabelDisabled]}>
                −
              </Text>
            </Pressable>
            <Text style={styles.quantity} accessibilityLiveRegion="polite">
              {quantity}
            </Text>
            <Pressable
              onPress={() => onChangeQuantity(item.id, quantity + 1)}
              disabled={quantity >= maxQuantity}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Increase quantity"
              accessibilityState={{ disabled: quantity >= maxQuantity }}
              style={({ pressed }) => [
                styles.stepButton,
                styles.stepButtonFilled,
                quantity >= maxQuantity && styles.stepButtonFilledDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.stepLabel, styles.stepLabelFilled]}>+</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => onRemove(item)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${product.name} from basket`}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
          >
            <Text style={styles.deleteIcon}>🗑️</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  swipeAction: {
    alignItems: 'center',
    backgroundColor: Colors.error,
    borderRadius: 20,
    bottom: 0,
    justifyContent: 'center',
    paddingLeft: 24,
    position: 'absolute',
    right: 0,
    top: 0,
    width: DELETE_ACTION_WIDTH + 24,
  },
  swipeActionIcon: {
    fontSize: 22,
  },
  swipeActionLabel: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    gap: 14,
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    gap: 14,
  },
  imageWrapper: {
    alignItems: 'center',
    backgroundColor: Colors.lightBlue,
    borderRadius: 16,
    height: 80,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 80,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  emoji: {
    fontSize: 36,
  },
  details: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: Colors.darkText,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19,
  },
  category: {
    color: Colors.mutedText,
    fontSize: 12,
  },
  price: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  unitPrice: {
    color: Colors.mutedText,
    fontSize: 12,
  },
  points: {
    color: Colors.goldText,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  quantityRow: {
    alignItems: 'center',
    borderTopColor: Colors.lightGrey,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  stepper: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  stepButton: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  stepButtonOutline: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  stepButtonDisabled: {
    borderColor: Colors.disabled,
  },
  stepButtonFilled: {
    backgroundColor: Colors.primary,
  },
  stepButtonFilledDisabled: {
    backgroundColor: Colors.disabled,
  },
  stepLabel: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  stepLabelOutline: {
    color: Colors.primary,
  },
  stepLabelDisabled: {
    color: Colors.disabled,
  },
  stepLabelFilled: {
    color: Colors.white,
  },
  quantity: {
    color: Colors.darkText,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    minWidth: 40,
    textAlign: 'center',
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#fdecee',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  deleteIcon: {
    fontSize: 16,
  },
  pressed: {
    opacity: 0.7,
  },
});
