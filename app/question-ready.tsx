import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const QUESTION_STEPS = 7;

export default function ReadyQuestionScreen() {
  const router = useRouter();

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

        <View style={styles.bottomSpacer} />

        <Pressable style={styles.confirmButton} onPress={() => router.push('/question-photos')}>
          <Text style={styles.confirmButtonText}>Add photos</Text>
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
  confirmButtonText: {
    color: '#1A123A',
    fontSize: 18,
    fontFamily: 'Prompt-SemiBold',
  },
});
