import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/colors';

type IconButtonProps = {
  icon: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
};

export function IconButton({ icon, accessibilityLabel, onPress, disabled = false }: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={styles.icon}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  pressed: {
    backgroundColor: Colors.lightGrey,
  },
  disabled: {
    opacity: 0.4,
  },
  icon: {
    color: Colors.darkText,
    fontSize: 22,
  },
});
