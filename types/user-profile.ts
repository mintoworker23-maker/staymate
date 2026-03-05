export type UserGender = 'female' | 'male' | 'non-binary';
export type AccommodationType = 'bedsitter' | 'studio' | 'one-bedroom';
export type RoommateGenderPreference = 'women' | 'men' | 'any';
export type RoommateAccommodationPreference = 'has-accommodation' | 'looking' | 'any';

export type BudgetRange = [number, number];

export type UserProfile = {
  uid: string;
  email: string;
  fullName: string;
  bio: string;
  isOnline: boolean;
  age: number;
  dateOfBirth: string;
  gender: UserGender;
  phoneNumber: string;
  whatsAppNumber: string;
  isVerified: boolean;
  accommodation: AccommodationType;
  preferredRoommateGender: RoommateGenderPreference;
  roommateAccommodationPreference: RoommateAccommodationPreference;
  photoUrls: string[];
  budgetRange: BudgetRange;
  institutionName: string;
  institutionKey: string;
  campus: string;
  town: string;
  townKey: string;
  estate: string;
  locationLat: number | null;
  locationLng: number | null;
  locationRadiusKm: number;
  hasAccommodation: boolean;
  lifestyleInterests: string[];
  hobbyInterests: string[];
  onboardingCompleted: boolean;
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
  isVerified: boolean;
  accommodation: AccommodationType;
  preferredRoommateGender: RoommateGenderPreference;
  roommateAccommodationPreference: RoommateAccommodationPreference | null;
  hasAccommodation: boolean | null;
  budgetRange: BudgetRange;
  institutionName: string;
  institutionKey: string;
  campus: string;
  town: string;
  townKey: string;
  estate: string;
  locationLat: number | null;
  locationLng: number | null;
  locationRadiusKm: number;
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
  isVerified: false,
  accommodation: 'studio',
  preferredRoommateGender: 'any',
  roommateAccommodationPreference: null,
  hasAccommodation: null,
  budgetRange: [5000, 8000],
  institutionName: '',
  institutionKey: '',
  campus: '',
  town: '',
  townKey: '',
  estate: '',
  locationLat: null,
  locationLng: null,
  locationRadiusKm: 8,
  lifestyleInterests: [],
  hobbyInterests: [],
};
