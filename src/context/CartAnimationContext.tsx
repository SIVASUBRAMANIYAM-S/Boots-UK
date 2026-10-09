import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Colors } from '@/constants/colors';

type Point = { x: number; y: number };
type Visual = { imageUrl?: string | null; emoji?: string };
type Flight = { from: Point; to: Point; visual: Visual };
type Target = { view: View; priority: number };
type AnimationContext = {
  registerTarget: (target: Target) => () => void;
  flyToCart: (
    source: View | null,
    visual: Visual,
    fallback?: View | null,
  ) => void;
};

const CartAnimationContext = createContext<AnimationContext | null>(null);
const SIZE = 52;

function measure(view: View, callback: (point: Point) => void) {
  view.measureInWindow((x, y, width, height) => {
    if (width > 0 && height > 0)
      callback({ x: x + width / 2, y: y + height / 2 });
  });
}

export function CartAnimationProvider({ children }: PropsWithChildren) {
  const container = useRef<View>(null);
  const targets = useRef(new Set<Target>());
  const reducedMotion = useRef(true);
  const mounted = useRef(true);
  const sequence = useRef(0);
  const progress = useRef(new Animated.Value(0)).current;
  const [flight, setFlight] = useState<Flight | null>(null);

  const registerTarget = useCallback((target: Target) => {
    targets.current.add(target);
    return () => {
      targets.current.delete(target);
    };
  }, []);

  const flyToCart = useCallback(
    (source: View | null, visual: Visual, fallback?: View | null) => {
      if (reducedMotion.current || !source || !container.current) return;
      const target = [...targets.current].sort(
        (a, b) => b.priority - a.priority,
      )[0];
      if (!target) return;
      const request = ++sequence.current;
      const launch = (node: View, canFallback: boolean) =>
        measure(node, (from) => {
          measure(target.view, (to) => {
            container.current?.measureInWindow((x, y, width, height) => {
              if (
                !mounted.current ||
                request !== sequence.current ||
                reducedMotion.current ||
                !targets.current.has(target)
              )
                return;
              if (
                from.x < x ||
                from.x > x + width ||
                from.y < y ||
                from.y > y + height
              ) {
                if (canFallback && fallback) launch(fallback, false);
                return;
              }
              progress.stopAnimation();
              progress.setValue(0);
              setFlight({
                from: { x: from.x - x, y: from.y - y },
                to: { x: to.x - x, y: to.y - y },
                visual,
              });
            });
          });
        });
      launch(source, true);
    },
    [progress],
  );

  useEffect(() => {
    mounted.current = true;
    let motionChanged = false;
    const updateMotion = (enabled: boolean) => {
      reducedMotion.current = enabled;
      if (enabled) {
        sequence.current += 1;
        progress.stopAnimation();
        setFlight(null);
      }
    };
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        motionChanged = true;
        updateMotion(enabled);
      },
    );
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted.current && !motionChanged) updateMotion(enabled);
      })
      .catch((error: unknown) => {
        globalThis.console.warn(
          'Could not read reduced-motion preference; cart animation disabled.',
          error,
        );
      });
    return () => {
      mounted.current = false;
      sequence.current += 1;
      subscription.remove();
      progress.stopAnimation();
    };
  }, [progress]);

  useEffect(() => {
    if (!flight) return;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 700,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
      isInteraction: false,
    });
    animation.start(({ finished }) => {
      if (finished && mounted.current) setFlight(null);
    });
    return () => animation.stop();
  }, [flight, progress]);

  const value = useMemo(
    () => ({ registerTarget, flyToCart }),
    [registerTarget, flyToCart],
  );
  return (
    <CartAnimationContext.Provider value={value}>
      <View ref={container} collapsable={false} style={styles.container}>
        {children}
        {flight && (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            aria-hidden
            style={styles.overlay}
          >
            <Animated.View
              testID="cart-product-flight"
              style={[
                styles.product,
                {
                  left: flight.from.x - SIZE / 2,
                  top: flight.from.y - SIZE / 2,
                  opacity: progress.interpolate({
                    inputRange: [0, 0.85, 1],
                    outputRange: [1, 1, 0],
                  }),
                  transform: [
                    {
                      translateX: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, flight.to.x - flight.from.x],
                      }),
                    },
                    {
                      translateY: progress.interpolate({
                        inputRange: [0, 0.35, 1],
                        outputRange: [
                          0,
                          Math.min(-70, (flight.to.y - flight.from.y) / 2 - 70),
                          flight.to.y - flight.from.y,
                        ],
                      }),
                    },
                    {
                      scale: progress.interpolate({
                        inputRange: [0, 0.2, 1],
                        outputRange: [1, 1.15, 0.25],
                      }),
                    },
                  ],
                },
              ]}
            >
              {flight.visual.imageUrl ? (
                <Image
                  source={{ uri: flight.visual.imageUrl }}
                  style={styles.image}
                />
              ) : (
                <Text style={styles.emoji}>{flight.visual.emoji ?? '🛍️'}</Text>
              )}
            </Animated.View>
          </View>
        )}
      </View>
    </CartAnimationContext.Provider>
  );
}

export function useCartAnimation() {
  const value = useContext(CartAnimationContext);
  if (!value) throw new Error('Cart animation requires CartAnimationProvider');
  return value;
}

export function CartAnimationTarget({
  children,
  header = false,
}: PropsWithChildren<{ header?: boolean }>) {
  const ref = useRef<View>(null);
  const { registerTarget } = useCartAnimation();
  useEffect(() => {
    if (!header && ref.current)
      return registerTarget({ view: ref.current, priority: 0 });
  }, [registerTarget, header]);
  useFocusEffect(
    useCallback(() => {
      if (header && ref.current)
        return registerTarget({ view: ref.current, priority: 1 });
    }, [registerTarget, header]),
  );
  return (
    <View ref={ref} collapsable={false}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  product: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: 16,
    backgroundColor: Colors.lightBlue,
    borderWidth: 2,
    borderColor: Colors.white,
    boxShadow: '0 6px 16px rgba(0,94,184,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  emoji: { fontSize: 30 },
});
