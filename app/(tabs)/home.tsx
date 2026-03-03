import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/bottom-navigation';
import { FiltersSheet } from '@/components/filters-sheet';
import { ProfileHeroCard, SwipeProfile } from '@/components/profile-hero-card';
import { useChatStore } from '@/context/chat-store';
import { useMatchFeedStore } from '@/context/match-feed-store';
import { matchPeople } from '@/data/people';

type HomeSwipeProfile = SwipeProfile & {
  source: 'roommates' | 'requests';
};

const fallbackPhotos: ImageSourcePropType[] = [
  require('@/assets/images/image.png'),
  require('@/assets/images/home-profile.png'),
  require('@/assets/images/IMG_0001_1 1.png'),
  require('@/assets/images/icon.png'),
  require('@/assets/images/grafiti.png'),
];

function shuffleArray<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function buildHomeProfiles(): HomeSwipeProfile[] {
  const shuffled = shuffleArray(matchPeople);

  return shuffled.map((person, index) => {
    const secondaryPhoto = fallbackPhotos[index % fallbackPhotos.length];
    const randomSource: HomeSwipeProfile['source'] = Math.random() > 0.5 ? 'roommates' : 'requests';

    return {
      id: person.id,
      name: person.name,
      age: person.age,
      role: person.role,
      score: person.score,
      source: randomSource,
      photos: [person.image, secondaryPhoto],
    };
  });
}

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export default function HomeScreen() {
  const router = useRouter();
  const { upsertConversationFromMatch } = useChatStore();
  const { rejectedPersonIds, matchedPersonIds, rejectPerson, markMatched, resetFeedDecisions } =
    useMatchFeedStore();

  const [filtersVisible, setFiltersVisible] = React.useState(false);
  const [sentRequestIds, setSentRequestIds] = React.useState<string[]>([]);
  const [decisionNotice, setDecisionNotice] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [profiles, setProfiles] = React.useState<HomeSwipeProfile[]>(() => buildHomeProfiles());
  const noticeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshSpin = React.useRef(new Animated.Value(0)).current;
  const refreshAnimationRef = React.useRef<Animated.CompositeAnimation | null>(null);

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
    const matchedIds = new Set(matchedPersonIds);
    const requestedIds = new Set(sentRequestIds);

    return profiles.filter(
      (profile) =>
        !rejectedIds.has(profile.id) && !matchedIds.has(profile.id) && !requestedIds.has(profile.id)
    );
  }, [matchedPersonIds, profiles, rejectedPersonIds, sentRequestIds]);

  const handleDecision = React.useCallback(
    (profile: SwipeProfile, decision: 'reject' | 'accept') => {
      if (decision === 'reject') {
        rejectPerson(profile.id);
        showDecisionNotice(`Skipped ${getFirstName(profile.name)}`);
        return;
      }

      if (profile.source === 'requests') {
        markMatched(profile.id);
        upsertConversationFromMatch(
          {
            matchPersonId: profile.id,
            name: profile.name,
            age: profile.age,
            avatar: profile.photos[0],
          },
          { matched: true }
        );
        showDecisionNotice(`It's a match with ${getFirstName(profile.name)}!`);
        router.push(`/person/match/${profile.id}`);
        return;
      }

      setSentRequestIds((prev) => (prev.includes(profile.id) ? prev : [...prev, profile.id]));
      showDecisionNotice(`Match request sent to ${getFirstName(profile.name)}`);
    },
    [markMatched, rejectPerson, router, showDecisionNotice, upsertConversationFromMatch]
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
      setSentRequestIds([]);
      setProfiles(buildHomeProfiles());
      setIsRefreshing(false);
      showDecisionNotice('Swipe feed refreshed');
    }, 560);
  }, [isRefreshing, resetFeedDecisions, showDecisionNotice]);

  const refreshRotation = refreshSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <MaterialCommunityIcons name="home-city-outline" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.brandText}>StayMate</Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable style={styles.settingsButton} onPress={() => setFiltersVisible(true)}>
            <MaterialCommunityIcons name="tune-variant" size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable onPress={() => router.push('/profile')}>
            <Image source={require('@/assets/images/image.png')} style={styles.profileAvatar} />
          </Pressable>
        </View>
      </View>

      <ProfileHeroCard
        style={styles.heroCard}
        profiles={visibleProfiles}
        onDecision={(profile, decision) => handleDecision(profile, decision)}
      />

      {isRefreshing ? (
        <View style={[styles.noticeBubble, styles.refreshBubble]}>
          <Animated.View style={{ transform: [{ rotate: refreshRotation }] }}>
            <MaterialCommunityIcons name="refresh" size={18} color="#D5FF78" />
          </Animated.View>
          <Text style={styles.noticeText}>Refreshing feed...</Text>
        </View>
      ) : decisionNotice ? (
        <View style={styles.noticeBubble}>
          <Text style={styles.noticeText}>{decisionNotice}</Text>
        </View>
      ) : null}

      <BottomNavigation
        style={styles.navigation}
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
          { icon: 'chat-outline' },
          { icon: 'handshake-outline' },
        ]}
      />

      <FiltersSheet visible={filtersVisible} onClose={() => setFiltersVisible(false)} />
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
