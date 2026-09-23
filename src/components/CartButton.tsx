import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';

const MAX_BADGE_COUNT = 99;

type CartButtonProps = {
  count: number;
  onPress: () => void;
};

export function CartButton({ count, onPress }: CartButtonProps) {
  const badgeLabel = count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(count);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.icon}>🛒</Text>
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>{badgeLabel}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  pressed: {
    opacity: 0.6,
  },
  icon: {
    fontSize: 24,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: Colors.error,
    borderColor: Colors.white,
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    minWidth: 20,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -2,
    top: 0,
  },
  badgeLabel: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
});
