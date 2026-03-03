import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

export type RangeValue = [number, number];

export type FilterValues = {
  accommodation: string;
  gender: string;
  ageRange: RangeValue;
  budgetRange: RangeValue;
};

export const DEFAULT_FILTER_VALUES: FilterValues = {
  accommodation: 'single-1',
  gender: 'women',
  ageRange: [18, 23],
  budgetRange: [3000, 4500],
};

type FiltersSheetProps = {
  visible: boolean;
  onClose: () => void;
  values?: FilterValues;
  onApply?: (values: FilterValues) => void;
};

type ChipOption = {
  key: string;
  label: string;
};

const accommodationOptions: ChipOption[] = [
  { key: 'single-1', label: 'Single Room' },
  { key: 'single-2', label: 'Single Room' },
  { key: 'single-3', label: 'Single Room' },
];

const genderOptions: ChipOption[] = [
  { key: 'men', label: 'Men' },
  { key: 'women', label: 'Women' },
  { key: 'all', label: 'All' },
];

type ActiveThumb = 'lower' | 'upper';

type RangeSliderProps = {
  min: number;
  max: number;
  step: number;
  value: RangeValue;
  onChange: (next: RangeValue) => void;
};

const THUMB_SIZE = 32;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function RangeSlider({ min, max, step, value, onChange }: RangeSliderProps) {
  const [trackWidth, setTrackWidth] = React.useState(0);
  const activeThumbRef = React.useRef<ActiveThumb>('lower');

  const [lowerValue, upperValue] = value;
  const range = max - min;
  const lowerX = trackWidth > 0 ? ((lowerValue - min) / range) * trackWidth : 0;
  const upperX = trackWidth > 0 ? ((upperValue - min) / range) * trackWidth : 0;

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
      <View style={[styles.sliderThumb, { left: lowerX - THUMB_SIZE / 2 }]} />
      <View style={[styles.sliderThumb, { left: upperX - THUMB_SIZE / 2 }]} />
      <View style={styles.sliderTouchLayer} {...panResponder.panHandlers} />
    </View>
  );
}

export function FiltersSheet({ visible, onClose, values, onApply }: FiltersSheetProps) {
  const [accommodation, setAccommodation] = React.useState(values?.accommodation ?? DEFAULT_FILTER_VALUES.accommodation);
  const [gender, setGender] = React.useState(values?.gender ?? DEFAULT_FILTER_VALUES.gender);
  const [ageRange, setAgeRange] = React.useState<RangeValue>(values?.ageRange ?? DEFAULT_FILTER_VALUES.ageRange);
  const [budgetRange, setBudgetRange] = React.useState<RangeValue>(values?.budgetRange ?? DEFAULT_FILTER_VALUES.budgetRange);

  React.useEffect(() => {
    if (!visible) return;

    const incoming = values ?? DEFAULT_FILTER_VALUES;
    setAccommodation(incoming.accommodation);
    setGender(incoming.gender);
    setAgeRange(incoming.ageRange);
    setBudgetRange(incoming.budgetRange);
  }, [values, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheetContainer}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filters</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <MaterialCommunityIcons name="close-circle-outline" size={24} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Accommodation</Text>
              <View style={styles.rowChips}>
                {accommodationOptions.map((option) => {
                  const active = option.key === accommodation;
                  return (
                    <Pressable
                      key={option.key}
                      onPress={() => setAccommodation(option.key)}
                      style={[styles.chip, active ? styles.chipActive : styles.chipOutline]}>
                      <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextOutline]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Gender:</Text>
              <View style={styles.rowChips}>
                {genderOptions.map((option) => {
                  const active = option.key === gender;
                  return (
                    <Pressable
                      key={option.key}
                      onPress={() => setGender(option.key)}
                      style={[styles.chip, styles.genderChip, active ? styles.chipActive : styles.chipOutline]}>
                      <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextOutline]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Text style={styles.sectionTitle}>Preferred age:</Text>
                <Text style={styles.valueText}>{`${ageRange[0]}-${ageRange[1]}`}</Text>
              </View>
              <RangeSlider min={18} max={35} step={1} value={ageRange} onChange={setAgeRange} />
            </View>

            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Text style={styles.sectionTitle}>Preferred Budget:</Text>
                <Text style={styles.valueText}>{`Kes ${budgetRange[0]} - ${budgetRange[1]}`}</Text>
              </View>
              <RangeSlider min={1000} max={10000} step={100} value={budgetRange} onChange={setBudgetRange} />
            </View>

            <Pressable
              onPress={() => {
                onApply?.({
                  accommodation,
                  gender,
                  ageRange,
                  budgetRange,
                });
                onClose();
              }}
              style={styles.applyButton}>
              <Text style={styles.applyText}>Apply filters</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    maxHeight: '84%',
  },
  sheet: {
    minHeight: 520,
    backgroundColor: '#3E248A',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 30,
    fontFamily: 'Prompt-Bold',
  },
  closeButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#5A37AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Prompt-SemiBold',
    marginBottom: 8,
  },
  rowChips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#CCFA72',
    minHeight: 58,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  chipActive: {
    backgroundColor: '#CCFA72',
  },
  chipOutline: {
    backgroundColor: 'transparent',
  },
  chipText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Prompt-SemiBold',
  },
  chipTextActive: {
    color: '#211246',
  },
  chipTextOutline: {
    color: '#CCFA72',
  },
  genderChip: {
    minHeight: 64,
    borderRadius: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  valueText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Prompt-SemiBold',
  },
  sliderRoot: {
    height: 32,
    justifyContent: 'center',
    position: 'relative',
    marginTop: 8,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#CCFA72',
  },
  sliderTouchLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  applyButton: {
    marginTop: 'auto',
    height: 58,
    borderRadius: 29,
    backgroundColor: '#A88DE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    color: '#120925',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Prompt-SemiBold',
  },
});
