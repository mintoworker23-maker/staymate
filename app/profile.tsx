import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { sendEmailVerification } from 'firebase/auth';
import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Image,
  ImageSourcePropType,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandedPromptModal } from '@/components/branded-prompt-modal';
import { MediaReviewModal } from '@/components/media-review-modal';
import { useAuthStore } from '@/context/auth-store';
import { useOnboardingProfileStore } from '@/context/onboarding-profile-store';
import { normalizeLookupKey, normalizeRadiusKm } from '@/lib/location';
import { uploadProfileImages } from '@/lib/profile-images';
import { subscribeToUserProfile, updateUserProfile } from '@/lib/user-profile';
import type { UserProfile, UserProfileInput } from '@/types/user-profile';

type ContactRowId =
  | 'full-name'
  | 'age'
  | 'phone'
  | 'whatsapp'
  | 'email'
  | 'bio'
  | 'institution'
  | 'campus'
  | 'town'
  | 'estate'
  | 'radius';

type ContactRow = {
  id: ContactRowId;
  label: string;
  value: string;
  editable: boolean;
};

const MIN_AGE = 16;
const MAX_AGE = 99;
const BIO_MAX_LENGTH = 220;
const MAX_PROFILE_IMAGES = 4;
const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 40;
const WHATSAPP_PREFIX = '+254';
const DEFAULT_PROFILE_AVATAR = require('@/assets/images/image.png');
const EMPTY_IMAGE_SLOTS = Array.from(
  { length: MAX_PROFILE_IMAGES },
  () => null as string | null
);

const CONTACT_ROW_LABELS: Record<ContactRowId, string> = {
  'full-name': 'Full name',
  age: 'Age',
  phone: 'Phone number',
  whatsapp: 'WhatsApp number',
  email: 'Email address',
  bio: 'Bio',
  institution: 'Institution',
  campus: 'Campus',
  town: 'Town',
  estate: 'Estate',
  radius: 'Search radius (km)',
};

function getEditorPlaceholder(rowId: ContactRowId | null): string {
  switch (rowId) {
    case 'full-name':
      return 'e.g. Teddy Omondi';
    case 'age':
      return `Age (${MIN_AGE}-${MAX_AGE})`;
    case 'phone':
      return 'e.g. 0712345678';
    case 'whatsapp':
      return '+254712345678';
    case 'email':
      return 'Email is managed by sign-in';
    case 'bio':
      return 'Tell people about yourself...';
    case 'institution':
      return 'e.g. University of Nairobi';
    case 'campus':
      return 'e.g. Main campus';
    case 'town':
      return 'e.g. Nairobi';
    case 'estate':
      return 'e.g. South B';
    case 'radius':
      return 'e.g. 8';
    default:
      return 'Value';
  }
}

function isValidKenyaMobileNumber(value: string) {
  return /^(?:\+254|254|0)?(?:7\d{8}|1\d{8})$/.test(value);
}

function isValidKenyaWhatsAppNumber(value: string) {
  return /^\+254(?:7\d{8}|1\d{8})$/.test(value);
}

function sanitizePhoneInput(value: string) {
  const trimmed = value.replace(/\s+/g, '');
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');
  return `${hasPlus ? '+' : ''}${digitsOnly}`;
}

