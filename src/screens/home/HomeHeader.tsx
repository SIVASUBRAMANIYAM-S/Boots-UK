import { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BootsLogo } from '@/components/BootsLogo';
import { CartButton } from '@/components/CartButton';
import { SearchBar } from '@/components/SearchBar';
import { Colors } from '@/constants/colors';

type HomeHeaderProps = {
  greeting: string;
  cartCount: number;
  onCartPress: () => void;
  onSearch: (query: string) => void;
};

export const HomeHeader = memo(function HomeHeader({
  greeting,
  cartCount,
  onCartPress,
  onSearch,
}: HomeHeaderProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topRow}>
        <BootsLogo size={24} />
        <CartButton count={cartCount} onPress={onCartPress} />
      </View>

      <Text style={styles.greeting} numberOfLines={1}>
        {greeting}
      </Text>

      <SearchBar value={query} onChangeText={setQuery} onSubmitEditing={() => onSearch(query.trim())} />
    </View>
  );
});

const styles = StyleSheet.create({
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
  greeting: {
    color: Colors.darkText,
    fontSize: 18,
    fontWeight: '600',
  },
});
