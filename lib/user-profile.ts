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
    budgetRange: normalizeBudgetRange(data.budgetRange),
    hasAccommodation: Boolean(data.hasAccommodation),
    lifestyleInterests: asStringArray(data.lifestyleInterests),
    hobbyInterests: asStringArray(data.hobbyInterests),
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
  const existing = await getDoc(profileRef);
  const now = new Date().toISOString();

  const merged: UserProfile = {
    uid,
    ...payload,
    createdAt: existing.exists() ? String(existing.data().createdAt ?? now) : now,
    updatedAt: now,
  };

  await setDoc(profileRef, merged, { merge: true });
  return merged;
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
