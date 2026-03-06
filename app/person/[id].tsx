import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Image, type ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandedPromptModal } from '@/components/branded-prompt-modal';
import { MessageUserButton } from '@/components/message-user-button';
import { useMatchFeedStore } from '@/context/match-feed-store';
import { useMatchRequestStore } from '@/context/match-request-store';
import { useNotificationStore } from '@/context/notification-store';
import { matchPeople } from '@/data/people';
import { goBackOrReplace } from '@/lib/navigation';
import { getUserProfile } from '@/lib/user-profile';
import type { UserProfile } from '@/types/user-profile';

const DEFAULT_PERSON_AVATAR = require('@/assets/images/image.png');

function formatAccommodationLabel(value: UserProfile['accommodation']) {
  if (value === 'bedsitter') return 'Bedsitter';
  if (value === 'studio') return 'Studio';
  return 'One Bedroom';
}

function formatGenderPreferenceLabel(value: UserProfile['preferredRoommateGender']) {
  if (value === 'women') return 'Prefers women';
  if (value === 'men') return 'Prefers men';
  return 'Any gender';
}

function formatRoommateAccommodationLabel(value: UserProfile['roommateAccommodationPreference']) {
  if (value === 'has-accommodation') return 'Wants roommate with accommodation';
  if (value === 'looking') return 'Wants roommate looking too';
  return 'Any accommodation status';
}

function buildProfileTags(profile: UserProfile | null, fallbackTags: string[]) {
  if (!profile) return fallbackTags;

  const selectedTags = [
    ...profile.lifestyleInterests,
    ...profile.hobbyInterests,
  ]
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  if (selectedTags.length > 0) {
    return Array.from(new Set(selectedTags)).slice(0, 8);
  }

  const setupFallbackTags = [
    formatGenderPreferenceLabel(profile.preferredRoommateGender),
    profile.hasAccommodation ? 'Has accommodation' : 'Looking for accommodation',
    formatRoommateAccommodationLabel(profile.roommateAccommodationPreference),
  ];

  const normalizedSetupTags = setupFallbackTags.filter((tag) => tag.length > 0);
  if (normalizedSetupTags.length > 0) {
    return Array.from(new Set(normalizedSetupTags)).slice(0, 8);
  }

  return fallbackTags;
}

