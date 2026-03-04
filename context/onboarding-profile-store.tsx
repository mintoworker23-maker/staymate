import React from 'react';

import {
  DEFAULT_ONBOARDING_DRAFT,
  type AccommodationType,
  type BudgetRange,
  type OnboardingDraft,
  type RoommateGenderPreference,
  type UserGender,
} from '@/types/user-profile';

type OnboardingProfileStoreValue = {
  draft: OnboardingDraft;
  resetDraft: () => void;
  setAccountEmail: (email: string) => void;
  setBasicInfo: (payload: {
    fullName: string;
    age: number;
    dateOfBirth: string;
    gender: UserGender;
    phoneNumber: string;
    whatsAppNumber: string;
  }) => void;
  setPreferences: (payload: {
    accommodation: AccommodationType;
    preferredRoommateGender: RoommateGenderPreference;
    budgetRange: BudgetRange;
  }) => void;
  setHasAccommodation: (value: boolean) => void;
  setInterests: (payload: { lifestyleInterests: string[]; hobbyInterests: string[] }) => void;
};

const OnboardingProfileStoreContext = React.createContext<OnboardingProfileStoreValue | null>(null);

export function OnboardingProfileStoreProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = React.useState<OnboardingDraft>(DEFAULT_ONBOARDING_DRAFT);

  const resetDraft = React.useCallback(() => {
    setDraft(DEFAULT_ONBOARDING_DRAFT);
  }, []);

  const setAccountEmail = React.useCallback((email: string) => {
    setDraft((prev) => ({ ...prev, email: email.trim().toLowerCase() }));
  }, []);

  const setBasicInfo = React.useCallback(
    (payload: {
      fullName: string;
      age: number;
      dateOfBirth: string;
      gender: UserGender;
      phoneNumber: string;
      whatsAppNumber: string;
    }) => {
      setDraft((prev) => ({
        ...prev,
        fullName: payload.fullName,
        age: payload.age,
        dateOfBirth: payload.dateOfBirth,
        gender: payload.gender,
        phoneNumber: payload.phoneNumber,
        whatsAppNumber: payload.whatsAppNumber,
      }));
    },
    []
  );

  const setPreferences = React.useCallback(
    (payload: {
      accommodation: AccommodationType;
      preferredRoommateGender: RoommateGenderPreference;
      budgetRange: BudgetRange;
    }) => {
      setDraft((prev) => ({
        ...prev,
        accommodation: payload.accommodation,
        preferredRoommateGender: payload.preferredRoommateGender,
        budgetRange: payload.budgetRange,
      }));
    },
    []
  );

  const setHasAccommodation = React.useCallback((value: boolean) => {
    setDraft((prev) => ({ ...prev, hasAccommodation: value }));
  }, []);

  const setInterests = React.useCallback(
    (payload: { lifestyleInterests: string[]; hobbyInterests: string[] }) => {
      setDraft((prev) => ({
        ...prev,
        lifestyleInterests: payload.lifestyleInterests,
        hobbyInterests: payload.hobbyInterests,
      }));
    },
    []
  );

  const value = React.useMemo<OnboardingProfileStoreValue>(
    () => ({
      draft,
      resetDraft,
      setAccountEmail,
      setBasicInfo,
      setPreferences,
      setHasAccommodation,
      setInterests,
    }),
    [draft, resetDraft, setAccountEmail, setBasicInfo, setPreferences, setHasAccommodation, setInterests]
  );

  return (
    <OnboardingProfileStoreContext.Provider value={value}>
      {children}
    </OnboardingProfileStoreContext.Provider>
  );
}

export function useOnboardingProfileStore() {
  const context = React.useContext(OnboardingProfileStoreContext);
  if (!context) {
    throw new Error('useOnboardingProfileStore must be used within OnboardingProfileStoreProvider');
  }

  return context;
}
