import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BootsLogo } from '@/components/BootsLogo';
import { CartButton } from '@/components/CartButton';
import { WishlistButton } from '@/components/WishlistButton';
import { SearchWishlistBar } from '@/components/SearchWishlistBar';
import { Colors } from '@/constants/colors';

type HomeHeaderProps = {
  cartCount: number;
  onCartPress: () => void;
  onSearch: (query: string) => void;
};

export const HomeHeader = memo(function HomeHeader({
  cartCount,
  onCartPress,
  onSearch,
}: HomeHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topRow}>
        <BootsLogo size={24} />
        <View style={styles.actions}>
          <WishlistButton />
          <CartButton count={cartCount} onPress={onCartPress} />
        </View>
      </View>

      <SearchWishlistBar
        onSearchSubmit={onSearch}
        placeholder="Search Boots products..."
      />
    </View>
  );
});

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  header: {
    backgroundColor: Colors.white,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    gap: 10,
    paddingBottom: 14,
    paddingHorizontal: 16,
    zIndex: 1,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