function normalizeKenyaWhatsAppInput(value: string) {
  let digits = value.replace(/[^0-9]/g, '');

  if (digits.startsWith('254')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  const localDigits = digits.slice(0, 9);
  return `${WHATSAPP_PREFIX}${localDigits}`;
}

function normalizeProfilePhotoUrls(photoUrls: string[] | undefined): string[] {
  if (!Array.isArray(photoUrls)) return [];

  return photoUrls
    .map((url) => url.trim())
    .filter((url) => url.length > 0)
    .slice(0, MAX_PROFILE_IMAGES);
}

function toPhotoSlots(photoUrls: string[]): (string | null)[] {
  return Array.from(
    { length: MAX_PROFILE_IMAGES },
    (_, index) => photoUrls[index] ?? null
  );
}

function fromPhotoSlots(photoSlots: (string | null)[]): string[] {
  return photoSlots.filter((slot): slot is string => Boolean(slot));
}

function buildContactRows(args: {
  fullName: string;
  bio: string;
  age: number;
  phoneNumber: string;
  whatsAppNumber: string;
  email: string;
  institutionName: string;
  campus: string;
  town: string;
  estate: string;
  locationRadiusKm: number;
}): ContactRow[] {
  return [
    {
      id: 'bio',
      label: CONTACT_ROW_LABELS.bio,
      value: args.bio.trim() || 'No bio yet',
      editable: true,
    },
    {
      id: 'full-name',
      label: CONTACT_ROW_LABELS['full-name'],
      value: args.fullName || 'Not set',
      editable: true,
    },
    {
      id: 'age',
      label: CONTACT_ROW_LABELS.age,
      value: args.age > 0 ? String(args.age) : 'Not set',
      editable: true,
    },
    {
      id: 'phone',
      label: CONTACT_ROW_LABELS.phone,
      value: args.phoneNumber || 'Not set',
      editable: true,
    },
    {
      id: 'whatsapp',
      label: CONTACT_ROW_LABELS.whatsapp,
      value: args.whatsAppNumber ? normalizeKenyaWhatsAppInput(args.whatsAppNumber) : 'Not set',
      editable: true,
    },
    {
      id: 'email',
      label: CONTACT_ROW_LABELS.email,
      value: args.email || 'Not set',
      editable: false,
    },
    {
      id: 'institution',
      label: CONTACT_ROW_LABELS.institution,
      value: args.institutionName || 'Not set',
      editable: true,
    },
    {
      id: 'campus',
      label: CONTACT_ROW_LABELS.campus,
      value: args.campus || 'Not set',
      editable: true,
    },
    {
      id: 'town',
      label: CONTACT_ROW_LABELS.town,
      value: args.town || 'Not set',
      editable: true,
    },
    {
      id: 'estate',
      label: CONTACT_ROW_LABELS.estate,
      value: args.estate || 'Not set',
      editable: true,
    },
    {
      id: 'radius',
      label: CONTACT_ROW_LABELS.radius,
      value: `${normalizeRadiusKm(args.locationRadiusKm)} km`,
      editable: true,
    },
  ];
}

function toProfileUpdate(
  rowId: ContactRowId,
  rawValue: string
): { updates: Partial<UserProfileInput> } | { error: string } {
  switch (rowId) {
    case 'full-name': {
      if (rawValue.length < 2) {
        return { error: 'Full name must have at least 2 characters.' };
      }
      return { updates: { fullName: rawValue } };
    }
    case 'age': {
      const numericAge = Number(rawValue);
      if (!Number.isInteger(numericAge) || numericAge < MIN_AGE || numericAge > MAX_AGE) {
        return { error: `Age must be between ${MIN_AGE} and ${MAX_AGE}.` };
      }
      return { updates: { age: numericAge } };
    }
    case 'phone': {
      if (!isValidKenyaMobileNumber(rawValue)) {
        return {
          error:
            'Use a valid Kenya mobile number (e.g. 0712345678, 0112345678, +254712345678, +254112345678).',
        };
      }
      return { updates: { phoneNumber: rawValue } };
    }
    case 'whatsapp': {
      const normalizedValue = normalizeKenyaWhatsAppInput(rawValue);
      if (!isValidKenyaWhatsAppNumber(normalizedValue)) {
        return {
          error:
            'Use a valid WhatsApp number in +254 format starting with 7 or 1 (e.g. +254712345678).',
        };
      }
      return { updates: { whatsAppNumber: normalizedValue } };
    }
    case 'email': {
      return { error: 'Email is managed by your sign-in account.' };
    }
    case 'bio': {
      if (rawValue.length > BIO_MAX_LENGTH) {
        return { error: `Bio must be at most ${BIO_MAX_LENGTH} characters.` };
      }
      return { updates: { bio: rawValue } };
    }
    case 'institution': {
      if (rawValue.length < 2) {
        return { error: 'Institution name must have at least 2 characters.' };
      }
      return {
        updates: {
          institutionName: rawValue,
          institutionKey: normalizeLookupKey(rawValue),
        },
      };
    }
    case 'campus': {
      return { updates: { campus: rawValue } };
    }
    case 'town': {
      if (rawValue.length < 2) {
        return { error: 'Town must have at least 2 characters.' };
      }
      return {
        updates: {
          town: rawValue,
          townKey: normalizeLookupKey(rawValue),
        },
      };
    }
    case 'estate': {
      return { updates: { estate: rawValue } };
    }
    case 'radius': {
      const numericRadius = Number(rawValue);
      if (!Number.isFinite(numericRadius)) {
        return { error: 'Radius must be a valid number.' };
      }
      if (numericRadius < MIN_RADIUS_KM || numericRadius > MAX_RADIUS_KM) {
        return { error: `Radius must be between ${MIN_RADIUS_KM} and ${MAX_RADIUS_KM} km.` };
      }
      return { updates: { locationRadiusKm: normalizeRadiusKm(numericRadius) } };
    }
    default: {
      return { error: 'This field cannot be updated.' };
    }
  }
}

export default function ProfileScreen() {
  const router = useRouter();
  const handleBackPress = React.useCallback(() => {
    router.replace('/home');
  }, [router]);
  const { user, loading, signOutCurrentUser } = useAuthStore();
  const {
    resetDraft,
    setAccountEmail,
    setBasicInfo,
    setPreferences,
    setRoommateAccommodationPreference,
    setHasAccommodation,
    setInterests,
  } = useOnboardingProfileStore();
  const [contactRows, setContactRows] = React.useState<ContactRow[]>(
    buildContactRows({
      fullName: '',
      bio: '',
      age: 0,
      phoneNumber: '',
      whatsAppNumber: '',
      email: user?.email ?? '',
      institutionName: '',
      campus: '',
      town: '',
      estate: '',
      locationRadiusKm: 8,
    })
  );
  const [photoSlots, setPhotoSlots] = React.useState<(string | null)[]>(
    () => [...EMPTY_IMAGE_SLOTS]
  );
  const [editorVisible, setEditorVisible] = React.useState(false);
  const [logoutPromptVisible, setLogoutPromptVisible] = React.useState(false);
  const [editingRowId, setEditingRowId] = React.useState<ContactRowId | null>(null);
  const [editingValue, setEditingValue] = React.useState('');
  const [profileLoading, setProfileLoading] = React.useState(true);
  const [photoSaving, setPhotoSaving] = React.useState(false);
  const [profileIsVerified, setProfileIsVerified] = React.useState(false);
  const [isSubmittingVerification, setIsSubmittingVerification] = React.useState(false);
  const [hasSentVerificationEmail, setHasSentVerificationEmail] = React.useState(false);
  const [profileSnapshot, setProfileSnapshot] = React.useState<UserProfile | null>(null);
  const [reviewingSlotIndex, setReviewingSlotIndex] = React.useState<number | null>(null);
  const [reviewingImageUri, setReviewingImageUri] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/start');
    }
  }, [loading, router, user]);

  React.useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      setContactRows(
        buildContactRows({
          fullName: '',
          bio: '',
          age: 0,
          phoneNumber: '',
          whatsAppNumber: '',
          email: '',
          institutionName: '',
          campus: '',
          town: '',
          estate: '',
          locationRadiusKm: 8,
        })
      );
      setPhotoSlots([...EMPTY_IMAGE_SLOTS]);
      setProfileIsVerified(false);
      setHasSentVerificationEmail(false);
      setProfileSnapshot(null);
      return;
    }

    setProfileLoading(true);
    const unsubscribe = subscribeToUserProfile(
      user.uid,
      (profile) => {
        setProfileSnapshot(profile);
        setContactRows(
          buildContactRows({
            fullName: profile?.fullName ?? '',
            bio: profile?.bio ?? '',
            age: profile?.age ?? 0,
            phoneNumber: profile?.phoneNumber ?? '',
            whatsAppNumber: profile?.whatsAppNumber ?? '',
            email: profile?.email ?? user.email ?? '',
            institutionName: profile?.institutionName ?? '',
            campus: profile?.campus ?? '',
            town: profile?.town ?? '',
            estate: profile?.estate ?? '',
            locationRadiusKm: profile?.locationRadiusKm ?? 8,
          })
        );
        setPhotoSlots(toPhotoSlots(normalizeProfilePhotoUrls(profile?.photoUrls)));
        setProfileIsVerified(Boolean(profile?.isVerified));
        if (profile?.isVerified) {
          setHasSentVerificationEmail(false);
        }
        setProfileLoading(false);
      },
      () => {
        setProfileLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const addImageAt = React.useCallback(async (slotIndex: number) => {
    if (!user) {
      Alert.alert('Session expired', 'Please sign in again before uploading photos.');
      return;
    }
    if (photoSaving) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.length) return;

      const selected = result.assets[0];
      setReviewingSlotIndex(slotIndex);
      setReviewingImageUri(selected.uri);
    } catch (error) {
      const detail = error instanceof Error ? error.message.toLowerCase() : '';
      if (detail.includes('permission') || detail.includes('denied')) {
        Alert.alert(
          'Permission needed',
          'Allow photo access in phone settings, then try selecting an image again.'
        );
        return;
      }
      Alert.alert('Gallery unavailable', 'Unable to open your gallery right now. Please try again.');
    }
  }, [photoSaving, user]);

  const uploadReviewedImageAt = React.useCallback(async (slotIndex: number, localUri: string) => {
    if (!user) {
      Alert.alert('Session expired', 'Please sign in again before uploading photos.');
      return;
    }

    const previousSlots = [...photoSlots];
    setPhotoSaving(true);

    try {
      const uploadedUrls = await uploadProfileImages(user.uid, [localUri]);
      const uploadedUrl = uploadedUrls[0];
      if (!uploadedUrl) {
        throw new Error('Image upload did not finish.');
      }

      const nextSlots = [...photoSlots];
      nextSlots[slotIndex] = uploadedUrl;
      setPhotoSlots(nextSlots);
      await updateUserProfile(user.uid, {
        photoUrls: fromPhotoSlots(nextSlots),
      });
    } catch (error) {
      setPhotoSlots(previousSlots);
      const detail = error instanceof Error ? error.message.toLowerCase() : '';
      const message = detail.includes('network')
        ? 'You appear to be offline. Check your internet and try again.'
        : 'We could not upload this photo right now. Please try again.';
      Alert.alert('Upload failed', message);
    } finally {
      setPhotoSaving(false);
    }
  }, [photoSlots, user]);

  const removeImageAt = React.useCallback((slotIndex: number) => {
    if (!user || photoSaving) return;

    const previousSlots = [...photoSlots];
    const nextSlots = [...photoSlots];
    nextSlots[slotIndex] = null;
    setPhotoSlots(nextSlots);
    setPhotoSaving(true);

    void (async () => {
      try {
        await updateUserProfile(user.uid, {
          photoUrls: fromPhotoSlots(nextSlots),
        });
      } catch {
        setPhotoSlots(previousSlots);
        Alert.alert('Update failed', 'Unable to remove photo right now. Please try again.');
      } finally {
        setPhotoSaving(false);
      }
    })();
  }, [photoSaving, photoSlots, user]);

  const editingRow = React.useMemo(
    () => contactRows.find((row) => row.id === editingRowId) ?? null,
    [contactRows, editingRowId]
  );
  const profileName = React.useMemo(
    () => contactRows.find((row) => row.id === 'full-name')?.value ?? 'Your name',
    [contactRows]
  );
  const profileAge = React.useMemo(
    () => contactRows.find((row) => row.id === 'age')?.value ?? '',
    [contactRows]
  );
  const profileAvatar = React.useMemo<ImageSourcePropType>(() => {
    const firstPhoto = photoSlots.find((slot): slot is string => Boolean(slot));
    return firstPhoto ? { uri: firstPhoto } : DEFAULT_PROFILE_AVATAR;
  }, [photoSlots]);
  const editorKeyboardType = React.useMemo(() => {
    if (editingRowId === 'age' || editingRowId === 'radius') return 'number-pad' as const;
    if (editingRowId === 'phone' || editingRowId === 'whatsapp') return 'phone-pad' as const;
    if (editingRowId === 'email') return 'email-address' as const;
    return 'default' as const;
  }, [editingRowId]);
  const editorPlaceholder = React.useMemo(
    () => getEditorPlaceholder(editingRowId),
    [editingRowId]
  );

  const openEditor = (row: ContactRow) => {
    if (!row.editable) {
      Alert.alert('Locked field', 'Email is managed by your sign-in account.');
      return;
    }

    setEditingRowId(row.id);
    const currentValue = row.value === 'Not set' || row.value === 'No bio yet' ? '' : row.value;
    if (row.id === 'whatsapp') {
      setEditingValue(normalizeKenyaWhatsAppInput(currentValue || WHATSAPP_PREFIX));
    } else if (row.id === 'radius') {
      setEditingValue(currentValue.replace(/\\s*km$/i, '').trim());
    } else {
      setEditingValue(currentValue);
    }
    setEditorVisible(true);
  };

  const closeEditor = () => {
    setEditorVisible(false);
    setEditingRowId(null);
    setEditingValue('');
  };

  const applyEdit = () => {
    if (!editingRowId || !user) return;

    const nextValue = editingValue.trim();
    const allowsEmptyValue =
      editingRowId === 'bio' || editingRowId === 'campus' || editingRowId === 'estate';
    if (!nextValue && !allowsEmptyValue) {
      Alert.alert('Missing value', 'Enter a value before applying changes.');
      return;
    }

    const result = toProfileUpdate(editingRowId, nextValue);
    if ('error' in result) {
      Alert.alert('Invalid value', result.error);
      return;
    }

    const normalizedDisplayValue =
      editingRowId === 'phone'
        ? sanitizePhoneInput(nextValue)
        : editingRowId === 'whatsapp'
          ? normalizeKenyaWhatsAppInput(nextValue)
          : editingRowId === 'bio'
            ? nextValue || 'No bio yet'
            : editingRowId === 'campus' || editingRowId === 'estate'
              ? nextValue || 'Not set'
            : editingRowId === 'radius'
              ? `${normalizeRadiusKm(Number(nextValue))} km`
            : nextValue;

    const previousRows = contactRows;
    setContactRows((prev) =>
      prev.map((row) =>
        row.id === editingRowId ? { ...row, value: normalizedDisplayValue } : row
      )
    );

    closeEditor();

    void (async () => {
      try {
        await updateUserProfile(user.uid, result.updates);
      } catch {
        setContactRows(previousRows);
        Alert.alert('Update failed', 'Unable to save changes right now. Please try again.');
      }
    })();
  };

  const pickProfileImage = React.useCallback(() => {
    void addImageAt(0);
  }, [addImageAt]);

  const handleLogout = React.useCallback(() => {
    setLogoutPromptVisible(true);
  }, []);

  const handleOpenGuidedSetup = React.useCallback(() => {
    if (!user || !profileSnapshot) {
      Alert.alert('Profile loading', 'Please wait for your profile to load, then try again.');
      return;
    }

    resetDraft();
    setAccountEmail(profileSnapshot.email || user.email || '');
    setBasicInfo({
      fullName: profileSnapshot.fullName,
      age: profileSnapshot.age,
      dateOfBirth: profileSnapshot.dateOfBirth,
      gender: profileSnapshot.gender,
      phoneNumber: profileSnapshot.phoneNumber,
      whatsAppNumber: profileSnapshot.whatsAppNumber,
      institutionName: profileSnapshot.institutionName,
      institutionKey: profileSnapshot.institutionKey,
      campus: profileSnapshot.campus,
      town: profileSnapshot.town,
      townKey: profileSnapshot.townKey || normalizeLookupKey(profileSnapshot.town),
      estate: profileSnapshot.estate,
      locationLat: profileSnapshot.locationLat,
      locationLng: profileSnapshot.locationLng,
      locationRadiusKm: profileSnapshot.locationRadiusKm,
    });
    setPreferences({
      accommodation: profileSnapshot.accommodation,
      preferredRoommateGender: profileSnapshot.preferredRoommateGender,
      budgetRange: profileSnapshot.budgetRange,
    });
    setRoommateAccommodationPreference(profileSnapshot.roommateAccommodationPreference);
    setHasAccommodation(profileSnapshot.hasAccommodation);
    setInterests({
      lifestyleInterests: profileSnapshot.lifestyleInterests,
      hobbyInterests: profileSnapshot.hobbyInterests,
    });

    router.push('/question-basic-info?from=profile');
  }, [
    profileSnapshot,
    resetDraft,
    router,
    setAccountEmail,
    setBasicInfo,
    setHasAccommodation,
    setInterests,
    setPreferences,
    setRoommateAccommodationPreference,
    user,
  ]);

  const syncEmailVerificationToProfile = React.useCallback(
    async (showPendingAlert: boolean): Promise<boolean> => {
      if (!user) return false;

      await user.reload();

      if (!user.emailVerified) {
        if (showPendingAlert) {
          Alert.alert(
            'Email not verified yet',
            'Open the verification email, click the link, then tap "I have verified my email".'
          );
        }
        return false;
      }

      if (!profileIsVerified) {
        await updateUserProfile(user.uid, { isVerified: true });
        setProfileIsVerified(true);
      }
      setHasSentVerificationEmail(false);
      return true;
    },
    [profileIsVerified, user]
  );

  React.useEffect(() => {
    if (!user || profileIsVerified) return;

    void syncEmailVerificationToProfile(false).catch(() => {});
  }, [profileIsVerified, syncEmailVerificationToProfile, user]);

  const handleVerifyProfile = React.useCallback(() => {
    if (!user || isSubmittingVerification || profileIsVerified) return;

    setIsSubmittingVerification(true);
    void (async () => {
      try {
        const alreadyVerified = await syncEmailVerificationToProfile(false);
        if (alreadyVerified) {
          Alert.alert('Profile verified', 'Your verified badge is now active.');
          return;
        }

        await sendEmailVerification(user);
        setHasSentVerificationEmail(true);
        Alert.alert(
          'Verification email sent',
          `We sent a verification link to ${user.email ?? 'your email address'}.`
        );
      } catch {
        Alert.alert(
          'Verification failed',
          'Unable to send verification email right now. Please try again.'
        );
      } finally {
        setIsSubmittingVerification(false);
      }
    })();
  }, [isSubmittingVerification, profileIsVerified, syncEmailVerificationToProfile, user]);

  const handleCheckVerification = React.useCallback(() => {
    if (!user || isSubmittingVerification || profileIsVerified) return;

    setIsSubmittingVerification(true);
    void (async () => {
      try {
        const verified = await syncEmailVerificationToProfile(true);
        if (verified) {
          Alert.alert('Profile verified', 'Your email is verified and your badge is now active.');
        }
      } catch {
        Alert.alert('Verification check failed', 'Unable to check verification right now.');
      } finally {
        setIsSubmittingVerification(false);
      }
    })();
  }, [isSubmittingVerification, profileIsVerified, syncEmailVerificationToProfile, user]);

  const confirmLogout = React.useCallback(() => {
    void (async () => {
      try {
        await signOutCurrentUser();
      } finally {
        setLogoutPromptVisible(false);
        router.replace('/start');
      }
    })();
  }, [router, signOutCurrentUser]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        <View style={styles.topRow}>
          <Pressable onPress={handleBackPress} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={34} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.centerSection}>
          <View style={styles.avatarWrap}>
            <Image source={profileAvatar} style={styles.mainAvatar} />
            <Pressable style={styles.avatarEditButton} onPress={pickProfileImage} disabled={photoSaving}>
              <MaterialCommunityIcons name="pencil-outline" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.userNameRow}>
            <Text style={styles.userName}>
              {profileAge && profileAge !== 'Not set' ? `${profileName}, ${profileAge}` : profileName}
            </Text>
            {profileIsVerified ? (
              <MaterialCommunityIcons name="check-decagram" size={26} color="#F6D84E" />
            ) : null}
          </View>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Log out</Text>
          </Pressable>
        </View>

        {!profileIsVerified ? (
          <View style={styles.verifyCard}>
            <Text style={styles.verifyTitle}>Verify your profile</Text>
            <Text style={styles.verifyDescription}>
              Verify your email to get the yellow tick beside your name and age.
            </Text>
            <Pressable
              style={[styles.verifyButton, isSubmittingVerification ? styles.verifyButtonDisabled : null]}
              onPress={handleVerifyProfile}
              disabled={isSubmittingVerification}>
              <Text style={styles.verifyButtonText}>
                {isSubmittingVerification
                  ? 'Please wait...'
                  : hasSentVerificationEmail
                    ? 'Resend verification email'
                    : 'Send verification email'}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.verifyStatusButton,
                isSubmittingVerification ? styles.verifyButtonDisabled : null,
              ]}
              onPress={handleCheckVerification}
              disabled={isSubmittingVerification}>
              <Text style={styles.verifyStatusButtonText}>I have verified my email</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.verifiedPill}>
            <MaterialCommunityIcons name="check-decagram" size={18} color="#F6D84E" />
            <Text style={styles.verifiedPillText}>Verified profile</Text>
          </View>
        )}

        <Pressable style={styles.guidedSetupButton} onPress={handleOpenGuidedSetup}>
          <MaterialCommunityIcons name="format-list-checks" size={18} color="#1A1433" />
          <Text style={styles.guidedSetupButtonText}>Edit profile with guided steps</Text>
        </Pressable>

        <View style={styles.galleryCard}>
          {photoSlots.map((slot, index) => {
            const hasImage = Boolean(slot);
            return (
              <View key={`slot-${index}`} style={styles.slotWrap}>
                {hasImage ? (
                  <Image source={{ uri: slot as string }} style={styles.slotImage} />
                ) : (
                  <Pressable
                    style={[styles.slotImage, styles.emptySlot]}
                    disabled={photoSaving}
                    onPress={() => {
                      void addImageAt(index);
                    }}>
                    <MaterialCommunityIcons name="plus-circle-outline" size={34} color="#FFFFFF" />
                  </Pressable>
                )}

                {hasImage ? (
                  <Pressable
                    style={styles.removeImageButton}
                    disabled={photoSaving}
                    onPress={() => removeImageAt(index)}>
                    <MaterialCommunityIcons name="close-circle-outline" size={26} color="#FFFFFF" />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>

        {profileLoading || photoSaving ? (
          <Text style={styles.loadingText}>
            {profileLoading ? 'Loading profile...' : 'Saving photos...'}
          </Text>
        ) : null}

        <View style={styles.detailsList}>
          {contactRows.map((row) => (
            <Pressable key={row.id} style={styles.detailRow} onPress={() => openEditor(row)}>
              <Text style={styles.detailLabel}>{row.label}</Text>
              <View style={styles.detailValueWrap}>
                <Text style={styles.detailValue}>{row.value}</Text>
                {row.editable ? (
                  <MaterialCommunityIcons name="chevron-right" size={30} color="#FFFFFF" />
                ) : (
                  <MaterialCommunityIcons name="lock-outline" size={20} color="#FFFFFF" />
                )}
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <BrandedPromptModal
        visible={logoutPromptVisible}
        title="Log out of StayMate?"
        description="You will be returned to the start screen."
        actions={[
          {
            label: 'Log out',
            tone: 'destructive',
            onPress: confirmLogout,
          },
        ]}
        onClose={() => setLogoutPromptVisible(false)}
      />

      <Modal transparent visible={editorVisible} animationType="fade" onRequestClose={closeEditor}>
        <View style={styles.editorOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.editorSheetWrap}>
            <View style={styles.editorSheet}>
              <View style={styles.editorHeader}>
                <Text style={styles.editorTitle}>{editingRow?.label ?? 'Edit field'}</Text>
                <Pressable style={styles.editorCloseButton} onPress={closeEditor}>
                  <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
                </Pressable>
              </View>

              <View style={styles.editorInputWrap}>
                <TextInput
                  value={editingValue}
                  onChangeText={(value) => {
                    if (editingRowId === 'phone') {
                      setEditingValue(sanitizePhoneInput(value).slice(0, 16));
                      return;
                    }
                    if (editingRowId === 'whatsapp') {
                      setEditingValue(normalizeKenyaWhatsAppInput(value));
                      return;
                    }
                    if (editingRowId === 'bio') {
                      setEditingValue(value.slice(0, BIO_MAX_LENGTH));
                      return;
                    }
                    if (editingRowId === 'radius') {
                      setEditingValue(value.replace(/[^0-9.]/g, ''));
                      return;
                    }

                    setEditingValue(value);
                  }}
                  placeholder={editorPlaceholder}
                  placeholderTextColor="#CBBDF0"
                  keyboardType={editorKeyboardType}
                  style={styles.editorInput}
                  autoCapitalize={
                    editingRowId === 'full-name'
                      ? 'words'
                      : editingRowId === 'bio'
                        ? 'sentences'
                        : 'none'
                  }
                  autoCorrect={false}
                  multiline={editingRowId === 'bio'}
                  numberOfLines={editingRowId === 'bio' ? 4 : 1}
                  textAlignVertical={editingRowId === 'bio' ? 'top' : 'center'}
                />
              </View>

              <Pressable style={styles.applyButton} onPress={applyEdit}>
                <Text style={styles.applyButtonText}>Apply changes</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <MediaReviewModal
        visible={Boolean(reviewingImageUri)}
        uri={reviewingImageUri}
        title="Review your profile photo"
        confirmLabel="Upload"
        onClose={() => {
          setReviewingImageUri(null);
          setReviewingSlotIndex(null);
        }}
        onConfirm={(uri) => {
          if (reviewingSlotIndex === null) return;
          setReviewingImageUri(null);
          void uploadReviewedImageAt(reviewingSlotIndex, uri).finally(() => {
            setReviewingSlotIndex(null);
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#371F7E',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  topRow: {
    height: 56,
    justifyContent: 'center',
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5A37AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSection: {
    alignItems: 'center',
    marginTop: 8,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  mainAvatar: {
    width: 140,
    height: 212,
    borderRadius: 24,
    resizeMode: 'cover',
  },
  avatarEditButton: {
    position: 'absolute',
    right: -20,
    bottom: 10,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FF4D7E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 36,
    fontFamily: 'Prompt-Bold',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  logoutButton: {
    marginTop: 10,
    width: 220,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#D84C74',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Prompt-SemiBold',
  },
  verifyCard: {
    marginTop: 16,
    backgroundColor: '#4D2B9D',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1.2,
    borderColor: '#F6D84E',
  },
  verifyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Prompt-SemiBold',
  },
  verifyDescription: {
    marginTop: 4,
    color: '#E5D7FF',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Prompt-SemiBold',
  },
  verifyButton: {
    marginTop: 10,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F6D84E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonDisabled: {
    opacity: 0.7,
  },
  verifyButtonText: {
    color: '#1A1433',
    fontSize: 14,
    fontFamily: 'Prompt-Bold',
  },
  verifyStatusButton: {
    marginTop: 8,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.2,
    borderColor: '#D8CBFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  verifyStatusButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Prompt-SemiBold',
  },
  verifiedPill: {
    marginTop: 16,
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(246, 216, 78, 0.16)',
    borderWidth: 1.2,
    borderColor: '#F6D84E',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  verifiedPillText: {
    color: '#F6D84E',
    fontSize: 14,
    fontFamily: 'Prompt-Bold',
  },
  guidedSetupButton: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: '#D5FF78',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  guidedSetupButtonText: {
    color: '#1A1433',
    fontSize: 14,
    fontFamily: 'Prompt-Bold',
  },
  galleryCard: {
    marginTop: 20,
    backgroundColor: '#4D2B9D',
    borderRadius: 22,
    padding: 10,
    flexDirection: 'row',
    gap: 8,
  },
  slotWrap: {
    flex: 1,
    position: 'relative',
  },
  slotImage: {
    width: '100%',
    height: 138,
    borderRadius: 18,
    resizeMode: 'cover',
  },
  emptySlot: {
    backgroundColor: '#3D2388',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageButton: {
    position: 'absolute',
    right: -8,
    bottom: -10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF4D7E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 14,
    color: '#E5D7FF',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Prompt-SemiBold',
    textAlign: 'center',
  },
  detailsList: {
    marginTop: 14,
    gap: 10,
  },
  detailRow: {
    minHeight: 92,
    borderRadius: 24,
    backgroundColor: '#5130A5',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Prompt-SemiBold',
  },
  detailValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '62%',
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Prompt-SemiBold',
  },
  editorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 8, 39, 0.52)',
    justifyContent: 'flex-end',
  },
  editorSheetWrap: {
    width: '100%',
  },
  editorSheet: {
    backgroundColor: '#371F7E',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24,
    minHeight: 248,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editorTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 28,
    fontFamily: 'Prompt-SemiBold',
  },
  editorCloseButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#5A37AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorInputWrap: {
    marginTop: 20,
    minHeight: 62,
    borderRadius: 20,
    backgroundColor: '#5130A5',
    borderWidth: 2,
    borderColor: '#623CB9',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  editorInput: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Prompt-SemiBold',
  },
  applyButton: {
    marginTop: 20,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#A787E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: '#1A1433',
    fontSize: 20,
    lineHeight: 24,
    fontFamily: 'Prompt-SemiBold',
  },
});
