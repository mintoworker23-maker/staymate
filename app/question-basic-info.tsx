import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const QUESTION_STEPS = 7;
const PHONE_PATTERN = /^\+?\d{9,15}$/;

function sanitizePhoneInput(value: string) {
  const trimmed = value.replace(/\s+/g, '');
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');
  return `${hasPlus ? '+' : ''}${digitsOnly}`;
}

export default function BasicInfoQuestionScreen() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState('');
  const [age, setAge] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [whatsAppNumber, setWhatsAppNumber] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleConfirm = React.useCallback(() => {
    const normalizedName = fullName.trim();
    const normalizedAge = age.trim();
    const normalizedPhone = phoneNumber.trim();
    const normalizedWhatsApp = whatsAppNumber.trim();
    const parsedAge = Number(normalizedAge);

    if (normalizedName.length < 2) {
      setErrorMessage('Enter your full name to continue.');
      return;
    }

    if (!Number.isInteger(parsedAge) || parsedAge < 16 || parsedAge > 99) {
      setErrorMessage('Enter a valid age between 16 and 99.');
      return;
    }

    if (!PHONE_PATTERN.test(normalizedPhone)) {
      setErrorMessage('Enter a valid phone number.');
      return;
    }

    if (!PHONE_PATTERN.test(normalizedWhatsApp)) {
      setErrorMessage('Enter a valid WhatsApp number.');
      return;
    }

    setErrorMessage(null);
    router.push({
      pathname: '/question-preferences',
      params: {
        fullName: normalizedName,
        age: normalizedAge,
        phoneNumber: normalizedPhone,
        whatsAppNumber: normalizedWhatsApp,
      },
    });
  }, [age, fullName, phoneNumber, router, whatsAppNumber]);

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

          <View style={styles.inputWrap}>
            <TextInput
              value={age}
              onChangeText={(value) => {
                setAge(value.replace(/[^0-9]/g, '').slice(0, 2));
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Age"
              placeholderTextColor="#A69BC9"
              keyboardType="number-pad"
              style={styles.input}
            />
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
  inputWrap: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#4B2A97',
    justifyContent: 'center',
    paddingHorizontal: 14,
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
});
