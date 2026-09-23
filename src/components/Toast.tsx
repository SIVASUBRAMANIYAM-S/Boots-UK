import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/colors';

const FADE_MS = 200;
const VISIBLE_MS = 1800;

type ToastVariant = 'success' | 'error';

type ToastState = {
  id: number;
  message: string;
  variant: ToastVariant;
};

export type ShowToast = (message: string, variant?: ToastVariant) => void;

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(0);

  const showToast = useCallback<ShowToast>((message, variant = 'success') => {
    nextId.current += 1;
    setToast({ id: nextId.current, message, variant });
  }, []);

  const hideToast = useCallback(() => setToast(null), []);

  return { toast, showToast, hideToast };
}

type ToastProps = {
  toast: ToastState | null;
  onHide: () => void;
  bottomOffset?: number;
};

export function Toast({ toast, onHide, bottomOffset = 20 }: ToastProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;

    progress.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: FADE_MS, useNativeDriver: true }),
      Animated.delay(VISIBLE_MS),
      Animated.timing(progress, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => {
      if (finished) onHide();
    });
    return () => animation.stop();
  }, [toast, progress, onHide]);

  if (!toast) return null;

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        toast.variant === 'error' ? styles.error : styles.success,
        { bottom: bottomOffset, opacity: progress, transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.icon}>{toast.variant === 'error' ? '!' : '✓'}</Text>
      <Text style={styles.message}>{toast.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 24,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    pointerEvents: 'none',
    position: 'absolute',
  },
  success: {
    backgroundColor: Colors.success,
  },
  error: {
    backgroundColor: Colors.error,
  },
  icon: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  message: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
