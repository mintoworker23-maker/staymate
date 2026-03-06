import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOnboardingProfileStore } from '@/context/onboarding-profile-store';
import type { RoommateAccommodationPreference } from '@/types/user-profile';

const QUESTION_STEPS = 7;

const accommodationStatusOptions = [
  { key: 'has-accommodation', label: 'Has accommodation' },
  { key: 'looking', label: 'Still looking' },
  { key: 'any', label: 'I don’t mind' },
] as const;

const ownAccommodationOptions = [
  { key: 'yes', label: 'Yes, I have accommodation' },
  { key: 'no', label: 'No, I am still looking' },
] as const;

type AccommodationStatus = RoommateAccommodationPreference;
type OwnAccommodationStatus = (typeof ownAccommodationOptions)[number]['key'];

export default function PersonalityQuestionScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string | string[] }>();
  const fromProfile = (Array.isArray(from) ? from[0] : from) === 'profile';
  const handleBackPress = React.useCallback(() => {
    router.replace(fromProfile ? '/profile' : '/start');
  }, [fromProfile, router]);
  const { draft, setRoommateAccommodationPreference, setHasAccommodation } = useOnboardingProfileStore();
  const [selectedStatus, setSelectedStatus] = React.useState<AccommodationStatus | null>(
    draft.roommateAccommodationPreference
  );
  const [ownAccommodationStatus, setOwnAccommodationStatus] = React.useState<OwnAccommodationStatus | null>(
    draft.hasAccommodation === null ? null : draft.hasAccommodation ? 'yes' : 'no'
  );

  const handleConfirm = React.useCallback(() => {
    if (!selectedStatus || !ownAccommodationStatus) return;

    setRoommateAccommodationPreference(selectedStatus);
    setHasAccommodation(ownAccommodationStatus === 'yes');
    router.push(fromProfile ? '/question-interests?from=profile' : '/question-interests');
  }, [
    ownAccommodationStatus,
    router,
    selectedStatus,
    setHasAccommodation,
    setRoommateAccommodationPreference,
    fromProfile,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.contentWrap}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={handleBackPress}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Roommate preference</Text>
        </View>

        <Text style={styles.questionText}>Question 5/7</Text>

        <View style={styles.progressRow}>
          {Array.from({ length: QUESTION_STEPS }).map((_, index) => (
            <View
              key={`step-${index + 1}`}
              style={[styles.progressSegment, index <= 4 ? styles.progressSegmentActive : null]}
            />
          ))}
        </View>

        <Text style={styles.promptText}>Roommate should already have accommodation?</Text>

        <View style={styles.optionList}>
          {accommodationStatusOptions.map((option) => {
            const isSelected = selectedStatus === option.key;
            return (
              <Pressable
                key={option.key}
                style={[styles.statusOption, isSelected ? styles.statusOptionSelected : styles.statusOptionIdle]}
                onPress={() => setSelectedStatus(option.key)}>
                <View style={styles.statusTextWrap}>
                  <Text
                    style={[
                      styles.statusOptionText,
                      isSelected ? styles.statusOptionTextSelected : styles.statusOptionTextIdle,
                    ]}>
                    {option.label}
                  </Text>
                </View>
                {isSelected ? (
                  <View style={styles.statusCheckWrap}>
                    <MaterialCommunityIcons name="check" size={22} color="#1E1341" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.promptTextSecondary}>Do you currently have accommodation?</Text>

        <View style={styles.optionList}>
          {ownAccommodationOptions.map((option) => {
            const isSelected = ownAccommodationStatus === option.key;
            return (
              <Pressable
                key={option.key}
                style={[styles.statusOption, isSelected ? styles.statusOptionSelected : styles.statusOptionIdle]}
                onPress={() => setOwnAccommodationStatus(option.key)}>
                <View style={styles.statusTextWrap}>
                  <Text
                    style={[
                      styles.statusOptionText,
                      isSelected ? styles.statusOptionTextSelected : styles.statusOptionTextIdle,
                    ]}>
                    {option.label}
                  </Text>
                </View>
                {isSelected ? (
                  <View style={styles.statusCheckWrap}>
                    <MaterialCommunityIcons name="check" size={22} color="#1E1341" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.bottomSpacer} />

        <Pressable
          style={styles.confirmButton}
          onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>Confirm</Text>
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
  promptText: {
    marginTop: 38,
    color: '#FFFFFF',
    fontSize: 21,
    lineHeight: 29,
    fontFamily: 'Prompt-SemiBold',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  promptTextSecondary: {
    marginTop: 22,
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Prompt-SemiBold',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  optionList: {
    marginTop: 28,
    gap: 12,
  },
  statusOption: {
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#CFFB75',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusOptionSelected: {
    backgroundColor: '#CFFB75',
  },
  statusOptionIdle: {
    backgroundColor: 'transparent',
  },
  statusTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  statusOptionText: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Prompt-SemiBold',
  },
  statusOptionTextSelected: {
    color: '#1E1341',
  },
  statusOptionTextIdle: {
    color: '#CFFB75',
  },
  statusCheckWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#B7E463',
    alignItems: 'center',
    justifyContent: 'center',
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
