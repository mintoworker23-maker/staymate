import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOnboardingProfileStore } from '@/context/onboarding-profile-store';

const QUESTION_STEPS = 7;
const MIN_AGE = 16;
const MAX_AGE = 99;

const GENDER_OPTIONS = [
  { key: 'female', label: 'Female' },
  { key: 'male', label: 'Male' },
  { key: 'non-binary', label: 'Non-binary' },
] as const;

const MONTH_OPTIONS = [
  { value: '01', label: 'Jan' },
  { value: '02', label: 'Feb' },
  { value: '03', label: 'Mar' },
  { value: '04', label: 'Apr' },
  { value: '05', label: 'May' },
  { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' },
  { value: '08', label: 'Aug' },
  { value: '09', label: 'Sep' },
  { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dec' },
];

const DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, '0'));
const CURRENT_YEAR = new Date().getFullYear();
const YOUNGEST_YEAR = CURRENT_YEAR - MIN_AGE;
const OLDEST_YEAR = CURRENT_YEAR - MAX_AGE;
const YEAR_OPTIONS = Array.from(
  { length: YOUNGEST_YEAR - OLDEST_YEAR + 1 },
  (_, index) => String(YOUNGEST_YEAR - index)
);

type GenderKey = (typeof GENDER_OPTIONS)[number]['key'];
type DobPickerTarget = 'day' | 'month' | 'year' | null;

function sanitizePhoneInput(value: string) {
  const trimmed = value.replace(/\s+/g, '');
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');
  return `${hasPlus ? '+' : ''}${digitsOnly}`;
}

function isValidKenyaMobileNumber(value: string) {
  return /^(?:\+254|254|0)?(?:7\d{8}|1\d{8})$/.test(value);
}

function getMonthLabel(month: string | null) {
  if (!month) return 'Month';
  return MONTH_OPTIONS.find((option) => option.value === month)?.label ?? 'Month';
}

function buildDateOfBirth(day: string, month: string, year: string) {
  const numericDay = Number(day);
  const numericMonth = Number(month);
  const numericYear = Number(year);
  if (!numericDay || !numericMonth || !numericYear) return null;

  const parsed = new Date(numericYear, numericMonth - 1, numericDay);
  if (
    parsed.getFullYear() !== numericYear ||
    parsed.getMonth() !== numericMonth - 1 ||
    parsed.getDate() !== numericDay
  ) {
    return null;
  }

  if (parsed > new Date()) {
    return null;
  }

  return parsed;
}

function calculateAgeFromDob(dateOfBirth: Date) {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  const beforeBirthday = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate());

  if (beforeBirthday) {
    age -= 1;
  }

  return age;
}

function splitDob(value: string) {
  const [day = '', month = '', year = ''] = value.split('/');
  return { day, month, year };
}

