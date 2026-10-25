import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useWallet } from '../context/WalletContext';
import { colors } from '../theme/colors';
import { radius } from '../theme/tokens';
import { formatRs } from '../utils/formatters';

interface SalaryConfigModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SalaryConfigModal: React.FC<SalaryConfigModalProps> = ({
  visible,
  onClose,
}) => {
  const { salaryConfig, updateSalaryConfig, receiveSalary } = useWallet();

  const [amountStr, setAmountStr] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [autoPrompt, setAutoPrompt] = useState<boolean>(true);

  const handleShow = () => {
    setAmountStr(salaryConfig.amount > 0 ? salaryConfig.amount.toString() : '120000');
    setDayOfMonth(salaryConfig.dayOfMonth || 1);
    setAutoPrompt(salaryConfig.autoPrompt !== false);
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amountStr.replace(/,/g, ''));
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid monthly salary amount in Rs.');
      return;
    }

    await updateSalaryConfig({
      ...salaryConfig,
      amount: numAmount,
      dayOfMonth,
      autoPrompt,
    });

    onClose();
  };

  const handleTestTrigger = async () => {
    const numAmount = parseFloat(amountStr.replace(/,/g, '')) || salaryConfig.amount;
    await receiveSalary(numAmount);
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
              <View style={styles.sheetContainer}>
                {/* Drag Handle */}
                <View style={styles.handleBar} />

                {/* Header Title */}
                <View style={styles.titleRow}>
                  <Text style={styles.sheetTitle}>Salary &amp; Payday Cycle</Text>
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
                    <Text style={styles.amountLabel}>Monthly Take-Home Salary</Text>
                    <View style={styles.amountInputRow}>
                      <Text style={styles.amountPrefix}>Rs.</Text>
                      <TextInput
                        style={styles.amountInput}
                        placeholder="0"
                        placeholderTextColor={colors.line}
                        keyboardType="numeric"
                        value={amountStr}
                        onChangeText={(txt) => setAmountStr(txt.replace(/[^0-9]/g, ''))}
                        autoFocus
                      />
                    </View>
                  </View>

                  {/* Day of Month Selector */}
                  <View style={styles.sectionBlock}>
                    <Text style={styles.sectionHeading}>Expected Payday (Day of Month)</Text>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => setDayOfMonth((d) => (d > 1 ? d - 1 : 31))}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="remove" size={20} color={colors.ink} />
                      </TouchableOpacity>

                      <View style={styles.dayValueBox}>
                        <Text style={styles.dayValueNum}>{dayOfMonth}</Text>
                        <Text style={styles.dayValueSub}>
                          {dayOfMonth === 1
                            ? '1st of every month'
                            : dayOfMonth === 2
                            ? '2nd of every month'
                            : dayOfMonth === 3
                            ? '3rd of every month'
                            : `${dayOfMonth}th of every month`}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => setDayOfMonth((d) => (d < 31 ? d + 1 : 1))}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="add" size={20} color={colors.ink} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Auto-Prompt Switch */}
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextContainer}>
                      <Text style={styles.switchTitle}>Prompt on Payday</Text>
                      <Text style={styles.switchSubtitle}>
                        Show Action Required banner on home screen when payday arrives
                      </Text>
                    </View>
                    <Switch
                      value={autoPrompt}
                      onValueChange={setAutoPrompt}
                      trackColor={{ false: colors.line, true: colors.brand }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {/* Test Payday Action Card */}
                  <TouchableOpacity
                    style={styles.testBtnCard}
                    onPress={handleTestTrigger}
                    activeOpacity={0.8}
                  >
                    <View style={styles.testIconBox}>
                      <MaterialIcons name="bolt" size={18} color={colors.brand} />
                    </View>
                    <View style={styles.testTextContainer}>
                      <Text style={styles.testTitle}>Claim Salary Now</Text>
                      <Text style={styles.testSubtitle}>
                        Directly credit {formatRs(parseFloat(amountStr) || salaryConfig.amount)} to Central Wallet
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.subtle} />
                  </TouchableOpacity>

                  {/* Save Button */}
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSave}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="check" size={18} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Save Salary Settings</Text>
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
    color: colors.brand,
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
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 6,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayValueBox: {
    flex: 1,
    alignItems: 'center',
  },
  dayValueNum: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
  },
  dayValueSub: {
    fontSize: 11.5,
    color: colors.muted,
    marginTop: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderRadius: radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 14,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  switchSubtitle: {
    fontSize: 11.5,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  testBtnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandSoft,
    borderRadius: radius.card,
    padding: 14,
    marginBottom: 20,
  },
  testIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  testTextContainer: {
    flex: 1,
  },
  testTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.brand,
  },
  testSubtitle: {
    fontSize: 11.5,
    color: colors.muted,
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.pill,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
