import { Stack } from 'expo-router';

import { CartCountProvider } from '@/context/CartCountContext';
import { FavouritesProvider } from '@/context/FavouritesContext';

export default function AppLayout() {
  return (
    <CartCountProvider>
      <FavouritesProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="checkout" />
          {/* No swipe back into a checkout for an order that's already placed. */}
          <Stack.Screen name="order-success" options={{ gestureEnabled: false, animation: 'fade' }} />
        </Stack>
      </FavouritesProvider>
    </CartCountProvider>
  );
}
