import type { Ref } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Colors } from '@/constants/colors';

type FormFieldProps = TextInputProps & {
  label: string;
  error?: string;
  ref?: Ref<TextInput>;
};

export function FormField({ label, error, style, ref, ...inputProps }: FormFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        style={[styles.input, error ? styles.inputError : null, style]}
        placeholderTextColor="#8a8a8a"
        accessibilityLabel={label}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    color: Colors.darkText,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.white,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    borderWidth: 1,
    color: Colors.darkText,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: Colors.error,
  },
  error: {
    color: Colors.error,
    fontSize: 13,
  },
});
