import React, {useState} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import {spacing, borderRadius, fontSize, colors} from '../theme';

interface SearchBarProps extends Omit<TextInputProps, 'style'> {
  onSearch?: (text: string) => void;
  onClear?: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search...',
  onSearch,
  onClear,
  value: controlledValue,
  onChangeText: controlledOnChangeText,
  ...rest
}) => {
  const [internalValue, setInternalValue] = useState('');

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const handleChangeText = (text: string) => {
    if (!isControlled) {
      setInternalValue(text);
    }
    controlledOnChangeText?.(text);
    onSearch?.(text);
  };

  const handleClear = () => {
    if (!isControlled) {
      setInternalValue('');
    }
    controlledOnChangeText?.('');
    onSearch?.('');
    onClear?.();
  };

  return (
    <View style={styles.container}>
      <FontAwesome
        name="search"
        size={16}
        color={colors.mutedForeground}
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={handleChangeText}
        autoCorrect={false}
        returnKeyType="search"
        {...rest}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          style={styles.clearButton}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <FontAwesome name="times-circle" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.foreground,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: spacing.sm,
  },
});

export default SearchBar;
