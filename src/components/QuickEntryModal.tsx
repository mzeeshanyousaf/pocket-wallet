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
import { formatRs } from '../utils/formatters';

interface QuickEntryModalProps {
  visible: boolean;
  onClose: () => void;
  defaultType?: 'expense' | 'income';
}

interface CategoryOption {
  id: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

const expenseCategories: CategoryOption[] = [
  { id: 'Food', label: 'Food', icon: 'restaurant' },
  { id: 'Grocery', label: 'Groceries', icon: 'shopping-cart' },
  { id: 'Transport', label: 'Transport', icon: 'directions-car' },
  { id: 'Bills', label: 'Bills', icon: 'receipt-long' },
  { id: 'Shopping', label: 'Shopping', icon: 'shopping-bag' },
  { id: 'Health', label: 'Health', icon: 'medical-services' },
  { id: 'Entertainment', label: 'Fun', icon: 'movie' },
  { id: 'Other', label: 'Other', icon: 'more-horiz' },
];

const incomeCategories: CategoryOption[] = [
  { id: 'Salary', label: 'Salary', icon: 'payments' },
  { id: 'Freelance', label: 'Freelance', icon: 'laptop' },
  { id: 'Business', label: 'Business', icon: 'storefront' },
  { id: 'Gift', label: 'Gift', icon: 'card-giftcard' },
  { id: 'Investment', label: 'Invest', icon: 'trending-up' },
  { id: 'Refund', label: 'Refund', icon: 'replay' },
  { id: 'Other', label: 'Other', icon: 'more-horiz' },
];

export const QuickEntryModal: React.FC<QuickEntryModalProps> = ({
  visible,
  onClose,
  defaultType = 'expense',
}) => {
  const { addIncome, addExpense, balance } = useWallet();
  const { height: windowHeight } = useWindowDimensions();
  const dynamicMaxHeight = Math.min(windowHeight * 0.88, 700);

  const [entryType, setEntryType] = useState<'expense' | 'income'>(defaultType);
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState<string>('Food');
  const [note, setNote] = useState('');

  const handleShow = () => {
    setEntryType(defaultType);
    setCategory(defaultType === 'income' ? 'Salary' : 'Food');
    setAmountStr('');
    setNote('');
  };

  const numAmount = parseFloat(amountStr) || 0;
  const isOut = entryType === 'expense';
  const exceedsBalance = isOut && numAmount > balance;
  const categoriesList = isOut ? expenseCategories : incomeCategories;

  const handleSwitchType = (type: 'expense' | 'income') => {
    setEntryType(type);
    setCategory(type === 'income' ? 'Salary' : 'Food');
  };

  const handleSubmit = async () => {
    if (numAmount <= 0) return;
    const finalDescription = note.trim() || category;

    if (entryType === 'income') {
      await addIncome(finalDescription, numAmount, category);
    } else {
      await addExpense(finalDescription, numAmount, category);
    }

    onClose();
  };

  return (
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
                {/* Drag handle */}
                <View style={styles.handleBar} />

                {/* Sheet Title Bar */}
                <View style={styles.titleRow}>
                  <Text style={styles.sheetTitle}>New entry</Text>
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
                  {/* Segmented Type Switcher */}
                  <View style={styles.segmentedRow}>
                    <TouchableOpacity
                      style={[
                        styles.segmentBtn,
                        entryType === 'income' && styles.segmentBtnActive,
                      ]}
                      onPress={() => handleSwitchType('income')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          entryType === 'income' && styles.segmentTextActive,
                        ]}
                      >
                        Cash in
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.segmentBtn,
                        entryType === 'expense' && styles.segmentBtnActive,
                      ]}
                      onPress={() => handleSwitchType('expense')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          entryType === 'expense' && styles.segmentTextActive,
                        ]}
                      >
                        Cash out
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Centered Large Amount Input */}
                  <View style={styles.amountSection}>
                    <Text style={styles.amountLabel}>Amount</Text>
                    <View style={styles.amountInputRow}>
                      <Text style={styles.amountPrefix}>Rs.</Text>
                      <TextInput
                        style={[
                          styles.amountInput,
                          { color: entryType === 'income' ? colors.pos : colors.ink },
                        ]}
                        placeholder="0"
                        placeholderTextColor={colors.line}
                        keyboardType="numeric"
                        value={amountStr}
                        onChangeText={(txt) => setAmountStr(txt.replace(/[^0-9]/g, ''))}
                        autoFocus
                      />
                    </View>

                    {exceedsBalance && (
                      <View style={styles.warnRow}>
                        <MaterialIcons name="warning" size={14} color={colors.warn} />
                        <Text style={styles.warnText}>
                          This exceeds your balance of {formatRs(balance)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Category Grid */}
                  <View style={styles.categorySection}>
                    <Text style={styles.sectionHeading}>Category</Text>
                    <View style={styles.categoryGrid}>
                      {categoriesList.map((cat) => {
                        const isSelected = category === cat.id;
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.catTile,
                              isSelected && styles.catTileActive,
                            ]}
                            onPress={() => setCategory(cat.id)}
                            activeOpacity={0.8}
                          >
                            <MaterialIcons
                              name={cat.icon}
                              size={18}
                              color={isSelected ? '#FFFFFF' : colors.muted}
                            />
                            <Text
                              style={[
                                styles.catLabel,
                                isSelected && styles.catLabelActive,
                              ]}
                              numberOfLines={1}
                            >
                              {cat.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Note Input */}
                  <View style={styles.noteSection}>
                    <Text style={styles.sectionHeading}>Note</Text>
                    <TextInput
                      style={styles.noteInput}
                      placeholder="e.g. Lunch with team, Groceries..."
                      placeholderTextColor={colors.subtle}
                      value={note}
                      onChangeText={setNote}
                    />
                  </View>

                  {/* Submit CTA Button */}
                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      {
                        backgroundColor:
                          numAmount > 0
                            ? entryType === 'income'
                              ? colors.brand
                              : colors.ink
                            : colors.line,
                      },
                    ]}
                    disabled={numAmount <= 0}
                    onPress={handleSubmit}
                    activeOpacity={0.88}
                  >
                    <Text
                      style={[
                        styles.submitBtnText,
                        { color: numAmount > 0 ? '#FFFFFF' : colors.subtle },
                      ]}
                    >
                      {entryType === 'income' ? 'Save Cash In (+)' : 'Save Cash Out (−)'}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  keyboardView: {
    width: '100%',
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '90%',
  },
  handleBar: {
    width: 36,
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
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: colors.canvas,
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: '#0F1419',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  segmentTextActive: {
    color: colors.ink,
    fontWeight: '700',
  },
  amountSection: {
    alignItems: 'center',
    marginBottom: 24,
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
    minWidth: 40,
    textAlign: 'left',
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  warnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.warn,
  },
  categorySection: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catTile: {
    width: '23%',
    aspectRatio: 1.1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 4,
  },
  catTileActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  catLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.muted,
  },
  catLabelActive: {
    color: '#FFFFFF',
  },
  noteSection: {
    marginBottom: 24,
  },
  noteInput: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.ink,
  },
  submitBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
