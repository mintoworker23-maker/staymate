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

import { getLastLoginEmail, saveLastLoginEmail } from '@/lib/auth-session';

const personalDomains = new Set(['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com']);
const STUDENT_EMAIL_PATTERN = /\.(edu|ac\.[a-z]{2,})$/i;

function isUniversityEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.includes(' ') || !normalized.includes('@')) return false;

  const domain = normalized.split('@')[1] ?? '';
  if (!domain || personalDomains.has(domain)) return false;

  return STUDENT_EMAIL_PATTERN.test(domain);
}

const QUESTION_STEPS = 7;

export default function UniversityLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [agreedToTerms, setAgreedToTerms] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const rememberedEmail = await getLastLoginEmail();
        if (!cancelled && rememberedEmail) {
          setEmail(rememberedEmail);
        }
      } catch {
        // Ignore local storage failures and continue with manual input.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleContinue = React.useCallback(() => {
    if (!isUniversityEmail(email)) {
      setErrorMessage('Enter a valid university email to continue.');
      return;
    }

    if (!agreedToTerms) {
      setErrorMessage('Agree to Terms and Conditions to continue.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    setErrorMessage(null);
    void saveLastLoginEmail(normalizedEmail);
    router.push({ pathname: '/university-code', params: { email: normalizedEmail } });
  }, [agreedToTerms, email, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.contentWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>University Verification</Text>
        </View>

        <Text style={styles.questionText}>Question 1/7</Text>

        <View style={styles.progressRow}>
          {Array.from({ length: QUESTION_STEPS }).map((_, index) => (
            <View
              key={`step-${index + 1}`}
              style={[styles.progressSegment, index === 0 ? styles.progressSegmentActive : null]}
            />
          ))}
        </View>

        <View style={[styles.emailFieldWrap, errorMessage ? styles.emailFieldWrapError : null]}>
          <TextInput
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="Enter your university email"
            placeholderTextColor="#A69BC9"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.emailInput}
          />
        </View>

        <Pressable
          style={styles.termsRow}
          onPress={() => {
            setAgreedToTerms((current) => !current);
            if (errorMessage) setErrorMessage(null);
          }}>
          <View style={[styles.checkboxOuter, agreedToTerms ? styles.checkboxOuterChecked : null]}>
            {agreedToTerms ? <MaterialCommunityIcons name="check" size={15} color="#201250" /> : null}
          </View>

          <Text style={styles.termsText}>
            Agree to our <Text style={styles.termsAccent}>Terms</Text> and{' '}
            <Text style={styles.termsAccent}>Conditions</Text>
          </Text>
        </Pressable>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.bottomSpacer} />

        <Pressable style={styles.confirmButton} onPress={handleContinue}>
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
  emailFieldWrap: {
    marginTop: 26,
    borderRadius: 28,
    height: 88,
    backgroundColor: '#5630A6',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  emailFieldWrapError: {
    borderWidth: 1.5,
    borderColor: '#FF9FB8',
  },
  emailInput: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Prompt-SemiBold',
  },
  termsRow: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  checkboxOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#D8D0EF',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOuterChecked: {
    backgroundColor: '#CFFB75',
    borderColor: '#CFFB75',
  },
  termsText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Prompt',
  },
  termsAccent: {
    color: '#D5FF78',
    fontFamily: 'Prompt-SemiBold',
  },
  errorText: {
    marginTop: 10,
    paddingHorizontal: 12,
    color: '#FFB8C8',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Prompt-SemiBold',
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
