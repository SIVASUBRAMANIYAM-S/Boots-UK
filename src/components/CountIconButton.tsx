import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Colors } from '@/constants/colors';

type CountIconButtonProps = {
  icon: string;
  count: number;
  label: string;
  onPress: () => void;
  loading?: boolean;
  unavailable?: boolean;
};

export function CountIconButton({
  icon,
  count,
  label,
  onPress,
  loading = false,
  unavailable = false,
}: CountIconButtonProps) {
  const badge = unavailable ? '!' : count > 99 ? '99+' : String(count);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${loading ? 'loading count' : unavailable ? 'count unavailable' : `${count} ${count === 1 ? 'item' : 'items'}`}`}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.icon}>{icon}</Text>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={Colors.primary}
          style={styles.loading}
        />
      ) : (
        (unavailable || count > 0) && (
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>{badge}</Text>
          </View>
        )
      )}
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
  pressed: { opacity: 0.6 },
  icon: { color: Colors.primary, fontSize: 24 },
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
  badgeLabel: { color: Colors.white, fontSize: 10, fontWeight: '800' },
  loading: { position: 'absolute', right: -2, top: 0 },
});
