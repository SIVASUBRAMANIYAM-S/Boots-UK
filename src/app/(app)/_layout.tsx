import { Stack } from 'expo-router';

import { FavouritesProvider } from '@/context/FavouritesContext';

export default function AppLayout() {
  return (
    <FavouritesProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </FavouritesProvider>
  );
}
