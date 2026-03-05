import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOnboardingProfileStore } from '@/context/onboarding-profile-store';
import {
  loginWithEmailAndPassword,
  registerWithEmailAndPassword,
  sendPasswordReset,
} from '@/lib/auth';
import { getLastLoginEmail, saveLastLoginEmail } from '@/lib/auth-session';
import { goBackOrReplace } from '@/lib/navigation';
import {
  createInitialUserProfile,
  getUserProfile,
  hasMinimumProfilePhotos,
  isUserProfileComplete,
} from '@/lib/user-profile';
import type { UserProfile } from '@/types/user-profile';

const QUESTION_STEPS = 7;
const MIN_PASSWORD_LENGTH = 6;
const PROFILE_LOOKUP_MAX_WAIT_MS = 450;
const personalDomains = new Set([
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
]);
const STUDENT_EMAIL_PATTERN = /\.(edu|ac\.[a-z]{2,})$/i;

function isUniversityEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.includes(' ') || !normalized.includes('@')) return false;

  const domain = normalized.split('@')[1] ?? '';
  if (!domain || personalDomains.has(domain)) return false;

  return STUDENT_EMAIL_PATTERN.test(domain);
}

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

async function getUserProfileWithTimeout(uid: string, timeoutMs: number) {
  const timeoutToken = Symbol('profile-timeout');
  const timeoutPromise = new Promise<typeof timeoutToken>((resolve) => {
    setTimeout(() => resolve(timeoutToken), timeoutMs);
  });
  const profilePromise = getUserProfile(uid).catch(() => null);

  const result = await Promise.race<UserProfile | null | typeof timeoutToken>([
    profilePromise,
    timeoutPromise,
  ]);

  if (result === timeoutToken) {
    return { timedOut: true as const, profile: null };
  }

  return { timedOut: false as const, profile: result };
}

