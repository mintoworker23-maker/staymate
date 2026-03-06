import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/context/auth-store';
import { useOnboardingProfileStore } from '@/context/onboarding-profile-store';
import { normalizeLookupKey } from '@/lib/location';
import { updateUserProfile } from '@/lib/user-profile';

const QUESTION_STEPS = 7;

export default function ReadyQuestionScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string | string[] }>();
  const fromProfile = (Array.isArray(from) ? from[0] : from) === 'profile';
  const { user } = useAuthStore();
  const { draft, resetDraft } = useOnboardingProfileStore();
  const [isSaving, setIsSaving] = React.useState(false);

  const handleBackPress = React.useCallback(() => {
    router.replace(fromProfile ? '/profile' : '/start');
  }, [fromProfile, router]);

  const handleConfirm = React.useCallback(() => {
    if (!fromProfile) {
      router.push('/question-photos');
      return;
    }
    if (!user) {
      router.replace('/start');
      return;
    }
    if (isSaving) {
      return;
    }
    const normalizedAge = draft.age;
    const normalizedGender = draft.gender;

    if (
      !draft.fullName.trim() ||
      !draft.dateOfBirth.trim() ||
      !normalizedGender ||
      typeof normalizedAge !== 'number' ||
      normalizedAge <= 0 ||
      !draft.phoneNumber.trim() ||
      !draft.whatsAppNumber.trim() ||
      !draft.institutionName.trim() ||
      !draft.town.trim()
    ) {
      Alert.alert(
        'Missing details',
        'Please complete the previous steps before saving your profile.'
      );
      return;
    }

    setIsSaving(true);
    void (async () => {
      try {
        await updateUserProfile(user.uid, {
          email: draft.email || user.email || '',
          fullName: draft.fullName.trim(),
          age: normalizedAge,
          dateOfBirth: draft.dateOfBirth.trim(),
          gender: normalizedGender,
          phoneNumber: draft.phoneNumber.trim(),
          whatsAppNumber: draft.whatsAppNumber.trim(),
          accommodation: draft.accommodation,
          preferredRoommateGender: draft.preferredRoommateGender,
          roommateAccommodationPreference: draft.roommateAccommodationPreference ?? 'any',
          budgetRange: draft.budgetRange,
          institutionName: draft.institutionName.trim(),
          institutionKey: draft.institutionKey || normalizeLookupKey(draft.institutionName),
          campus: draft.campus.trim(),
          town: draft.town.trim(),
          townKey: draft.townKey || normalizeLookupKey(draft.town),
          estate: draft.estate.trim(),
          locationLat: draft.locationLat,
          locationLng: draft.locationLng,
          locationRadiusKm: draft.locationRadiusKm,
          hasAccommodation: draft.hasAccommodation ?? false,
          lifestyleInterests: draft.lifestyleInterests,
          hobbyInterests: draft.hobbyInterests,
          onboardingCompleted: true,
        });
        resetDraft();
        router.replace('/profile');
      } catch {
        Alert.alert('Save failed', 'Unable to update your profile right now. Please try again.');
      } finally {
        setIsSaving(false);
      }
    })();
  }, [draft, fromProfile, isSaving, resetDraft, router, user]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.contentWrap}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={handleBackPress}>
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

        <View style={styles.bottomSpacer} />

        <Pressable
          style={[styles.confirmButton, isSaving ? styles.confirmButtonDisabled : null]}
          onPress={handleConfirm}
          disabled={isSaving}>
          <Text style={styles.confirmButtonText}>
            {isSaving
              ? 'Saving...'
              : fromProfile
                ? 'Save profile'
                : 'Add photos'}
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
