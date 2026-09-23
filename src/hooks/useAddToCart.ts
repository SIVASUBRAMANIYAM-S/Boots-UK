import { useCallback, useState } from 'react';

import type { ShowToast } from '@/components/Toast';
import { addToCart } from '@/services/cart';

type UseAddToCartOptions = {
  userId: string;
  showToast: ShowToast;
  onAdded?: (quantity: number) => void;
};

export function useAddToCart({ userId, showToast, onAdded }: UseAddToCartOptions) {
  const [addingIds, setAddingIds] = useState<ReadonlySet<string>>(() => new Set());

  const addProductToCart = useCallback(
    async (productId: string, quantity = 1, successMessage = 'Added to cart!') => {
      setAddingIds((current) => new Set(current).add(productId));
      try {
        await addToCart(userId, productId, quantity);
        onAdded?.(quantity);
        showToast(successMessage);
      } catch {
        showToast("Couldn't add to cart. Please try again.", 'error');
      } finally {
        setAddingIds((current) => {
          const next = new Set(current);
          next.delete(productId);
          return next;
        });
      }
    },
    [userId, showToast, onAdded],
  );

  return { addingIds, addProductToCart };
}