export default function UniversityCodeScreen() {
  const router = useRouter();
  const handleBackPress = React.useCallback(() => {
    goBackOrReplace(router, '/start');
  }, [router]);
  const { resetDraft, setAccountEmail } = useOnboardingProfileStore();
  const params = useLocalSearchParams<{ email?: string; mode?: string }>();
  const paramEmail = typeof params.email === 'string' ? params.email : '';
  const mode = params.mode === 'login' ? 'login' : 'register';
  const isLoginMode = mode === 'login';
  const [resolvedEmail, setResolvedEmail] = React.useState(paramEmail);
  const [isResolvingEmail, setIsResolvingEmail] = React.useState(!paramEmail);

  const [password, setPassword] = React.useState('');
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSendingReset, setIsSendingReset] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [infoMessage, setInfoMessage] = React.useState<string | null>(null);
  const [showResetInboxHint, setShowResetInboxHint] = React.useState(false);
  const [resetModalVisible, setResetModalVisible] = React.useState(false);
  const [resetEmail, setResetEmail] = React.useState('');
  const [resetEmailError, setResetEmailError] = React.useState<string | null>(null);

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

  React.useEffect(() => {
    if (!resetModalVisible) {
      setResetEmail(resolvedEmail);
      setResetEmailError(null);
    }
  }, [resolvedEmail, resetModalVisible]);

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
    setShowResetInboxHint(false);

    void (async () => {
      const authenticate =
        mode === 'login' ? loginWithEmailAndPassword : registerWithEmailAndPassword;

      let uid = '';
      try {
        const credentials = await authenticate(resolvedEmail, normalizedPassword);
        uid = credentials.user.uid;
      } catch (error) {
        const code = getFirebaseErrorCode(error);
        if (mode === 'register' && code === 'auth/email-already-in-use') {
          setErrorMessage('This email is already registered. Use Login from start screen.');
        } else if (
          code === 'auth/invalid-credential' ||
          code === 'auth/wrong-password' ||
          code === 'auth/invalid-password'
        ) {
          setErrorMessage('Incorrect password. Please try again.');
        } else if (mode === 'login' && code === 'auth/user-not-found') {
          setErrorMessage('No account found for this email. Use Register first.');
        } else if (code === 'auth/weak-password') {
          setErrorMessage('Password is too weak. Use at least 6 characters.');
        } else if (code === 'auth/too-many-requests') {
          setErrorMessage('Too many attempts. Please wait and try again.');
        } else {
          setErrorMessage(
            mode === 'login'
              ? 'Unable to sign in right now. Please try again.'
              : 'Unable to create account right now. Please try again.'
          );
        }
        return;
      }

      const routeToOnboarding = () => {
        resetDraft();
        setAccountEmail(resolvedEmail);
        router.replace('/question-basic-info');
      };
      const routeToCompletedDestination = (profile: UserProfile) => {
        resetDraft();
        router.replace(hasMinimumProfilePhotos(profile) ? '/home' : '/question-photos');
      };

      if (mode === 'register') {
        routeToOnboarding();

        void (async () => {
          try {
            await createInitialUserProfile(uid, resolvedEmail);
          } catch {
            // Non-blocking: registration continues even if profile bootstrap write is delayed.
          }
        })();
        return;
      }

      const lookup = await getUserProfileWithTimeout(uid, PROFILE_LOOKUP_MAX_WAIT_MS);

      if (lookup.timedOut) {
        router.replace('/home');

        void (async () => {
          const profile = await getUserProfile(uid).catch(() => null);
          if (!profile) {
            await createInitialUserProfile(uid, resolvedEmail).catch(() => {});
            routeToOnboarding();
            return;
          }

          if (!isUserProfileComplete(profile)) {
            routeToOnboarding();
            return;
          }

          if (!hasMinimumProfilePhotos(profile)) {
            resetDraft();
            router.replace('/question-photos');
          }
        })();
        return;
      }

      if (!lookup.profile) {
        routeToOnboarding();

        void (async () => {
          try {
            await createInitialUserProfile(uid, resolvedEmail);
          } catch {
            // Continue even if initial profile write fails.
          }
        })();
        return;
      }

      if (isUserProfileComplete(lookup.profile)) {
        routeToCompletedDestination(lookup.profile);
      } else {
        routeToOnboarding();
      }
    })().finally(() => {
      setIsSubmitting(false);
    });
  }, [isSubmitting, mode, password, resetDraft, resolvedEmail, router, setAccountEmail]);

  const handleSendReset = React.useCallback(() => {
    if (isSendingReset) return;
    setResetEmail(resolvedEmail);
    setResetEmailError(null);
    setResetModalVisible(true);
  }, [isSendingReset, resolvedEmail]);

  const handleConfirmSendReset = React.useCallback(() => {
    if (isSendingReset) return;

    const normalizedResetEmail = resetEmail.trim().toLowerCase();
    if (!normalizedResetEmail) {
      setResetEmailError('Enter your university email.');
      return;
    }

    if (!isUniversityEmail(normalizedResetEmail)) {
      setResetEmailError('Enter a valid university email.');
      return;
    }

    setIsSendingReset(true);
    setResetEmailError(null);
    setErrorMessage(null);
    setInfoMessage(null);
    setShowResetInboxHint(false);

    void (async () => {
      try {
        await sendPasswordReset(normalizedResetEmail);
        void saveLastLoginEmail(normalizedResetEmail);
        setInfoMessage(`Password reset email sent to ${maskEmail(normalizedResetEmail)}.`);
        setShowResetInboxHint(true);
        setResetModalVisible(false);
      } catch (error) {
        const code = getFirebaseErrorCode(error);
        if (code === 'auth/invalid-email') {
          setResetEmailError('That email format is invalid.');
        } else if (code === 'auth/user-not-found') {
          setResetEmailError('No account found for this email.');
        } else if (code === 'auth/too-many-requests') {
          setResetEmailError('Too many requests. Please wait before trying again.');
        } else {
          setResetEmailError('Unable to send reset email right now. Please try again.');
        }
      } finally {
        setIsSendingReset(false);
      }
    })();
  }, [isSendingReset, resetEmail]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.contentWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={handleBackPress}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>{isLoginMode ? 'Login' : 'Create Password'}</Text>
        </View>

        <Text style={styles.questionText}>{isLoginMode ? 'Login' : 'Question 2/7'}</Text>

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
            : isLoginMode
              ? `Enter your password for ${maskEmail(resolvedEmail || 'your university email')}.`
              : `Create a password for ${maskEmail(resolvedEmail || 'your university email')}.`}
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

        {isLoginMode ? (
          <Pressable style={styles.resendRow} onPress={handleSendReset} disabled={isSendingReset}>
            <Text style={styles.resendText}>Forgot password? </Text>
            <Text style={styles.resendAccent}>Send reset email</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.resendRow}
            onPress={() => router.replace({ pathname: '/university-code', params: { mode: 'login' } })}>
            <Text style={styles.resendText}>Already have an account? </Text>
            <Text style={styles.resendAccent}>Login</Text>
          </Pressable>
        )}

        {infoMessage ? <Text style={styles.infoStatusText}>{infoMessage}</Text> : null}
        {showResetInboxHint ? (
          <Text style={styles.resetInboxHintText}>Check Spam/Promotions if not in inbox.</Text>
        ) : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {isLoginMode ? (
          <Pressable
            style={styles.useEmailButton}
            onPress={() => router.replace({ pathname: '/university-login', params: { mode: 'login' } })}>
            <Text style={styles.useEmailButtonText}>Use another account</Text>
          </Pressable>
        ) : null}

        <View style={styles.bottomSpacer} />

        <Pressable
          style={[styles.confirmButton, isSubmitting ? styles.confirmButtonDisabled : null]}
          onPress={handleConfirm}
          disabled={isSubmitting || isResolvingEmail}>
          <Text style={styles.confirmButtonText}>
            {isSubmitting ? (isLoginMode ? 'Signing in...' : 'Creating account...') : 'Confirm'}
          </Text>
        </Pressable>
      </KeyboardAvoidingView>

      <Modal
        visible={resetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResetModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setResetModalVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reset password</Text>
            <Text style={styles.modalDescription}>
              Enter the university email for the account you want to recover.
            </Text>

            <View
              style={[
                styles.modalInputWrap,
                resetEmailError ? styles.modalInputWrapError : null,
              ]}>
              <TextInput
                value={resetEmail}
                onChangeText={(value) => {
                  setResetEmail(value);
                  if (resetEmailError) setResetEmailError(null);
                }}
                placeholder="your.name@school.ac.ke"
                placeholderTextColor="#A69BC9"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.modalInput}
                editable={!isSendingReset}
              />
            </View>

            {resetEmailError ? <Text style={styles.modalErrorText}>{resetEmailError}</Text> : null}

            <View style={styles.modalButtonRow}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setResetModalVisible(false)}
                disabled={isSendingReset}>
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.modalButtonPrimary, isSendingReset ? styles.modalButtonDisabled : null]}
                onPress={handleConfirmSendReset}
                disabled={isSendingReset}>
                {isSendingReset ? (
                  <ActivityIndicator size="small" color="#1A123A" />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>Send link</Text>
                )}
              </Pressable>
            </View>
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
  resetInboxHintText: {
    marginTop: 6,
    color: '#D8CCFF',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Prompt',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 9, 35, 0.64)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: '#5630A6',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Prompt-SemiBold',
  },
  modalDescription: {
    marginTop: 6,
    color: '#D8CCFF',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Prompt',
  },
  modalInputWrap: {
    marginTop: 12,
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: '#4B2A97',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  modalInputWrapError: {
    borderWidth: 1.5,
    borderColor: '#FF9FB8',
  },
  modalInput: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Prompt-SemiBold',
  },
  modalErrorText: {
    marginTop: 8,
    color: '#FFB8C8',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Prompt-SemiBold',
  },
  modalButtonRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#D5FF78',
  },
  modalButtonSecondary: {
    borderWidth: 1.2,
    borderColor: '#A89CD1',
    backgroundColor: 'transparent',
  },
  modalButtonPrimaryText: {
    color: '#1A123A',
    fontSize: 14,
    fontFamily: 'Prompt-Bold',
  },
  modalButtonSecondaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Prompt-SemiBold',
  },
  modalButtonDisabled: {
    opacity: 0.75,
  },
});
