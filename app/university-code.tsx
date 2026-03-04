import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOnboardingProfileStore } from '@/context/onboarding-profile-store';
import { sendPasswordReset, signInOrCreateWithPassword } from '@/lib/auth';
import { getLastLoginEmail, saveLastLoginEmail } from '@/lib/auth-session';
import { getUserProfile } from '@/lib/user-profile';

const QUESTION_STEPS = 7;
const MIN_PASSWORD_LENGTH = 6;

function maskEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) return normalized;

  const [localPart, domain] = normalized.split('@');
  const visiblePrefix = localPart.slice(0, 2);
  return `${visiblePrefix}${'*'.repeat(Math.max(localPart.length - 2, 2))}@${domain}`;
}

function getFirebaseErrorCode(error: unknown) {
  if (!error || typeof error !== 'object') return null;
  if (!('code' in error)) return null;

  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

export default function UniversityCodeScreen() {
  const router = useRouter();
  const { resetDraft, setAccountEmail } = useOnboardingProfileStore();
  const params = useLocalSearchParams<{ email?: string; mode?: string }>();
  const paramEmail = typeof params.email === 'string' ? params.email : '';
  const isLoginMode = params.mode === 'login';
  const [resolvedEmail, setResolvedEmail] = React.useState(paramEmail);
  const [isResolvingEmail, setIsResolvingEmail] = React.useState(!paramEmail);

  const [password, setPassword] = React.useState('');
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSendingReset, setIsSendingReset] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [infoMessage, setInfoMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    if (paramEmail) {
      setResolvedEmail(paramEmail);
      setIsResolvingEmail(false);
      void saveLastLoginEmail(paramEmail);
      return () => {
        cancelled = true;
      };
    }

    setIsResolvingEmail(true);
    setErrorMessage(null);
    void (async () => {
      try {
        const rememberedEmail = await getLastLoginEmail();
        if (cancelled) return;

        if (!rememberedEmail) {
          setResolvedEmail('');
          setErrorMessage('No saved email found. Use university email first.');
          return;
        }

        setResolvedEmail(rememberedEmail);
      } catch {
        if (!cancelled) {
          setErrorMessage('Unable to load saved login email. Use university email first.');
        }
      } finally {
        if (!cancelled) {
          setIsResolvingEmail(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paramEmail]);

  const handleConfirm = React.useCallback(() => {
    if (isSubmitting) return;

    if (!resolvedEmail) {
      setErrorMessage('Missing email. Go back and enter your university email.');
      return;
    }

    const normalizedPassword = password.trim();
    if (normalizedPassword.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    void (async () => {
      try {
        const credentials = await signInOrCreateWithPassword(resolvedEmail, normalizedPassword);
        const existingProfile = await getUserProfile(credentials.user.uid);

        if (existingProfile) {
          resetDraft();
          router.replace('/home');
          return;
        }

        resetDraft();
        setAccountEmail(resolvedEmail);
        router.replace('/question-basic-info');
      } catch (error) {
        const code = getFirebaseErrorCode(error);
        if (
          code === 'auth/invalid-credential' ||
          code === 'auth/wrong-password' ||
          code === 'auth/invalid-password'
        ) {
          setErrorMessage('Incorrect password. Please try again.');
        } else if (code === 'auth/weak-password') {
          setErrorMessage('Password is too weak. Use at least 6 characters.');
        } else if (code === 'auth/too-many-requests') {
          setErrorMessage('Too many attempts. Please wait and try again.');
        } else {
          setErrorMessage('Unable to sign in right now. Please try again.');
        }
      } finally {
        setIsSubmitting(false);
      }
    })();
  }, [isSubmitting, password, resetDraft, resolvedEmail, router, setAccountEmail]);

  const handleSendReset = React.useCallback(() => {
    if (isSendingReset) return;
    if (!resolvedEmail) {
      setErrorMessage('Missing email. Go back and enter your university email.');
      return;
    }

    setIsSendingReset(true);
    setErrorMessage(null);
    setInfoMessage(null);

    void (async () => {
      try {
        await sendPasswordReset(resolvedEmail);
        setInfoMessage(`Password reset email sent to ${maskEmail(resolvedEmail)}.`);
      } catch (error) {
        const code = getFirebaseErrorCode(error);
        if (code === 'auth/user-not-found') {
          setErrorMessage('No account found for this email yet. Create one by setting a password.');
        } else if (code === 'auth/too-many-requests') {
          setErrorMessage('Too many requests. Please wait before trying again.');
        } else {
          setErrorMessage('Unable to send reset email right now. Please try again.');
        }
      } finally {
        setIsSendingReset(false);
      }
    })();
  }, [isSendingReset, resolvedEmail]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.contentWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>{isLoginMode ? 'Login' : 'Account Password'}</Text>
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
          {isResolvingEmail
            ? 'Loading your login account...'
            : `Enter your password for ${maskEmail(resolvedEmail || 'your university email')}.`}
        </Text>

        <View style={[styles.codeFieldWrap, errorMessage ? styles.codeFieldWrapError : null]}>
          <TextInput
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (errorMessage) setErrorMessage(null);
              if (infoMessage) setInfoMessage(null);
            }}
            placeholder="Enter password"
            placeholderTextColor="#A69BC9"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={!passwordVisible}
            style={styles.codeInput}
            editable={!isResolvingEmail}
          />
          <Pressable
            style={styles.visibilityButton}
            onPress={() => setPasswordVisible((current) => !current)}
            disabled={isResolvingEmail}>
            <MaterialCommunityIcons
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#D8CCFF"
            />
          </Pressable>
        </View>

        <Pressable style={styles.resendRow} onPress={handleSendReset} disabled={isSendingReset}>
          {isSendingReset ? <ActivityIndicator size="small" color="#D5FF78" style={styles.resetSpinner} /> : null}
          <Text style={styles.resendText}>Forgot password? </Text>
          <Text style={styles.resendAccent}>Send reset email</Text>
        </Pressable>

        {infoMessage ? <Text style={styles.infoStatusText}>{infoMessage}</Text> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {isLoginMode && !resolvedEmail ? (
          <Pressable style={styles.useEmailButton} onPress={() => router.replace('/university-login')}>
            <Text style={styles.useEmailButtonText}>Use university email instead</Text>
          </Pressable>
        ) : null}

        <View style={styles.bottomSpacer} />

        <Pressable
          style={[styles.confirmButton, isSubmitting ? styles.confirmButtonDisabled : null]}
          onPress={handleConfirm}
          disabled={isSubmitting || isResolvingEmail}>
          <Text style={styles.confirmButtonText}>{isSubmitting ? 'Signing in...' : 'Confirm'}</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  codeFieldWrapError: {
    borderWidth: 1.5,
    borderColor: '#FF9FB8',
  },
  codeInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Prompt-SemiBold',
  },
  visibilityButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
  },
  resetSpinner: {
    marginRight: 6,
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
  infoStatusText: {
    marginTop: 10,
    color: '#CFFB75',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Prompt-SemiBold',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  useEmailButton: {
    marginTop: 12,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  useEmailButtonText: {
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
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#1A123A',
    fontSize: 18,
    fontFamily: 'Prompt-SemiBold',
  },
});
