import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/bottom-navigation';
import { ExpandingSearch } from '@/components/expanding-search';
import { useMatchFeedStore } from '@/context/match-feed-store';

type RequestPerson = {
  id: string;
  name: string;
  age: number;
  role: string;
  score: number;
  image: ReturnType<typeof require>;
};

const requestPeople: RequestPerson[] = [
  { id: '1', name: 'Teddy Omondi', age: 21, role: 'Bedsitter', score: 94, image: require('@/assets/images/image.png') },
  { id: '2', name: 'Akinyi Moraa', age: 23, role: 'Studio', score: 91, image: require('@/assets/images/home-profile.png') },
  { id: '3', name: 'Mark Otieno', age: 24, role: 'One Bedroom', score: 88, image: require('@/assets/images/image.png') },
  { id: '4', name: 'Njeri Maina', age: 22, role: 'Bedsitter', score: 93, image: require('@/assets/images/home-profile.png') },
  { id: '5', name: 'Kelvin Ouma', age: 25, role: 'Studio', score: 90, image: require('@/assets/images/image.png') },
  { id: '6', name: 'Anne Wanjiru', age: 20, role: 'Bedsitter', score: 92, image: require('@/assets/images/home-profile.png') },
  { id: '7', name: 'Brian Ochieng', age: 26, role: 'One Bedroom', score: 89, image: require('@/assets/images/image.png') },
  { id: '8', name: 'Faith Anyango', age: 22, role: 'Studio', score: 95, image: require('@/assets/images/home-profile.png') },
  { id: '9', name: 'Kevin Mutiso', age: 24, role: 'Bedsitter', score: 87, image: require('@/assets/images/image.png') },
  { id: '10', name: 'Mercy Achieng', age: 23, role: 'One Bedroom', score: 94, image: require('@/assets/images/home-profile.png') },
];

function RequestCard({ person, onPress }: { person: RequestPerson; onPress: () => void }) {
  return (
    <Pressable style={styles.cardWrap} onPress={onPress}>
      <View style={styles.cardImageWrap}>
        <Image source={person.image} style={styles.cardImage} />
        <View style={styles.scoreBadge}>
          <MaterialCommunityIcons name="handshake-outline" size={20} color="#1B1533" />
          <Text style={styles.scoreText}>{`${person.score}%`}</Text>
        </View>
      </View>
      <Text style={styles.cardName}>{`${person.name}, ${person.age}`}</Text>
      <Text style={styles.cardRole}>{person.role}</Text>
    </Pressable>
  );
}

export default function RequestsScreen() {
  const router = useRouter();
  const { rejectedPersonIds, matchedPersonIds } = useMatchFeedStore();
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredPeople = React.useMemo(() => {
    const rejectedIds = new Set(rejectedPersonIds);
    const matchedIds = new Set(matchedPersonIds);
    const availablePeople = requestPeople.filter(
      (person) => !rejectedIds.has(person.id) && !matchedIds.has(person.id)
    );
    const query = searchQuery.trim().toLowerCase();
    if (!query) return availablePeople;

    return availablePeople.filter((person) => {
      return person.name.toLowerCase().includes(query) || person.role.toLowerCase().includes(query);
    });
  }, [matchedPersonIds, rejectedPersonIds, searchQuery]);

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
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No match requests found.</Text>}
      />

      <BottomNavigation
        style={styles.navigation}
        activeIndex={3}
        onChange={(index) => {
          if (index === 0) {
            router.push('/');
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
          { icon: 'chat-outline' },
          { icon: 'handshake-outline' },
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
    marginTop: 10,
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
