import { Stack } from 'expo-router';

export const unstable_settings = { anchor: 'shop' };

export default function ShoppingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="shop" />
      <Stack.Screen name="wishlist" />
    </Stack>
  );
}
