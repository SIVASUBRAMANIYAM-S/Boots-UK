import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

import { useCartCountContext } from '@/context/CartCountContext';

/** Shared cart count, re-synced with the server whenever the calling screen regains focus. */
export function useCartCount() {
  const context = useCartCountContext();
  const { refreshCartCount } = context;

  useFocusEffect(
    useCallback(() => {
      void refreshCartCount();
    }, [refreshCartCount]),
  );

  return context;
}
