import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView} from 'react-native';
import {spacing, fontSize, fontWeight, borderRadius, colors} from '../theme';

interface StatusFilterProps {
  options: readonly string[];
  activeOption: string;
  onSelect: (option: string) => void;
}

const StatusFilter: React.FC<StatusFilterProps> = ({
  options,
  activeOption,
  onSelect,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}>
      {options.map(option => {
        const isActive = activeOption === option;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => onSelect(option)}
            activeOpacity={0.7}>
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
    minHeight: 50,
  },
  content: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  pill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    minHeight: 36,
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
  pillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.black,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  pillTextActive: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
});

export default StatusFilter;
