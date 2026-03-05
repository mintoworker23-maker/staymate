import {
  collection,
  doc,
  query,
  getDoc,
  onSnapshot,
  setDoc,
  where,
  type DocumentData,
  type FirestoreError,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import {
  DEFAULT_LOCATION_RADIUS_KM,
  normalizeLookupKey,
  normalizeRadiusKm,
} from '@/lib/location';
import {
  type UserProfile,
  type UserProfileInput,
  type BudgetRange,
  type AccommodationType,
  type RoommateAccommodationPreference,
  type RoommateGenderPreference,
  type UserGender,
} from '@/types/user-profile';

function normalizeBudgetRange(value: unknown): BudgetRange {
  if (Array.isArray(value) && value.length === 2) {
    const lower = Number(value[0]);
    const upper = Number(value[1]);
    if (Number.isFinite(lower) && Number.isFinite(upper)) {
      return [lower, upper];
    }
  }

  return [5000, 8000];
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function asFiniteNumberOrNull(value: unknown): number | null {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeProfileLocationFields<T extends Partial<UserProfileInput>>(payload: T): T {
  const nextPayload = { ...payload } as Partial<UserProfileInput>;

  if ('institutionName' in nextPayload || 'institutionKey' in nextPayload) {
    const sourceInstitutionName = String(nextPayload.institutionName ?? '').trim();
    const sourceInstitutionKey = String(nextPayload.institutionKey ?? '').trim();
    const normalizedInstitutionKey = normalizeLookupKey(
      sourceInstitutionKey || sourceInstitutionName
    );

    nextPayload.institutionName = sourceInstitutionName;
    nextPayload.institutionKey = normalizedInstitutionKey;
  }

  if ('town' in nextPayload || 'townKey' in nextPayload) {
    const sourceTown = String(nextPayload.town ?? '').trim();
    const sourceTownKey = String(nextPayload.townKey ?? '').trim();
    const normalizedTownKey = normalizeLookupKey(sourceTownKey || sourceTown);

    nextPayload.town = sourceTown;
    nextPayload.townKey = normalizedTownKey;
  }

  if ('campus' in nextPayload) {
    nextPayload.campus = String(nextPayload.campus ?? '').trim();
  }
  if ('estate' in nextPayload) {
    nextPayload.estate = String(nextPayload.estate ?? '').trim();
  }

  if ('locationRadiusKm' in nextPayload) {
    nextPayload.locationRadiusKm = normalizeRadiusKm(
      nextPayload.locationRadiusKm,
      DEFAULT_LOCATION_RADIUS_KM
    );
  }

  if ('locationLat' in nextPayload) {
    nextPayload.locationLat = asFiniteNumberOrNull(nextPayload.locationLat);
  }

  if ('locationLng' in nextPayload) {
    nextPayload.locationLng = asFiniteNumberOrNull(nextPayload.locationLng);
  }

  return nextPayload as T;
}

function toUserProfile(uid: string, data: DocumentData): UserProfile {
  const institutionName = String(data.institutionName ?? '');
  const institutionKey = normalizeLookupKey(
    String(data.institutionKey ?? institutionName)
  );
  const town = String(data.town ?? '');
  const townKey = normalizeLookupKey(String(data.townKey ?? town));

  return {
    uid,
    email: String(data.email ?? ''),
    fullName: String(data.fullName ?? ''),
    bio: String(data.bio ?? ''),
    isOnline: Boolean(data.isOnline),
    age: Number(data.age ?? 0),
    dateOfBirth: String(data.dateOfBirth ?? ''),
    gender: (data.gender as UserGender) ?? 'female',
    phoneNumber: String(data.phoneNumber ?? ''),
    whatsAppNumber: String(data.whatsAppNumber ?? ''),
    isVerified: Boolean(data.isVerified),
    accommodation: (data.accommodation as AccommodationType) ?? 'studio',
    preferredRoommateGender:
      (data.preferredRoommateGender as RoommateGenderPreference) ?? 'any',
    roommateAccommodationPreference:
      (data.roommateAccommodationPreference as RoommateAccommodationPreference) ?? 'any',
    photoUrls: asStringArray(data.photoUrls),
    budgetRange: normalizeBudgetRange(data.budgetRange),
    institutionName,
    institutionKey,
    campus: String(data.campus ?? ''),
    town,
    townKey,
    estate: String(data.estate ?? ''),
    locationLat: asFiniteNumberOrNull(data.locationLat),
    locationLng: asFiniteNumberOrNull(data.locationLng),
    locationRadiusKm: normalizeRadiusKm(
      data.locationRadiusKm,
      DEFAULT_LOCATION_RADIUS_KM
    ),
    hasAccommodation: Boolean(data.hasAccommodation),
    lifestyleInterests: asStringArray(data.lifestyleInterests),
    hobbyInterests: asStringArray(data.hobbyInterests),
    onboardingCompleted: Boolean(data.onboardingCompleted),
    createdAt: String(data.createdAt ?? ''),
    updatedAt: String(data.updatedAt ?? ''),
  };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const profileRef = doc(db, 'users', uid);
  const snapshot = await getDoc(profileRef);
  if (!snapshot.exists()) {
    return null;
  }

  return toUserProfile(uid, snapshot.data());
}

export async function upsertUserProfile(
  uid: string,
  payload: UserProfileInput
): Promise<UserProfile> {
  const profileRef = doc(db, 'users', uid);
  const now = new Date().toISOString();
  let createdAt = now;

  try {
    const existing = await getDoc(profileRef);
    if (existing.exists()) {
      createdAt = String(existing.data().createdAt ?? now);
    }
  } catch {
    // Some Firestore rules allow writes but block reads.
    // Continue with a write attempt so profile save is not blocked by a pre-read failure.
  }

  const merged: UserProfile = {
    uid,
    ...normalizeProfileLocationFields(payload),
    createdAt,
    updatedAt: now,
  };

  await setDoc(profileRef, merged, { merge: true });
  return merged;
}

export async function createInitialUserProfile(uid: string, email: string): Promise<UserProfile> {
  return upsertUserProfile(uid, {
    email: email.trim().toLowerCase(),
    fullName: '',
    bio: '',
    isOnline: true,
    age: 0,
    dateOfBirth: '',
    gender: 'female',
    phoneNumber: '',
    whatsAppNumber: '',
    isVerified: false,
    accommodation: 'studio',
    preferredRoommateGender: 'any',
    roommateAccommodationPreference: 'any',
    photoUrls: [],
    budgetRange: [5000, 8000],
    institutionName: '',
    institutionKey: '',
    campus: '',
    town: '',
    townKey: '',
    estate: '',
    locationLat: null,
    locationLng: null,
    locationRadiusKm: DEFAULT_LOCATION_RADIUS_KM,
    hasAccommodation: false,
    lifestyleInterests: [],
    hobbyInterests: [],
    onboardingCompleted: false,
  });
}

export function isUserProfileComplete(profile: UserProfile | null): boolean {
  if (!profile) return false;
  if (profile.onboardingCompleted === true) return true;

  // Backward compatibility for existing users created before onboardingCompleted existed.
  return (
    profile.fullName.trim().length >= 2 &&
    profile.age > 0 &&
    profile.dateOfBirth.trim().length > 0 &&
    profile.phoneNumber.trim().length > 0 &&
    profile.whatsAppNumber.trim().length > 0
  );
}

export function hasMinimumProfilePhotos(profile: UserProfile | null, minPhotos = 2): boolean {
  if (!profile) return false;
  return profile.photoUrls.length >= minPhotos;
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfileInput>
): Promise<void> {
  const profileRef = doc(db, 'users', uid);
  await setDoc(
    profileRef,
    {
      ...normalizeProfileLocationFields(updates),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function setUserOnlineStatus(uid: string, isOnline: boolean): Promise<void> {
  if (!uid) return;

  const profileRef = doc(db, 'users', uid);
  await setDoc(
    profileRef,
    {
      isOnline,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export function subscribeToUserProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const profileRef = doc(db, 'users', uid);

  return onSnapshot(
    profileRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }

      onChange(toUserProfile(uid, snapshot.data()));
    },
    (error) => {
      onError?.(error);
    }
  );
}

export function subscribeToDiscoverUserProfiles(
  currentUid: string,
  onChange: (profiles: UserProfile[]) => void,
  onError?: (error: FirestoreError) => void,
  options?: {
    institutionKey?: string | null;
  }
): Unsubscribe {
  const usersRef = collection(db, 'users');
  const normalizedInstitutionKey = normalizeLookupKey(options?.institutionKey ?? '');
  const discoverableUsersQuery =
    normalizedInstitutionKey.length > 0
      ? query(
          usersRef,
          where('onboardingCompleted', '==', true),
          where('institutionKey', '==', normalizedInstitutionKey)
        )
      : query(usersRef, where('onboardingCompleted', '==', true));

  return onSnapshot(
    discoverableUsersQuery,
    (snapshot) => {
      const profiles = snapshot.docs
        .map((entry) => toUserProfile(entry.id, entry.data()))
        .filter((profile) => profile.uid !== currentUid);

      onChange(profiles);
    },
    (error) => {
      onError?.(error);
    }
  );
}
