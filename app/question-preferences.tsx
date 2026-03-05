import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOnboardingProfileStore } from '@/context/onboarding-profile-store';
import { goBackOrReplace } from '@/lib/navigation';
import {
  type AccommodationType,
  type BudgetRange,
  type RoommateGenderPreference,
} from '@/types/user-profile';

type Option<T extends string> = {
  key: T;
  label: string;
};

type RangeValue = BudgetRange;
type ActiveThumb = 'lower' | 'upper';

const QUESTION_STEPS = 7;
const BUDGET_MIN = 1000;
const BUDGET_MAX = 10000;
const BUDGET_STEP = 100;
const INITIAL_BUDGET_RANGE: RangeValue = [5000, 8000];
const THUMB_SIZE = 32;

const accommodationOptions: Option<AccommodationType>[] = [
  { key: 'bedsitter', label: 'Bedsitter' },
  { key: 'studio', label: 'Studio' },
  { key: 'one-bedroom', label: 'One Bedroom' },
];

const roommateGenderOptions: Option<RoommateGenderPreference>[] = [
  { key: 'women', label: 'Women' },
  { key: 'men', label: 'Men' },
  { key: 'any', label: 'Any' },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function RangeSlider({
  min,
  max,
  step,
  value,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  value: RangeValue;
  onChange: (next: RangeValue) => void;
}) {
  const [trackWidth, setTrackWidth] = React.useState(0);
  const activeThumbRef = React.useRef<ActiveThumb>('lower');

  const [lowerValue, upperValue] = value;
  const range = max - min;
  const lowerX = trackWidth > 0 ? ((lowerValue - min) / range) * trackWidth : 0;
  const upperX = trackWidth > 0 ? ((upperValue - min) / range) * trackWidth : 0;
  const lowerThumbLeft = clamp(lowerX - THUMB_SIZE / 2, 0, Math.max(trackWidth - THUMB_SIZE, 0));
  const upperThumbLeft = clamp(upperX - THUMB_SIZE / 2, 0, Math.max(trackWidth - THUMB_SIZE, 0));

  const updateValueFromX = React.useCallback(
    (x: number, activeThumb: ActiveThumb) => {
      if (trackWidth <= 0) return;

      const ratio = clamp(x / trackWidth, 0, 1);
      const raw = min + ratio * range;
      const snapped = clamp(min + Math.round((raw - min) / step) * step, min, max);

      if (activeThumb === 'lower') {
        const nextLower = Math.min(snapped, upperValue - step);
        onChange([nextLower, upperValue]);
      } else {
        const nextUpper = Math.max(snapped, lowerValue + step);
        onChange([lowerValue, nextUpper]);
      }
    },
    [lowerValue, max, min, onChange, range, step, trackWidth, upperValue]
  );

  const onTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const x = event.nativeEvent.locationX;
          const lowerDistance = Math.abs(x - lowerX);
          const upperDistance = Math.abs(x - upperX);
          const thumb: ActiveThumb = lowerDistance <= upperDistance ? 'lower' : 'upper';

          activeThumbRef.current = thumb;
          updateValueFromX(x, thumb);
        },
        onPanResponderMove: (event) => {
          updateValueFromX(event.nativeEvent.locationX, activeThumbRef.current);
        },
      }),
    [lowerX, updateValueFromX, upperX]
  );

  return (
    <View style={styles.sliderRoot} onLayout={onTrackLayout}>
      <View style={styles.sliderTrack} />
      <View
        style={[
          styles.sliderFill,
          {
            left: lowerX,
            width: Math.max(upperX - lowerX, 0),
          },
        ]}
      />
      <View style={[styles.sliderThumb, { left: lowerThumbLeft }]} />
      <View style={[styles.sliderThumb, { left: upperThumbLeft }]} />
      <View style={styles.sliderTouchLayer} {...panResponder.panHandlers} />
    </View>
  );
}

function OptionRow<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Option<T>[];
  value: T;
  onChange: (key: T) => void;
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
  const { from } = useLocalSearchParams<{ from?: string | string[] }>();
  const fromProfile = (Array.isArray(from) ? from[0] : from) === 'profile';
  const handleBackPress = React.useCallback(() => {
    goBackOrReplace(router, fromProfile ? '/profile' : '/start');
  }, [fromProfile, router]);
  const { draft, setPreferences } = useOnboardingProfileStore();
  const [accommodation, setAccommodation] = React.useState<AccommodationType>(draft.accommodation);
  const [roommateGender, setRoommateGender] = React.useState<RoommateGenderPreference>(
    draft.preferredRoommateGender
  );
  const [budgetRange, setBudgetRange] = React.useState<RangeValue>(
    draft.budgetRange ?? INITIAL_BUDGET_RANGE
  );

  const handleConfirm = React.useCallback(() => {
    setPreferences({
      accommodation,
      preferredRoommateGender: roommateGender,
      budgetRange,
    });
    router.push(fromProfile ? '/question-personality?from=profile' : '/question-personality');
  }, [accommodation, budgetRange, roommateGender, router, setPreferences, fromProfile]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.contentWrap}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={handleBackPress}>
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

          <OptionRow
            title="Preferred roommate gender"
            options={roommateGenderOptions}
            value={roommateGender}
            onChange={setRoommateGender}
          />

          <View style={styles.optionSection}>
            <View style={styles.budgetLabelRow}>
              <Text style={styles.optionTitle}>Budget range</Text>
              <Text style={styles.budgetValueText}>{`KES ${budgetRange[0]} - ${budgetRange[1]}`}</Text>
            </View>
            <RangeSlider
              min={BUDGET_MIN}
              max={BUDGET_MAX}
              step={BUDGET_STEP}
              value={budgetRange}
              onChange={setBudgetRange}
            />
          </View>
        </View>

        <View style={styles.bottomSpacer} />

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
  budgetLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Prompt-SemiBold',
  },
  budgetValueText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 17,
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
  sliderRoot: {
    height: 32,
    justifyContent: 'center',
    position: 'relative',
    marginTop: 4,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: 'rgba(188, 204, 223, 0.5)',
    borderRadius: 2,
    width: '100%',
  },
  sliderFill: {
    position: 'absolute',
    top: 14,
    height: 4,
    backgroundColor: '#CCFA72',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    top: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#CCFA72',
  },
  sliderTouchLayer: {
    ...StyleSheet.absoluteFillObject,
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
