import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandedPromptModal } from '@/components/branded-prompt-modal';
import { MessageUserButton } from '@/components/message-user-button';
import { useMatchFeedStore } from '@/context/match-feed-store';
import { matchPeople } from '@/data/people';

export default function PersonDetailScreen() {
  const router = useRouter();
  const { rejectPerson } = useMatchFeedStore();
  const { id, source } = useLocalSearchParams<{ id?: string | string[]; source?: string | string[] }>();
  const [matchRequestPromptVisible, setMatchRequestPromptVisible] = React.useState(false);

  const personId = Array.isArray(id) ? id[0] : id;
  const sourceTab = Array.isArray(source) ? source[0] : source;
  const person = matchPeople.find((item) => item.id === personId) ?? matchPeople[0];
  const openedFromRequests = sourceTab === 'requests';

  const handleMatchPress = React.useCallback(() => {
    if (openedFromRequests) {
      router.push(`/person/match/${person.id}`);
      return;
    }
    setMatchRequestPromptVisible(true);
  }, [openedFromRequests, person.id, router]);

  const handleRejectPress = React.useCallback(() => {
    rejectPerson(person.id);
    router.back();
  }, [person.id, rejectPerson, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Pressable style={styles.floatingBackButton} onPress={() => router.back()}>
        <MaterialCommunityIcons name="arrow-left" size={34} color="#FFFFFF" />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        <View style={styles.imageWrap}>
          <Image source={person.image} style={styles.image} />

          <View style={styles.scoreBadge}>
            <MaterialCommunityIcons name="handshake-outline" size={24} color="#1B1533" />
            <Text style={styles.scoreText}>{`${person.score}%`}</Text>
          </View>
        </View>

        <View style={styles.metaSection}>
          <Text style={styles.nameText}>{`${person.name}, ${person.age}`}</Text>
          <View style={styles.roleRow}>
            <MaterialCommunityIcons name="home" size={16} color="#FFFFFF" />
            <Text style={styles.roleText}>{person.role}</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.prefRow}>
          {person.preferences.map((label, index) => (
            <View key={`${label}-${index}`} style={styles.prefChip}>
              <Text style={styles.prefText}>{label}</Text>
            </View>
          ))}
        </ScrollView>

        <Text style={styles.bioText}>{person.bio}</Text>

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
              matchPersonId: person.id,
              name: person.name,
              age: person.age,
              avatar: person.image,
            }}
          />
        </View>
      </ScrollView>

      <BrandedPromptModal
        visible={matchRequestPromptVisible}
        title="Match request sent"
        description={`${person.name} has been notified. You will see an update once they respond.`}
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
