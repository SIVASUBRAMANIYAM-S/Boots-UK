import { useCallback } from 'react';
import { router } from 'expo-router';

import type { ShowToast } from '@/components/Toast';
import { useFavourites } from '@/context/FavouritesContext';
import { useAddToCart } from '@/hooks/useAddToCart';
import type { Product } from '@/types/catalog';

type UseProductActionsOptions = {
  userId: string;
  showToast: ShowToast;
  onAddedToCart?: (quantity: number) => void;
};

/** Handlers shared by every screen that renders ProductCards. */
export function useProductActions({ userId, showToast, onAddedToCart }: UseProductActionsOptions) {
  const { favouriteIds, toggleFavourite } = useFavourites();
  const { addingIds, addProductToCart } = useAddToCart({
    userId,
    showToast,
    onAdded: onAddedToCart,
  });

  const openProduct = useCallback((product: Product) => {
    router.push({ pathname: '/product/[id]', params: { id: product.id } });
  }, []);

  const handleToggleFavourite = useCallback(
    async (productId: string) => {
      const saved = await toggleFavourite(productId);
      if (!saved) showToast("Couldn't update favourites. Please try again.", 'error');
    },
    [toggleFavourite, showToast],
  );

  const handleAddToCart = useCallback(
    (product: Product) => addProductToCart(product.id),
    [addProductToCart],
  );

  return {
    favouriteIds,
    addingIds,
    addProductToCart,
    openProduct,
    toggleFavourite: handleToggleFavourite,
    addToCart: handleAddToCart,
  };
}
