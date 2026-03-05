import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import type { FirestoreError } from 'firebase/firestore';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/bottom-navigation';
import { ExpandingSearch } from '@/components/expanding-search';
import { useAuthStore } from '@/context/auth-store';
import { useChatStore } from '@/context/chat-store';
import { useMatchFeedStore } from '@/context/match-feed-store';
import { useMatchRequestStore } from '@/context/match-request-store';
import { type MatchPerson } from '@/data/people';
import {
  isDiscoverableProfile,
  mapUserProfileToMatchPerson,
} from '@/lib/discovery-people';
import {
  subscribeToDiscoverUserProfiles,
  subscribeToUserProfile,
} from '@/lib/user-profile';

function MatchCard({ person, onPress }: { person: MatchPerson; onPress: () => void }) {
  return (
    <Pressable style={styles.cardWrap} onPress={onPress}>
      <View style={styles.cardImageWrap}>
        <Image source={person.image} style={styles.cardImage} />
        <View style={styles.scoreBadge}>
          <MaterialCommunityIcons name="handshake-outline" size={20} color="#1B1533" />
          <Text style={styles.scoreText}>{`${person.score}%`}</Text>
        </View>
      </View>
      <View style={styles.cardNameRow}>
        <Text style={styles.cardName}>{`${person.name}, ${person.age}`}</Text>
        {person.isVerified ? (
          <MaterialCommunityIcons name="check-decagram" size={18} color="#F6D84E" />
        ) : null}
      </View>
      <Text style={styles.cardRole}>{person.role}</Text>
    </Pressable>
  );
}

export default function MatchExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { totalUnreadCount } = useChatStore();
  const { rejectedPersonIds, matchedPersonIds } = useMatchFeedStore();
  const { incomingCount, matchedUserIds } = useMatchRequestStore();
  const [databasePeople, setDatabasePeople] = React.useState<MatchPerson[]>([]);
  const [people, setPeople] = React.useState<MatchPerson[]>([]);
  const [currentInstitutionKey, setCurrentInstitutionKey] = React.useState('');
  const [hasLoadedCurrentProfile, setHasLoadedCurrentProfile] = React.useState(false);
  const [discoverErrorMessage, setDiscoverErrorMessage] = React.useState<string | null>(null);
  const [isReloading, setIsReloading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const reloadTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredPeople = React.useMemo(() => {
    const rejectedIds = new Set(rejectedPersonIds);
    const matchedIds = new Set([...matchedPersonIds, ...matchedUserIds]);
    const availablePeople = people.filter(
      (person) => !rejectedIds.has(person.id) && !matchedIds.has(person.id)
    );
    const query = searchQuery.trim().toLowerCase();
    if (!query) return availablePeople;

    return availablePeople.filter((person) => {
      return person.name.toLowerCase().includes(query) || person.role.toLowerCase().includes(query);
    });
  }, [matchedPersonIds, matchedUserIds, people, rejectedPersonIds, searchQuery]);

  const randomizePeople = React.useCallback(() => {
    const shuffled = [...databasePeople]
      .map((person) => ({
        ...person,
        score: Math.floor(Math.random() * 10) + 86,
      }))
      .sort(() => Math.random() - 0.5);

    setPeople(shuffled);
  }, [databasePeople]);

  const handleReload = React.useCallback(() => {
    if (isReloading) return;

    setIsReloading(true);
    reloadTimerRef.current = setTimeout(() => {
      randomizePeople();
      setIsReloading(false);
    }, 550);
  }, [isReloading, randomizePeople]);

  const handleDiscoverError = React.useCallback((error: FirestoreError) => {
    if (error.code === 'permission-denied') {
      setDiscoverErrorMessage(
        'We could not load roommates right now. Please try again shortly.'
      );
      return;
    }

    setDiscoverErrorMessage('We could not load roommates. Check your internet and try again.');
  }, []);

  React.useEffect(() => {
    if (!user) {
      setCurrentInstitutionKey('');
      setHasLoadedCurrentProfile(false);
      return;
    }

    const unsubscribe = subscribeToUserProfile(
      user.uid,
      (profile) => {
        setCurrentInstitutionKey(profile?.institutionKey ?? '');
        setHasLoadedCurrentProfile(true);
      },
      () => {
        setCurrentInstitutionKey('');
        setHasLoadedCurrentProfile(true);
      }
    );

    return unsubscribe;
  }, [user]);

  React.useEffect(() => {
    if (!user || !hasLoadedCurrentProfile) {
      setDatabasePeople([]);
      setPeople([]);
      setDiscoverErrorMessage(null);
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
        institutionKey: currentInstitutionKey,
      }
    );

    return unsubscribe;
  }, [currentInstitutionKey, handleDiscoverError, hasLoadedCurrentProfile, user]);

  React.useEffect(() => {
    setPeople(databasePeople);
  }, [databasePeople]);

  React.useEffect(() => {
    return () => {
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
      }
    };
  }, []);
  const navigationBottom = Math.max(insets.bottom + 12, 34);
  const listBottomPadding = 145 + (navigationBottom - 34);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topRow}>
        <View style={styles.topLeftGroup}>
          <Pressable onPress={handleReload} style={styles.refreshButton}>
            <MaterialCommunityIcons
              name={isReloading ? 'loading' : 'refresh'}
              size={28}
              color="#1F1537"
            />
          </Pressable>
          <Text style={styles.topTitle}>Roomates to Match</Text>
        </View>

        <ExpandingSearch
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search roommates..."
          expandedWidth={220}
        />
      </View>

      <Text style={styles.countText}>{`${filteredPeople.length} Persons Found`}</Text>

      <FlatList
        data={filteredPeople}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MatchCard
            person={item}
            onPress={() =>
              router.push({
                pathname: '/person/[id]',
                params: { id: item.id, source: 'explore' },
              })
            }
          />
        )}
        numColumns={2}
        refreshing={isReloading}
        onRefresh={handleReload}
        columnWrapperStyle={styles.rowGap}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {discoverErrorMessage ?? 'No roommates found.'}
          </Text>
        }
      />

      <BottomNavigation
        style={[styles.navigation, { bottom: navigationBottom }]}
        activeIndex={1}
        onChange={(index) => {
          if (index === 0) {
            router.push('/home');
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#371F7E',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    marginRight: 8,
  },
  refreshButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#D5FF78',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Prompt-SemiBold',
    flexShrink: 1,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Prompt',
    marginTop: 14,
    marginBottom: 18,
    opacity: 0.95,
  },
  listContent: {
    paddingBottom: 145,
    gap: 14,
  },
  rowGap: {
    justifyContent: 'space-between',
    gap: 14,
  },
  cardWrap: {
    width: '48%',
    flexGrow: 0,
  },
  cardImageWrap: {
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 208,
    resizeMode: 'cover',
  },
  scoreBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#D5FF78',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    color: '#1B1533',
    fontSize: 17,
    fontFamily: 'Prompt-Bold',
  },
  cardName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Prompt-Bold',
  },
  cardNameRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  cardRole: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Prompt',
    marginTop: 2,
    opacity: 0.95,
  },
  navigation: {
    position: 'absolute',
    bottom: 34,
    alignSelf: 'center',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Prompt-SemiBold',
    textAlign: 'center',
    marginTop: 20,
    opacity: 0.9,
  },
});
