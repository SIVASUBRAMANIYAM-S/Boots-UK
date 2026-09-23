import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/colors';

type FavouriteButtonProps = {
  isFavourite: boolean;
  productName: string;
  onPress: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function FavouriteButton({
  isFavourite,
  productName,
  onPress,
  size = 32,
  style,
}: FavouriteButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={
        isFavourite ? `Remove ${productName} from favourites` : `Add ${productName} to favourites`
      }
      accessibilityState={{ selected: isFavourite }}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.heart, { fontSize: size * 0.56 }, isFavourite && styles.heartActive]}>
        {isFavourite ? '♥' : '♡'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.12)',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ scale: 0.9 }],
  },
  heart: {
    color: Colors.darkText,
  },
  heartActive: {
    color: Colors.error,
  },
});
