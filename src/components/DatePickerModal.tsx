import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { formatDateDisplay, parseDate, toDateString } from '../utils/formatters';

interface DatePickerModalProps {
  visible: boolean;
  currentDate: string;
  onSelect: (dateStr: string) => void;
  onClose: () => void;
  title?: string;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  currentDate,
  onSelect,
  onClose,
  title = 'Select Date',
}) => {
  const initial = currentDate ? parseDate(currentDate) : new Date();
  const [selectedYear, setSelectedYear] = useState(initial.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(initial.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState(initial.getDate());

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  // Quick preset handlers
  const handleQuickPreset = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const dateStr = toDateString(d);
    onSelect(dateStr);
    onClose();
  };

  const handleEndOfMonthPreset = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const dateStr = toDateString(lastDay);
    onSelect(dateStr);
    onClose();
  };

  const handleConfirmCustom = () => {
    const d = new Date(selectedYear, selectedMonth, selectedDay);
    const dateStr = toDateString(d);
    onSelect(dateStr);
    onClose();
  };

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Presets */}
              <Text style={styles.sectionLabel}>QUICK PRESETS</Text>
              <View style={styles.presetRow}>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => handleQuickPreset(0)}
                >
                  <Text style={styles.presetChipText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => handleQuickPreset(1)}
                >
                  <Text style={styles.presetChipText}>Tomorrow</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => handleQuickPreset(3)}
                >
                  <Text style={styles.presetChipText}>+3 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => handleQuickPreset(7)}
                >
                  <Text style={styles.presetChipText}>+1 Week</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={handleEndOfMonthPreset}
                >
                  <Text style={styles.presetChipText}>End of Month</Text>
                </TouchableOpacity>
              </View>

              {/* Custom Selector */}
              <Text style={styles.sectionLabel}>SELECT SPECIFIC DATE</Text>
              <View style={styles.pickerRow}>
                {/* Day selector */}
                <View style={styles.selectorCol}>
                  <Text style={styles.colLabel}>Day</Text>
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() =>
                        setSelectedDay((d) => (d > 1 ? d - 1 : daysInMonth))
                      }
                    >
                      <Text style={styles.stepperText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperVal}>{selectedDay}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() =>
                        setSelectedDay((d) => (d < daysInMonth ? d + 1 : 1))
                      }
                    >
                      <Text style={styles.stepperText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Month selector */}
                <View style={styles.selectorCol}>
                  <Text style={styles.colLabel}>Month</Text>
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() =>
                        setSelectedMonth((m) => (m > 0 ? m - 1 : 11))
                      }
                    >
                      <Text style={styles.stepperText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperVal}>{months[selectedMonth]}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() =>
                        setSelectedMonth((m) => (m < 11 ? m + 1 : 0))
                      }
                    >
                      <Text style={styles.stepperText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Year selector */}
                <View style={styles.selectorCol}>
                  <Text style={styles.colLabel}>Year</Text>
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setSelectedYear((y) => y - 1)}
                    >
                      <Text style={styles.stepperText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperVal}>{selectedYear}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setSelectedYear((y) => y + 1)}
                    >
                      <Text style={styles.stepperText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Preview */}
              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>Selected Date:</Text>
                <Text style={styles.previewValue}>
                  {formatDateDisplay(
                    toDateString(
                      new Date(selectedYear, selectedMonth, selectedDay)
                    )
                  )}
                </Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={onClose}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.confirmBtn]}
                  onPress={handleConfirmCustom}
                >
                  <Text style={styles.confirmBtnText}>Set Date</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surfaceSolid,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  closeBtn: {
    fontSize: 18,
    color: colors.muted,
    fontWeight: 'bold',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginTop: 10,
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    backgroundColor: colors.chipBg,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '600',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  selectorCol: {
    flex: 1,
    alignItems: 'center',
  },
  colLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 6,
    fontWeight: '500',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    width: '100%',
    justifyContent: 'space-between',
    padding: 3,
  },
  stepperBtn: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
    borderRadius: 8,
  },
  stepperText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepperVal: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: '700',
  },
  previewBox: {
    backgroundColor: colors.canvas,
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  previewLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brand,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cancelBtnText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: colors.ink,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
