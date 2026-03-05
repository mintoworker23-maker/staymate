import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthStoreProvider } from '@/context/auth-store';
import { ChatStoreProvider } from '@/context/chat-store';
import { MatchFeedStoreProvider } from '@/context/match-feed-store';
import { MatchRequestStoreProvider } from '@/context/match-request-store';
import { OnboardingProfileStoreProvider } from '@/context/onboarding-profile-store';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Prompt: require('@/assets/fonts/Prompt-Regular.ttf'),
    'Prompt-SemiBold': require('@/assets/fonts/Prompt-SemiBold.ttf'),
    'Prompt-Bold': require('@/assets/fonts/Prompt-Bold.ttf'),
    ...MaterialCommunityIcons.font,
    ...MaterialIcons.font,
  });

  if (!fontsLoaded) {
    return null;
  }

  const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: '#371F7E',
      card: '#371F7E',
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#371F7E' }}>
      <SafeAreaProvider>
        <ThemeProvider value={navigationTheme}>
          <AuthStoreProvider>
            <OnboardingProfileStoreProvider>
              <MatchFeedStoreProvider>
                <MatchRequestStoreProvider>
                  <ChatStoreProvider>
                    <Stack
                      screenOptions={{
                        contentStyle: { backgroundColor: '#371F7E' },
                        animation: 'slide_from_right',
                        animationTypeForReplace: 'push',
                        fullScreenGestureEnabled: true,
                      }}>
                      <Stack.Screen name="index" options={{ headerShown: false }} />
                      <Stack.Screen name="start" options={{ headerShown: false }} />
                      <Stack.Screen name="university-login" options={{ headerShown: false }} />
                      <Stack.Screen name="university-code" options={{ headerShown: false }} />
                      <Stack.Screen name="question-basic-info" options={{ headerShown: false }} />
                      <Stack.Screen name="question-preferences" options={{ headerShown: false }} />
                      <Stack.Screen name="question-personality" options={{ headerShown: false }} />
                      <Stack.Screen name="question-interests" options={{ headerShown: false }} />
                      <Stack.Screen name="question-ready" options={{ headerShown: false }} />
                      <Stack.Screen name="question-photos" options={{ headerShown: false }} />
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                      <Stack.Screen name="profile" options={{ headerShown: false }} />
                      <Stack.Screen name="person/[id]" options={{ headerShown: false }} />
                      <Stack.Screen name="person/match/[id]" options={{ headerShown: false }} />
                      <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
                    </Stack>
                  </ChatStoreProvider>
                </MatchRequestStoreProvider>
              </MatchFeedStoreProvider>
            </OnboardingProfileStoreProvider>
          </AuthStoreProvider>
          <StatusBar style="light" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
