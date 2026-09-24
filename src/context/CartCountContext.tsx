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

import { useSession } from '@/context/SessionContext';
import { getCartCount } from '@/services/cart';

type CartCountContextValue = {
  cartCount: number;
  refreshCartCount: () => Promise<void>;
  increaseCartCount: (quantity: number) => void;
  setCartCount: (count: number) => void;
};

const CartCountContext = createContext<CartCountContextValue | null>(null);

/** One live cart count shared by the tab badge and every screen's cart button. */
export function CartCountProvider({ children }: PropsWithChildren) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const [cartCount, setCartCountState] = useState(0);
  const latestRequestId = useRef(0);

  const refreshCartCount = useCallback(async () => {
    if (!userId) return;
    const requestId = ++latestRequestId.current;
    try {
      const count = await getCartCount(userId);
      if (requestId === latestRequestId.current) setCartCountState(count);
    } catch {
      // Keep the last known count; the badge is informational only.
    }
  }, [userId]);

  // A local change supersedes any in-flight refresh.
  const setCartCount = useCallback((count: number) => {
    latestRequestId.current += 1;
    setCartCountState(Math.max(0, count));
  }, []);

  const increaseCartCount = useCallback((quantity: number) => {
    latestRequestId.current += 1;
    setCartCountState((count) => count + quantity);
  }, []);

  useEffect(() => {
    setCartCountState(0);
    void refreshCartCount();
  }, [refreshCartCount]);

  const value = useMemo(
    () => ({ cartCount, refreshCartCount, increaseCartCount, setCartCount }),
    [cartCount, refreshCartCount, increaseCartCount, setCartCount],
  );

  return <CartCountContext.Provider value={value}>{children}</CartCountContext.Provider>;
}

export function useCartCountContext(): CartCountContextValue {
  const value = useContext(CartCountContext);
  if (!value) {
    throw new Error('useCartCountContext must be used within a CartCountProvider');
  }
  return value;
}
