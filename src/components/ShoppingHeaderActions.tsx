import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CartButton } from '@/components/CartButton';
import { WishlistButton } from '@/components/WishlistButton';
import { useCartCountContext } from '@/context/CartCountContext';

export function ShoppingHeaderActions() {
  const { cartCount } = useCartCountContext();
  return (
    <View style={styles.actions}>
      <WishlistButton />
      <CartButton count={cartCount} onPress={() => router.navigate('/cart')} />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
