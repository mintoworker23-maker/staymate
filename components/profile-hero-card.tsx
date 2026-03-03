import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  GestureResponderEvent,
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
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';

export type ProfileDecision = 'reject' | 'accept';

export type SwipeProfile = {
  id: string;
  name: string;
  age: number;
  role: string;
  score?: number;
  source?: 'roommates' | 'requests';
  photos: ImageSourcePropType[];
};

type ProfileHeroCardProps = {
  profiles: SwipeProfile[];
  style?: StyleProp<ViewStyle>;
  onDecision?: (profile: SwipeProfile, decision: ProfileDecision) => void;
};

const PHOTO_DURATION_MS = 2800;
const PROGRESS_TICK_MS = 50;
const SWIPE_TRIGGER_PX = 28;
const SWIPE_VELOCITY_TRIGGER = 0.22;
const SWIPE_START_PX = 8;
const RING_SEGMENTS = 120;
const RING_SIZE = 94;
const PAUSE_SIZE = 75;

function sourceLabelFromProfile(profile: SwipeProfile) {
  if (profile.source === 'roommates') return 'Roommate to match';
  if (profile.source === 'requests') return 'Match request';
  return null;
}

export function ProfileHeroCard({ profiles, style, onDecision }: ProfileHeroCardProps) {
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [photoProgress, setPhotoProgress] = useState(0);
  const [isHoldPaused, setIsHoldPaused] = useState(false);
  const [isManualPaused, setIsManualPaused] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [cardWidth, setCardWidth] = useState(0);

  const cardTranslateX = useRef(new Animated.Value(0)).current;
  const holdLayoutProgress = useRef(new Animated.Value(0)).current;
  const isSwipingRef = useRef(false);
  const controlPressActiveRef = useRef(false);
  const isPaused = isHoldPaused || isManualPaused;

  const safeProfiles = profiles.length > 0 ? profiles : [];
  const profileCount = Math.max(safeProfiles.length, 1);
  const currentProfile = safeProfiles[currentProfileIndex % profileCount];
  const nextProfile = safeProfiles.length > 1 ? safeProfiles[(currentProfileIndex + 1) % safeProfiles.length] : null;

  const photos = useMemo(() => {
    if (!currentProfile) return [];
    return currentProfile.photos.length > 0 ? currentProfile.photos : [];
  }, [currentProfile]);

  const profileProgress = useMemo(() => {
    if (photos.length === 0) return 0;
    return Math.min((currentPhotoIndex + photoProgress) / photos.length, 1);
  }, [currentPhotoIndex, photoProgress, photos.length]);

  const advanceToNextProfile = useCallback(() => {
    setCurrentProfileIndex((prev) => (safeProfiles.length === 0 ? 0 : (prev + 1) % safeProfiles.length));
    setCurrentPhotoIndex(0);
    setPhotoProgress(0);
    setIsHoldPaused(false);
    setIsManualPaused(false);
  }, [safeProfiles.length]);

  const animateDecision = useCallback(
    (decision: ProfileDecision) => {
      if (!currentProfile || isAnimatingOut) return;

      controlPressActiveRef.current = false;
      setIsAnimatingOut(true);
      setIsHoldPaused(false);
      setIsManualPaused(true);

      const toValue = decision === 'accept' ? 480 : -480;
      Animated.timing(cardTranslateX, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        onDecision?.(currentProfile, decision);
        if (onDecision) {
          // Parent removes/updates the swiped profile; avoid local index jump to prevent flicker.
          setCurrentPhotoIndex(0);
          setPhotoProgress(0);
          setIsHoldPaused(false);
          setIsManualPaused(false);
          controlPressActiveRef.current = false;
          cardTranslateX.setValue(0);
          setIsAnimatingOut(false);
          return;
        }

        advanceToNextProfile();
        controlPressActiveRef.current = false;
        cardTranslateX.setValue(0);
        setIsAnimatingOut(false);
      });
    },
    [advanceToNextProfile, cardTranslateX, currentProfile, isAnimatingOut, onDecision]
  );

  useEffect(() => {
    Animated.timing(holdLayoutProgress, {
      toValue: isHoldPaused ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [holdLayoutProgress, isHoldPaused]);

  useEffect(() => {
    if (!currentProfile || photos.length === 0) return;
    if (isPaused || isAnimatingOut) return;

    const intervalId = setInterval(() => {
      setPhotoProgress((prev) => Math.min(prev + PROGRESS_TICK_MS / PHOTO_DURATION_MS, 1));
    }, PROGRESS_TICK_MS);

    return () => clearInterval(intervalId);
  }, [currentProfile, isAnimatingOut, isPaused, photos.length]);

  useEffect(() => {
    if (!currentProfile || photos.length === 0) return;
    if (isPaused || isAnimatingOut) return;
    if (photoProgress < 1) return;

    if (currentPhotoIndex < photos.length - 1) {
      setCurrentPhotoIndex((prev) => prev + 1);
      setPhotoProgress(0);
      return;
    }

    advanceToNextProfile();
  }, [
    advanceToNextProfile,
    currentPhotoIndex,
    currentProfile,
    isAnimatingOut,
    isPaused,
    photoProgress,
    photos.length,
  ]);

  useEffect(() => {
    setCurrentPhotoIndex(0);
    setPhotoProgress(0);
    controlPressActiveRef.current = false;
  }, [currentProfile?.id]);

  useEffect(() => {
    setCurrentProfileIndex((prev) => {
      if (safeProfiles.length === 0) return 0;
      return Math.min(prev, safeProfiles.length - 1);
    });
  }, [safeProfiles.length]);

  const goToPreviousPhoto = useCallback(() => {
    setCurrentPhotoIndex((prev) => Math.max(prev - 1, 0));
    setPhotoProgress(0);
  }, []);

  const goToNextPhoto = useCallback(() => {
    setCurrentPhotoIndex((prev) => Math.min(prev + 1, Math.max(photos.length - 1, 0)));
    setPhotoProgress(0);
  }, [photos.length]);

  const handleImageTap = useCallback(
    (event: GestureResponderEvent) => {
      if (isAnimatingOut || photos.length <= 1) return;
      if (isSwipingRef.current) return;
      if (cardWidth <= 0) return;

      const tapX = event.nativeEvent.locationX;
      const tappedLeftSide = tapX < cardWidth / 2;

      if (tappedLeftSide) {
        goToPreviousPhoto();
      } else {
        goToNextPhoto();
      }
    },
    [cardWidth, goToNextPhoto, goToPreviousPhoto, isAnimatingOut, photos.length]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onPanResponderGrant: () => {
          controlPressActiveRef.current = false;
          isSwipingRef.current = false;
        },
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (controlPressActiveRef.current || isAnimatingOut) return false;
          const horizontalDistance = Math.abs(gestureState.dx);
          const verticalDistance = Math.abs(gestureState.dy);
          return (
            horizontalDistance > SWIPE_START_PX && horizontalDistance > verticalDistance * 1.15
          );
        },
        onPanResponderMove: (_, gestureState) => {
          if (Math.abs(gestureState.dx) <= Math.abs(gestureState.dy) * 1.1) return;
          isSwipingRef.current = true;
          setIsHoldPaused(false);
          cardTranslateX.setValue(Math.max(-260, Math.min(260, gestureState.dx)));
        },
        onPanResponderRelease: (_, gestureState) => {
          controlPressActiveRef.current = false;
          setIsHoldPaused(false);
          const passedDistance = Math.abs(gestureState.dx) > SWIPE_TRIGGER_PX;
          const passedVelocity = Math.abs(gestureState.vx) > SWIPE_VELOCITY_TRIGGER;
          const shouldCommit = passedDistance || passedVelocity;

          if (shouldCommit && gestureState.dx > 0) {
            animateDecision('accept');
            setTimeout(() => {
              isSwipingRef.current = false;
            }, 0);
            return;
          }

          if (shouldCommit && gestureState.dx < 0) {
            animateDecision('reject');
            setTimeout(() => {
              isSwipingRef.current = false;
            }, 0);
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
          controlPressActiveRef.current = false;
          setIsHoldPaused(false);
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

  const beginControlPress = useCallback(() => {
    controlPressActiveRef.current = true;
    setIsHoldPaused(false);
  }, []);

  const endControlPress = useCallback(() => {
    controlPressActiveRef.current = false;
  }, []);

  if (!currentProfile || photos.length === 0) {
    return <View style={[styles.container, styles.emptyState, style]} />;
  }

  const activePhoto = photos[currentPhotoIndex] ?? photos[0];
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
                <Text style={styles.nameText}>{`${nextProfile.name}, ${nextProfile.age}`}</Text>
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
        <View style={styles.imageContainer} onLayout={(event) => setCardWidth(event.nativeEvent.layout.width)}>
          <ImageBackground source={activePhoto} fadeDuration={0} style={styles.image} imageStyle={styles.imageRound}>
            <Pressable
              style={styles.mediaTouchLayer}
              onPress={handleImageTap}
              onPressIn={() => setIsHoldPaused(true)}
              onPressOut={() => setIsHoldPaused(false)}
            />

            <View style={styles.progressRow}>
              {photos.map((_, index) => {
                const fill = index < currentPhotoIndex ? 1 : index === currentPhotoIndex ? photoProgress : 0;
                return (
                  <View key={`${currentProfile.id}-bar-${index}`} style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${fill * 100}%` }]} />
                  </View>
                );
              })}
            </View>
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
              <Animated.View
                style={[
                  styles.profileInfo,
                  {
                    marginBottom: holdLayoutProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 6],
                    }),
                    transform: [
                      {
                        translateY: holdLayoutProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 6],
                        }),
                      },
                    ],
                  },
                ]}>
                <Text style={styles.nameText}>{`${currentProfile.name}, ${currentProfile.age}`}</Text>
                <View style={styles.roleRow}>
                  <MaterialCommunityIcons name="home" size={16} color="#FFFFFF" />
                  <Text style={styles.roleText}>{currentProfile.role}</Text>
                  {sourceLabel ? (
                    <View style={styles.sourceChip}>
                      <Text style={styles.sourceChipText}>{sourceLabel}</Text>
                    </View>
                  ) : null}
                </View>
              </Animated.View>

              <Animated.View
                pointerEvents={isHoldPaused ? 'none' : 'auto'}
                style={[
                  styles.actionsRow,
                  {
                    opacity: holdLayoutProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0],
                    }),
                    height: holdLayoutProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [RING_SIZE, 0],
                    }),
                    marginTop: holdLayoutProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0],
                    }),
                  },
                ]}>
                <Pressable
                  onPressIn={beginControlPress}
                  onPressOut={endControlPress}
                  onPress={() => animateDecision('reject')}
                  style={[styles.actionButton, styles.rejectButton]}>
                  <MaterialCommunityIcons name="close" size={28} color="#FFFFFF" />
                </Pressable>

                <Pressable
                  onPressIn={beginControlPress}
                  onPressOut={endControlPress}
                  onPress={() => setIsManualPaused((prev) => !prev)}
                  style={[styles.actionButton, styles.pauseWrapper]}>
                  <View pointerEvents="none" style={styles.progressRing}>
                    {Array.from({ length: RING_SEGMENTS }).map((_, index) => {
                      const progressAtSegment = (index + 1) / RING_SEGMENTS;
                      const isFilled = progressAtSegment <= profileProgress;
                      return (
                        <View
                          key={`ring-segment-${index}`}
                          style={[
                            styles.progressRingSegment,
                            {
                              backgroundColor: isFilled ? '#D5FF78' : 'rgba(213, 255, 120, 0.20)',
                              transform: [
                                { rotate: `${(360 / RING_SEGMENTS) * index}deg` },
                                { translateY: -(RING_SIZE / 2 - 6) },
                              ],
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                  <View style={styles.pauseButton}>
                    <View style={styles.pauseIconWrap}>
                      <MaterialCommunityIcons name={isPaused ? 'play' : 'pause'} size={30} color="#111111" />
                    </View>
                  </View>
                </Pressable>

                <Pressable
                  onPressIn={beginControlPress}
                  onPressOut={endControlPress}
                  onPress={() => animateDecision('accept')}
                  style={[styles.actionButton, styles.acceptButton]}>
                  <MaterialCommunityIcons name="handshake-outline" size={26} color="#FFFFFF" />
                </Pressable>
              </Animated.View>
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
  mediaTouchLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '62%',
    zIndex: 1,
  },
  image: {
    flex: 1,
    justifyContent: 'space-between',
  },
  imageRound: {
    borderRadius: 30,
    resizeMode: 'cover',
  },
  progressRow: {
    marginTop: 16,
    marginHorizontal: 14,
    flexDirection: 'row',
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(207, 234, 138, 0.35)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#D5FF78',
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
    gap: 18,
    overflow: 'hidden',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#3A2286',
  },
  pauseButton: {
    width: PAUSE_SIZE,
    height: PAUSE_SIZE,
    borderRadius: PAUSE_SIZE / 2,
    backgroundColor: '#CFFF70',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingSegment: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -1,
    marginTop: -2,
    width: 2,
    height: 4,
    borderRadius: 1,
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
  pauseIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FF4C85',
  },
});
