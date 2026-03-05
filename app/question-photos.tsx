import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/context/auth-store';
import { useOnboardingProfileStore } from '@/context/onboarding-profile-store';
import { uploadProfileImages } from '@/lib/profile-images';
import { updateUserProfile } from '@/lib/user-profile';
import type { UserProfileInput } from '@/types/user-profile';

const QUESTION_STEPS = 7;
const MIN_IMAGES = 2;
const MAX_IMAGES = 4;

function getErrorCode(error: unknown) {
  if (!error || typeof error !== 'object') return null;
  if (!('code' in error)) return null;

  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

function buildEmptySlots() {
  return Array.from({ length: MAX_IMAGES }, () => null as string | null);
}

export default function PhotoSetupQuestionScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { draft, resetDraft } = useOnboardingProfileStore();
  const [imageSlots, setImageSlots] = React.useState<(string | null)[]>(buildEmptySlots());
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const selectedImageUris = React.useMemo(
    () => imageSlots.filter((item): item is string => Boolean(item)),
    [imageSlots]
  );

  const pickImageAt = React.useCallback(async (slotIndex: number) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow media access to add your profile photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.length) return;

    const selected = result.assets[0];
    setImageSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = selected.uri;
      return next;
    });
    if (errorMessage) setErrorMessage(null);
  }, [errorMessage]);

  const removeImageAt = React.useCallback((slotIndex: number) => {
    setImageSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
  }, []);

  const buildProfilePayload = React.useCallback((photoUrls: string[]): UserProfileInput | null => {
    const email = draft.email || user?.email || '';
    if (!email || !draft.fullName || !draft.dateOfBirth || !draft.gender) {
      return null;
    }
    if (
      typeof draft.age !== 'number' ||
      draft.age <= 0 ||
      !draft.roommateAccommodationPreference ||
      draft.hasAccommodation === null
    ) {
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
      roommateAccommodationPreference: draft.roommateAccommodationPreference,
      photoUrls,
      budgetRange: draft.budgetRange,
      hasAccommodation: draft.hasAccommodation,
      lifestyleInterests: draft.lifestyleInterests,
      hobbyInterests: draft.hobbyInterests,
      onboardingCompleted: true,
    };
  }, [draft, user?.email]);

  const handleConfirm = React.useCallback(() => {
    if (isSubmitting) return;
    if (!user) {
      setErrorMessage('Session expired. Please sign in again.');
      return;
    }
    if (selectedImageUris.length < MIN_IMAGES) {
      setErrorMessage(`Add at least ${MIN_IMAGES} photos to continue.`);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    void (async () => {
      try {
        const uploadedUrls = await uploadProfileImages(user.uid, selectedImageUris);
        const payload = buildProfilePayload(uploadedUrls);
        if (payload) {
          await updateUserProfile(user.uid, payload);
        } else {
          await updateUserProfile(user.uid, {
            photoUrls: uploadedUrls,
            onboardingCompleted: true,
          });
        }
        resetDraft();
        router.replace('/home');
      } catch (error) {
        const code = getErrorCode(error);
        if (code === 'cloudinary/missing-config') {
          setErrorMessage(
            'Cloudinary is not configured. Add EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET.'
          );
        } else if (code === 'cloudinary/read-failed') {
          setErrorMessage('Could not read one of the selected images. Please try different photos.');
        } else if (code === 'cloudinary/upload-failed' || code === 'cloudinary/invalid-response') {
          setErrorMessage('Unable to upload photos to Cloudinary right now. Please try again.');
        } else if (code === 'permission-denied') {
          setErrorMessage('Photo upload blocked by Firebase rules. Please update Storage/Firestore rules.');
        } else if (code === 'unavailable') {
          setErrorMessage('Network issue while uploading photos. Please try again.');
        } else {
          setErrorMessage('Unable to save photos right now. Please try again.');
        }
      } finally {
        setIsSubmitting(false);
      }
    })();
  }, [buildProfilePayload, isSubmitting, resetDraft, router, selectedImageUris, user]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.contentWrap}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Profile photos</Text>
        </View>

        <Text style={styles.questionText}>Final setup</Text>

        <View style={styles.progressRow}>
          {Array.from({ length: QUESTION_STEPS }).map((_, index) => (
            <View
              key={`step-${index + 1}`}
              style={[styles.progressSegment, styles.progressSegmentActive]}
            />
          ))}
        </View>

        <Text style={styles.promptTitle}>Add your swipe photos</Text>
        <Text style={styles.promptDescription}>
          Upload between {MIN_IMAGES} and {MAX_IMAGES} photos so your profile can appear in matches.
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.galleryWrap}>
          <View style={styles.grid}>
            {imageSlots.map((uri, index) => {
              const hasImage = Boolean(uri);
              return (
                <View key={`photo-slot-${index}`} style={styles.slotWrap}>
                  {hasImage ? (
                    <Pressable onPress={() => pickImageAt(index)}>
                      <Image source={{ uri: uri as string }} style={styles.slotImage} />
                    </Pressable>
                  ) : (
                    <Pressable style={[styles.slotImage, styles.emptySlot]} onPress={() => pickImageAt(index)}>
                      <MaterialCommunityIcons name="plus-circle-outline" size={34} color="#D5FF78" />
                      <Text style={styles.emptySlotText}>{`Photo ${index + 1}`}</Text>
                    </Pressable>
                  )}

                  {hasImage ? (
                    <Pressable style={styles.removeImageButton} onPress={() => removeImageAt(index)}>
                      <MaterialCommunityIcons name="close-circle" size={24} color="#FFFFFF" />
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        </ScrollView>

        <Text style={styles.countText}>{`${selectedImageUris.length}/${MAX_IMAGES} selected`}</Text>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable
          style={[
            styles.confirmButton,
            selectedImageUris.length < MIN_IMAGES || isSubmitting ? styles.confirmButtonDisabled : null,
          ]}
          onPress={handleConfirm}
          disabled={selectedImageUris.length < MIN_IMAGES || isSubmitting}>
          <Text style={styles.confirmButtonText}>{isSubmitting ? 'Uploading photos...' : 'Finish setup'}</Text>
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
  promptTitle: {
    marginTop: 26,
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'Prompt-SemiBold',
    textAlign: 'center',
  },
  promptDescription: {
    marginTop: 8,
    color: '#E7DBFF',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Prompt',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  galleryWrap: {
    paddingTop: 20,
    paddingBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  slotWrap: {
    width: '48.4%',
    position: 'relative',
  },
  slotImage: {
    width: '100%',
    height: 152,
    borderRadius: 18,
    resizeMode: 'cover',
    backgroundColor: '#5630A6',
  },
  emptySlot: {
    borderWidth: 1.5,
    borderColor: '#CFFB75',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptySlotText: {
    color: '#CFFB75',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Prompt-SemiBold',
  },
  removeImageButton: {
    position: 'absolute',
    right: -8,
    top: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF4D7E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    marginTop: 8,
    color: '#D5FF78',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Prompt-SemiBold',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 8,
    color: '#FFB8C8',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Prompt-SemiBold',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  confirmButton: {
    marginTop: 14,
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
