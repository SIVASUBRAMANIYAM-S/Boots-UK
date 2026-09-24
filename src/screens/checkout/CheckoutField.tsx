import type { PropsWithChildren, Ref } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Colors } from '@/constants/colors';

type CheckoutFieldProps = TextInputProps & {
  label: string;
  error?: string;
  ref?: Ref<TextInput>;
};

export function CheckoutField({ label, error, style, ref, ...inputProps }: CheckoutFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        style={[styles.input, error ? styles.inputError : null, style]}
        placeholderTextColor={Colors.inactive}
        accessibilityLabel={label}
        accessibilityHint={error}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/** White rounded card that groups related checkout content. */
export function CheckoutCard({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

export function SectionTitle({ children }: PropsWithChildren) {
  return (
    <Text style={styles.sectionTitle} accessibilityRole="header">
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.07)',
    gap: 14,
    padding: 16,
  },
  sectionTitle: {
    color: Colors.darkText,
    fontSize: 20,
    fontWeight: '800',
  },
  field: {
    gap: 6,
  },
  label: {
    color: Colors.darkText,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    backgroundColor: Colors.lightGrey,
    borderColor: Colors.lightGrey,
    borderRadius: 12,
    borderWidth: 1.5,
    color: Colors.darkText,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  inputError: {
    backgroundColor: '#fdf2f3',
    borderColor: Colors.error,
  },
  error: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
});
