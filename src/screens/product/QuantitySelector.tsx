import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';

type StepButtonProps = {
  symbol: string;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
};

function StepButton({ symbol, accessibilityLabel, disabled, onPress }: StepButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.symbol, disabled && styles.symbolDisabled]}>{symbol}</Text>
    </Pressable>
  );
}

type QuantitySelectorProps = {
  quantity: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (quantity: number) => void;
};

export function QuantitySelector({ quantity, min, max, disabled = false, onChange }: QuantitySelectorProps) {
  return (
    <View style={styles.row} accessibilityLabel={`Quantity ${quantity}`}>
      <StepButton
        symbol="−"
        accessibilityLabel="Decrease quantity"
        disabled={disabled || quantity <= min}
        onPress={() => onChange(quantity - 1)}
      />
      <Text style={[styles.value, disabled && styles.symbolDisabled]} accessibilityLiveRegion="polite">
        {quantity}
      </Text>
      <StepButton
        symbol="+"
        accessibilityLabel="Increase quantity"
        disabled={disabled || quantity >= max}
        onPress={() => onChange(quantity + 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  button: {
    alignItems: 'center',
    borderColor: Colors.primary,
    borderRadius: 20,
    borderWidth: 2,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  buttonDisabled: {
    borderColor: Colors.disabled,
  },
  buttonPressed: {
    backgroundColor: Colors.lightBlue,
  },
  symbol: {
    color: Colors.primary,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  symbolDisabled: {
    color: Colors.disabled,
  },
  value: {
    color: Colors.darkText,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },
});
