import { borderRadius, spacing, fontSize } from '../theme/spacing';
import React from 'react'
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { lightColors } from '../theme/colors';

interface InputProps extends Omit<TextInputProps, 'placeholder' | 'value' | 'onChangeText'> {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
}

const Input = ({ placeholder, value, onChangeText, error, ...rest }: InputProps) => {
  return <View style={styles.container}>
    <TextInput
      style={[styles.input, { color: lightColors.text }, error ? styles.inputError : undefined]}
      placeholder={placeholder}
      placeholderTextColor={lightColors.textTertiary}
      value={value}
      onChangeText={onChangeText}
      {...rest}
    />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>;
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: spacing.xs,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: lightColors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  inputError: {
    borderColor: '#DC2626',
  },
  errorText: {
    color: '#DC2626',
    fontSize: fontSize.sm,
    alignSelf: 'flex-start',
  },
});


export default Input;