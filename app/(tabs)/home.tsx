import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import type { FirestoreError } from 'firebase/firestore';
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/bottom-navigation';
import {
  DEFAULT_FILTER_VALUES,
  FiltersSheet,
  type FilterValues,
} from '@/components/filters-sheet';
import { ProfileHeroCard, SwipeProfile } from '@/components/profile-hero-card';
import { useAuthStore } from '@/context/auth-store';
import { useChatStore } from '@/context/chat-store';
import { useMatchFeedStore } from '@/context/match-feed-store';
import { useMatchRequestStore } from '@/context/match-request-store';
import { type MatchPerson } from '@/data/people';
import {
  isDiscoverableProfile,
  mapUserProfileToMatchPerson,
} from '@/lib/discovery-people';
import { buildHomeRecommendations } from '@/lib/matchmaking';
import { subscribeToDiscoverUserProfiles, subscribeToUserProfile } from '@/lib/user-profile';
import type { UserProfile } from '@/types/user-profile';

type HomeSwipeProfile = SwipeProfile & {
  source: 'roommates' | 'requests';
};

const fallbackPhotos: ImageSourcePropType[] = [
  require('@/assets/images/image.png'),
  require('@/assets/images/home-profile.png'),
  require('@/assets/images/IMG_0001_1 1.png'),
  require('@/assets/images/home-profile.png'),
  require('@/assets/images/grafiti.png'),
];
const DEFAULT_HOME_AVATAR = require('@/assets/images/image.png');

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function buildHomeProfiles(args: {
  people: MatchPerson[];
  userProfile: UserProfile | null;
  filters: FilterValues;
  randomSeed: number;
}): HomeSwipeProfile[] {
  const recommendations = buildHomeRecommendations({
    people: args.people,
    userProfile: args.userProfile,
    filters: args.filters,
    randomSeed: args.randomSeed,
  });

  return recommendations.map((entry, index) => {
    const photoSeed = hashString(`${entry.person.id}-${args.randomSeed}`);
    const secondaryPhoto = fallbackPhotos[(photoSeed + index) % fallbackPhotos.length];
    const swipePhotos =
      entry.person.photos && entry.person.photos.length > 0
        ? entry.person.photos
        : [entry.person.image, secondaryPhoto];

    return {
      id: entry.person.id,
      name: entry.person.name,
      age: entry.person.age,
      isVerified: entry.person.isVerified,
      role: entry.person.role,
      score: entry.score,
      whatsappNumber: entry.person.whatsappNumber,
      source: entry.source,
      photos: swipePhotos,
    };
  });
}

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

const REQUIRED_PROFILE_FIELDS = [
  'full name',
  'date of birth',
  'phone number',
  'WhatsApp',
  'bio',
  'institution',
  'town',
  '2 photos',
] as const;

function getMissingProfileFields(profile: UserProfile | null): string[] {
  if (!profile) return [...REQUIRED_PROFILE_FIELDS];

  const missingFields: string[] = [];

  if (profile.fullName.trim().length < 2) {
    missingFields.push('full name');
  }
  if (profile.age <= 0 || profile.dateOfBirth.trim().length === 0) {
    missingFields.push('date of birth');
  }
  if (profile.phoneNumber.trim().length === 0) {
    missingFields.push('phone number');
  }
  if (profile.whatsAppNumber.trim().length === 0) {
    missingFields.push('WhatsApp');
  }
  if (profile.bio.trim().length === 0) {
    missingFields.push('bio');
  }
  if (profile.institutionName.trim().length === 0) {
    missingFields.push('institution');
  }
  if (profile.town.trim().length === 0) {
    missingFields.push('town');
  }
  if (profile.photoUrls.filter((url) => url.trim().length > 0).length < 2) {
    missingFields.push('2 photos');
  }

  return missingFields;
}

