import { type MatchPerson } from '@/data/people';
import {
  DEFAULT_LOCATION_RADIUS_KM,
  haversineDistanceKm,
  normalizeLookupKey,
  normalizeRadiusKm,
} from '@/lib/location';
import {
  type AccommodationType,
  type BudgetRange,
  type RoommateGenderPreference,
  type UserProfile,
} from '@/types/user-profile';

export type MatchFilterAccommodation = 'any' | AccommodationType;
export type MatchFilterGender = 'all' | 'women' | 'men';
export type MatchLocationScope = 'same-institution' | 'same-town' | 'anywhere';

export type MatchFilterValues = {
  accommodation: MatchFilterAccommodation;
  gender: MatchFilterGender;
  ageRange: BudgetRange;
  budgetRange: BudgetRange;
  locationScope: MatchLocationScope;
};

export type CandidateSource = 'roommates' | 'requests';

export type HomeRecommendation = {
  person: MatchPerson;
  score: number;
  source: CandidateSource;
};

type CandidateGender = 'female' | 'male' | 'non-binary';

type CandidateProfileTraits = {
  person: MatchPerson;
  accommodation: AccommodationType;
  gender: CandidateGender;
  budgetRange: BudgetRange;
  hasAccommodation: boolean;
  interests: string[];
  institutionKey: string;
  townKey: string;
  estateKey: string;
  locationLat: number | null;
  locationLng: number | null;
  locationRadiusKm: number;
  scoreSeed: number;
};

export const DEFAULT_MATCH_FILTER_VALUES: MatchFilterValues = {
  accommodation: 'any',
  gender: 'all',
  ageRange: [18, 30],
  budgetRange: [3000, 12000],
  locationScope: 'same-institution',
};

