import { type ImageSourcePropType } from 'react-native';

import { type MatchPerson } from '@/data/people';
import { type UserProfile } from '@/types/user-profile';

const DEFAULT_PROFILE_IMAGE = require('@/assets/images/image.png') as ImageSourcePropType;

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function formatAccommodationLabel(value: UserProfile['accommodation']) {
  if (value === 'bedsitter') return 'Bedsitter';
  if (value === 'studio') return 'Studio';
  return 'One Bedroom';
}

function seededScore(uid: string) {
  const seed = hashString(uid);
  return 86 + (seed % 12);
}

function getFallbackName(profile: UserProfile) {
  const emailPrefix = profile.email.split('@')[0]?.trim() ?? '';
  return emailPrefix.length > 0 ? emailPrefix : 'StayMate User';
}

function deriveFallbackTags(profile: UserProfile) {
  if (profile.preferredRoommateGender === 'women') return ['Prefers women'];
  if (profile.preferredRoommateGender === 'men') return ['Prefers men'];
  return ['Any gender'];
}

function toMatchPersonImage(profile: UserProfile): ImageSourcePropType {
  const firstPhotoUrl = profile.photoUrls.find((url) => url.trim().length > 0);
  return firstPhotoUrl ? { uri: firstPhotoUrl } : DEFAULT_PROFILE_IMAGE;
}

function toMatchPersonPhotos(profile: UserProfile): ImageSourcePropType[] {
  const uploaded = profile.photoUrls
    .map((url) => url.trim())
    .filter((url) => url.length > 0)
    .map((url) => ({ uri: url } as ImageSourcePropType));

  if (uploaded.length > 0) {
    return uploaded;
  }

  return [DEFAULT_PROFILE_IMAGE];
}

function toWhatsAppNumber(profile: UserProfile) {
  const fromWhatsApp = profile.whatsAppNumber.trim();
  if (fromWhatsApp.length > 0) return fromWhatsApp;

  const fromPhone = profile.phoneNumber.trim();
  if (fromPhone.length > 0) return fromPhone;

  return '';
}

function dedupeById(people: MatchPerson[]) {
  const seenIds = new Set<string>();
  const deduped: MatchPerson[] = [];

  for (const person of people) {
    if (seenIds.has(person.id)) continue;
    seenIds.add(person.id);
    deduped.push(person);
  }

  return deduped;
}

export function isDiscoverableProfile(profile: UserProfile) {
  if (!profile.onboardingCompleted) return false;
  if (profile.fullName.trim().length === 0 && profile.email.trim().length === 0) return false;

  const hasPhoto = profile.photoUrls.some((url) => url.trim().length > 0);
  if (!hasPhoto) return false;

  return true;
}

export function mapUserProfileToMatchPerson(profile: UserProfile): MatchPerson {
  const interests = [
    ...profile.lifestyleInterests,
    ...profile.hobbyInterests,
  ]
    .map((interest) => interest.trim())
    .filter((interest) => interest.length > 0)
    .slice(0, 4);

  return {
    id: profile.uid,
    name: profile.fullName.trim() || getFallbackName(profile),
    age: profile.age > 0 ? profile.age : 18,
    role: formatAccommodationLabel(profile.accommodation),
    score: seededScore(profile.uid),
    image: toMatchPersonImage(profile),
    photos: toMatchPersonPhotos(profile),
    whatsappNumber: toWhatsAppNumber(profile),
    isVerified: profile.isVerified,
    bio: profile.bio.trim() || 'No bio yet',
    preferences: interests.length > 0 ? interests : deriveFallbackTags(profile),
    accommodationType: profile.accommodation,
    budgetRange: profile.budgetRange,
    gender: profile.gender,
    hasAccommodation: profile.hasAccommodation,
    institutionName: profile.institutionName,
    institutionKey: profile.institutionKey,
    campus: profile.campus,
    town: profile.town,
    townKey: profile.townKey,
    estate: profile.estate,
    locationLat: profile.locationLat,
    locationLng: profile.locationLng,
    locationRadiusKm: profile.locationRadiusKm,
  };
}

export function mergePeopleWithPriority(priorityPeople: MatchPerson[], fallbackPeople: MatchPerson[]) {
  return dedupeById([...priorityPeople, ...fallbackPeople]);
}
