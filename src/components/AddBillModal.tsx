import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { useWallet } from '../context/WalletContext';
import { colors } from '../theme/colors';
import { radius } from '../theme/tokens';
import { BillCategory, BillFrequency } from '../types';
import { formatDateDisplay, toDateString } from '../utils/formatters';
import { DatePickerModal } from './DatePickerModal';

interface AddBillModalProps {
  visible: boolean;
  onClose: () => void;
}

const presetCategories: {
  name: BillCategory;
  icon: keyof typeof MaterialIcons.glyphMap;
  defaultTitle: string;
}[] = [
  {
    name: 'Electricity',
    icon: 'bolt',
    defaultTitle: 'Electricity (WAPDA / K-Electric)',
  },
  {
    name: 'Rent',
    icon: 'home',
    defaultTitle: 'Monthly House / Apartment Rent',
  },
  {
    name: 'Internet',
    icon: 'wifi',
    defaultTitle: 'Fiber Internet (StormFiber / PTCL)',
  },
  {
    name: 'Gas',
    icon: 'local-fire-department',
    defaultTitle: 'Sui Gas (SSGC / SNGPL)',
  },
  {
    name: 'Water',
    icon: 'water-drop',
    defaultTitle: 'Water & Tanker Bill',
  },
  {
    name: 'Credit Card',
    icon: 'credit-card',
    defaultTitle: 'Bank Credit Card Statement',
  },
  {
    name: 'Grocery',
    icon: 'shopping-cart',
    defaultTitle: 'Monthly Kitchen & Grocery',
  },
  {
    name: 'Other',
    icon: 'receipt',
    defaultTitle: 'Recurring Monthly Bill',
  },
];