const FEMALE_FIRST_NAMES = new Set(['akinyi', 'njeri', 'anne', 'faith', 'mercy']);
const MALE_FIRST_NAMES = new Set(['teddy', 'mark', 'kelvin', 'brian', 'kevin']);
const INTEREST_POOL = [
  'cleanliness',
  'quiet-space',
  'music',
  'cooking',
  'fitness',
  'study-focus',
  'early-riser',
  'night-owl',
  'social',
  'weekend-plans',
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function seededUnit(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapSeed = seed + index * 101;
    const swapIndex = Math.floor(seededUnit(swapSeed) * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function mapRoleToAccommodation(role: string): AccommodationType {
  const normalized = role.trim().toLowerCase();
  if (normalized.includes('bed')) return 'bedsitter';
  if (normalized.includes('studio')) return 'studio';
  return 'one-bedroom';
}

function deriveCandidateGender(person: MatchPerson): CandidateGender {
  if (person.gender === 'female' || person.gender === 'male' || person.gender === 'non-binary') {
    return person.gender;
  }

  const firstName = person.name.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  if (FEMALE_FIRST_NAMES.has(firstName)) return 'female';
  if (MALE_FIRST_NAMES.has(firstName)) return 'male';
  return hashString(person.id) % 2 === 0 ? 'female' : 'male';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeCandidateBudgetRange(
  budgetRange: MatchPerson['budgetRange'] | undefined,
  fallbackBudgetRange: BudgetRange
): BudgetRange {
  if (!budgetRange || budgetRange.length !== 2) {
    return fallbackBudgetRange;
  }

  const lower = Number(budgetRange[0]);
  const upper = Number(budgetRange[1]);
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
    return fallbackBudgetRange;
  }

  return [Math.min(lower, upper), Math.max(lower, upper)];
}

function normalizeInterests(person: MatchPerson, seed: number) {
  const fromPreferences = person.preferences
    .map((preference) => preference.trim().toLowerCase())
    .filter((preference) => preference.length > 0);

  if (fromPreferences.length > 0) {
    return Array.from(new Set(fromPreferences)).slice(0, 6);
  }

  return [
    INTEREST_POOL[seed % INTEREST_POOL.length],
    INTEREST_POOL[(seed + 3) % INTEREST_POOL.length],
    INTEREST_POOL[(seed + 6) % INTEREST_POOL.length],
  ];
}

function deriveCandidateTraits(person: MatchPerson): CandidateProfileTraits {
  const accommodation = person.accommodationType ?? mapRoleToAccommodation(person.role);
  const seed = hashString(person.id);

  const baseBudgetByAccommodation: Record<AccommodationType, BudgetRange> = {
    bedsitter: [3500, 7000],
    studio: [5500, 9500],
    'one-bedroom': [8000, 14000],
  };
  const budgetBase = baseBudgetByAccommodation[accommodation];
  const variation = (seed % 5) * 300 - 600;
  const lowerBudget = Math.max(1200, budgetBase[0] + variation);
  const upperBudget = Math.max(lowerBudget + 1200, budgetBase[1] + variation);

  const institutionKey = normalizeLookupKey(person.institutionKey ?? person.institutionName ?? '');
  const townKey = normalizeLookupKey(person.townKey ?? person.town ?? '');
  const estateKey = normalizeLookupKey(person.estate ?? '');

  return {
    person,
    accommodation,
    gender: deriveCandidateGender(person),
    budgetRange: normalizeCandidateBudgetRange(person.budgetRange, [lowerBudget, upperBudget]),
    hasAccommodation:
      typeof person.hasAccommodation === 'boolean' ? person.hasAccommodation : seed % 3 !== 0,
    interests: normalizeInterests(person, seed),
    institutionKey,
    townKey,
    estateKey,
    locationLat: isFiniteNumber(person.locationLat) ? Number(person.locationLat) : null,
    locationLng: isFiniteNumber(person.locationLng) ? Number(person.locationLng) : null,
    locationRadiusKm: normalizeRadiusKm(person.locationRadiusKm, DEFAULT_LOCATION_RADIUS_KM),
    scoreSeed: seed,
  };
}

function rangeOverlapRatio(rangeA: BudgetRange, rangeB: BudgetRange) {
  const intersection = Math.max(0, Math.min(rangeA[1], rangeB[1]) - Math.max(rangeA[0], rangeB[0]));
  if (intersection <= 0) return 0;

  const spanA = Math.max(1, rangeA[1] - rangeA[0]);
  const spanB = Math.max(1, rangeB[1] - rangeB[0]);
  return intersection / Math.min(spanA, spanB);
}

function getGenderPreferenceScore(
  preference: RoommateGenderPreference,
  candidateGender: CandidateGender
) {
  if (preference === 'any') return candidateGender === 'non-binary' ? 0.9 : 1;
  if (preference === 'women') {
    if (candidateGender === 'female') return 1;
    if (candidateGender === 'non-binary') return 0.58;
    return 0.12;
  }

  if (candidateGender === 'male') return 1;
  if (candidateGender === 'non-binary') return 0.58;
  return 0.12;
}

function getAccommodationScore(
  userAccommodation: AccommodationType,
  candidateAccommodation: AccommodationType
) {
  if (userAccommodation === candidateAccommodation) return 1;
  if (
    (userAccommodation === 'studio' && candidateAccommodation !== 'studio') ||
    (candidateAccommodation === 'studio' && userAccommodation !== 'studio')
  ) {
    return 0.68;
  }
  return 0.38;
}

function getAgeScore(userAge: number, candidateAge: number) {
  if (userAge <= 0) return 0.66;
  const delta = Math.abs(userAge - candidateAge);
  return clamp(1 - delta / 12, 0.24, 1);
}

function getRoommateAccommodationScore(
  preference: UserProfile['roommateAccommodationPreference'],
  candidateHasAccommodation: boolean
) {
  if (preference === 'any') return 0.8;
  if (preference === 'has-accommodation') return candidateHasAccommodation ? 1 : 0.2;
  return candidateHasAccommodation ? 0.36 : 1;
}

function getBudgetScore(userBudgetRange: BudgetRange, candidateBudgetRange: BudgetRange) {
  const overlap = rangeOverlapRatio(userBudgetRange, candidateBudgetRange);
  if (overlap > 0) {
    return clamp(0.56 + overlap * 0.44, 0, 1);
  }

  const belowGap = userBudgetRange[0] - candidateBudgetRange[1];
  const aboveGap = candidateBudgetRange[0] - userBudgetRange[1];
  const distance = Math.max(belowGap, aboveGap, 0);
  return clamp(0.64 - distance / 12000, 0.18, 0.62);
}

function getInterestScore(userProfile: UserProfile, candidateInterests: string[]) {
  const userInterests = [...userProfile.lifestyleInterests, ...userProfile.hobbyInterests]
    .map((interest) => interest.trim().toLowerCase())
    .filter((interest) => interest.length > 0);
  if (userInterests.length === 0) return 0.62;

  const userSet = new Set(userInterests);
  const overlapCount = candidateInterests.filter((interest) => userSet.has(interest)).length;
  const overlapRatio = overlapCount / Math.min(userSet.size, candidateInterests.length);
  return clamp(0.25 + overlapRatio * 0.75, 0.25, 1);
}

function getLocationScore(userProfile: UserProfile, traits: CandidateProfileTraits) {
  const userInstitutionKey = normalizeLookupKey(
    userProfile.institutionKey || userProfile.institutionName
  );
  const userTownKey = normalizeLookupKey(userProfile.townKey || userProfile.town);
  const userEstateKey = normalizeLookupKey(userProfile.estate);

  let score = 0.56;

  if (userInstitutionKey && traits.institutionKey) {
    score = userInstitutionKey === traits.institutionKey ? 1 : 0.14;
  } else if (userInstitutionKey || traits.institutionKey) {
    score = 0.42;
  }

  if (userTownKey && traits.townKey) {
    const townScore = userTownKey === traits.townKey ? 1 : 0.28;
    score = score * 0.68 + townScore * 0.32;
  }

  if (userEstateKey && traits.estateKey && userEstateKey === traits.estateKey) {
    score = clamp(score + 0.08, 0, 1);
  }

  const userLat = userProfile.locationLat;
  const userLng = userProfile.locationLng;
  if (
    isFiniteNumber(userLat) &&
    isFiniteNumber(userLng) &&
    isFiniteNumber(traits.locationLat) &&
    isFiniteNumber(traits.locationLng)
  ) {
    const distanceKm = haversineDistanceKm({
      fromLat: userLat,
      fromLng: userLng,
      toLat: traits.locationLat,
      toLng: traits.locationLng,
    });
    const preferredDistanceKm = Math.max(
      normalizeRadiusKm(userProfile.locationRadiusKm, DEFAULT_LOCATION_RADIUS_KM),
      normalizeRadiusKm(traits.locationRadiusKm, DEFAULT_LOCATION_RADIUS_KM),
      3
    );

    const distanceScore = clamp(1 - distanceKm / (preferredDistanceKm * 3), 0.06, 1);
    score = score * 0.56 + distanceScore * 0.44;
  }

  return clamp(score, 0.05, 1);
}

function computeCompatibilityScore(userProfile: UserProfile | null, traits: CandidateProfileTraits) {
  if (!userProfile) {
    const seededFallback = 64 + Math.round(seededUnit(traits.scoreSeed) * 30);
    return clamp(seededFallback, 55, 94);
  }

  const genderScore = getGenderPreferenceScore(userProfile.preferredRoommateGender, traits.gender);
  const budgetScore = getBudgetScore(userProfile.budgetRange, traits.budgetRange);
  const accommodationScore = getAccommodationScore(userProfile.accommodation, traits.accommodation);
  const ageScore = getAgeScore(userProfile.age, traits.person.age);
  const availabilityScore = getRoommateAccommodationScore(
    userProfile.roommateAccommodationPreference,
    traits.hasAccommodation
  );
  const interestScore = getInterestScore(userProfile, traits.interests);
  const locationScore = getLocationScore(userProfile, traits);

  const weightedScore =
    genderScore * 20 +
    budgetScore * 18 +
    accommodationScore * 14 +
    ageScore * 12 +
    availabilityScore * 10 +
    interestScore * 10 +
    locationScore * 16;

  return Math.round(clamp(weightedScore, 28, 98));
}

function passesLocationScopeFilter(args: {
  userProfile: UserProfile | null;
  traits: CandidateProfileTraits;
  locationScope: MatchLocationScope;
}) {
  if (!args.userProfile || args.locationScope === 'anywhere') {
    return true;
  }

  const userInstitutionKey = normalizeLookupKey(
    args.userProfile.institutionKey || args.userProfile.institutionName
  );
  const userTownKey = normalizeLookupKey(args.userProfile.townKey || args.userProfile.town);

  if (args.locationScope === 'same-institution') {
    if (!userInstitutionKey) {
      return true;
    }

    return args.traits.institutionKey === userInstitutionKey;
  }

  if (!userTownKey) {
    return true;
  }

  return args.traits.townKey === userTownKey;
}

function passesFilters(args: {
  traits: CandidateProfileTraits;
  filters: MatchFilterValues;
  userProfile: UserProfile | null;
}) {
  const age = args.traits.person.age;
  const [minAge, maxAge] = args.filters.ageRange;
  if (age < minAge || age > maxAge) return false;

  if (
    args.filters.accommodation !== 'any' &&
    args.traits.accommodation !== args.filters.accommodation
  ) {
    return false;
  }

  if (args.filters.gender === 'women' && args.traits.gender !== 'female') return false;
  if (args.filters.gender === 'men' && args.traits.gender !== 'male') return false;

  if (rangeOverlapRatio(args.filters.budgetRange, args.traits.budgetRange) <= 0) return false;

  if (
    !passesLocationScopeFilter({
      userProfile: args.userProfile,
      traits: args.traits,
      locationScope: args.filters.locationScope,
    })
  ) {
    return false;
  }

  return true;
}

export function buildHomeRecommendations(args: {
  people: MatchPerson[];
  userProfile: UserProfile | null;
  filters: MatchFilterValues;
  randomSeed: number;
}): HomeRecommendation[] {
  const withScores = args.people.map((person) => {
    const traits = deriveCandidateTraits(person);
    return {
      traits,
      score: computeCompatibilityScore(args.userProfile, traits),
    };
  });

  const filtered = withScores.filter((entry) =>
    passesFilters({
      traits: entry.traits,
      filters: args.filters,
      userProfile: args.userProfile,
    })
  );
  if (filtered.length === 0) {
    return [];
  }

  const sorted = [...filtered].sort((left, right) => right.score - left.score);
  const highProbability = sorted.filter((entry) => entry.score >= 72);
  const randomFolks = sorted.filter((entry) => entry.score < 72);

  const randomizedHigh = shuffleWithSeed(highProbability, args.randomSeed + 11);
  const randomizedRandom = shuffleWithSeed(randomFolks, args.randomSeed + 97);
  const ranked = [...randomizedHigh, ...randomizedRandom];

  return ranked.map((entry) => ({
    person: entry.traits.person,
    score: entry.score,
    source: entry.score >= 72 ? 'roommates' : 'requests',
  }));
}
