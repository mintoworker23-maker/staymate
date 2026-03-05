import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { goBackOrReplace } from '@/lib/navigation';
import { useOnboardingProfileStore } from '@/context/onboarding-profile-store';

const QUESTION_STEPS = 7;

type ChipState = {
  id: string;
  label: string;
  selected: boolean;
};

const initialLifestyleOptions: ChipState[] = [
  { id: 'g-1', label: 'Quiet home', selected: true },
  { id: 'g-2', label: 'Early bird', selected: true },
  { id: 'g-3', label: 'Night owl', selected: false },
  { id: 'g-4', label: 'Social', selected: true },
  { id: 'g-5', label: 'No smoking', selected: false },
  { id: 'g-6', label: 'Clean space', selected: true },
  { id: 'g-7', label: 'Guests okay', selected: false },
  { id: 'g-8', label: 'Cooking', selected: true },
  { id: 'g-9', label: 'Study time', selected: true },
  { id: 'g-10', label: 'Private time', selected: true },
  { id: 'g-11', label: 'Pet friendly', selected: false },
  { id: 'g-12', label: 'Music', selected: true },
];

const initialHobbyOptions: ChipState[] = [
  { id: 's-1', label: 'Football', selected: true },
  { id: 's-2', label: 'Running', selected: true },
  { id: 's-3', label: 'Basketball', selected: false },
  { id: 's-4', label: 'Gym', selected: true },
  { id: 's-5', label: 'Swimming', selected: false },
  { id: 's-6', label: 'Cycling', selected: true },
  { id: 's-7', label: 'Movies', selected: false },
  { id: 's-8', label: 'Reading', selected: true },
  { id: 's-9', label: 'Gaming', selected: true },
  { id: 's-10', label: 'Travel', selected: true },
  { id: 's-11', label: 'Art', selected: false },
  { id: 's-12', label: 'Tech', selected: true },
];

function hydrateSelections(options: ChipState[], selectedLabels: string[]) {
  if (!selectedLabels.length) return options;

  const selectedSet = new Set(selectedLabels);
  return options.map((option) => ({
    ...option,
    selected: selectedSet.has(option.label),
  }));
}

function InterestSection({
  title,
  items,
  onToggle,
}: {
  title: string;
  items: ChipState[];
  onToggle: (id: string) => void;
}) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.chipGrid}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.chip, item.selected ? styles.chipActive : styles.chipInactive]}
            onPress={() => onToggle(item.id)}>
            <Text style={[styles.chipText, item.selected ? styles.chipTextActive : styles.chipTextInactive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function InterestsQuestionScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string | string[] }>();
  const fromProfile = (Array.isArray(from) ? from[0] : from) === 'profile';
  const handleBackPress = React.useCallback(() => {
    goBackOrReplace(router, fromProfile ? '/profile' : '/start');
  }, [fromProfile, router]);
  const { draft, setInterests } = useOnboardingProfileStore();
  const [lifestyleInterests, setLifestyleInterests] = React.useState<ChipState[]>(() =>
    hydrateSelections(initialLifestyleOptions, draft.lifestyleInterests)
  );
  const [hobbyInterests, setHobbyInterests] = React.useState<ChipState[]>(() =>
    hydrateSelections(initialHobbyOptions, draft.hobbyInterests)
  );

  const toggleLifestyleInterest = React.useCallback((id: string) => {
    setLifestyleInterests((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  }, []);

  const toggleHobbyInterest = React.useCallback((id: string) => {
    setHobbyInterests((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  }, []);

  const handleConfirm = React.useCallback(() => {
    setInterests({
      lifestyleInterests: lifestyleInterests
        .filter((item) => item.selected)
        .map((item) => item.label),
      hobbyInterests: hobbyInterests.filter((item) => item.selected).map((item) => item.label),
    });
    router.push(fromProfile ? '/question-ready?from=profile' : '/question-ready');
  }, [hobbyInterests, lifestyleInterests, router, setInterests, fromProfile]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.contentWrap}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={handleBackPress}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Interests</Text>
        </View>

        <Text style={styles.questionText}>Question 6/7</Text>

        <View style={styles.progressRow}>
          {Array.from({ length: QUESTION_STEPS }).map((_, index) => (
            <View
              key={`step-${index + 1}`}
              style={[styles.progressSegment, index <= 5 ? styles.progressSegmentActive : null]}
            />
          ))}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          <Text style={styles.mainTitle}>Choose Your Interests</Text>
          <Text style={styles.descriptionText}>
            Pick the habits and hobbies that match your day-to-day life so we can recommend
            roommates who fit your vibe.
          </Text>

          <InterestSection title="Lifestyle" items={lifestyleInterests} onToggle={toggleLifestyleInterest} />

          <InterestSection title="Sports & hobbies" items={hobbyInterests} onToggle={toggleHobbyInterest} />
        </ScrollView>

        <Pressable style={styles.confirmButton} onPress={handleConfirm}>
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
  scrollContent: {
    paddingTop: 18,
    paddingBottom: 118,
    gap: 22,
  },
  mainTitle: {
    color: '#DDDCF0',
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'Prompt-SemiBold',
  },
  descriptionText: {
    marginTop: -4,
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Prompt',
    opacity: 0.96,
    paddingRight: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Prompt-SemiBold',
    marginBottom: 12,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    minWidth: '31%',
    height: 40,
    borderRadius: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#CFFB75',
  },
  chipInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1.2,
    borderColor: '#CFFB75',
  },
  chipText: {
    fontFamily: 'Prompt-SemiBold',
    fontSize: 11,
    lineHeight: 14,
  },
  chipTextActive: {
    color: '#1D1340',
  },
  chipTextInactive: {
    color: '#CFFB75',
  },
  confirmButton: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 10,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#A385E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#1A123A',
    fontSize: 18,
    fontFamily: 'Prompt-SemiBold',
  },
});
