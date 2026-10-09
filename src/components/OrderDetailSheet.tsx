import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  findNodeHandle,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ErrorState';
import { SkeletonBox, useSkeletonPulse } from '@/components/Skeleton';
import { getCategoryEmoji } from '@/constants/catalog';
import { Colors } from '@/constants/colors';
import { getOrderDetails, type OrderDetails } from '@/services/profileService';
import { showMessage } from '@/utils/dialogs';

type OrderDetailSheetProps = {
  order_id: string | null;
  onClose: () => void;
};

type LoadState = {
  orderId: string | null;
  data: OrderDetails | null;
  error: boolean;
};

const STEPS = [
  'Order Placed',
  'Payment Confirmed',
  'Processing',
  'Delivered',
] as const;

function money(value: number | null): string {
  return value === null ? '-' : `£${value.toFixed(2)}`;
}

function placedDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

function orderStatus(status: string | null): string {
  return status?.trim() ? status.replace(/[_-]/g, ' ') : 'Unknown';
}

function timeline(
  status: string | null,
): { complete: boolean; detail: string }[] {
  const normalized = status?.trim().toLowerCase();
  const confirmed = [
    'confirmed',
    'processing',
    'shipped',
    'delivered',
  ].includes(normalized ?? '');
  const processing = ['processing', 'shipped', 'delivered'].includes(
    normalized ?? '',
  );
  const delivered = normalized === 'delivered';
  const cancelled = normalized === 'cancelled' || normalized === 'canceled';
  const known = confirmed || normalized === 'pending';
  const unavailable = cancelled ? 'Cancelled — not confirmed' : 'Not available';
  return [
    { complete: true, detail: 'Placed' },
    {
      complete: confirmed,
      detail: confirmed ? 'Confirmed' : known ? 'Pending' : unavailable,
    },
    {
      complete: processing,
      detail: delivered
        ? 'Complete'
        : normalized === 'shipped'
          ? 'Shipped'
          : normalized === 'processing'
            ? 'In progress'
            : known
              ? 'Pending'
              : unavailable,
    },
    {
      complete: delivered,
      detail: delivered ? 'Delivered' : known ? 'Pending' : unavailable,
    },
  ];
}

function LoadingDetails() {
  const opacity = useSkeletonPulse();
  return (
    <View
      style={styles.loading}
      accessibilityLabel="Loading order details"
      accessibilityRole="progressbar"
    >
      <SkeletonBox opacity={opacity} width="65%" height={28} />
      <SkeletonBox opacity={opacity} width="40%" height={18} />
      <SkeletonBox opacity={opacity} width="100%" height={200} />
      <SkeletonBox opacity={opacity} width="100%" height={100} />
      <SkeletonBox opacity={opacity} width="100%" height={130} />
    </View>
  );
}