export const AddBillModal: React.FC<AddBillModalProps> = ({
  visible,
  onClose,
}) => {
  const { addBill } = useWallet();
  const { height: windowHeight } = useWindowDimensions();
  const dynamicMaxHeight = Math.min(windowHeight * 0.88, 700);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BillCategory>('Electricity');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(() =>
    toDateString(new Date(Date.now() + 86400000 * 5))
  );
  const [frequency, setFrequency] = useState<BillFrequency>('monthly');
  const [customDays, setCustomDays] = useState('6');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleShow = () => {
    setTitle('Electricity (WAPDA / K-Electric)');
    setCategory('Electricity');
    setAmount('');
    setDueDate(toDateString(new Date(Date.now() + 86400000 * 5)));
    setFrequency('monthly');
    setCustomDays('6');
  };

  const handleCategorySelect = (preset: typeof presetCategories[0]) => {
    setCategory(preset.name);
    if (!title || presetCategories.some((p) => p.defaultTitle === title)) {
      setTitle(preset.defaultTitle);
    }
  };

  const handleSave = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      alert('Please enter a bill title or provider.');
      return;
    }

    const cleanAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      alert('Please enter an estimated bill amount in Rs.');
      return;
    }

    await addBill(
      cleanTitle,
      category,
      cleanAmount,
      dueDate,
      frequency,
      parseInt(customDays, 10) || 6
    );
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
        onShow={handleShow}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.keyboardView}
            >
              <TouchableWithoutFeedback>
                <View style={[styles.sheetContainer, { maxHeight: dynamicMaxHeight }]}>
                  {/* Drag Handle */}
                  <View style={styles.handleBar} />

                  {/* Header Title */}
                  <View style={styles.titleRow}>
                    <Text style={styles.sheetTitle}>Schedule Recurring Bill</Text>
                    <TouchableOpacity
                      onPress={onClose}
                      style={styles.closeBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialIcons name="close" size={20} color={colors.muted} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                  >
                    {/* Centered Large Amount Input */}
                    <View style={styles.amountSection}>
                      <Text style={styles.amountLabel}>Estimated Bill Amount</Text>
                      <View style={styles.amountInputRow}>
                        <Text style={styles.amountPrefix}>Rs.</Text>
                        <TextInput
                          style={styles.amountInput}
                          placeholder="0"
                          placeholderTextColor={colors.line}
                          keyboardType="numeric"
                          value={amount}
                          onChangeText={(txt) => setAmount(txt.replace(/[^0-9]/g, ''))}
                          autoFocus
                        />
                      </View>
                    </View>

                    {/* Preset Categories */}
                    <View style={styles.sectionBlock}>
                      <Text style={styles.sectionHeading}>Category</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoryScroll}
                      >
                        {presetCategories.map((p) => {
                          const isSelected = category === p.name;
                          return (
                            <TouchableOpacity
                              key={p.name}
                              style={[
                                styles.catChip,
                                isSelected && styles.catChipActive,
                              ]}
                              onPress={() => handleCategorySelect(p)}
                              activeOpacity={0.7}
                            >
                              <MaterialIcons
                                name={p.icon}
                                size={15}
                                color={isSelected ? '#FFFFFF' : colors.muted}
                              />
                              <Text
                                style={[
                                  styles.catText,
                                  isSelected && styles.catTextActive,
                                ]}
                              >
                                {p.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>

                    {/* Bill Title / Provider */}
                    <View style={styles.sectionBlock}>
                      <Text style={styles.sectionHeading}>Bill title / provider</Text>
                      <TextInput
                        style={styles.fieldInput}
                        placeholder="e.g. LESCO, StormFiber, Landlord Rent"
                        placeholderTextColor={colors.subtle}
                        value={title}
                        onChangeText={setTitle}
                      />
                    </View>

                    {/* Due Date Selector */}
                    <View style={styles.sectionBlock}>
                      <Text style={styles.sectionHeading}>Due / last payment date</Text>
                      <TouchableOpacity
                        style={styles.dateSelectorCard}
                        onPress={() => setShowDatePicker(true)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.dateInfoRow}>
                          <View style={styles.calendarIconBox}>
                            <MaterialIcons
                              name="event"
                              size={18}
                              color={colors.ink}
                            />
                          </View>
                          <View>
                            <Text style={styles.dateValue}>
                              {formatDateDisplay(dueDate)}
                            </Text>
                            <Text style={styles.dateSub}>Tap to change payment deadline</Text>
                          </View>
                        </View>
                        <MaterialIcons
                          name="edit-calendar"
                          size={18}
                          color={colors.subtle}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Recurring Frequency Selector */}
                    <View style={styles.sectionBlock}>
                      <Text style={styles.sectionHeading}>Recurring frequency</Text>
                      <View style={styles.freqRow}>
                        {[
                          { id: 'monthly', label: 'Monthly' },
                          { id: 'weekly', label: 'Weekly' },
                          { id: 'quarterly', label: '3 Months' },
                          { id: 'custom_days', label: 'Custom' },
                        ].map((f) => {
                          const isSelected = frequency === f.id;
                          return (
                            <TouchableOpacity
                              key={f.id}
                              style={[
                                styles.freqChip,
                                isSelected && styles.freqChipActive,
                              ]}
                              onPress={() => setFrequency(f.id as BillFrequency)}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.freqChipText,
                                  isSelected && styles.freqChipTextActive,
                                ]}
                              >
                                {f.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {frequency === 'custom_days' && (
                        <View style={styles.customDaysRow}>
                          <Text style={styles.customDaysLabel}>Repeats every</Text>
                          <View style={styles.customDaysInputWrap}>
                            <TextInput
                              style={styles.customDaysInput}
                              value={customDays}
                              onChangeText={(t) => setCustomDays(t.replace(/[^0-9]/g, ''))}
                              keyboardType="numeric"
                              maxLength={3}
                            />
                            <Text style={styles.customDaysUnit}>days</Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                      style={styles.submitBtn}
                      onPress={handleSave}
                      activeOpacity={0.85}
                    >
                      <MaterialIcons name="add-task" size={18} color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>Schedule &amp; Set Reminder</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        currentDate={dueDate}
        title="Select Bill Due Date"
        onSelect={(date) => setDueDate(date)}
        onClose={() => setShowDatePicker(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 20, 25, 0.55)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    width: '100%',
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    maxHeight: '90%',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    alignSelf: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  amountSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  amountLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.muted,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    gap: 6,
  },
  amountPrefix: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.subtle,
    includeFontPadding: false,
  },
  amountInput: {
    fontSize: 38,
    fontWeight: '700',
    color: colors.ink,
    minWidth: 40,
    textAlign: 'left',
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.canvas,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  catChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  catText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.ink,
  },
  catTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  fieldInput: {
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 15,
  },
  dateSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calendarIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  dateValue: {
    fontSize: 14.5,
    fontWeight: '600',
    color: colors.ink,
  },
  dateSub: {
    fontSize: 11,
    color: colors.subtle,
    marginTop: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.pill,
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  freqRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freqChip: {
    flex: 1,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  freqChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.muted,
  },
  freqChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  customDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    backgroundColor: colors.canvas,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  customDaysLabel: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '500',
  },
  customDaysInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customDaysInput: {
    width: 50,
    height: 34,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  customDaysUnit: {
    fontSize: 13,
    color: colors.ink,
    fontWeight: '600',
  },
});
