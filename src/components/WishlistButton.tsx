import { router } from 'expo-router';

import { CountIconButton } from '@/components/CountIconButton';
import { useFavourites } from '@/context/FavouritesContext';

export function WishlistButton() {
  const { favouriteIds, isLoading, hasError } = useFavourites();
  return (
    <CountIconButton
      icon="♥"
      label="Open wishlist"
      count={favouriteIds.size}
      loading={isLoading}
      unavailable={hasError}
      onPress={() => router.navigate('/wishlist', { withAnchor: true })}
    />
  );
}