function Details({ order }: { order: OrderDetails }) {
  const stages = timeline(order.status);
  const address = order.shipping_address;
  const addressLines = address
    ? [
        address.fullName,
        address.line1,
        address.line2,
        address.city,
        address.postcode,
        address.phone,
      ]
        .filter((line) => line?.trim())
        .join('\n') || '-'
    : '-';

  return (
    <>
      <View style={styles.summary}>
        <Text style={styles.eyebrow}>YOUR BOOTS ORDER</Text>
        <Text style={styles.orderNumber}>{order.order_number ?? order.id}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{orderStatus(order.status)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Order journey
        </Text>
        {STEPS.map((label, index) => {
          const stage = stages[index];
          return (
            <View key={label} style={styles.timelineRow}>
              <View
                style={styles.timelineTrack}
                importantForAccessibility="no-hide-descendants"
              >
                <View
                  style={[styles.dot, stage.complete && styles.dotComplete]}
                >
                  <Text
                    style={[
                      styles.dotLabel,
                      stage.complete && styles.dotLabelComplete,
                    ]}
                  >
                    {stage.complete ? '✓' : '•'}
                  </Text>
                </View>
                {index < STEPS.length - 1 ? (
                  <View style={styles.connector} />
                ) : null}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{label}</Text>
                <Text style={styles.secondary}>{stage.detail}</Text>
              </View>
              <Text style={styles.timelineDate}>
                {index === 0 ? placedDate(order.created_at) : '-'}
              </Text>
            </View>
          );
        })}
        <Text style={styles.dateNote}>
          Only the order placed date is available. Other dates: -
        </Text>
        <Text style={styles.dateNote}>
          Demo checkout — no live payment gateway is connected.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Items
        </Text>
        {order.items.length === 0 ? (
          <Text style={styles.secondary}>No item details available.</Text>
        ) : null}
        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemEmojiBox}>
              <Text style={styles.itemEmoji} importantForAccessibility="no">
                {getCategoryEmoji(item.product?.category?.name)}
              </Text>
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemName}>
                {item.product?.name || 'Product no longer available'}
              </Text>
              <Text style={styles.secondary}>
                {item.quantity ?? '-'} × {money(item.price)}
              </Text>
            </View>
            <Text style={styles.itemPrice}>
              {money(
                item.quantity === null || item.price === null
                  ? null
                  : item.quantity * item.price,
              )}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Payment summary
        </Text>
        {(
          [
            ['Subtotal', order.subtotal],
            ['Delivery', order.delivery_fee],
            ['Discount', order.discount_amount],
          ] as const
        ).map(([label, value]) => (
          <View key={label} style={styles.amountRow}>
            <Text style={styles.secondary}>{label}</Text>
            <Text style={styles.amount}>{money(value)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.total}>Total</Text>
          <Text style={styles.total}>{money(order.total_amount)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Delivery address
        </Text>
        <Text style={styles.address}>{addressLines}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => showMessage('Need help?', 'Contact support@boots.com')}
        style={({ pressed }) => [styles.helpButton, pressed && styles.pressed]}
      >
        <Text style={styles.helpLabel}>Need help?</Text>
        <Text style={styles.secondary}>We’re here for you</Text>
      </Pressable>
    </>
  );
}

export function OrderDetailSheet({ order_id, onClose }: OrderDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheetHeight = Math.max(
    0,
    Math.min(height * 0.9, height - insets.top - 12),
  );
  const translateY = useRef(new Animated.Value(height)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const closing = useRef(false);
  const closeButton = useRef<View>(null);
  const focusFrame = useRef<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState>({
    orderId: null,
    data: null,
    error: false,
  });

  useEffect(() => {
    closing.current = false;
    animation.current?.stop();
    if (order_id !== null) {
      translateY.setValue(height);
      animation.current = Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      });
      animation.current.start();
    }
    return () => {
      animation.current?.stop();
      if (focusFrame.current !== null)
        globalThis.cancelAnimationFrame(focusFrame.current);
    };
  }, [order_id, height, translateY]);

  useEffect(() => {
    let active = true;
    setState({ orderId: order_id, data: null, error: false });
    if (order_id !== null) {
      void getOrderDetails(order_id).then(
        (data) => {
          if (active) setState({ orderId: order_id, data, error: false });
        },
        () => {
          if (active) setState({ orderId: order_id, data: null, error: true });
        },
      );
    }
    return () => {
      active = false;
    };
  }, [order_id, attempt]);

  const dismiss = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    animation.current?.stop();
    animation.current = Animated.timing(translateY, {
      toValue: height,
      duration: 180,
      useNativeDriver: true,
    });
    animation.current.start(({ finished }) => {
      if (finished) onClose();
    });
  }, [height, onClose, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          !closing.current &&
          gesture.dy > 8 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => {
          animation.current?.stop();
        },
        onPanResponderMove: (_, gesture) => {
          if (!closing.current) translateY.setValue(Math.max(0, gesture.dy));
        },
        onPanResponderRelease: (_, gesture) => {
          if (closing.current) return;
          if (gesture.dy > 80 || (gesture.dy > 20 && gesture.vy > 0.8))
            dismiss();
          else {
            animation.current = Animated.timing(translateY, {
              toValue: 0,
              duration: 180,
              useNativeDriver: true,
            });
            animation.current.start();
          }
        },
        onPanResponderTerminate: () => {
          if (!closing.current) {
            animation.current = Animated.timing(translateY, {
              toValue: 0,
              duration: 180,
              useNativeDriver: true,
            });
            animation.current.start();
          }
        },
      }),
    [dismiss, translateY],
  );

  const focusClose = () => {
    if (focusFrame.current !== null)
      globalThis.cancelAnimationFrame(focusFrame.current);
    focusFrame.current = globalThis.requestAnimationFrame(() => {
      if (Platform.OS === 'web') closeButton.current?.focus();
      else {
        const node = findNodeHandle(closeButton.current);
        if (node !== null) AccessibilityInfo.setAccessibilityFocus(node);
      }
    });
  };

  const current = state.orderId === order_id;
  return (
    <Modal
      visible={order_id !== null}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
      onShow={focusClose}
    >
      <View style={styles.modal}>
        <Pressable
          style={styles.backdrop}
          onPress={dismiss}
          aria-hidden
          importantForAccessibility="no"
          accessible={false}
          focusable={false}
        />
        <Animated.View
          accessibilityViewIsModal
          onAccessibilityEscape={dismiss}
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              paddingBottom: insets.bottom,
              paddingLeft: insets.left,
              paddingRight: insets.right,
              transform: [{ translateY }],
            },
          ]}
        >
          <View
            style={styles.handleArea}
            {...panResponder.panHandlers}
            accessible={false}
          >
            <View style={styles.handle} />
          </View>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              Order details
            </Text>
            <Pressable
              ref={closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close order details"
              onPress={dismiss}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.closeLabel}>✕</Text>
            </Pressable>
          </View>
          <ScrollView
            key={order_id}
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator
          >
            {current && state.error ? (
              <View style={styles.error}>
                <ErrorState
                  title="Unable to load this order"
                  message="Please try again to view your order details."
                  onAction={() => setAttempt((value) => value + 1)}
                  actionLabel="Retry"
                />
              </View>
            ) : current && state.data ? (
              <Details order={state.data} />
            ) : (
              <LoadingDetails />
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 26, 48, 0.5)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  handleArea: { alignItems: 'center', height: 30, justifyContent: 'center' },
  handle: {
    backgroundColor: Colors.border,
    borderRadius: 3,
    height: 5,
    width: 42,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: 12,
  },
  title: { color: Colors.midnight, fontSize: 23, fontWeight: '700' },
  closeButton: {
    alignItems: 'center',
    backgroundColor: Colors.lightGrey,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  closeLabel: { color: Colors.midnight, fontSize: 20 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 22, paddingBottom: 24 },
  loading: { gap: 18, paddingVertical: 16 },
  error: { minHeight: 280, paddingVertical: 24 },
  summary: {
    alignItems: 'flex-start',
    backgroundColor: Colors.lightBlue,
    borderRadius: 18,
    gap: 10,
    padding: 18,
    marginBottom: 8,
  },
  eyebrow: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  orderNumber: { color: Colors.midnight, fontSize: 19, fontWeight: '700' },
  statusBadge: {
    backgroundColor: Colors.white,
    borderColor: Colors.gold,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statusText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  section: {
    borderBottomColor: Colors.lightGrey,
    borderBottomWidth: 1,
    paddingVertical: 20,
  },
  sectionTitle: {
    color: Colors.midnight,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
  },
  timelineRow: { flexDirection: 'row', minHeight: 64, gap: 12 },
  timelineTrack: { alignItems: 'center', width: 26 },
  dot: {
    alignItems: 'center',
    backgroundColor: Colors.lightGrey,
    borderColor: Colors.border,
    borderRadius: 13,
    borderWidth: 1,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  dotComplete: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dotLabel: { color: Colors.mutedText, fontWeight: '700' },
  dotLabelComplete: { color: Colors.white },
  connector: {
    backgroundColor: Colors.border,
    flex: 1,
    marginVertical: 4,
    width: 1,
  },
  timelineContent: { flex: 1, gap: 4, paddingBottom: 16 },
  timelineTitle: { color: Colors.midnight, fontSize: 14, fontWeight: '700' },
  timelineDate: {
    color: Colors.mutedText,
    fontSize: 12,
    maxWidth: '35%',
    paddingTop: 3,
    textAlign: 'right',
  },
  secondary: { color: Colors.mutedText, fontSize: 13, lineHeight: 19 },
  dateNote: { color: Colors.mutedText, fontSize: 11, lineHeight: 16 },
  itemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  itemEmojiBox: {
    alignItems: 'center',
    backgroundColor: Colors.lightBlue,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  itemEmoji: { fontSize: 25 },
  itemContent: { flex: 1, gap: 4 },
  itemName: {
    color: Colors.darkText,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  itemPrice: {
    color: Colors.midnight,
    fontSize: 14,
    fontWeight: '700',
    maxWidth: '30%',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 10,
  },
  amount: { color: Colors.darkText, fontSize: 14 },
  totalRow: {
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 16,
  },
  total: { color: Colors.primary, fontSize: 18, fontWeight: '800' },
  address: { color: Colors.darkText, fontSize: 14, lineHeight: 23 },
  helpButton: {
    alignItems: 'center',
    backgroundColor: Colors.lightBlue,
    borderRadius: 14,
    gap: 4,
    marginTop: 20,
    minHeight: 64,
    padding: 14,
  },
  helpLabel: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
