import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
const DUMMY_VERIFICATION_CODE = '123456';
const CODE_PATTERN = /^\d{6}$/;

function maskEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) return normalized;

  const [localPart, domain] = normalized.split('@');
  const visiblePrefix = localPart.slice(0, 2);
  return `${visiblePrefix}${'*'.repeat(Math.max(localPart.length - 2, 2))}@${domain}`;
}

export default function UniversityCodeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';

  const [code, setCode] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleConfirm = React.useCallback(() => {
    const normalizedCode = code.trim();
    if (!CODE_PATTERN.test(normalizedCode)) {
      setErrorMessage('Enter the 6-digit code.');
      return;
    }

    if (normalizedCode !== DUMMY_VERIFICATION_CODE) {
      setErrorMessage('Invalid code. Use 123456 for now.');
      return;
    }

    setErrorMessage(null);
    router.push('/question-basic-info');
  }, [code, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.contentWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Code Verification</Text>
        </View>

        <Text style={styles.questionText}>Question 2/7</Text>

        <View style={styles.progressRow}>
          {Array.from({ length: QUESTION_STEPS }).map((_, index) => (
            <View
              key={`step-${index + 1}`}
              style={[
                styles.progressSegment,
                index <= 1 ? styles.progressSegmentActive : null,
              ]}
            />
          ))}
        </View>

        <Text style={styles.infoText}>
          {`Enter the 6-digit code sent to ${maskEmail(email || 'your university email')}`}
        </Text>

        <View style={[styles.codeFieldWrap, errorMessage ? styles.codeFieldWrapError : null]}>
          <TextInput
            value={code}
            onChangeText={(value) => {
              const numbersOnly = value.replace(/[^0-9]/g, '').slice(0, 6);
              setCode(numbersOnly);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="Enter verification code"
            placeholderTextColor="#A69BC9"
            keyboardType="number-pad"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={6}
            style={styles.codeInput}
          />
        </View>

        <Pressable
          style={styles.resendRow}
          onPress={() => {
            setErrorMessage('Dummy mode: use code 123456.');
          }}>
          <Text style={styles.resendText}>Didn’t get a code? </Text>
          <Text style={styles.resendAccent}>Resend</Text>
        </Pressable>

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
    marginTop: 52,
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
  infoText: {
    marginTop: 18,
    color: '#D8CCFF',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Prompt',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  codeFieldWrap: {
    marginTop: 14,
    borderRadius: 28,
    height: 88,
    backgroundColor: '#5630A6',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  codeFieldWrapError: {
    borderWidth: 1.5,
    borderColor: '#FF9FB8',
  },
  codeInput: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Prompt-SemiBold',
  },
  resendRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignSelf: 'center',
  },
  resendText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Prompt',
  },
  resendAccent: {
    color: '#D5FF78',
    fontSize: 12,
    fontFamily: 'Prompt-SemiBold',
  },
  errorText: {
    marginTop: 10,
    color: '#FFB8C8',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Prompt-SemiBold',
    textAlign: 'center',
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
