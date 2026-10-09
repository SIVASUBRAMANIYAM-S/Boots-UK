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
import {
  getCartQuantities,
  setProductCartQuantity,
  type CartItem,
} from '@/services/cart';

type CartCountContextValue = {
  cartCount: number;
  quantities: Readonly<Record<string, number>>;
  pendingProductIds: ReadonlySet<string>;
  cartLoading: boolean;
  cartError: boolean;
  refreshCartCount: () => Promise<void>;
  setCartCount: (count: number) => void;
  syncCartItems: (items: readonly CartItem[]) => void;
  changeProductQuantity: (productId: string, quantity: number) => Promise<void>;
  addProduct: (productId: string, quantity: number) => Promise<void>;
};

const CartCountContext = createContext<CartCountContextValue | null>(null);

export function CartCountProvider({ children }: PropsWithChildren) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const [quantities, setQuantities] = useState<
    Readonly<Record<string, number>>
  >({});
  const quantitiesRef = useRef(quantities);
  const [cartCount, setCartCountState] = useState(0);
  const [cartLoading, setCartLoading] = useState(true);
  const [cartError, setCartError] = useState(false);
  const loadingRef = useRef(true);
  const [pendingProductIds, setPendingProductIds] = useState<
    ReadonlySet<string>
  >(new Set());
  const pending = useRef(new Set<string>());
  const version = useRef(0);
  const epoch = useRef(0);

  const publish = useCallback((next: Readonly<Record<string, number>>) => {
    quantitiesRef.current = next;
    setQuantities(next);
    setCartCountState(
      Object.values(next).reduce((sum, quantity) => sum + quantity, 0),
    );
  }, []);

  const refreshCartCount = useCallback(async () => {
    if (!userId || pending.current.size) return;
    const id = ++version.current;
    loadingRef.current = true;
    setCartLoading(true);
    try {
      const next = await getCartQuantities(userId);
      if (id === version.current) {
        publish(next);
        setCartError(false);
      }
    } catch {
      if (id === version.current) setCartError(true);
    } finally {
      if (id === version.current) {
        loadingRef.current = false;
        setCartLoading(false);
      }
    }
  }, [userId, publish]);

  const changeProductQuantity = useCallback(
    async (productId: string, quantity: number) => {
      if (!userId || loadingRef.current || cartError)
        throw new Error('Basket is unavailable. Please refresh.');
      if (pending.current.has(productId))
        throw new Error('This product is still updating.');
      const accountEpoch = epoch.current;
      version.current += 1;
      const previous = quantitiesRef.current[productId] ?? 0;
      pending.current.add(productId);
      setPendingProductIds(new Set(pending.current));
      publish({ ...quantitiesRef.current, [productId]: quantity });
      try {
        await setProductCartQuantity(userId, productId, quantity);
      } catch (error) {
        if (accountEpoch === epoch.current) {
          publish({ ...quantitiesRef.current, [productId]: previous });
          setCartError(true);
        }
        throw error;
      } finally {
        if (accountEpoch === epoch.current) {
          pending.current.delete(productId);
          setPendingProductIds(new Set(pending.current));
          if (!pending.current.size) void refreshCartCount();
        }
      }
    },
    [userId, cartError, publish, refreshCartCount],
  );

  const addProduct = useCallback(
    (productId: string, quantity: number) =>
      changeProductQuantity(
        productId,
        (quantitiesRef.current[productId] ?? 0) + quantity,
      ),
    [changeProductQuantity],
  );

  const setCartCount = useCallback(
    (count: number) => {
      version.current += 1;
      if (count === 0) publish({});
      else setCartCountState(Math.max(0, count));
    },
    [publish],
  );
  const syncCartItems = useCallback(
    (items: readonly CartItem[]) => {
      version.current += 1;
      const next: Record<string, number> = {};
      for (const item of items)
        next[item.product.id] = (next[item.product.id] ?? 0) + item.quantity;
      publish(next);
      loadingRef.current = false;
      setCartLoading(false);
      setCartError(false);
    },
    [publish],
  );

  useEffect(() => {
    publish({});
    pending.current.clear();
    setPendingProductIds(new Set());
    void refreshCartCount();
    return () => {
      version.current += 1;
      epoch.current += 1;
    };
  }, [publish, refreshCartCount]);

  const value = useMemo(
    () => ({
      cartCount,
      quantities,
      pendingProductIds,
      cartLoading,
      cartError,
      refreshCartCount,
      setCartCount,
      syncCartItems,
      changeProductQuantity,
      addProduct,
    }),
    [
      cartCount,
      quantities,
      pendingProductIds,
      cartLoading,
      cartError,
      refreshCartCount,
      setCartCount,
      syncCartItems,
      changeProductQuantity,
      addProduct,
    ],
  );
  return (
    <CartCountContext.Provider value={value}>
      {children}
    </CartCountContext.Provider>
  );
}

export function useCartCountContext(): CartCountContextValue {
  const value = useContext(CartCountContext);
  if (!value)
    throw new Error(
      'useCartCountContext must be used within a CartCountProvider',
    );
  return value;
}
