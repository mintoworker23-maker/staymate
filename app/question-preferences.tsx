import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Option = {
  key: string;
  label: string;
};

const QUESTION_STEPS = 7;

const accommodationOptions: Option[] = [
  { key: 'bedsitter', label: 'Bedsitter' },
  { key: 'studio', label: 'Studio' },
  { key: 'one-bedroom', label: 'One Bedroom' },
];

const roommateGenderOptions: Option[] = [
  { key: 'women', label: 'Women' },
  { key: 'men', label: 'Men' },
  { key: 'any', label: 'Any' },
];

const userGenderOptions: Option[] = [
  { key: 'female', label: 'Female' },
  { key: 'male', label: 'Male' },
  { key: 'non-binary', label: 'Non-binary' },
];

const budgetOptions: Option[] = [
  { key: '3k-5k', label: 'KES 3k-5k' },
  { key: '5k-8k', label: 'KES 5k-8k' },
  { key: '8k-12k', label: 'KES 8k-12k' },
];

function OptionRow({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Option[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={styles.optionSection}>
      <Text style={styles.optionTitle}>{title}</Text>
      <View style={styles.optionGrid}>
        {options.map((option) => {
          const isActive = option.key === value;
          return (
            <Pressable
              key={option.key}
              style={[styles.optionChip, isActive ? styles.optionChipActive : styles.optionChipInactive]}
              onPress={() => onChange(option.key)}>
              <Text
                style={[
                  styles.optionChipText,
                  isActive ? styles.optionChipTextActive : styles.optionChipTextInactive,
                ]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function PreferencesQuestionScreen() {
  const router = useRouter();
  const [accommodation, setAccommodation] = React.useState('studio');
  const [userGender, setUserGender] = React.useState('female');
  const [roommateGender, setRoommateGender] = React.useState('any');
  const [budgetRange, setBudgetRange] = React.useState('5k-8k');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.contentWrap}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Living Preferences</Text>
        </View>

        <Text style={styles.questionText}>Question 4/7</Text>

        <View style={styles.progressRow}>
          {Array.from({ length: QUESTION_STEPS }).map((_, index) => (
            <View
              key={`step-${index + 1}`}
              style={[styles.progressSegment, index <= 3 ? styles.progressSegmentActive : null]}
            />
          ))}
        </View>

        <View style={styles.card}>
          <OptionRow
            title="Accommodation"
            options={accommodationOptions}
            value={accommodation}
            onChange={setAccommodation}
          />

          <OptionRow title="Your gender" options={userGenderOptions} value={userGender} onChange={setUserGender} />

          <OptionRow
            title="Preferred roommate gender"
            options={roommateGenderOptions}
            value={roommateGender}
            onChange={setRoommateGender}
          />

          <OptionRow title="Budget range" options={budgetOptions} value={budgetRange} onChange={setBudgetRange} />
        </View>

        <View style={styles.bottomSpacer} />

        <Pressable style={styles.confirmButton} onPress={() => router.push('/question-personality')}>
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
  card: {
    marginTop: 26,
    borderRadius: 28,
    backgroundColor: '#5630A6',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  optionSection: {
    gap: 8,
  },
  optionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Prompt-SemiBold',
  },
  optionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  optionChip: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  optionChipActive: {
    backgroundColor: '#CFFB75',
  },
  optionChipInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1.2,
    borderColor: '#CFFB75',
  },
  optionChipText: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: 'Prompt-SemiBold',
  },
  optionChipTextActive: {
    color: '#1D1340',
  },
  optionChipTextInactive: {
    color: '#CFFB75',
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
