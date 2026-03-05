import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Keyboard,
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
import {
  DEFAULT_LOCATION_RADIUS_KM,
  inferInstitutionFromEmail,
  normalizeLookupKey,
  requestLocationSnapshot,
  sanitizeLocationText,
  searchKenyanInstitutions,
} from '@/lib/location';
import { goBackOrReplace } from '@/lib/navigation';

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
const WHATSAPP_PREFIX = '+254';

type GenderKey = (typeof GENDER_OPTIONS)[number]['key'];
type DobPickerTarget = 'day' | 'month' | 'year' | null;

type GeoCoordinates = {
  lat: number | null;
  lng: number | null;
};

function sanitizePhoneInput(value: string) {
  const trimmed = value.replace(/\s+/g, '');
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');
  return `${hasPlus ? '+' : ''}${digitsOnly}`;
}

function isValidKenyaMobileNumber(value: string) {
  return /^(?:\+254|254|0)?(?:7\d{8}|1\d{8})$/.test(value);
}

function normalizeKenyaWhatsAppInput(value: string) {
  let digits = value.replace(/[^0-9]/g, '');

  if (digits.startsWith('254')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  const localDigits = digits.slice(0, 9);
  return `${WHATSAPP_PREFIX}${localDigits}`;
}

function isValidKenyaWhatsAppNumber(value: string) {
  return /^\+254(?:7\d{8}|1\d{8})$/.test(value);
}

function getMonthLabel(month: string | null) {
  if (!month) return 'MM';
  return MONTH_OPTIONS.find((option) => option.value === month)?.label ?? 'MM';
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
  const beforeBirthday =
    monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate());

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
  const { from } = useLocalSearchParams<{ from?: string | string[] }>();
  const fromProfile = (Array.isArray(from) ? from[0] : from) === 'profile';
  const handleBackPress = React.useCallback(() => {
    goBackOrReplace(router, fromProfile ? '/profile' : '/start');
  }, [fromProfile, router]);

  const { draft, setBasicInfo } = useOnboardingProfileStore();
  const initialDobParts = React.useMemo(() => splitDob(draft.dateOfBirth), [draft.dateOfBirth]);

  const [fullName, setFullName] = React.useState(draft.fullName);
  const [dobDay, setDobDay] = React.useState<string | null>(initialDobParts.day || null);
  const [dobMonth, setDobMonth] = React.useState<string | null>(initialDobParts.month || null);
  const [dobYear, setDobYear] = React.useState<string | null>(initialDobParts.year || null);
  const [selectedGender, setSelectedGender] = React.useState<GenderKey | null>(draft.gender);
  const [phoneNumber, setPhoneNumber] = React.useState(draft.phoneNumber);
  const [whatsAppNumber, setWhatsAppNumber] = React.useState(() =>
    normalizeKenyaWhatsAppInput(draft.whatsAppNumber || WHATSAPP_PREFIX)
  );
  const [institutionName, setInstitutionName] = React.useState(draft.institutionName);
  const [institutionKey, setInstitutionKey] = React.useState(draft.institutionKey);
  const [campus, setCampus] = React.useState(draft.campus);
  const [town, setTown] = React.useState(draft.town);
  const [estate, setEstate] = React.useState(draft.estate);
  const [locationCoords, setLocationCoords] = React.useState<GeoCoordinates>({
    lat: draft.locationLat,
    lng: draft.locationLng,
  });

  const [activeDobPicker, setActiveDobPicker] = React.useState<DobPickerTarget>(null);
  const [institutionModalVisible, setInstitutionModalVisible] = React.useState(false);
  const [institutionSearchQuery, setInstitutionSearchQuery] = React.useState('');
  const [isResolvingLocation, setIsResolvingLocation] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (institutionName.trim().length > 0 || draft.email.trim().length === 0) {
      return;
    }

    const inferredInstitution = inferInstitutionFromEmail(draft.email);
    if (!inferredInstitution) {
      return;
    }

    setInstitutionName(inferredInstitution.name);
    setInstitutionKey(inferredInstitution.key);
  }, [draft.email, institutionName]);

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

  const institutionOptions = React.useMemo(
    () => searchKenyanInstitutions(institutionSearchQuery, 80),
    [institutionSearchQuery]
  );

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

  const handlePickInstitution = React.useCallback(
    (value: { name: string; key: string }) => {
      setInstitutionName(value.name);
      setInstitutionKey(value.key);
      setInstitutionModalVisible(false);
      setInstitutionSearchQuery('');
      if (errorMessage) {
        setErrorMessage(null);
      }
    },
    [errorMessage]
  );

  const openDobPicker = React.useCallback(
    (target: DobPickerTarget) => {
      Keyboard.dismiss();
      setInstitutionModalVisible(false);
      setActiveDobPicker(target);
      if (errorMessage) {
        setErrorMessage(null);
      }
    },
    [errorMessage]
  );

  const handleUseCurrentLocation = React.useCallback(() => {
    if (isResolvingLocation) {
      return;
    }

    setIsResolvingLocation(true);
    if (errorMessage) {
      setErrorMessage(null);
    }

    void (async () => {
      const result = await requestLocationSnapshot();
      if (!result.ok) {
        setErrorMessage(result.message);
        setIsResolvingLocation(false);
        return;
      }

      setTown((currentTown) => currentTown || sanitizeLocationText(result.snapshot.town));
      setEstate((currentEstate) => currentEstate || sanitizeLocationText(result.snapshot.estate));
      setLocationCoords({
        lat: result.snapshot.latitude,
        lng: result.snapshot.longitude,
      });
      setIsResolvingLocation(false);
    })();
  }, [errorMessage, isResolvingLocation]);

  const handleConfirm = React.useCallback(() => {
    const normalizedName = fullName.trim();
    const normalizedPhone = phoneNumber.trim();
    const normalizedWhatsApp = normalizeKenyaWhatsAppInput(whatsAppNumber);
    const normalizedInstitutionName = sanitizeLocationText(institutionName);
    const normalizedInstitutionKey = normalizeLookupKey(institutionKey || normalizedInstitutionName);
    const normalizedCampus = sanitizeLocationText(campus);
    const normalizedTown = sanitizeLocationText(town);
    const normalizedEstate = sanitizeLocationText(estate);

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

    if (!isValidKenyaWhatsAppNumber(normalizedWhatsApp)) {
      setErrorMessage(
        'Use a valid WhatsApp number in +254 format starting with 7 or 1 (e.g. +254712345678).'
      );
      return;
    }

    if (normalizedInstitutionName.length < 2) {
      setErrorMessage('Select your tertiary institution to continue.');
      return;
    }

    if (normalizedTown.length < 2) {
      setErrorMessage('Enter your town/location to continue.');
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
      institutionName: normalizedInstitutionName,
      institutionKey: normalizedInstitutionKey,
      campus: normalizedCampus,
      town: normalizedTown,
      townKey: normalizeLookupKey(normalizedTown),
      estate: normalizedEstate,
      locationLat: locationCoords.lat,
      locationLng: locationCoords.lng,
      locationRadiusKm: DEFAULT_LOCATION_RADIUS_KM,
    });

    router.push(fromProfile ? '/question-preferences?from=profile' : '/question-preferences');
  }, [
    campus,
    dobDay,
    dobMonth,
    dobYear,
    estate,
    fullName,
    institutionKey,
    institutionName,
    locationCoords.lat,
    locationCoords.lng,
    phoneNumber,
    router,
    selectedGender,
    setBasicInfo,
    town,
    whatsAppNumber,
    fromProfile,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.contentWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always">
          <View style={styles.headerRow}>
            <Pressable style={styles.backButton} onPress={handleBackPress}>
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
                style={[styles.selectInput, styles.dobSelectInput]}
                onPress={() => openDobPicker('day')}>
                <Text style={[styles.selectInputText, !dobDay ? styles.selectInputPlaceholder : null]}>
                  {dobDay ?? 'DD'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={18} color="#CBBDF0" />
              </Pressable>

              <Pressable
                style={[styles.selectInput, styles.dobSelectInput]}
                onPress={() => openDobPicker('month')}>
                <Text style={[styles.selectInputText, !dobMonth ? styles.selectInputPlaceholder : null]}>
                  {getMonthLabel(dobMonth)}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={18} color="#CBBDF0" />
              </Pressable>

              <Pressable
                style={[styles.selectInput, styles.dobSelectInput]}
                onPress={() => openDobPicker('year')}>
                <Text style={[styles.selectInputText, !dobYear ? styles.selectInputPlaceholder : null]}>
                  {dobYear ?? 'YYY'}
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
                  setWhatsAppNumber(normalizeKenyaWhatsAppInput(value));
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="+254712345678"
                placeholderTextColor="#A69BC9"
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Institution</Text>
              <Pressable
                style={styles.selectInput}
                onPress={() => {
                  Keyboard.dismiss();
                  setActiveDobPicker(null);
                  setInstitutionModalVisible(true);
                  if (errorMessage) setErrorMessage(null);
                }}>
                <Text
                  style={[
                    styles.selectInputText,
                    institutionName.trim().length === 0 ? styles.selectInputPlaceholder : null,
                  ]}
                  numberOfLines={1}>
                  {institutionName.trim().length > 0
                    ? institutionName
                    : 'Select your tertiary institution'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={18} color="#CBBDF0" />
              </Pressable>
              <View style={styles.inputWrap}>
                <TextInput
                  value={institutionName}
                  onChangeText={(value) => {
                    setInstitutionName(value);
                    setInstitutionKey(normalizeLookupKey(value));
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Type institution manually if not listed"
                  placeholderTextColor="#A69BC9"
                  style={styles.input}
                />
              </View>
              <Text style={styles.helperText}>
                {draft.email
                  ? `Detected from ${draft.email}. You can change it.`
                  : 'Pick your school for better roommate matching.'}
              </Text>
            </View>

            <View style={styles.inputWrap}>
              <TextInput
                value={campus}
                onChangeText={(value) => {
                  setCampus(value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Campus (optional)"
                placeholderTextColor="#A69BC9"
                style={styles.input}
              />
            </View>

            <View style={styles.inputWrap}>
              <TextInput
                value={town}
                onChangeText={(value) => {
                  setTown(value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Town / area"
                placeholderTextColor="#A69BC9"
                style={styles.input}
              />
            </View>

            <View style={styles.inputWrap}>
              <TextInput
                value={estate}
                onChangeText={(value) => {
                  setEstate(value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Estate (optional)"
                placeholderTextColor="#A69BC9"
                style={styles.input}
              />
            </View>

            <Pressable
              style={[styles.locationButton, isResolvingLocation ? styles.locationButtonDisabled : null]}
              onPress={handleUseCurrentLocation}
              disabled={isResolvingLocation}>
              {isResolvingLocation ? (
                <ActivityIndicator size="small" color="#1D1340" />
              ) : (
                <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#1D1340" />
              )}
              <Text style={styles.locationButtonText}>
                {isResolvingLocation ? 'Getting your location...' : 'Use my current location'}
              </Text>
            </Pressable>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </ScrollView>

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
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalListContent}>
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

      <Modal
        visible={institutionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInstitutionModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setInstitutionModalVisible(false)} />
          <View style={styles.modalSheetLarge}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select institution</Text>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setInstitutionModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.searchInputWrap}>
              <TextInput
                value={institutionSearchQuery}
                onChangeText={setInstitutionSearchQuery}
                placeholder="Search institution"
                placeholderTextColor="#A69BC9"
                style={styles.searchInput}
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalListContent}>
              {institutionOptions.map((option) => {
                const isActive = institutionKey === option.key;
                return (
                  <Pressable
                    key={option.key}
                    style={[styles.modalOption, isActive ? styles.modalOptionActive : null]}
                    onPress={() => handlePickInstitution(option)}>
                    <Text style={[styles.modalOptionText, isActive ? styles.modalOptionTextActive : null]}>
                      {option.name}
                    </Text>
                  </Pressable>
                );
              })}
              {institutionOptions.length === 0 ? (
                <View style={styles.noResultWrap}>
                  <Text style={styles.noResultText}>No institutions found for that search.</Text>
                </View>
              ) : null}
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
  scrollContent: {
    paddingBottom: 14,
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
    marginTop: 28,
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
    width: '100%',
    flexDirection: 'row',
    gap: 8,
  },
  inputWrap: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: '#4B2A97',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  selectInput: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: '#4B2A97',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dobSelectInput: {
    flex: 1,
    minWidth: 0,
  },
  selectInputText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Prompt-SemiBold',
  },
  selectInputPlaceholder: {
    color: '#A69BC9',
  },
  helperText: {
    color: '#D7CCF7',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Prompt',
    paddingHorizontal: 2,
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
  locationButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: '#CFFB75',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  locationButtonDisabled: {
    opacity: 0.8,
  },
  locationButtonText: {
    color: '#1D1340',
    fontSize: 13,
    lineHeight: 17,
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
  confirmButton: {
    height: 70,
    borderRadius: 35,
    backgroundColor: '#A385E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: 8,
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
  modalSheetLarge: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: '#4B2A97',
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 24,
    maxHeight: '78%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Prompt-SemiBold',
    textAlign: 'center',
    flex: 1,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5E39B1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputWrap: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#5E39B1',
    paddingHorizontal: 12,
    justifyContent: 'center',
    marginBottom: 10,
  },
  searchInput: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Prompt-SemiBold',
  },
  modalListContent: {
    gap: 8,
    paddingBottom: 12,
  },
  modalOption: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#5E39B1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalOptionActive: {
    backgroundColor: '#CFFB75',
  },
  modalOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Prompt-SemiBold',
    textAlign: 'center',
  },
  modalOptionTextActive: {
    color: '#1D1340',
  },
  noResultWrap: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultText: {
    color: '#D7CCF7',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Prompt-SemiBold',
  },
});
