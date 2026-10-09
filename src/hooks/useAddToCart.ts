import { useCallback } from 'react';

import type { ShowToast } from '@/components/Toast';
import { useCartCountContext } from '@/context/CartCountContext';

type UseAddToCartOptions = {
  userId: string;
  showToast: ShowToast;
};

export function useAddToCart({ showToast }: UseAddToCartOptions) {
  const { pendingProductIds: addingIds, addProduct } = useCartCountContext();

  const addProductToCart = useCallback(
    async (
      productId: string,
      quantity = 1,
      successMessage = 'Added to cart!',
    ) => {
      try {
        await addProduct(productId, quantity);
        showToast(successMessage);
        return true;
      } catch {
        showToast("Couldn't add to cart. Please try again.", 'error');
        return false;
      }
    },
    [addProduct, showToast],
  );

  return { addingIds, addProductToCart };
}
