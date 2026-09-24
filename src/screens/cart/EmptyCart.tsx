import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';

export function EmptyCart({ onStartShopping }: { onStartShopping: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🛒</Text>
      <Text style={styles.title} accessibilityRole="header">
        Your basket is empty
      </Text>
      <Text style={styles.subtitle}>Discover our amazing products</Text>
      <Pressable
        onPress={onStartShopping}
        accessibilityRole="button"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonLabel}>Start Shopping</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    padding: 32,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 8,
    opacity: 0.45,
  },
  title: {
    color: Colors.darkText,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.mutedText,
    fontSize: 15,
  },
  button: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    marginTop: 20,
    width: 200,
  },
  pressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
});
