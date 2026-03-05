import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
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

function toUserProfile(uid: string, data: DocumentData): UserProfile {
  return {
    uid,
    email: String(data.email ?? ''),
    fullName: String(data.fullName ?? ''),
    age: Number(data.age ?? 0),
    dateOfBirth: String(data.dateOfBirth ?? ''),
    gender: (data.gender as UserGender) ?? 'female',
    phoneNumber: String(data.phoneNumber ?? ''),
    whatsAppNumber: String(data.whatsAppNumber ?? ''),
    accommodation: (data.accommodation as AccommodationType) ?? 'studio',
    preferredRoommateGender:
      (data.preferredRoommateGender as RoommateGenderPreference) ?? 'any',
    roommateAccommodationPreference:
      (data.roommateAccommodationPreference as RoommateAccommodationPreference) ?? 'any',
    photoUrls: asStringArray(data.photoUrls),
    budgetRange: normalizeBudgetRange(data.budgetRange),
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
    ...payload,
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
    age: 0,
    dateOfBirth: '',
    gender: 'female',
    phoneNumber: '',
    whatsAppNumber: '',
    accommodation: 'studio',
    preferredRoommateGender: 'any',
    roommateAccommodationPreference: 'any',
    photoUrls: [],
    budgetRange: [5000, 8000],
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
  await setDoc(profileRef, { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
}

export function subscribeToUserProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void
): Unsubscribe {
  const profileRef = doc(db, 'users', uid);

  return onSnapshot(profileRef, (snapshot) => {
    if (!snapshot.exists()) {
      onChange(null);
      return;
    }

    onChange(toUserProfile(uid, snapshot.data()));
  });
}
