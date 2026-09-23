import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';

type ErrorStateProps = {
  message: string;
  onAction: () => void;
  emoji?: string;
  title?: string;
  actionLabel?: string;
};

export function ErrorState({
  message,
  onAction,
  emoji = '⚠️',
  title = 'Something went wrong',
  actionLabel = 'Try again',
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable
        onPress={onAction}
        accessibilityRole="button"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonLabel}>{actionLabel}</Text>
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
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 40,
  },
  title: {
    color: Colors.darkText,
    fontSize: 18,
    fontWeight: '700',
  },
  message: {
    color: Colors.mutedText,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    marginTop: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
