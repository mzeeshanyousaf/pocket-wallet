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
import { formatDateDisplay, formatRs, toDateString } from '../utils/formatters';
import { DatePickerModal } from './DatePickerModal';

interface CardBankPaymentModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CardBankPaymentModal: React.FC<CardBankPaymentModalProps> = ({
  visible,
  onClose,
}) => {
  const { cardDueToBank, cardCashHeldForBank, addCreditCardBankPayment } =
    useWallet();
  const { height: windowHeight } = useWindowDimensions();
  const dynamicMaxHeight = Math.min(windowHeight * 0.88, 700);

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [draftDate, setDraftDate] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const payDate = draftDate ?? toDateString(new Date());

  const resetForm = () => {
    setAmount('');
    setNote('');
    setDraftDate(null);
    setErrorText('');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    setErrorText('');
    const cleanAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setErrorText('Please enter a valid payment amount in Rs.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addCreditCardBankPayment(cleanAmount, note, payDate);
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onShow={resetForm}
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidRoot}
        >
          <TouchableWithoutFeedback onPress={handleClose}>
            <View style={styles.backdrop}>
              <TouchableWithoutFeedback>
                <View style={[styles.sheetContainer, { maxHeight: dynamicMaxHeight }]}>
                  {/* Drag Handle */}
                  <View style={styles.handleBar} />

                  {/* Header Title */}
                  <View style={styles.titleRow}>
                    <Text style={styles.sheetTitle}>Pay Credit Card Bank</Text>
                    <TouchableOpacity
                      onPress={handleClose}
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
                    {/* Summary Box */}
                    <View style={styles.summaryBox}>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Due to card bank</Text>
                        <Text style={styles.summaryVal}>
                          {formatRs(Math.max(0, cardDueToBank))}
                        </Text>
                      </View>
                      <View style={styles.summaryDivider} />
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Held from collections</Text>
                        <Text style={[styles.summaryVal, { color: colors.brand }]}>
                          {formatRs(Math.max(0, cardCashHeldForBank))}
                        </Text>
                      </View>
                    </View>

                    {/* Quick-fill chips */}
                    {(cardCashHeldForBank > 0 || cardDueToBank > 0) && (
                      <View style={styles.quickFillRow}>
                        {cardCashHeldForBank > 0 && (
                          <TouchableOpacity
                            style={styles.quickFillChip}
                            onPress={() =>
                              setAmount(String(Math.round(cardCashHeldForBank)))
                            }
                            activeOpacity={0.75}
                          >
                            <Text style={styles.quickFillText}>
                              Held ({formatRs(cardCashHeldForBank)})
                            </Text>
                          </TouchableOpacity>
                        )}
                        {cardDueToBank > 0 && (
                          <TouchableOpacity
                            style={styles.quickFillChip}
                            onPress={() =>
                              setAmount(String(Math.round(cardDueToBank)))
                            }
                            activeOpacity={0.75}
                          >
                            <Text style={styles.quickFillText}>
                              Full due ({formatRs(cardDueToBank)})
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {/* Centered Large Amount Input */}
                    <View style={styles.amountSection}>
                      <Text style={styles.amountLabel}>Amount paid to bank</Text>
                      <View style={styles.amountInputRow}>
                        <Text style={styles.amountPrefix}>Rs.</Text>
                        <TextInput
                          style={styles.amountInput}
                          placeholder="0"
                          placeholderTextColor={colors.line}
                          keyboardType="numeric"
                          maxLength={10}
                          value={amount}
                          onChangeText={(txt) => setAmount(txt.replace(/[^0-9]/g, ''))}
                          autoFocus
                        />
                      </View>
                    </View>

                    {/* Note */}
                    <View style={styles.sectionBlock}>
                      <Text style={styles.sectionHeading}>Payment Note</Text>
                      <TextInput
                        style={styles.fieldInput}
                        placeholder="e.g. HBL card transfer, bank app..."
                        placeholderTextColor={colors.subtle}
                        value={note}
                        onChangeText={setNote}
                      />
                    </View>

                    {/* Date Selector */}
                    <View style={styles.sectionBlock}>
                      <Text style={styles.sectionHeading}>Payment Date</Text>
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
                              {formatDateDisplay(payDate)}
                            </Text>
                            <Text style={styles.dateSub}>Tap to change date</Text>
                          </View>
                        </View>
                        <MaterialIcons
                          name="edit-calendar"
                          size={18}
                          color={colors.subtle}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Isolation Notice */}
                    <View style={styles.infoBanner}>
                      <MaterialIcons name="info-outline" size={16} color={colors.brand} />
                      <Text style={styles.infoBannerText}>
                        Tracked in Credit Card Ledger only — does not deduct from your Central Wallet or Bills.
                      </Text>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                      style={styles.submitBtn}
                      onPress={handleSave}
                      disabled={isSubmitting}
                      activeOpacity={0.85}
                    >
                      <MaterialIcons name="account-balance" size={18} color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>Log Bank Payment</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      <DatePickerModal
        visible={showDatePicker}
        currentDate={payDate}
        title="Select Bank Payment Date"
        onSelect={(d) => setDraftDate(d)}
        onClose={() => setShowDatePicker(false)}
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
  summaryBox: {
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 12.5,
    color: colors.muted,
    fontWeight: '500',
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 5,
  },
  quickFillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  quickFillChip: {
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  quickFillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand,
  },
  amountSection: {
    alignItems: 'center',
    marginBottom: 18,
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginBottom: 14,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: colors.brand,
    lineHeight: 16,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.pill,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
