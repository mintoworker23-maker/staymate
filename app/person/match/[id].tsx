import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MessageUserButton } from '@/components/message-user-button';
import { useChatStore } from '@/context/chat-store';
import { useMatchFeedStore } from '@/context/match-feed-store';
import { matchPeople } from '@/data/people';

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

const floatingDots = [
  { left: 12, top: 140, size: 16, color: 'rgba(213, 255, 120, 0.9)' },
  { left: 74, top: 240, size: 9, color: 'rgba(180, 154, 242, 0.85)' },
  { left: 330, top: 160, size: 14, color: 'rgba(255, 96, 140, 0.9)' },
  { left: 286, top: 265, size: 10, color: 'rgba(213, 255, 120, 0.8)' },
  { left: 24, top: 492, size: 12, color: 'rgba(255, 96, 140, 0.84)' },
  { left: 330, top: 540, size: 17, color: 'rgba(180, 154, 242, 0.88)' },
  { left: 130, top: 620, size: 9, color: 'rgba(213, 255, 120, 0.86)' },
  { left: 258, top: 704, size: 14, color: 'rgba(255, 96, 140, 0.76)' },
];
const currentUser = {
  name: 'You',
  image: require('@/assets/images/IMG_0001_1 1.png'),
};

export default function MatchCelebrationScreen() {
  const router = useRouter();
  const { upsertConversationFromMatch } = useChatStore();
  const { markMatched } = useMatchFeedStore();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const pulse = React.useRef(new Animated.Value(0)).current;
  const entrance = React.useRef(new Animated.Value(0)).current;
  const spin = React.useRef(new Animated.Value(0)).current;
  const driftValues = React.useRef([0, 1, 2, 3, 4, 5, 6, 7].map(() => new Animated.Value(0))).current;

  const personId = Array.isArray(id) ? id[0] : id;
  const person = matchPeople.find((item) => item.id === personId) ?? matchPeople[0];
  const firstName = getFirstName(person.name);

  React.useEffect(() => {
    upsertConversationFromMatch({
      matchPersonId: person.id,
      name: person.name,
      age: person.age,
      avatar: person.image,
    }, { matched: true });
    markMatched(person.id);
  }, [markMatched, person.age, person.id, person.image, person.name, upsertConversationFromMatch]);

  React.useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1700,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const driftLoops = driftValues.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 140),
          Animated.timing(value, {
            toValue: 1,
            duration: 1800 + index * 180,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 1800 + index * 180,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      )
    );

    Animated.timing(entrance, {
      toValue: 1,
      duration: 460,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    pulseLoop.start();
    spinLoop.start();
    driftLoops.forEach((loop) => loop.start());

    return () => {
      pulseLoop.stop();
      spinLoop.stop();
      driftLoops.forEach((loop) => loop.stop());
    };
  }, [driftValues, entrance, pulse, spin]);

  const orbitRotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        {driftValues.map((value, index) => {
          const dotConfig = floatingDots[index];
          return (
            <Animated.View
              key={`dot-${index}`}
              style={[
                styles.floatingDot,
                {
                  left: dotConfig.left,
                  top: dotConfig.top,
                  width: dotConfig.size,
                  height: dotConfig.size,
                  borderRadius: dotConfig.size / 2,
                  backgroundColor: dotConfig.color,
                  opacity: value.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.25, 0.9, 0.25],
                  }),
                  transform: [
                    {
                      translateY: value.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [14, -20, 14],
                      }),
                    },
                    {
                      scale: value.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.88, 1.12, 0.88],
                      }),
                    },
                  ],
                },
              ]}
            />
          );
        })}

        <Animated.View
          style={[
            styles.orbitWrap,
            {
              transform: [{ rotate: orbitRotation }],
            },
          ]}>
          <MaterialCommunityIcons name="star-four-points" size={26} color="#D5FF78" />
        </Animated.View>
        <Animated.View
          style={[
            styles.orbitWrapReverse,
            {
              transform: [{ rotate: orbitRotation }],
            },
          ]}>
          <MaterialCommunityIcons name="star-four-points-outline" size={20} color="#B49AF2" />
        </Animated.View>
      </View>

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <MaterialCommunityIcons name="arrow-left" size={28} color="#FFFFFF" />
      </Pressable>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [24, 0],
                }),
              },
            ],
          },
        ]}>
        <View style={styles.imageRingWrap}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pulseRing,
              {
                opacity: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 0.14],
                }),
                transform: [
                  {
                    scale: pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1.25],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pulseRingSecondary,
              {
                opacity: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.45, 0.08],
                }),
                transform: [
                  {
                    scale: pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1.02, 1.38],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.coinStack,
              {
                transform: [
                  {
                    translateY: pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, -4],
                    }),
                  },
                ],
              },
            ]}>
            <View style={[styles.coin, styles.coinLeft]}>
              <Image source={person.image} style={styles.coinImage} />
            </View>
            <View style={[styles.coin, styles.coinRight]}>
              <Image source={currentUser.image} style={styles.coinImage} />
            </View>
          </Animated.View>
        </View>

        <View style={styles.badgeRow}>
          <MaterialCommunityIcons name="handshake-outline" size={22} color="#1B1533" />
          <Text style={styles.badgeText}>Perfect vibe match</Text>
        </View>

        <Text style={styles.title}>{"It's a Match!"}</Text>
        <Text style={styles.subtitle}>
          {`You and ${firstName} matched successfully.\nSay hi and keep the conversation going.`}
        </Text>

        <MessageUserButton
          label={`Message ${firstName}`}
          target={{
            matchPersonId: person.id,
            name: person.name,
            age: person.age,
            avatar: person.image,
          }}
          style={styles.messageButton}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#371F7E',
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  orbitWrap: {
    position: 'absolute',
    top: 100,
    left: 36,
    width: 310,
    height: 310,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    opacity: 0.65,
  },
  orbitWrapReverse: {
    position: 'absolute',
    top: 420,
    left: 30,
    width: 320,
    height: 320,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    opacity: 0.58,
  },
  floatingDot: {
    position: 'absolute',
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5A37AF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 70,
  },
  imageRingWrap: {
    width: 260,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  pulseRing: {
    position: 'absolute',
    width: 230,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    borderColor: '#D5FF78',
  },
  pulseRingSecondary: {
    position: 'absolute',
    width: 250,
    height: 198,
    borderRadius: 99,
    borderWidth: 2,
    borderColor: '#B49AF2',
  },
  coinStack: {
    width: 248,
    height: 180,
    justifyContent: 'center',
  },
  coin: {
    position: 'absolute',
    width: 146,
    height: 146,
    borderRadius: 73,
    overflow: 'hidden',
    borderWidth: 5,
  },
  coinLeft: {
    left: 22,
    borderColor: '#D5FF78',
  },
  coinRight: {
    right: 22,
    borderColor: '#FF5A90',
  },
  coinImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badgeRow: {
    height: 38,
    borderRadius: 19,
    backgroundColor: '#D5FF78',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  badgeText: {
    color: '#1B1533',
    fontSize: 14,
    fontFamily: 'Prompt-Bold',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 44,
    lineHeight: 48,
    fontFamily: 'Prompt-Bold',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 10,
    color: '#FFFFFF',
    opacity: 0.95,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Prompt-SemiBold',
    textAlign: 'center',
  },
  messageButton: {
    marginTop: 30,
    minWidth: 230,
  },
});
