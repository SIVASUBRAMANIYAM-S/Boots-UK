import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { fetchCartItemCount } from '@/services/cart';

/** Total quantity in the user's cart, re-synced whenever the screen regains focus. */
export function useCartCount(userId: string) {
  const [cartCount, setCartCount] = useState(0);

  const refreshCartCount = useCallback(async () => {
    try {
      setCartCount(await fetchCartItemCount(userId));
    } catch {
      // Keep the last known count; the badge is informational only.
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void refreshCartCount();
    }, [refreshCartCount]),
  );

  const increaseCartCount = useCallback((quantity: number) => {
    setCartCount((count) => count + quantity);
  }, []);

  return { cartCount, refreshCartCount, increaseCartCount };
}
