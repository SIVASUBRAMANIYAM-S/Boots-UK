import { Stack } from 'expo-router';

import { CartCountProvider } from '@/context/CartCountContext';
import { CartAnimationProvider } from '@/context/CartAnimationContext';
import { FavouritesProvider } from '@/context/FavouritesContext';
import { LoyaltyProvider } from '@/context/LoyaltyContext';

export const unstable_settings = { anchor: '(tabs)' };

export default function AppLayout() {
  return (
    <CartAnimationProvider>
      <CartCountProvider>
        <FavouritesProvider>
          <LoyaltyProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="checkout" />
              {/* No swipe back into a checkout for an order that's already placed. */}
              <Stack.Screen
                name="order-success"
                options={{ gestureEnabled: false, animation: 'fade' }}
              />
            </Stack>
          </LoyaltyProvider>
        </FavouritesProvider>
      </CartCountProvider>
    </CartAnimationProvider>
  );
}
