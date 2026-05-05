import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {borderRadius, colors, fontSize, fontWeight, spacing} from '../theme';

const formatDate = (date: Date): string => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

interface CalendarProps {
  fromDate?: Date | null;
  toDate?: Date | null;
  onFromChange?: (date: Date) => void;
  onToChange?: (date: Date) => void;
}

const Calendar: React.FC<CalendarProps> = ({
  fromDate = null,
  toDate = null,
  onFromChange,
  onToChange,
}) => {
  const [pickerTarget, setPickerTarget] = useState<'from' | 'to' | null>(null);

  const handleChange = useCallback(
    (_event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setPickerTarget(null);
      }
      if (_event.type === 'dismissed') {
        setPickerTarget(null);
        return;
      }
      if (!selectedDate) return;

      if (pickerTarget === 'from') onFromChange?.(selectedDate);
      else if (pickerTarget === 'to') onToChange?.(selectedDate);

      if (Platform.OS === 'android') {
        setPickerTarget(null);
      }
    },
    [pickerTarget, onFromChange, onToChange],
  );

  const handleIOSConfirm = () => {
    setPickerTarget(null);
  };

  const currentValue =
    pickerTarget === 'from'
      ? fromDate ?? new Date()
      : pickerTarget === 'to'
        ? toDate ?? new Date()
        : new Date();

  const renderPicker = () => {
    if (pickerTarget === null) return null;

    const picker = (
      <DateTimePicker
        value={currentValue}
        mode="date"
        display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
        onChange={handleChange}
        minimumDate={pickerTarget === 'to' && fromDate ? fromDate : undefined}
        maximumDate={pickerTarget === 'from' && toDate ? toDate : undefined}
        accentColor={colors.primary}
      />
    );

    if (Platform.OS === 'ios') {
      return (
        <Modal
          transparent
          animationType="slide"
          visible
          onRequestClose={() => setPickerTarget(null)}>
          <Pressable style={styles.overlay} onPress={() => setPickerTarget(null)}>
            <View style={styles.sheet} onStartShouldSetResponder={() => true}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>
                  {pickerTarget === 'from' ? 'Select From Date' : 'Select To Date'}
                </Text>
                <TouchableOpacity onPress={handleIOSConfirm}>
                  <Text style={styles.doneButton}>Done</Text>
                </TouchableOpacity>
              </View>
              {picker}
            </View>
          </Pressable>
        </Modal>
      );
    }

    return picker;
  };

  return (
    <View style={styles.container}>
      <Ionicons
        name="calendar-outline"
        size={16}
        color={colors.primary}
      />
      <TouchableOpacity
        style={styles.dateField}
        onPress={() => setPickerTarget('from')}
        activeOpacity={0.7}>
        <Text style={styles.label}>From: </Text>
        <Text style={styles.dateText}>
          {fromDate ? formatDate(fromDate) : ''}
        </Text>
      </TouchableOpacity>

      <Text style={styles.divider}>|</Text>

      <TouchableOpacity
        style={styles.dateField}
        onPress={() => setPickerTarget('to')}
        activeOpacity={0.7}>
        <Text style={styles.label}>To: </Text>
        <Text style={styles.dateText}>
          {toDate ? formatDate(toDate) : ''}
        </Text>
      </TouchableOpacity>

      {renderPicker()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.foreground,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  dateField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  dateText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.mutedForeground,
  },
  divider: {
    fontSize: fontSize.lg,
    color: colors.foreground,
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
    paddingHorizontal: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  sheetTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  doneButton: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});

export default Calendar;
