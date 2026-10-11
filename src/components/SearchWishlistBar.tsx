import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors } from '@/constants/colors';

type SearchWishlistBarProps = {
  onSearch?: (text: string) => void;
  onSearchSubmit?: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  value?: string;
};

export function SearchWishlistBar({
  onSearch,
  onSearchSubmit,
  placeholder = 'Search products...',
  autoFocus = false,
  value,
}: SearchWishlistBarProps) {
  const [query, setQuery] = useState('');
  const text = value ?? query;
  const change = (next: string) => {
    setQuery(next);
    onSearch?.(next);
  };
  return (
    <View style={styles.row}>
      <View style={styles.search}>
        <Text style={styles.icon}>🔍</Text>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={change}
          placeholder={placeholder}
          placeholderTextColor={Colors.mutedText}
          autoFocus={autoFocus}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search products"
          onSubmitEditing={() => onSearchSubmit?.(text.trim())}
        />
        {text.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => change('')}
            hitSlop={8}
            style={styles.clear}
          >
            <Text style={styles.clearText}>✕</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  search: {
    flex: 1,
    minWidth: 0,
    height: 46,
    backgroundColor: Colors.lightGrey,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  icon: { fontSize: 16, color: Colors.mutedText },
  input: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    color: Colors.darkText,
    fontSize: 14,
  },
  clear: {
    width: 24,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: { color: Colors.mutedText, fontSize: 14 },
});
