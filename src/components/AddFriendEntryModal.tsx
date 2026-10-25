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
import { FriendEntryType } from '../types';
import { formatDateDisplay, toDateString } from '../utils/formatters';
import { DatePickerModal } from './DatePickerModal';

interface AddFriendEntryModalProps {
  visible: boolean;
  onClose: () => void;
  preselectedFriendName?: string;
  prefilledFriendName?: string;
  defaultType?: FriendEntryType;
}

export const AddFriendEntryModal: React.FC<AddFriendEntryModalProps> = ({
  visible,
  onClose,
  preselectedFriendName = '',
  prefilledFriendName = '',
  defaultType = 'lent',
}) => {
  const { friends, addFriendEntry } = useWallet();
  const { height: windowHeight } = useWindowDimensions();
  const dynamicMaxHeight = Math.min(windowHeight * 0.88, 700);

  const [friendName, setFriendName] = useState(preselectedFriendName || prefilledFriendName);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<FriendEntryType>(defaultType);
  const [description, setDescription] = useState('');
  const [recoveryDate, setRecoveryDate] = useState(() =>
    toDateString(new Date(Date.now() + 86400000 * 7))
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleShow = () => {
    setFriendName(preselectedFriendName || prefilledFriendName || '');
    setAmount('');
    setType(defaultType);
    setDescription('');
    setRecoveryDate(toDateString(new Date(Date.now() + 86400000 * 7)));
    setErrorText('');
  };

  const handleSave = async () => {
    setErrorText('');
    const cleanName = friendName.trim();
    if (!cleanName) {
      setErrorText('Please enter a friend name.');
      return;
    }

    const cleanAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setErrorText('Please enter a valid amount in Rs.');
      return;
    }

    await addFriendEntry(
      cleanName,
      cleanAmount,
      type,
      description.trim() ||
        (type === 'lent' ? 'Money Lent' : 'Money Borrowed'),
      recoveryDate
    );

    onClose();
  };

  const isLent = type === 'lent';

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
                    <Text style={styles.sheetTitle}>Give &amp; Take Entry</Text>
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
                    {/* Segmented Direction Switcher */}
                    <View style={styles.segmentedRow}>
                      <TouchableOpacity
                        style={[
                          styles.segmentBtn,
                          isLent && styles.segmentBtnActiveLent,
                        ]}
                        onPress={() => setType('lent')}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons
                          name="arrow-upward"
                          size={16}
                          color={isLent ? '#FFFFFF' : colors.muted}
                        />
                        <Text
                          style={[
                            styles.segmentText,
                            isLent && styles.segmentTextActiveLight,
                          ]}
                        >
                          I Gave / Lent
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.segmentBtn,
                          !isLent && styles.segmentBtnActiveBorrowed,
                        ]}
                        onPress={() => setType('borrowed')}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons
                          name="arrow-downward"
                          size={16}
                          color={!isLent ? '#FFFFFF' : colors.muted}
                        />
                        <Text
                          style={[
                            styles.segmentText,
                            !isLent && styles.segmentTextActiveLight,
                          ]}
                        >
                          I Took / Borrowed
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Centered Large Amount Input */}
                    <View style={styles.amountSection}>
                      <Text style={styles.amountLabel}>
                        {isLent ? 'Amount to Lend' : 'Amount to Borrow'}
                      </Text>
                      <View style={styles.amountInputRow}>
                        <Text style={styles.amountPrefix}>Rs.</Text>
                        <TextInput
                          style={[
                            styles.amountInput,
                            { color: isLent ? colors.neg : colors.pos },
                          ]}
                          placeholder="0"
                          placeholderTextColor={colors.line}
                          keyboardType="numeric"
                          value={amount}
                          onChangeText={(txt) => setAmount(txt.replace(/[^0-9]/g, ''))}
                          autoFocus={!preselectedFriendName}
                        />
                      </View>
                    </View>

                    {/* Autocomplete Existing Friends */}
                    {friends.length > 0 && !preselectedFriendName && (
                      <View style={styles.sectionBlock}>
                        <Text style={styles.sectionHeading}>Existing friends</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.chipsScroll}
                        >
                          {friends.map((f) => {
                            const isSelected =
                              friendName.toLowerCase() === f.name.toLowerCase();
                            return (
                              <TouchableOpacity
                                key={f.id}
                                style={[
                                  styles.friendChip,
                                  isSelected && styles.friendChipActive,
                                ]}
                                onPress={() => setFriendName(f.name)}
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
                                    {f.name.slice(0, 2).toUpperCase()}
                                  </Text>
                                </View>
                                <Text
                                  style={[
                                    styles.friendChipText,
                                    isSelected && styles.friendChipTextActive,
                                  ]}
                                >
                                  {f.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}

                    {/* Friend Name Input */}
                    <View style={styles.sectionBlock}>
                      <Text style={styles.sectionHeading}>Friend Name</Text>
                      <TextInput
                        style={styles.fieldInput}
                        placeholder="e.g. Ahmad, Hamza, Bilal..."
                        placeholderTextColor={colors.subtle}
                        value={friendName}
                        onChangeText={setFriendName}
                        editable={!preselectedFriendName}
                      />
                    </View>

                    {/* Purpose / Note */}
                    <View style={styles.sectionBlock}>
                      <Text style={styles.sectionHeading}>Purpose / Note</Text>
                      <TextInput
                        style={styles.fieldInput}
                        placeholder={
                          isLent
                            ? 'e.g. Dinner share, grocery, emergency loan'
                            : 'e.g. Car fuel, lunch, loan'
                        }
                        placeholderTextColor={colors.subtle}
                        value={description}
                        onChangeText={setDescription}
                      />
                    </View>

                    {/* Recovery / Promise Date */}
                    <View style={styles.sectionBlock}>
                      <Text style={styles.sectionHeading}>
                        {isLent ? 'Expected recovery date' : 'Repayment promise date'}
                      </Text>
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
                              {formatDateDisplay(recoveryDate)}
                            </Text>
                            <Text style={styles.dateSub}>Tap to change due date</Text>
                          </View>
                        </View>
                        <MaterialIcons
                          name="edit-calendar"
                          size={18}
                          color={colors.subtle}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                      style={[
                        styles.submitBtn,
                        {
                          backgroundColor: isLent ? colors.heroDark : colors.brand,
                        },
                      ]}
                      onPress={handleSave}
                      activeOpacity={0.85}
                    >
                      <MaterialIcons
                        name={isLent ? 'account-balance-wallet' : 'add-circle-outline'}
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.submitBtnText}>
                        {isLent
                          ? 'Deduct from Wallet & Record'
                          : 'Credit to Wallet & Record'}
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
        currentDate={recoveryDate}
        title="Select Promise / Recovery Date"
        onSelect={(date) => setRecoveryDate(date)}
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
  segmentBtnActiveLent: {
    backgroundColor: colors.neg,
  },
  segmentBtnActiveBorrowed: {
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
  friendChip: {
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
  friendChipActive: {
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
  friendChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.ink,
  },
  friendChipTextActive: {
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
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.pill,
    marginTop: 10,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