export default function PersonDetailScreen() {
  const router = useRouter();
  const handleBackPress = React.useCallback(() => {
    goBackOrReplace(router, '/home');
  }, [router]);
  const { rejectPerson } = useMatchFeedStore();
  const { respondToIncomingRequest, sendRequest, hasOutgoingTo, hasMatchedWith, hasIncomingFrom } =
    useMatchRequestStore();
  const { markNotificationsByType } = useNotificationStore();
  const { id, source } = useLocalSearchParams<{ id?: string | string[]; source?: string | string[] }>();
  const [matchRequestPromptVisible, setMatchRequestPromptVisible] = React.useState(false);
  const [matchRequestPromptTitle, setMatchRequestPromptTitle] = React.useState('Match request sent');
  const [matchRequestPromptDescription, setMatchRequestPromptDescription] = React.useState('');
  const [profileFromSetup, setProfileFromSetup] = React.useState<UserProfile | null>(null);

  const personId = Array.isArray(id) ? id[0] : id;
  const sourceTab = Array.isArray(source) ? source[0] : source;
  const fallbackPerson = personId ? matchPeople.find((item) => item.id === personId) ?? null : null;
  const effectivePersonId = personId ?? fallbackPerson?.id ?? '';
  const openedFromRequests = sourceTab === 'requests';

  React.useEffect(() => {
    let cancelled = false;

    if (!personId) {
      setProfileFromSetup(null);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const profile = await getUserProfile(personId).catch(() => null);
      if (!cancelled) {
        setProfileFromSetup(profile);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [personId]);

  const personName = profileFromSetup?.fullName || fallbackPerson?.name || 'User';
  const personAge = profileFromSetup?.age && profileFromSetup.age > 0 ? profileFromSetup.age : fallbackPerson?.age ?? 0;
  const personRole = profileFromSetup
    ? formatAccommodationLabel(profileFromSetup.accommodation)
    : fallbackPerson?.role ?? 'Roommate';

  const photoSources = React.useMemo<ImageSourcePropType[]>(() => {
    if (profileFromSetup?.photoUrls && profileFromSetup.photoUrls.length > 0) {
      return profileFromSetup.photoUrls.map((url) => ({ uri: url }));
    }
    return fallbackPerson?.image ? [fallbackPerson.image] : [DEFAULT_PERSON_AVATAR];
  }, [profileFromSetup, fallbackPerson]);

  const mainPhotoSource = photoSources[0];

  const personPreferences = buildProfileTags(profileFromSetup, fallbackPerson?.preferences ?? []);
  const personBio = profileFromSetup
    ? profileFromSetup.bio.trim() || 'No bio yet'
    : fallbackPerson?.bio.trim() || 'No bio yet';
  const personWhatsappNumber =
    profileFromSetup?.whatsAppNumber.trim() ||
    profileFromSetup?.phoneNumber.trim() ||
    fallbackPerson?.whatsappNumber?.trim() ||
    '';
  const personIsVerified = Boolean(profileFromSetup?.isVerified ?? fallbackPerson?.isVerified);
  const personScore = fallbackPerson?.score ?? 88;
  const personDisplayName = personAge > 0 ? `${personName}, ${personAge}` : personName;

  const handleMatchPress = React.useCallback(() => {
    if ((openedFromRequests || hasIncomingFrom(effectivePersonId)) && effectivePersonId) {
      void (async () => {
        const accepted = await respondToIncomingRequest(effectivePersonId, 'accepted')
          .then(() => true)
          .catch(() => false);

        if (!accepted) {
          setMatchRequestPromptTitle('Unable to accept request');
          setMatchRequestPromptDescription('Please try again in a moment.');
          setMatchRequestPromptVisible(true);
          return;
        }

        markNotificationsByType('match-request');
        router.push(`/person/match/${effectivePersonId}`);
      })();
      return;
    }

    if (!effectivePersonId) {
      setMatchRequestPromptTitle('Unable to send request');
      setMatchRequestPromptDescription('This profile is missing an id.');
      setMatchRequestPromptVisible(true);
      return;
    }

    if (hasOutgoingTo(effectivePersonId)) {
      setMatchRequestPromptTitle('Request already sent');
      setMatchRequestPromptDescription(
        `${personName} already has your request. You will be notified once they respond.`
      );
      setMatchRequestPromptVisible(true);
      return;
    }

    if (hasMatchedWith(effectivePersonId)) {
      setMatchRequestPromptTitle('Already matched');
      setMatchRequestPromptDescription(`You are already matched with ${personName}.`);
      setMatchRequestPromptVisible(true);
      return;
    }

    void sendRequest(effectivePersonId)
      .then(() => {
        setMatchRequestPromptTitle('Match request sent');
        setMatchRequestPromptDescription(
          `${personName} has been notified. You will see an update once they respond.`
        );
        setMatchRequestPromptVisible(true);
      })
      .catch(() => {
        setMatchRequestPromptTitle('Unable to send request');
        setMatchRequestPromptDescription('Please try again in a moment.');
        setMatchRequestPromptVisible(true);
      });
  }, [
    effectivePersonId,
    hasIncomingFrom,
    hasMatchedWith,
    hasOutgoingTo,
    markNotificationsByType,
    openedFromRequests,
    personName,
    respondToIncomingRequest,
    router,
    sendRequest,
  ]);

  const handleRejectPress = React.useCallback(() => {
    if ((openedFromRequests || hasIncomingFrom(effectivePersonId)) && effectivePersonId) {
      void respondToIncomingRequest(effectivePersonId, 'rejected');
      markNotificationsByType('match-request');
    }
    if (effectivePersonId) {
      rejectPerson(effectivePersonId);
    }
    goBackOrReplace(router, '/home');
  }, [
    effectivePersonId,
    hasIncomingFrom,
    markNotificationsByType,
    openedFromRequests,
    rejectPerson,
    respondToIncomingRequest,
    router,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Pressable style={styles.floatingBackButton} onPress={handleBackPress}>
        <MaterialCommunityIcons name="arrow-left" size={34} color="#FFFFFF" />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        <View style={styles.imageWrap}>
          <Image source={mainPhotoSource} style={styles.image} />

          <View style={styles.scoreBadge}>
            <MaterialCommunityIcons name="handshake-outline" size={24} color="#1B1533" />
            <Text style={styles.scoreText}>{`${personScore}%`}</Text>
          </View>
        </View>

        <View style={styles.metaSection}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText}>{personDisplayName}</Text>
            {personIsVerified ? (
              <MaterialCommunityIcons name="check-decagram" size={32} color="#F6D84E" />
            ) : null}
          </View>
          <View style={styles.roleRow}>
            <MaterialCommunityIcons name="home" size={16} color="#FFFFFF" />
            <Text style={styles.roleText}>{personRole}</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.prefRow}>
          {(personPreferences.length > 0 ? personPreferences : ['No preferences yet']).map((label, index) => (
            <View key={`${label}-${index}`} style={styles.prefChip}>
              <Text style={styles.prefText}>{label}</Text>
            </View>
          ))}
        </ScrollView>

        <Text style={styles.bioText}>{personBio}</Text>

        <View style={styles.photoGallery}>
          {photoSources.slice(1).map((source, index) => (
            <View key={`photo-${index}`} style={styles.secondaryImageWrap}>
              <Image source={source} style={styles.image} />
            </View>
          ))}
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={[styles.actionButton, styles.rejectButton]} onPress={handleRejectPress}>
            <MaterialCommunityIcons name="close" size={32} color="#FFFFFF" />
          </Pressable>

          <Pressable style={[styles.actionButton, styles.acceptButton]} onPress={handleMatchPress}>
            <MaterialCommunityIcons name="handshake-outline" size={44} color="#FFFFFF" />
          </Pressable>

          <MessageUserButton
            variant="icon"
            target={{
              matchPersonId: effectivePersonId || 'unknown-person',
              name: personName,
              age: personAge,
              avatar: mainPhotoSource,
              isVerified: personIsVerified,
              whatsappNumber: personWhatsappNumber,
            }}
          />
        </View>
      </ScrollView>

      <BrandedPromptModal
        visible={matchRequestPromptVisible}
        title={matchRequestPromptTitle}
        description={matchRequestPromptDescription}
        actions={[
          {
            label: 'Done',
            onPress: () => undefined,
          },
        ]}
        onClose={() => setMatchRequestPromptVisible(false)}
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
    paddingBottom: 28,
  },
  imageWrap: {
    borderRadius: 32,
    overflow: 'hidden',
    position: 'relative',
    height: 500,
  },
  secondaryImageWrap: {
    borderRadius: 32,
    overflow: 'hidden',
    position: 'relative',
    height: 500,
    marginTop: 16,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  floatingBackButton: {
    position: 'absolute',
    top: 28,
    left: 38,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5A37AF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scoreBadge: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#D5FF78',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scoreText: {
    color: '#1B1533',
    fontSize: 17,
    fontFamily: 'Prompt-Bold',
  },
  metaSection: {
    marginTop: 18,
    paddingHorizontal: 10,
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 48,
    lineHeight: 52,
    fontFamily: 'Prompt-Bold',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  roleRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Prompt-SemiBold',
  },
  prefRow: {
    marginTop: 12,
    paddingHorizontal: 10,
    gap: 10,
  },
  prefChip: {
    height: 44,
    minWidth: 96,
    borderRadius: 22,
    paddingHorizontal: 14,
    backgroundColor: '#D5FF78',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefText: {
    color: '#1A1433',
    fontSize: 15,
    fontFamily: 'Prompt-SemiBold',
  },
  bioText: {
    marginTop: 14,
    paddingHorizontal: 10,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 24,
    fontFamily: 'Prompt-SemiBold',
    opacity: 0.95,
  },
  photoGallery: {
    marginTop: 10,
  },
  actionsRow: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#5A37AF',
  },
  acceptButton: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#FF4D7E',
  },
});