export default function BasicInfoQuestionScreen() {
  const router = useRouter();
  const { draft, setBasicInfo } = useOnboardingProfileStore();
  const initialDobParts = React.useMemo(() => splitDob(draft.dateOfBirth), [draft.dateOfBirth]);

  const [fullName, setFullName] = React.useState(draft.fullName);
  const [dobDay, setDobDay] = React.useState<string | null>(initialDobParts.day || null);
  const [dobMonth, setDobMonth] = React.useState<string | null>(initialDobParts.month || null);
  const [dobYear, setDobYear] = React.useState<string | null>(initialDobParts.year || null);
  const [selectedGender, setSelectedGender] = React.useState<GenderKey | null>(draft.gender);
  const [phoneNumber, setPhoneNumber] = React.useState(draft.phoneNumber);
  const [whatsAppNumber, setWhatsAppNumber] = React.useState(draft.whatsAppNumber);
  const [activeDobPicker, setActiveDobPicker] = React.useState<DobPickerTarget>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const pickerOptions = React.useMemo(() => {
    if (activeDobPicker === 'day') {
      return DAY_OPTIONS.map((value) => ({ value, label: value }));
    }

    if (activeDobPicker === 'month') {
      return MONTH_OPTIONS;
    }

    if (activeDobPicker === 'year') {
      return YEAR_OPTIONS.map((value) => ({ value, label: value }));
    }

    return [];
  }, [activeDobPicker]);

  const pickerTitle = React.useMemo(() => {
    if (activeDobPicker === 'day') return 'Select day';
    if (activeDobPicker === 'month') return 'Select month';
    if (activeDobPicker === 'year') return 'Select year';
    return 'Select';
  }, [activeDobPicker]);

  const selectedPickerValue = React.useMemo(() => {
    if (activeDobPicker === 'day') return dobDay;
    if (activeDobPicker === 'month') return dobMonth;
    if (activeDobPicker === 'year') return dobYear;
    return null;
  }, [activeDobPicker, dobDay, dobMonth, dobYear]);

  const handleDobOptionSelect = React.useCallback(
    (value: string) => {
      if (activeDobPicker === 'day') {
        setDobDay(value);
      } else if (activeDobPicker === 'month') {
        setDobMonth(value);
      } else if (activeDobPicker === 'year') {
        setDobYear(value);
      }

      if (errorMessage) {
        setErrorMessage(null);
      }

      setActiveDobPicker(null);
    },
    [activeDobPicker, errorMessage]
  );

  const handleConfirm = React.useCallback(() => {
    const normalizedName = fullName.trim();
    const normalizedPhone = phoneNumber.trim();
    const normalizedWhatsApp = whatsAppNumber.trim();

    if (normalizedName.length < 2) {
      setErrorMessage('Enter your full name to continue.');
      return;
    }

    if (!dobDay || !dobMonth || !dobYear) {
      setErrorMessage('Select your full date of birth.');
      return;
    }

    const parsedDob = buildDateOfBirth(dobDay, dobMonth, dobYear);
    if (!parsedDob) {
      setErrorMessage('Select a valid date of birth.');
      return;
    }

    const calculatedAge = calculateAgeFromDob(parsedDob);
    if (!Number.isInteger(calculatedAge) || calculatedAge < MIN_AGE || calculatedAge > MAX_AGE) {
      setErrorMessage(`Your age must be between ${MIN_AGE} and ${MAX_AGE}.`);
      return;
    }

    if (!selectedGender) {
      setErrorMessage('Select your gender to continue.');
      return;
    }

    if (!isValidKenyaMobileNumber(normalizedPhone)) {
      setErrorMessage(
        'Use a valid Kenya mobile number (e.g. 0712345678, 0112345678, +254712345678, +254112345678).'
      );
      return;
    }

    if (!isValidKenyaMobileNumber(normalizedWhatsApp)) {
      setErrorMessage(
        'Use a valid Kenya WhatsApp number (e.g. 0712345678, 0112345678, +254712345678, +254112345678).'
      );
      return;
    }

    setErrorMessage(null);
    const normalizedDob = `${dobDay}/${dobMonth}/${dobYear}`;
    setBasicInfo({
      fullName: normalizedName,
      age: calculatedAge,
      dateOfBirth: normalizedDob,
      gender: selectedGender,
      phoneNumber: normalizedPhone,
      whatsAppNumber: normalizedWhatsApp,
    });
    router.push('/question-preferences');
  }, [
    dobDay,
    dobMonth,
    dobYear,
    fullName,
    phoneNumber,
    router,
    selectedGender,
    setBasicInfo,
    whatsAppNumber,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.contentWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Basic Information</Text>
        </View>

        <Text style={styles.questionText}>Question 3/7</Text>

        <View style={styles.progressRow}>
          {Array.from({ length: QUESTION_STEPS }).map((_, index) => (
            <View
              key={`step-${index + 1}`}
              style={[styles.progressSegment, index <= 2 ? styles.progressSegmentActive : null]}
            />
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.inputWrap}>
            <TextInput
              value={fullName}
              onChangeText={(value) => {
                setFullName(value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Full name"
              placeholderTextColor="#A69BC9"
              autoCapitalize="words"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Date of birth</Text>
            <View style={styles.dobRow}>
              <Pressable
                style={styles.selectInput}
                onPress={() => {
                  setActiveDobPicker('day');
                  if (errorMessage) setErrorMessage(null);
                }}>
                <Text style={[styles.selectInputText, !dobDay ? styles.selectInputPlaceholder : null]}>
                  {dobDay ?? 'Day'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={18} color="#CBBDF0" />
              </Pressable>

              <Pressable
                style={styles.selectInput}
                onPress={() => {
                  setActiveDobPicker('month');
                  if (errorMessage) setErrorMessage(null);
                }}>
                <Text style={[styles.selectInputText, !dobMonth ? styles.selectInputPlaceholder : null]}>
                  {getMonthLabel(dobMonth)}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={18} color="#CBBDF0" />
              </Pressable>

              <Pressable
                style={styles.selectInput}
                onPress={() => {
                  setActiveDobPicker('year');
                  if (errorMessage) setErrorMessage(null);
                }}>
                <Text style={[styles.selectInputText, !dobYear ? styles.selectInputPlaceholder : null]}>
                  {dobYear ?? 'Year'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={18} color="#CBBDF0" />
              </Pressable>
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Gender</Text>
            <View style={styles.genderRow}>
              {GENDER_OPTIONS.map((option) => {
                const isSelected = selectedGender === option.key;
                return (
                  <Pressable
                    key={option.key}
                    style={[styles.genderChip, isSelected ? styles.genderChipActive : styles.genderChipInactive]}
                    onPress={() => {
                      setSelectedGender(option.key);
                      if (errorMessage) setErrorMessage(null);
                    }}>
                    <Text
                      style={[
                        styles.genderChipText,
                        isSelected ? styles.genderChipTextActive : styles.genderChipTextInactive,
                      ]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.inputWrap}>
            <TextInput
              value={phoneNumber}
              onChangeText={(value) => {
                setPhoneNumber(sanitizePhoneInput(value).slice(0, 16));
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Phone number"
              placeholderTextColor="#A69BC9"
              keyboardType="phone-pad"
              style={styles.input}
            />
          </View>

          <View style={styles.inputWrap}>
            <TextInput
              value={whatsAppNumber}
              onChangeText={(value) => {
                setWhatsAppNumber(sanitizePhoneInput(value).slice(0, 16));
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="WhatsApp number"
              placeholderTextColor="#A69BC9"
              keyboardType="phone-pad"
              style={styles.input}
            />
          </View>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.bottomSpacer} />

        <Pressable style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </Pressable>
      </KeyboardAvoidingView>

      <Modal
        visible={activeDobPicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveDobPicker(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setActiveDobPicker(null)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{pickerTitle}</Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalListContent}>
              {pickerOptions.map((option) => {
                const isActive = option.value === selectedPickerValue;
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.modalOption, isActive ? styles.modalOptionActive : null]}
                    onPress={() => handleDobOptionSelect(option.value)}>
                    <Text style={[styles.modalOptionText, isActive ? styles.modalOptionTextActive : null]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3D258B',
  },
  contentWrap: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 18,
  },
  headerRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#5D35AC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 22,
    fontFamily: 'Prompt-SemiBold',
  },
  questionText: {
    marginTop: 42,
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Prompt',
    textAlign: 'center',
  },
  progressRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
  },
  progressSegment: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(208, 200, 235, 0.35)',
  },
  progressSegmentActive: {
    backgroundColor: '#CFFB75',
  },
  card: {
    marginTop: 26,
    borderRadius: 28,
    backgroundColor: '#5630A6',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Prompt-SemiBold',
    paddingHorizontal: 2,
  },
  dobRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputWrap: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#4B2A97',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  selectInput: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#4B2A97',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectInputText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Prompt-SemiBold',
  },
  selectInputPlaceholder: {
    color: '#A69BC9',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderChip: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderChipActive: {
    backgroundColor: '#CFFB75',
  },
  genderChipInactive: {
    borderWidth: 1.2,
    borderColor: '#CFFB75',
    backgroundColor: 'transparent',
  },
  genderChipText: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: 'Prompt-SemiBold',
  },
  genderChipTextActive: {
    color: '#1D1340',
  },
  genderChipTextInactive: {
    color: '#CFFB75',
  },
  input: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Prompt-SemiBold',
  },
  errorText: {
    marginTop: 12,
    color: '#FFB8C8',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Prompt-SemiBold',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  bottomSpacer: {
    flex: 1,
  },
  confirmButton: {
    height: 70,
    borderRadius: 35,
    backgroundColor: '#A385E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  confirmButtonText: {
    color: '#1A123A',
    fontSize: 18,
    fontFamily: 'Prompt-SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 7, 32, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: '#4B2A97',
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 24,
    maxHeight: '58%',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Prompt-SemiBold',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalListContent: {
    gap: 8,
    paddingBottom: 12,
  },
  modalOption: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#5E39B1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionActive: {
    backgroundColor: '#CFFB75',
  },
  modalOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Prompt-SemiBold',
  },
  modalOptionTextActive: {
    color: '#1D1340',
  },
});
