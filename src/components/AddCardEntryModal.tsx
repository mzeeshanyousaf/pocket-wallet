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
import { CreditCardEntryType } from '../types';
import { formatDateDisplay, toDateString } from '../utils/formatters';
import { DatePickerModal } from './DatePickerModal';

interface AddCardEntryModalProps {
  visible: boolean;
  onClose: () => void;
  defaultType?: CreditCardEntryType;
  preselectedMemberName?: string;
}

export const AddCardEntryModal: React.FC<AddCardEntryModalProps> = ({
  visible,
  onClose,
  defaultType = 'charge',
  preselectedMemberName = '',
}) => {
  const { creditCardMembers, addCreditCardEntry } = useWallet();
  const { height: windowHeight } = useWindowDimensions();
  const dynamicMaxHeight = Math.min(windowHeight * 0.88, 700);

  const [draftMemberName, setDraftMemberName] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [draftType, setDraftType] = useState<CreditCardEntryType | null>(null);
  const [description, setDescription] = useState('');
  const [draftDate, setDraftDate] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const memberName = draftMemberName ?? preselectedMemberName;
  const type = draftType ?? defaultType;
  const entryDate = draftDate ?? toDateString(new Date());

  const resetForm = () => {
    setDraftMemberName(null);
    setAmount('');
    setDraftType(null);
    setDescription('');
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
    const cleanName = memberName.trim();
    if (!cleanName) {
      setErrorText('Please enter a friend or family member name.');
      return;
    }

    const cleanAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setErrorText('Please enter a valid amount in Rs.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addCreditCardEntry(
        cleanName,
        cleanAmount,
        type,
        description.trim() ||
          (type === 'charge' ? 'Card spend' : 'Payment received'),
        entryDate
      );
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCharge = type === 'charge';

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
                    <Text style={styles.sheetTitle}>Credit Card Entry</Text>
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
                    {/* Segmented Direction Switcher */}
                    <View style={styles.segmentedRow}>
                      <TouchableOpacity
                        style={[
                          styles.segmentBtn,
                          isCharge && styles.segmentBtnActiveCharge,
                        ]}
                        onPress={() => setDraftType('charge')}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons
                          name="credit-card"
                          size={16}
                          color={isCharge ? '#FFFFFF' : colors.muted}
                        />
                        <Text
                          style={[
                            styles.segmentText,
                            isCharge && styles.segmentTextActiveLight,
                          ]}
                        >
                          Card Used
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.segmentBtn,
                          !isCharge && styles.segmentBtnActivePayment,
                        ]}
                        onPress={() => setDraftType('payment')}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons
                          name="arrow-downward"
                          size={16}
                          color={!isCharge ? '#FFFFFF' : colors.muted}
                        />
                        <Text
                          style={[
                            styles.segmentText,
                            !isCharge && styles.segmentTextActiveLight,
                          ]}
                        >
                          Got Payment
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Centered Large Amount Input */}
                    <View style={styles.amountSection}>
                      <Text style={styles.amountLabel}>
                        {isCharge
                          ? 'Amount swiped on credit card'
                          : 'Random payment received'}
                      </Text>
                      <View style={styles.amountInputRow}>
                        <Text style={styles.amountPrefix}>Rs.</Text>
                        <TextInput
                          style={[
                            styles.amountInput,
                            { color: isCharge ? colors.neg : colors.pos },
                          ]}
                          placeholder="0"
                          placeholderTextColor={colors.line}
                          keyboardType="numeric"
                          maxLength={10}
                          value={amount}
                          onChangeText={(txt) => setAmount(txt.replace(/[^0-9]/g, ''))}
                          autoFocus={!preselectedMemberName}
                        />
                      </View>
                    </View>

                    {/* Autocomplete Existing Members */}
                    {creditCardMembers.length > 0 && !preselectedMemberName && (
                      <View style={styles.sectionBlock}>
                        <Text style={styles.sectionHeading}>Existing people</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.chipsScroll}
                        >
                          {creditCardMembers.map((m) => {
                            const isSelected =
                              memberName.toLowerCase() === m.name.toLowerCase();
                            return (
                              <TouchableOpacity
                                key={m.id}
                                style={[
                                  styles.memberChip,
                                  isSelected && styles.memberChipActive,
                                ]}
                                onPress={() => setDraftMemberName(m.name)}
                                activeOpacity={0.7}
                              >
                                <View
                                  style={[
                                    styles.chipAvatar,
                                    isSelected && styles.chipAvatarActive,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.chipAvatarText,
                                      isSelected && styles.chipAvatarTextActive,
                                    ]}
                                  >
                                    {m.name.slice(0, 2).toUpperCase()}
                                  </Text>
                                </View>
                                <Text
                                  style={[
                                    styles.memberChipText,
                                    isSelected && styles.memberChipTextActive,
                                  ]}
                                >
                                  {m.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}

                    {/* Friend / Family Name Input */}
                    <View style={styles.sectionBlock}>
                      <Text style={styles.sectionHeading}>Friend / Family Name</Text>
                      <TextInput
                        style={styles.fieldInput}
                        placeholder="e.g. Ali, Brother, Cousin..."
                        placeholderTextColor={colors.subtle}
                        value={memberName}
                        onChangeText={setDraftMemberName}
                        editable={!preselectedMemberName}
                      />
                    </View>

                    {/* Note / Purpose */}
                    <View style={styles.sectionBlock}>
                      <Text style={styles.sectionHeading}>Note / Purpose</Text>
                      <TextInput
                        style={styles.fieldInput}
                        placeholder="Daraz order, Petrol, EasyPaisa..."
                        placeholderTextColor={colors.subtle}
                        value={description}
                        onChangeText={setDescription}
                      />
                    </View>

                    {/* Date Selector */}
                    <View style={styles.sectionBlock}>
                      <Text style={styles.sectionHeading}>Date</Text>
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
                              {formatDateDisplay(entryDate)}
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
                        Isolated Credit Card Ledger — won&apos;t affect your Central Wallet or Bills.
                      </Text>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                      style={[
                        styles.submitBtn,
                        {
                          backgroundColor: isCharge ? colors.heroDark : colors.brand,
                        },
                      ]}
                      onPress={handleSave}
                      disabled={isSubmitting}
                      activeOpacity={0.85}
                    >
                      <MaterialIcons
                        name={isCharge ? 'credit-card' : 'check-circle-outline'}
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.submitBtnText}>
                        {isCharge ? 'Record Card Use' : 'Record Random Payment'}
                      </Text>
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
        currentDate={entryDate}
        title="Select Entry Date"
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
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: colors.canvas,
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segmentBtnActiveCharge: {
    backgroundColor: colors.neg,
  },
  segmentBtnActivePayment: {
    backgroundColor: colors.brand,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  segmentTextActiveLight: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  chipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.canvas,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  memberChipActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  chipAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAvatarActive: {
    backgroundColor: colors.brand,
  },
  chipAvatarText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.muted,
  },
  chipAvatarTextActive: {
    color: '#FFFFFF',
  },
  memberChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.ink,
  },
  memberChipTextActive: {
    color: colors.brand,
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
    paddingVertical: 14,
    borderRadius: radius.pill,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
