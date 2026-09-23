import { StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/colors';

type BootsLogoProps = {
  size?: number;
};

export function BootsLogo({ size = 48 }: BootsLogoProps) {
  return (
    <Text
      style={[styles.logo, { fontSize: size }]}
      accessibilityRole="header"
      accessibilityLabel="Boots"
    >
      boots
    </Text>
  );
}

const styles = StyleSheet.create({
  logo: {
    color: Colors.primary,
    fontWeight: '800',
    letterSpacing: -1,
  },
});
