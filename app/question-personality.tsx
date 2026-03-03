import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const QUESTION_STEPS = 7;

export default function PersonalityQuestionScreen() {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(4);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.contentWrap}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Personality type</Text>
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

        <Text style={styles.promptText}>{'I\'m comfortable living\nwith female roommates'}</Text>

        <View style={styles.scaleRow}>
          {Array.from({ length: 5 }).map((_, index) => {
            const isSelected = selectedIndex === index;
            return (
              <Pressable
                key={`scale-${index}`}
                style={[styles.scaleOption, isSelected ? styles.scaleOptionSelected : null]}
                onPress={() => setSelectedIndex(index)}>
                {isSelected ? <MaterialCommunityIcons name="check" size={32} color="#1E1341" /> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.scaleLabelsRow}>
          <Text style={styles.scaleLabel}>Disagree</Text>
          <Text style={styles.scaleLabel}>Not Sure</Text>
          <Text style={styles.scaleLabel}>Agree</Text>
        </View>

        <View style={styles.bottomSpacer} />

        <Pressable
          style={styles.confirmButton}
          onPress={() => {
            if (selectedIndex === null) return;
            router.push('/question-interests');
          }}>
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
    fontSize: 20,
    lineHeight: 28,
    fontFamily: 'Prompt-SemiBold',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  scaleRow: {
    marginTop: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  scaleOption: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: '#CFFB75',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  scaleOptionSelected: {
    backgroundColor: '#CFFB75',
  },
  scaleLabelsRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  scaleLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Prompt',
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
