export type UserGender = 'female' | 'male' | 'non-binary';
export type AccommodationType = 'bedsitter' | 'studio' | 'one-bedroom';
export type RoommateGenderPreference = 'women' | 'men' | 'any';

export type BudgetRange = [number, number];

export type UserProfile = {
  uid: string;
  email: string;
  fullName: string;
  age: number;
  dateOfBirth: string;
  gender: UserGender;
  phoneNumber: string;
  whatsAppNumber: string;
  accommodation: AccommodationType;
  preferredRoommateGender: RoommateGenderPreference;
  budgetRange: BudgetRange;
  hasAccommodation: boolean;
  lifestyleInterests: string[];
  hobbyInterests: string[];
  createdAt: string;
  updatedAt: string;
};

export type UserProfileInput = Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>;

export type OnboardingDraft = {
  email: string;
  fullName: string;
  age: number | null;
  dateOfBirth: string;
  gender: UserGender | null;
  phoneNumber: string;
  whatsAppNumber: string;
  accommodation: AccommodationType;
  preferredRoommateGender: RoommateGenderPreference;
  budgetRange: BudgetRange;
  hasAccommodation: boolean | null;
  lifestyleInterests: string[];
  hobbyInterests: string[];
};

export const DEFAULT_ONBOARDING_DRAFT: OnboardingDraft = {
  email: '',
  fullName: '',
  age: null,
  dateOfBirth: '',
  gender: null,
  phoneNumber: '',
  whatsAppNumber: '',
  accommodation: 'studio',
  preferredRoommateGender: 'any',
  budgetRange: [5000, 8000],
  hasAccommodation: null,
  lifestyleInterests: [],
  hobbyInterests: [],
};
