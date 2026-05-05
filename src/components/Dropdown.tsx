import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ViewStyle,
  ScrollView,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import {colors, spacing, borderRadius, fontSize, fontWeight} from '../theme';

export interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  options: DropdownOption[];
  selectedValue?: string;
  onSelect: (option: DropdownOption) => void;
  placeholder?: string;
  label?: string;
  style?: ViewStyle;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  selectedValue,
  onSelect,
  placeholder = 'Select...',
  label,
  style,
}) => {
  const [visible, setVisible] = useState(false);

  const selectedLabel = options.find(o => o.value === selectedValue)?.label;

  const handleSelect = useCallback(
    (option: DropdownOption) => {
      setVisible(false);
      onSelect(option);
    },
    [onSelect],
  );

  return (
    <View style={style}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}>
        <Text
          style={[
            styles.triggerText,
            !selectedLabel && styles.placeholderText,
          ]}
          numberOfLines={1}>
          {selectedLabel ?? placeholder}
        </Text>
        <FontAwesome
          name={visible ? 'chevron-up' : 'chevron-down'}
          size={12}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>

      <Modal
        transparent
        visible={visible}
        animationType="slide"
        onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.handleBar} />
            {label && <Text style={styles.sheetTitle}>{label}</Text>}
            <ScrollView
              style={styles.optionsList}
              bounces={false}
              showsVerticalScrollIndicator={false}>
              {options.map((option, index) => {
                const isSelected = option.value === selectedValue;
                return (
                  <React.Fragment key={option.value}>
                    {index > 0 && <View style={styles.divider} />}
                    <TouchableOpacity
                      style={[
                        styles.menuItem,
                        isSelected && styles.menuItemSelected,
                      ]}
                      onPress={() => handleSelect(option)}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.menuItemText,
                          isSelected && styles.selectedText,
                        ]}>
                        {option.label}
                      </Text>
                      {isSelected && (
                        <FontAwesome
                          name="check"
                          size={14}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  triggerText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.black,
    marginRight: spacing.sm,
  },
  placeholderText: {
    color: colors.mutedForeground,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xl,
    maxHeight: '50%',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginTop: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.black,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  optionsList: {
    flexGrow: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  menuItemSelected: {
    backgroundColor: '#F1F5F9',
  },
  menuItemText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.black,
  },
  selectedText: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: spacing.lg,
  },
});

export default Dropdown;