function formatMissingFieldsSummary(missingFields: string[]) {
  if (missingFields.length === 0) return '';
  if (missingFields.length <= 2) return missingFields.join(' and ');

  const visible = missingFields.slice(0, 2).join(', ');
  const remaining = missingFields.length - 2;
  return `${visible} and ${remaining} more`;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading } = useAuthStore();
  const { upsertConversationFromMatch, totalUnreadCount } = useChatStore();
  const { rejectedPersonIds, matchedPersonIds, rejectPerson, markMatched, resetFeedDecisions } =
    useMatchFeedStore();
  const {
    outgoingRequestUserIds,
    matchedUserIds,
    hasIncomingFrom,
    hasOutgoingTo,
    hasMatchedWith,
    incomingCount,
    sendRequest,
    respondToIncomingRequest,
  } = useMatchRequestStore();

  const [filtersVisible, setFiltersVisible] = React.useState(false);
  const [decisionNotice, setDecisionNotice] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [activeFilters, setActiveFilters] = React.useState<FilterValues>(DEFAULT_FILTER_VALUES);
  const [currentUserProfile, setCurrentUserProfile] = React.useState<UserProfile | null>(null);
  const [hasLoadedCurrentProfile, setHasLoadedCurrentProfile] = React.useState(false);
  const [databasePeople, setDatabasePeople] = React.useState<MatchPerson[]>([]);
  const [discoverErrorMessage, setDiscoverErrorMessage] = React.useState<string | null>(null);
  const [feedSeed, setFeedSeed] = React.useState(1);
  const [profiles, setProfiles] = React.useState<HomeSwipeProfile[]>(() =>
    buildHomeProfiles({
      people: [],
      userProfile: null,
      filters: DEFAULT_FILTER_VALUES,
      randomSeed: 1,
    })
  );
  const [currentUserName, setCurrentUserName] = React.useState('');
  const [currentUserPhotoUrl, setCurrentUserPhotoUrl] = React.useState('');
  const [swipedProfileIds, setSwipedProfileIds] = React.useState<string[]>([]);
  const noticeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshSpin = React.useRef(new Animated.Value(0)).current;
  const refreshAnimationRef = React.useRef<Animated.CompositeAnimation | null>(null);

  const handleDiscoverError = React.useCallback((error: FirestoreError) => {
    if (error.code === 'permission-denied') {
      setDiscoverErrorMessage(
        'Unable to load roommate feed. Firestore read permission is missing for users.'
      );
      return;
    }

    setDiscoverErrorMessage('Unable to load roommate feed right now. Please try again.');
  }, []);

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/start');
    }
  }, [loading, router, user]);

  React.useEffect(() => {
    if (!user) {
      setCurrentUserName('');
      setCurrentUserPhotoUrl('');
      setCurrentUserProfile(null);
      setHasLoadedCurrentProfile(false);
      setDatabasePeople([]);
      setDiscoverErrorMessage(null);
      setSwipedProfileIds([]);
      return;
    }

    const unsubscribe = subscribeToUserProfile(
      user.uid,
      (profile) => {
        setCurrentUserProfile(profile);
        setCurrentUserName(profile?.fullName ?? '');
        const firstPhoto = profile?.photoUrls.find((url) => url.trim().length > 0) ?? '';
        setCurrentUserPhotoUrl(firstPhoto);
        setHasLoadedCurrentProfile(true);
      },
      (error) => {
        setHasLoadedCurrentProfile(true);
        if (error.code === 'permission-denied') {
          setDiscoverErrorMessage(
            'Unable to load your profile. Firestore read permission is missing for users.'
          );
          return;
        }

        setDiscoverErrorMessage('Unable to load your profile right now. Please try again.');
      }
    );

    return unsubscribe;
  }, [user]);

  React.useEffect(() => {
    if (!user || !hasLoadedCurrentProfile) {
      setDatabasePeople([]);
      return;
    }

    const unsubscribe = subscribeToDiscoverUserProfiles(
      user.uid,
      (profilesFromDb) => {
        const discoverable = profilesFromDb
          .filter(isDiscoverableProfile)
          .map(mapUserProfileToMatchPerson);
        setDatabasePeople(discoverable);
        setDiscoverErrorMessage(null);
      },
      handleDiscoverError,
      {
        institutionKey: currentUserProfile?.institutionKey,
      }
    );

    return unsubscribe;
  }, [currentUserProfile?.institutionKey, handleDiscoverError, hasLoadedCurrentProfile, user]);

  React.useEffect(() => {
    setProfiles(
      buildHomeProfiles({
        people: databasePeople,
        userProfile: currentUserProfile,
        filters: activeFilters,
        randomSeed: feedSeed,
      })
    );
  }, [activeFilters, currentUserProfile, databasePeople, feedSeed]);

  React.useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current);
      }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      refreshAnimationRef.current?.stop();
    };
  }, []);

  React.useEffect(() => {
    if (!isRefreshing) {
      refreshAnimationRef.current?.stop();
      refreshAnimationRef.current = null;
      refreshSpin.setValue(0);
      return;
    }

    refreshSpin.setValue(0);
    refreshAnimationRef.current = Animated.loop(
      Animated.timing(refreshSpin, {
        toValue: 1,
        duration: 640,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    refreshAnimationRef.current.start();
  }, [isRefreshing, refreshSpin]);

  const showDecisionNotice = React.useCallback((message: string) => {
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    setDecisionNotice(message);
    noticeTimerRef.current = setTimeout(() => {
      setDecisionNotice(null);
    }, 1800);
  }, []);

  const visibleProfiles = React.useMemo(() => {
    const rejectedIds = new Set(rejectedPersonIds);
    const matchedIds = new Set([...matchedPersonIds, ...matchedUserIds]);
    const requestedIds = new Set(outgoingRequestUserIds);
    const swipedIds = new Set(swipedProfileIds);

    return profiles.filter(
      (profile) =>
        !rejectedIds.has(profile.id) &&
        !matchedIds.has(profile.id) &&
        !requestedIds.has(profile.id) &&
        !swipedIds.has(profile.id)
    );
  }, [
    matchedPersonIds,
    matchedUserIds,
    outgoingRequestUserIds,
    profiles,
    rejectedPersonIds,
    swipedProfileIds,
  ]);

  const handleDecision = React.useCallback(
    (profile: SwipeProfile, decision: 'reject' | 'accept') => {
      setSwipedProfileIds((previous) =>
        previous.includes(profile.id) ? previous : [...previous, profile.id]
      );

      if (decision === 'reject') {
        if (hasIncomingFrom(profile.id)) {
          void respondToIncomingRequest(profile.id, 'rejected');
        }
        rejectPerson(profile.id);
        showDecisionNotice(`Skipped ${getFirstName(profile.name)}`);
        return;
      }

      void (async () => {
        if (hasIncomingFrom(profile.id)) {
          const accepted = await respondToIncomingRequest(profile.id, 'accepted')
            .then(() => true)
            .catch(() => false);
          if (!accepted) {
            showDecisionNotice('Unable to accept request right now.');
            return;
          }
          markMatched(profile.id);
          upsertConversationFromMatch(
            {
              matchPersonId: profile.id,
              name: profile.name,
              age: profile.age,
              isVerified: profile.isVerified,
              avatar: profile.photos[0],
              whatsappNumber: profile.whatsappNumber,
            },
            { matched: true }
          );
          showDecisionNotice(`It's a match with ${getFirstName(profile.name)}!`);
          router.push(`/person/match/${profile.id}`);
          return;
        }

        if (hasOutgoingTo(profile.id)) {
          showDecisionNotice(`Request already sent to ${getFirstName(profile.name)}`);
          return;
        }

        if (hasMatchedWith(profile.id)) {
          showDecisionNotice(`You are already matched with ${getFirstName(profile.name)}`);
          return;
        }

        await sendRequest(profile.id)
          .then(() => {
            showDecisionNotice(`Match request sent to ${getFirstName(profile.name)}`);
          })
          .catch(() => {
            showDecisionNotice('Unable to send request right now.');
          });
      })();
    },
    [
      hasIncomingFrom,
      hasMatchedWith,
      hasOutgoingTo,
      markMatched,
      rejectPerson,
      respondToIncomingRequest,
      router,
      sendRequest,
      showDecisionNotice,
      upsertConversationFromMatch,
    ]
  );

  const refreshSwipeDeck = React.useCallback(() => {
    if (isRefreshing) return;

    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    setDecisionNotice(null);
    setIsRefreshing(true);

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = setTimeout(() => {
      resetFeedDecisions();
      setSwipedProfileIds([]);
      setFeedSeed((prev) => prev + 1);
      setIsRefreshing(false);
      showDecisionNotice('Swipe feed refreshed');
    }, 560);
  }, [isRefreshing, resetFeedDecisions, showDecisionNotice]);

  const refreshRotation = refreshSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const navigationBottom = Math.max(insets.bottom + 12, 34);
  const bottomLift = navigationBottom - 34;
  const noticeBottom = 108 + bottomLift;
  const heroBottomMargin = 138 + bottomLift;
  const firstName = currentUserName.trim().split(/\s+/)[0] ?? '';
  const missingProfileFields = React.useMemo(
    () => getMissingProfileFields(currentUserProfile),
    [currentUserProfile]
  );
  const shouldPromptProfileCompletion =
    Boolean(user) && hasLoadedCurrentProfile && missingProfileFields.length > 0;
  const missingFieldsSummary = React.useMemo(
    () => formatMissingFieldsSummary(missingProfileFields),
    [missingProfileFields]
  );
  const profileAvatarSource = React.useMemo<ImageSourcePropType>(
    () => (currentUserPhotoUrl ? { uri: currentUserPhotoUrl } : DEFAULT_HOME_AVATAR),
    [currentUserPhotoUrl]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <MaterialCommunityIcons name="home-city-outline" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.brandText}>StayMate</Text>
          </View>
          {firstName ? <Text style={styles.welcomeText}>{`Hi, ${firstName}`}</Text> : null}
        </View>

        <View style={styles.headerActions}>
          <Pressable style={styles.settingsButton} onPress={() => setFiltersVisible(true)}>
            <MaterialCommunityIcons name="tune-variant" size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable onPress={() => router.push('/profile')}>
            <Image source={profileAvatarSource} style={styles.profileAvatar} />
          </Pressable>
        </View>
      </View>

      {shouldPromptProfileCompletion ? (
        <Pressable style={styles.profilePromptCard} onPress={() => router.push('/profile')}>
          <View style={styles.profilePromptIcon}>
            <MaterialCommunityIcons name="account-alert-outline" size={20} color="#F6D84E" />
          </View>
          <View style={styles.profilePromptContent}>
            <Text style={styles.profilePromptTitle}>Complete your profile</Text>
            <Text style={styles.profilePromptDescription}>
              {`Missing ${missingFieldsSummary}. Tap to finish setup.`}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#FFFFFF" />
        </Pressable>
      ) : null}

      <ProfileHeroCard
        style={[styles.heroCard, { marginBottom: heroBottomMargin }]}
        profiles={visibleProfiles}
        onDecision={(profile, decision) => handleDecision(profile, decision)}
      />

      {isRefreshing ? (
        <View style={[styles.noticeBubble, styles.refreshBubble, { bottom: noticeBottom }]}>
          <Animated.View style={{ transform: [{ rotate: refreshRotation }] }}>
            <MaterialCommunityIcons name="refresh" size={18} color="#D5FF78" />
          </Animated.View>
          <Text style={styles.noticeText}>Refreshing feed...</Text>
        </View>
      ) : decisionNotice ? (
        <View style={[styles.noticeBubble, { bottom: noticeBottom }]}>
          <Text style={styles.noticeText}>{decisionNotice}</Text>
        </View>
      ) : null}

      {!decisionNotice && !isRefreshing && discoverErrorMessage ? (
        <View style={[styles.noticeBubble, { bottom: noticeBottom }]}>
          <Text style={styles.noticeText}>{discoverErrorMessage}</Text>
        </View>
      ) : null}

      <BottomNavigation
        style={[styles.navigation, { bottom: navigationBottom }]}
        activeIndex={0}
        onChange={(index) => {
          if (index === 0) {
            refreshSwipeDeck();
          }
          if (index === 1) {
            router.push('/explore');
          }
          if (index === 2) {
            router.push('/chat');
          }
          if (index === 3) {
            router.push('/requests');
          }
        }}
        items={[
          { icon: 'home' },
          { icon: 'target' },
          { icon: 'chat-outline', badgeCount: totalUnreadCount },
          { icon: 'handshake-outline', badgeCount: incomingCount },
        ]}
      />

      <FiltersSheet
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        values={activeFilters}
        onApply={(nextValues) => {
          const nextSeed = feedSeed + 1;
          const matchCount = buildHomeRecommendations({
            people: databasePeople,
            userProfile: currentUserProfile,
            filters: nextValues,
            randomSeed: nextSeed,
          }).length;

          setActiveFilters(nextValues);
          resetFeedDecisions();
          setFeedSeed(nextSeed);
          showDecisionNotice(
                matchCount > 0
                  ? `Showing ${matchCount} filtered matches`
                  : 'No matches for these filters'
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#371F7E',
    paddingTop: 10,
  },
  header: {
    height: 72,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 42,
    fontFamily: 'Prompt-Bold',
  },
  welcomeText: {
    marginTop: -4,
    color: '#DCCAFF',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Prompt-SemiBold',
    paddingLeft: 36,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#3A2286',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
  },
  profilePromptCard: {
    marginTop: 8,
    marginHorizontal: 20,
    borderRadius: 18,
    backgroundColor: '#4D2B9D',
    borderWidth: 1.2,
    borderColor: '#F6D84E',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profilePromptIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(246, 216, 78, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePromptContent: {
    flex: 1,
  },
  profilePromptTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Prompt-Bold',
  },
  profilePromptDescription: {
    marginTop: 2,
    color: '#E8DEFF',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Prompt-SemiBold',
  },
  heroCard: {
    flex: 1,
    marginTop: 12,
    marginHorizontal: 20,
    marginBottom: 138,
  },
  noticeBubble: {
    position: 'absolute',
    bottom: 108,
    alignSelf: 'center',
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    backgroundColor: '#5A37AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Prompt-SemiBold',
  },
  refreshBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navigation: {
    position: 'absolute',
    bottom: 34,
    alignSelf: 'center',
  },
});
