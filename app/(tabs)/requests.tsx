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

function RequestCard({ person, onPress }: { person: MatchPerson; onPress: () => void }) {
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

export default function RequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { totalUnreadCount } = useChatStore();
  const { rejectedPersonIds, matchedPersonIds } = useMatchFeedStore();
  const { incomingRequestUserIds, incomingCount } = useMatchRequestStore();
  const [databasePeople, setDatabasePeople] = React.useState<MatchPerson[]>([]);
  const [currentInstitutionKey, setCurrentInstitutionKey] = React.useState('');
  const [hasLoadedCurrentProfile, setHasLoadedCurrentProfile] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [discoverErrorMessage, setDiscoverErrorMessage] = React.useState<string | null>(null);

  const handleDiscoverError = React.useCallback((error: FirestoreError) => {
    if (error.code === 'permission-denied') {
      setDiscoverErrorMessage(
        'Unable to load requests. Firestore read permission is missing for users.'
      );
      return;
    }

    setDiscoverErrorMessage('Unable to load requests right now. Please try again.');
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

  const filteredPeople = React.useMemo(() => {
    const rejectedIds = new Set(rejectedPersonIds);
    const matchedIds = new Set(matchedPersonIds);
    const incomingIds = new Set(incomingRequestUserIds);
    const availablePeople = databasePeople.filter(
      (person) =>
        incomingIds.has(person.id) &&
        !rejectedIds.has(person.id) &&
        !matchedIds.has(person.id)
    );
    const query = searchQuery.trim().toLowerCase();
    if (!query) return availablePeople;

    return availablePeople.filter((person) => {
      return person.name.toLowerCase().includes(query) || person.role.toLowerCase().includes(query);
    });
  }, [databasePeople, incomingRequestUserIds, matchedPersonIds, rejectedPersonIds, searchQuery]);
  const navigationBottom = Math.max(insets.bottom + 12, 34);
  const listBottomPadding = 145 + (navigationBottom - 34);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topRow}>
        <Text style={styles.topTitle}>Match requests</Text>
        <ExpandingSearch
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search requests..."
          expandedWidth={220}
        />
      </View>

      <Text style={styles.countText}>{`${filteredPeople.length} Persons Found`}</Text>

      <FlatList
        data={filteredPeople}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RequestCard
            person={item}
            onPress={() =>
              router.push({
                pathname: '/person/[id]',
                params: { id: item.id, source: 'requests' },
              })
            }
          />
        )}
        numColumns={2}
        columnWrapperStyle={styles.rowGap}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {discoverErrorMessage ?? 'No match requests found.'}
          </Text>
        }
      />

      <BottomNavigation
        style={[styles.navigation, { bottom: navigationBottom }]}
        activeIndex={3}
        onChange={(index) => {
          if (index === 0) {
            router.push('/home');
          }
          if (index === 1) {
            router.push('/explore');
          }
          if (index === 2) {
            router.push('/chat');
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
  topTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Prompt-SemiBold',
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
