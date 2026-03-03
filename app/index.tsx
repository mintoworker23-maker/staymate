import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

const LAUNCH_LOGO_XML = `
<svg width="160" height="154" viewBox="0 0 160 154" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="160" height="154" rx="36" fill="#30186F"/>
  <path d="M44 52L46 49.5L48 47.5L56 43L63.5 48L70.5 53.5L63.5 58L81 68.5L117 86.5L118.5 89L119 92V103L117 107L108.5 111.5L109.5 109.5V104.5L109 103.5L108 102.5L99 97L80.5 87L62 77L52.5 72L48 69.5L44 66V52Z" fill="#FFFFFF"/>
  <rect x="38" y="28" width="84" height="98" rx="18" fill="#4C2A97"/>
  <text x="80" y="87" text-anchor="middle" fill="#D7FF79" font-size="34" font-family="Arial, sans-serif" font-weight="700">SM</text>
</svg>
`;

export default function LaunchScreen() {
  const router = useRouter();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/start');
    }, 900);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <SvgXml xml={LAUNCH_LOGO_XML} width="100%" height="100%" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3D258B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
