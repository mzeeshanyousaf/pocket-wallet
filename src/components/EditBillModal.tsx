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
import { Bill, BillCategory, BillFrequency } from '../types';
import { formatDateDisplay } from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';
import { DatePickerModal } from './DatePickerModal';

interface EditBillModalProps {
  visible: boolean;
  bill: Bill | null;
  onClose: () => void;
}

const presetCategories: {
  name: BillCategory;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  { name: 'Electricity', icon: 'bolt' },
  { name: 'Rent', icon: 'home' },
  { name: 'Internet', icon: 'wifi' },
  { name: 'Gas', icon: 'local-fire-department' },
  { name: 'Water', icon: 'water-drop' },
  { name: 'Credit Card', icon: 'credit-card' },
  { name: 'Grocery', icon: 'shopping-cart' },
  { name: 'Other', icon: 'receipt' },
];

export const EditBillModal: React.FC<EditBillModalProps> = ({
  visible,
  bill,
  onClose,
}) => {
  const { editBill, deleteBill } = useWallet();

  const { height: windowHeight } = useWindowDimensions();
  const dynamicMaxHeight = Math.min(windowHeight * 0.92, 740);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BillCategory>('Other');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [frequency, setFrequency] = useState<BillFrequency>('monthly');
  const [customDays, setCustomDays] = useState('6');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleShow = () => {
    if (bill) {
      setTitle(bill.title);
      setCategory(bill.category as BillCategory);
      setAmount(bill.estimatedAmount.toString());
      setDueDate(bill.dueDate);
      setFrequency(bill.frequency || 'monthly');
      setCustomDays(String(bill.frequencyDays || 6));
      setErrorText('');
    }
  };

  const handleSave = async () => {
    if (!bill) return;
    setErrorText('');

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setErrorText('Please enter a bill title.');
      return;
    }

    const cleanAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setErrorText('Please enter a valid amount.');
      return;
    }

    await editBill(bill.id, {
      title: cleanTitle,
      category,
      estimatedAmount: cleanAmount,
      dueDate,
      frequency,
      frequencyDays: frequency === 'custom_days' ? (parseInt(customDays, 10) || 6) : undefined,
    });

    onClose();
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!bill) return;
    setShowDeleteConfirm(false);
    await deleteBill(bill.id);
    onClose();
  };

  if (!bill) return null;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
        onShow={handleShow}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidRoot}
        >
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.backdrop}>
              <TouchableWithoutFeedback>
                <View style={[styles.sheetContainer, { maxHeight: dynamicMaxHeight }]}>
                  {/* Drag Handle */}
                  <View style={styles.handleBar} />

                  {/* Header Title */}
                  <View style={styles.titleRow}>
                    <Text style={styles.sheetTitle}>Edit Bill Details</Text>
                    <TouchableOpacity
                      onPress={onClose}
                      style={styles.closeBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialIcons name="close" size={20} color={colors.muted} />
                    </TouchableOpacity>
                  </View>

                  {errorText ? (
                    <View style={styles.errorBox}>
                      <MaterialIcons name="error-outline" size={16} color={colors.neg} />
                      <Text style={styles.errorText}>{errorText}</Text>
                    </View>
                  ) : null}

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
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
                              onPress={() => setCategory(p.name)}
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
                            <Text style={styles.dateSub}>Tap to change deadline</Text>
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

                    {/* Action Buttons Row */}
                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={handleDelete}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="delete-outline" size={18} color={colors.neg} />
                        <Text style={styles.deleteBtnText}>Delete</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.saveBtn}
                        onPress={handleSave}
                        activeOpacity={0.85}
                      >
                        <MaterialIcons name="check" size={18} color="#FFFFFF" />
                        <Text style={styles.saveBtnText}>Save changes</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        currentDate={dueDate}
        title="Select Bill Due Date"
        onSelect={(date) => setDueDate(date)}
        onClose={() => setShowDatePicker(false)}
      />

      {/* Branded Delete Confirmation Modal */}
      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete Bill?"
        message={`Are you sure you want to delete "${bill?.title}"? This cannot be undone.`}
        confirmText="Delete Bill"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidRoot: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 20, 25, 0.55)',
    justifyContent: 'flex-end',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.negSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginHorizontal: 20,
    marginBottom: 8,
    gap: 8,
  },
  errorText: {
    fontSize: 12.5,
    color: colors.neg,
    fontWeight: '600',
    flex: 1,
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.negSoft,
    paddingVertical: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.negSoft,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neg,
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.pill,
  },
  saveBtnText: {
    fontSize: 14.5,
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
