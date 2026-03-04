import React from 'react';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Animated, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';

export default function StartScreen() {
  const router = useRouter();
  const panelEntrance = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(panelEntrance, {
      toValue: 1,
      duration: 360,
      useNativeDriver: true,
    }).start();
  }, [panelEntrance]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.artSection}>
        <ImageBackground
          source={require('../assets/images/grafiti.png')}
          style={styles.artImage}
          imageStyle={styles.artImageInner}
        />
      </View>

      <Animated.View
        style={[
          styles.bottomSection,
          {
            opacity: panelEntrance,
            transform: [
              {
                translateY: panelEntrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          },
        ]}>
        <Svg style={styles.transitionGradient} pointerEvents="none">
          <Defs>
            <SvgLinearGradient id="bottomTransition" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0%" stopColor="#3D258B" stopOpacity="1" />
              <Stop offset="58%" stopColor="#3D258B" stopOpacity="0.62" />
              <Stop offset="100%" stopColor="#3D258B" stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#bottomTransition)" />
        </Svg>

        <Text style={styles.title}>{'Find Your Roommate\nis easy and fun'}</Text>
        <Text style={styles.description}>
          Connect with trusted students and match with the right roommate near campus.
        </Text>

        <Pressable style={styles.confirmButton} onPress={() => router.push('/university-login')}>
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </Pressable>

        <Pressable
          style={styles.googleButton}
          onPress={() => router.push({ pathname: '/university-code', params: { mode: 'login' } })}>
          <MaterialCommunityIcons name="login-variant" size={20} color="#3A237F" />
          <Text style={styles.googleButtonText}>Login</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3D258B',
  },
  artSection: {
    flex: 0.82,
    overflow: 'hidden',
  },
  artImage: {
    flex: 1,
  },
  artImageInner: {
    resizeMode: 'cover',
    transform: [{ translateY: 40 }, { scale: 1.04 }],
  },
  bottomSection: {
    flex: 0.30,
    backgroundColor: '#3D258B',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    justifyContent: 'flex-start',
    position: 'relative',
    marginTop: -34,
  },
  transitionGradient: {
    position: 'absolute',
    left: -1,
    right: -1,
    top: -62,
    height: 62,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: 'Prompt-Bold',
    fontSize: 34,
    lineHeight: 42,
    textAlign: 'center',
  },
  description: {
    marginTop: 6,
    color: '#E7DBFF',
    fontFamily: 'Prompt',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    opacity: 0.94,
    paddingHorizontal: 12,
  },
  confirmButton: {
    marginTop: 10,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#A385E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#120C2B',
    fontFamily: 'Prompt-SemiBold',
    fontSize: 18,
  },
  googleButton: {
    marginTop: 10,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.4,
    borderColor: '#E5DDFE',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  googleButtonText: {
    color: '#3A237F',
    fontFamily: 'Prompt-SemiBold',
    fontSize: 16,
  },
});
