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
import { Bill } from '../types';
import { formatRs } from '../utils/formatters';

interface PayBillModalProps {
  visible: boolean;
  bill: Bill | null;
  onClose: () => void;
}

export const PayBillModal: React.FC<PayBillModalProps> = ({
  visible,
  bill,
  onClose,
}) => {
  const { balance, payBill } = useWallet();
  const { height: windowHeight } = useWindowDimensions();
  const dynamicMaxHeight = Math.min(windowHeight * 0.9, 700);

  const [amountStr, setAmountStr] = useState('');
  const [errorText, setErrorText] = useState('');

  const handleShow = () => {
    if (bill) {
      setAmountStr(bill.estimatedAmount.toString());
    }
    setErrorText('');
  };

  const handleConfirmPay = async () => {
    if (!bill) return;
    setErrorText('');

    const numAmount = parseFloat(amountStr.replace(/,/g, ''));
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorText('Please enter a valid payment amount.');
      return;
    }

    await payBill(bill.id, numAmount);
    onClose();
  };

  if (!bill) return null;

  const currentEntered = parseFloat(amountStr) || 0;
  const balanceAfter = balance - currentEntered;

  return (
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
                  <Text style={styles.sheetTitle}>Pay &amp; Deduct Bill</Text>
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
                  {/* Bill Card Summary */}
                  <View style={styles.billSummaryCard}>
                    <View style={styles.iconBox}>
                      <MaterialIcons name="receipt-long" size={22} color={colors.brand} />
                    </View>
                    <View style={styles.billSummaryInfo}>
                      <Text style={styles.billTitle}>{bill.title}</Text>
                      <Text style={styles.billMeta}>
                        {bill.category} · Due {bill.dueDate}
                      </Text>
                    </View>
                  </View>

                  {/* Centered Large Amount Input */}
                  <View style={styles.amountSection}>
                    <Text style={styles.amountLabel}>Amount to deduct from Central Wallet</Text>
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
                    <Text style={styles.amountHint}>
                      Adjust if actual paid bill differs from estimated.
                    </Text>
                  </View>

                  {/* Balance Impact Strip */}
                  <View style={styles.impactCard}>
                    <View style={styles.impactRow}>
                      <Text style={styles.impactLabel}>Current wallet balance</Text>
                      <Text style={styles.impactVal}>{formatRs(balance)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.impactRow}>
                      <Text style={styles.impactLabel}>Balance after payment</Text>
                      <Text
                        style={[
                          styles.impactVal,
                          {
                            color: balanceAfter < 0 ? colors.neg : colors.brand,
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {formatRs(balanceAfter)}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={onClose}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.confirmBtn}
                      onPress={handleConfirmPay}
                      activeOpacity={0.85}
                    >
                      <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.confirmBtnText}>Confirm &amp; Deduct</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
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
  billSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderRadius: radius.card,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  billSummaryInfo: {
    flex: 1,
  },
  billTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  billMeta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  amountSection: {
    alignItems: 'center',
    marginBottom: 20,
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
  amountHint: {
    fontSize: 11.5,
    color: colors.subtle,
    marginTop: 4,
  },
  impactCard: {
    backgroundColor: colors.canvas,
    borderRadius: radius.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 20,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  impactLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  impactVal: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.pill,
  },
  confirmBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
