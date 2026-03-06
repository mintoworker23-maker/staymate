import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Animated,
  Easing,
  ImageBackground,
  ImageSourcePropType,
  PanResponder,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

export type ProfileDecision = 'reject' | 'accept';

export type SwipeProfile = {
  id: string;
  name: string;
  age: number;
  isVerified?: boolean;
  role: string;
  score?: number;
  whatsappNumber?: string;
  source?: 'roommates' | 'requests';
  photos: ImageSourcePropType[];
};

type ProfileHeroCardProps = {
  profiles: SwipeProfile[];
  style?: StyleProp<ViewStyle>;
  onDecision?: (profile: SwipeProfile, decision: ProfileDecision) => void;
};

const SWIPE_TRIGGER_PX = 28;
const SWIPE_VELOCITY_TRIGGER = 0.22;
const SWIPE_START_PX = 8;

function sourceLabelFromProfile(profile: SwipeProfile) {
  if (profile.source === 'roommates') return 'Roommate to match';
  if (profile.source === 'requests') return 'Random folks';
  return null;
}

export function ProfileHeroCard({ profiles, style, onDecision }: ProfileHeroCardProps) {
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const cardTranslateX = useRef(new Animated.Value(0)).current;

  const isSwipingRef = useRef(false);
  const actionButtonActiveRef = useRef(false);

  const safeProfiles = profiles.length > 0 ? profiles : [];
  const profileCount = Math.max(safeProfiles.length, 1);
  const currentProfile = safeProfiles[currentProfileIndex % profileCount];
  const nextProfile = safeProfiles.length > 1 ? safeProfiles[(currentProfileIndex + 1) % safeProfiles.length] : null;

  const photos = useMemo(() => {
    if (!currentProfile) return [];
    return currentProfile.photos.length > 0 ? currentProfile.photos : [];
  }, [currentProfile]);

  const advanceToNextProfile = useCallback(() => {
    setCurrentProfileIndex((prev) => (safeProfiles.length === 0 ? 0 : (prev + 1) % safeProfiles.length));
  }, [safeProfiles.length]);

  const animateDecision = useCallback(
    (decision: ProfileDecision) => {
      if (!currentProfile || isAnimatingOut) return;

      actionButtonActiveRef.current = false;
      setIsAnimatingOut(true);

      const toValue = decision === 'accept' ? 480 : -480;
      Animated.timing(cardTranslateX, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        onDecision?.(currentProfile, decision);
        if (onDecision) {
          actionButtonActiveRef.current = false;
          cardTranslateX.setValue(0);
          setIsAnimatingOut(false);
          return;
        }

        advanceToNextProfile();
        actionButtonActiveRef.current = false;
        cardTranslateX.setValue(0);
        setIsAnimatingOut(false);
      });
    },
    [advanceToNextProfile, cardTranslateX, currentProfile, isAnimatingOut, onDecision]
  );

  useEffect(() => {
    actionButtonActiveRef.current = false;
  }, [currentProfile?.id]);

  useEffect(() => {
    setCurrentProfileIndex((prev) => {
      if (safeProfiles.length === 0) return 0;
      return Math.min(prev, safeProfiles.length - 1);
    });
  }, [safeProfiles.length]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onPanResponderGrant: () => {
          isSwipingRef.current = false;
        },
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (actionButtonActiveRef.current || isAnimatingOut) return false;
          const horizontalDistance = Math.abs(gestureState.dx);
          const verticalDistance = Math.abs(gestureState.dy);
          return (
            horizontalDistance > SWIPE_START_PX && horizontalDistance > verticalDistance * 1.15
          );
        },
        onPanResponderMove: (_, gestureState) => {
          if (Math.abs(gestureState.dx) <= Math.abs(gestureState.dy) * 1.1) return;
          isSwipingRef.current = true;
          cardTranslateX.setValue(Math.max(-260, Math.min(260, gestureState.dx)));
        },
        onPanResponderRelease: (_, gestureState) => {
          actionButtonActiveRef.current = false;
          const passedDistance = Math.abs(gestureState.dx) > SWIPE_TRIGGER_PX;
          const passedVelocity = Math.abs(gestureState.vx) > SWIPE_VELOCITY_TRIGGER;
          const shouldCommit = passedDistance || passedVelocity;

          if (shouldCommit && gestureState.dx > 0) {
            animateDecision('accept');
            setTimeout(() => { isSwipingRef.current = false; }, 0);
            return;
          }

          if (shouldCommit && gestureState.dx < 0) {
            animateDecision('reject');
            setTimeout(() => { isSwipingRef.current = false; }, 0);
            return;
          }

          Animated.timing(cardTranslateX, {
            toValue: 0,
            duration: 130,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            isSwipingRef.current = false;
          });
        },
        onPanResponderTerminate: () => {
          actionButtonActiveRef.current = false;
          Animated.timing(cardTranslateX, {
            toValue: 0,
            duration: 130,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            isSwipingRef.current = false;
          });
        },
      }),
    [animateDecision, cardTranslateX, isAnimatingOut]
  );

  if (!currentProfile || photos.length === 0) {
    return (
      <View style={[styles.container, styles.emptyState, style]}>
        <View pointerEvents="none" style={styles.emptyGlowTop} />
        <View pointerEvents="none" style={styles.emptyGlowBottom} />

        <View style={styles.emptyContent}>
          <View style={styles.emptyIllustrationWrap}>
            <Svg width={124} height={124} viewBox="0 0 124 124">
              <Defs>
                <SvgLinearGradient id="emptyCardGradient" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#6B45BF" />
                  <Stop offset="100%" stopColor="#3A2286" />
                </SvgLinearGradient>
              </Defs>
              <Rect x={16} y={22} width={92} height={80} rx={24} fill="url(#emptyCardGradient)" />
              <Rect
                x={30}
                y={36}
                width={64}
                height={34}
                rx={10}
                fill="rgba(213, 255, 120, 0.16)"
                stroke="rgba(213, 255, 120, 0.5)"
                strokeWidth={1.5}
              />
              <Circle cx={62} cy={88} r={7} fill="#D5FF78" />
              <Circle cx={92} cy={31} r={16} fill="rgba(213, 255, 120, 0.22)" />
              <Path
                d="M92 24v8l5 3"
                stroke="#1B1533"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>

          <Text style={styles.emptyTitle}>Oops, no matches yet</Text>
          <Text style={styles.emptySubtitle}>
            We are refreshing recommendations. Please check back later.
          </Text>
        </View>
      </View>
    );
  }

  const activePhoto = photos[0];
  const score = currentProfile.score ?? 94;
  const sourceLabel = sourceLabelFromProfile(currentProfile);
  const nextSourceLabel = nextProfile ? sourceLabelFromProfile(nextProfile) : null;
  const nextPhoto = nextProfile?.photos[0];

  const nextScale = cardTranslateX.interpolate({
    inputRange: [-220, 0, 220],
    outputRange: [1, 0.94, 1],
  });
  const nextTranslateY = cardTranslateX.interpolate({
    inputRange: [-220, 0, 220],
    outputRange: [0, 16, 0],
  });
  const nextOpacity = cardTranslateX.interpolate({
    inputRange: [-220, 0, 220],
    outputRange: [1, 0.76, 1],
  });

  return (
    <View style={[styles.container, style]}>
      {nextProfile && nextPhoto ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.nextLayer,
            {
              opacity: nextOpacity,
              transform: [{ scale: nextScale }, { translateY: nextTranslateY }],
            },
          ]}>
          <ImageBackground source={nextPhoto} fadeDuration={0} style={styles.image} imageStyle={styles.imageRound}>
            <View pointerEvents="none" style={styles.bottomGradient}>
              <Svg width="100%" height="100%" preserveAspectRatio="none">
                <Defs>
                  <SvgLinearGradient id="nextCardGradient" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#2F1E61" stopOpacity="0" />
                    <Stop offset="100%" stopColor="#2F1E61" stopOpacity="0.96" />
                  </SvgLinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#nextCardGradient)" />
              </Svg>
            </View>

            <View style={[styles.bottomContent, styles.nextBottomContent]}>
              <View style={styles.profileInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.nameText}>{`${nextProfile.name}, ${nextProfile.age}`}</Text>
                  {nextProfile.isVerified ? (
                    <MaterialCommunityIcons name="check-decagram" size={22} color="#F6D84E" />
                  ) : null}
                </View>
                <View style={styles.roleRow}>
                  <MaterialCommunityIcons name="home" size={16} color="#FFFFFF" />
                  <Text style={styles.roleText}>{nextProfile.role}</Text>
                  {nextSourceLabel ? (
                    <View style={styles.sourceChip}>
                      <Text style={styles.sourceChipText}>{nextSourceLabel}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </ImageBackground>
        </Animated.View>
      ) : null}

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.swipeLayer,
          {
            transform: [
              { translateX: cardTranslateX },
              {
                rotate: cardTranslateX.interpolate({
                  inputRange: [-220, 0, 220],
                  outputRange: ['-5deg', '0deg', '5deg'],
                }),
              },
            ],
          },
        ]}>
        <View style={styles.imageContainer}>
          <ImageBackground source={activePhoto} fadeDuration={0} style={styles.image} imageStyle={styles.imageRound}>
            <View style={styles.scoreBadge}>
              <MaterialCommunityIcons name="handshake-outline" size={22} color="#1B1533" />
              <Text style={styles.scoreText}>{`${score}%`}</Text>
            </View>

            <View pointerEvents="none" style={styles.bottomGradient}>
              <Svg width="100%" height="100%" preserveAspectRatio="none">
                <Defs>
                  <SvgLinearGradient id="currentCardGradient" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#2F1E61" stopOpacity="0" />
                    <Stop offset="100%" stopColor="#2F1E61" stopOpacity="0.96" />
                  </SvgLinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#currentCardGradient)" />
              </Svg>
            </View>

            <View style={styles.bottomContent}>
              <View style={styles.profileInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.nameText}>{`${currentProfile.name}, ${currentProfile.age}`}</Text>
                  {currentProfile.isVerified ? (
                    <MaterialCommunityIcons name="check-decagram" size={22} color="#F6D84E" />
                  ) : null}
                </View>
                <View style={styles.roleRow}>
                  <MaterialCommunityIcons name="home" size={16} color="#FFFFFF" />
                  <Text style={styles.roleText}>{currentProfile.role}</Text>
                  {sourceLabel ? (
                    <View style={styles.sourceChip}>
                      <Text style={styles.sourceChipText}>{sourceLabel}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  onPressIn={() => { actionButtonActiveRef.current = true; }}
                  onPressOut={() => { actionButtonActiveRef.current = false; }}
                  onPress={() => {
                    actionButtonActiveRef.current = false;
                    animateDecision('reject');
                  }}
                  style={[styles.actionButton, styles.rejectButton]}>
                  <MaterialCommunityIcons name="close" size={28} color="#FFFFFF" />
                </Pressable>

                <Pressable
                  onPressIn={() => { actionButtonActiveRef.current = true; }}
                  onPressOut={() => { actionButtonActiveRef.current = false; }}
                  onPress={() => {
                    actionButtonActiveRef.current = false;
                    animateDecision('accept');
                  }}
                  style={[styles.actionButton, styles.acceptButton]}>
                  <MaterialCommunityIcons name="handshake-outline" size={26} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          </ImageBackground>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#2E1A63',
  },
  emptyState: {
    backgroundColor: '#2E1A63',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyGlowTop: {
    position: 'absolute',
    top: -46,
    right: -34,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(213, 255, 120, 0.12)',
  },
  emptyGlowBottom: {
    position: 'absolute',
    bottom: -52,
    left: -42,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 76, 133, 0.1)',
  },
  emptyContent: {
    width: '100%',
    maxWidth: 328,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(220, 202, 255, 0.32)',
    backgroundColor: 'rgba(58, 34, 134, 0.66)',
    alignItems: 'center',
  },
  emptyIllustrationWrap: {
    width: 124,
    height: 124,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
    fontFamily: 'Prompt-Bold',
  },
  emptySubtitle: {
    marginTop: 8,
    color: '#DCCAFF',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: 'Prompt-SemiBold',
  },
  nextLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
    overflow: 'hidden',
  },
  swipeLayer: {
    flex: 1,
  },
  imageContainer: {
    flex: 1,
    borderRadius: 30,
    overflow: 'hidden',
  },
  image: {
    flex: 1,
    justifyContent: 'space-between',
  },
  imageRound: {
    borderRadius: 30,
    resizeMode: 'cover',
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 240,
  },
  profileInfo: {
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  bottomContent: {
    paddingHorizontal: 14,
    paddingBottom: 18,
    paddingTop: 14,
    zIndex: 2,
  },
  nextBottomContent: {
    paddingTop: 22,
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontFamily: 'Prompt-Bold',
    letterSpacing: 0.2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  roleRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 18,
    opacity: 0.9,
    fontFamily: 'Prompt-SemiBold',
  },
  sourceChip: {
    marginLeft: 'auto',
    minHeight: 26,
    borderRadius: 13,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(213, 255, 120, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceChipText: {
    color: '#D5FF78',
    fontSize: 12,
    fontFamily: 'Prompt-SemiBold',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginTop: 12,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3A2286',
  },
  scoreBadge: {
    position: 'absolute',
    top: 22,
    right: 14,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D5FF78',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreText: {
    color: '#1B1533',
    fontSize: 17,
    fontFamily: 'Prompt-Bold',
  },
  acceptButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF4C85',
  },
});
