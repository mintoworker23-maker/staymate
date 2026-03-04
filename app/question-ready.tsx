import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/context/auth-store';
import { useOnboardingProfileStore } from '@/context/onboarding-profile-store';
import { upsertUserProfile } from '@/lib/user-profile';
import type { UserProfileInput } from '@/types/user-profile';

const QUESTION_STEPS = 7;

export default function ReadyQuestionScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { draft, resetDraft } = useOnboardingProfileStore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const buildProfilePayload = React.useCallback((): UserProfileInput | null => {
    const email = draft.email || user?.email || '';
    if (!email || !draft.fullName || !draft.dateOfBirth || !draft.gender) {
      return null;
    }
    if (typeof draft.age !== 'number' || draft.age <= 0 || draft.hasAccommodation === null) {
      return null;
    }
    if (!draft.phoneNumber || !draft.whatsAppNumber) {
      return null;
    }

    return {
      email,
      fullName: draft.fullName,
      age: draft.age,
      dateOfBirth: draft.dateOfBirth,
      gender: draft.gender,
      phoneNumber: draft.phoneNumber,
      whatsAppNumber: draft.whatsAppNumber,
      accommodation: draft.accommodation,
      preferredRoommateGender: draft.preferredRoommateGender,
      budgetRange: draft.budgetRange,
      hasAccommodation: draft.hasAccommodation,
      lifestyleInterests: draft.lifestyleInterests,
      hobbyInterests: draft.hobbyInterests,
    };
  }, [draft, user?.email]);

  const handleSaveProfile = React.useCallback(() => {
    if (isSubmitting) return;
    if (!user) {
      setErrorMessage('Session expired. Please sign in again.');
      return;
    }

    const payload = buildProfilePayload();
    if (!payload) {
      setErrorMessage('Your onboarding data is incomplete. Please go back and complete all fields.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    void (async () => {
      try {
        await upsertUserProfile(user.uid, payload);
        resetDraft();
        router.replace('/home');
      } catch {
        setErrorMessage('Unable to save your profile right now. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    })();
  }, [buildProfilePayload, isSubmitting, resetDraft, router, user]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.contentWrap}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Almost Done</Text>
        </View>

        <Text style={styles.questionText}>Question 7/7</Text>

        <View style={styles.progressRow}>
          {Array.from({ length: QUESTION_STEPS }).map((_, index) => (
            <View
              key={`step-${index + 1}`}
              style={[styles.progressSegment, index <= 6 ? styles.progressSegmentActive : null]}
            />
          ))}
        </View>

        <View style={styles.readyCard}>
          <View style={styles.readyIconWrap}>
            <MaterialCommunityIcons name="check" size={36} color="#1E1341" />
          </View>
          <Text style={styles.readyTitle}>You are ready to match</Text>
          <Text style={styles.readyDescription}>
            Your profile preferences are set. Start exploring roommates around your campus.
          </Text>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.bottomSpacer} />

        <Pressable
          style={[styles.confirmButton, isSubmitting ? styles.confirmButtonDisabled : null]}
          onPress={handleSaveProfile}
          disabled={isSubmitting}>
          <Text style={styles.confirmButtonText}>
            {isSubmitting ? 'Saving profile...' : 'Go to Home'}
          </Text>
        </Pressable>
      </View>
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
  readyCard: {
    marginTop: 28,
    borderRadius: 28,
    backgroundColor: '#5630A6',
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: 'center',
  },
  readyIconWrap: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#CFFB75',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyTitle: {
    marginTop: 14,
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 24,
    fontFamily: 'Prompt-SemiBold',
    textAlign: 'center',
  },
  readyDescription: {
    marginTop: 8,
    color: '#E7DBFF',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Prompt',
    textAlign: 'center',
  },
  bottomSpacer: {
    flex: 1,
  },
  errorText: {
    marginTop: 10,
    color: '#FFB8C8',
    fontSize: 12,
    lineHeight: 17,
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
  },
  confirmButtonDisabled: {
    opacity: 0.75,
  },
  confirmButtonText: {
    color: '#1A123A',
    fontSize: 18,
    fontFamily: 'Prompt-SemiBold',
  },
});
