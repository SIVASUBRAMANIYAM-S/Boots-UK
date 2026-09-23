import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Colors } from '@/constants/colors';

type SearchBarProps = Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> & {
  value: string;
  onChangeText: (text: string) => void;
};

export function SearchBar({ value, onChangeText, ...inputProps }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔍</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search products..."
        placeholderTextColor={Colors.inactive}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel="Search products"
        {...inputProps}
        style={styles.input}
      />
      {value ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={styles.clearButton}
        >
          <Text style={styles.clearIcon}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: Colors.lightGrey,
    borderRadius: 24,
    flexDirection: 'row',
    gap: 8,
    height: 44,
    paddingHorizontal: 14,
  },
  icon: {
    fontSize: 16,
  },
  input: {
    color: Colors.darkText,
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  clearButton: {
    alignItems: 'center',
    backgroundColor: Colors.disabled,
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  clearIcon: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
});
