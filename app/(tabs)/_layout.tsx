import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '@/context/auth-store';
import { getUserProfile, isUserProfileComplete } from '@/lib/user-profile';

export default function TabLayout() {
  const router = useRouter();
  const { user, loading } = useAuthStore();
  const [isCheckingOnboarding, setIsCheckingOnboarding] = React.useState(true);

  React.useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/start');
      return;
    }

    let isCancelled = false;
    void (async () => {
      try {
        const profile = await getUserProfile(user.uid);
        if (isCancelled) return;

        if (!isUserProfileComplete(profile)) {
          // If profile is incomplete, go back to index to let it handle redirection
          router.replace('/');
          return;
        }
        setIsCheckingOnboarding(false);
      } catch (error) {
        if (!isCancelled) {
          // If fetch fails (maybe offline), but user is still logged in,
          // allow them to proceed to the tabs rather than booting them out.
          setIsCheckingOnboarding(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [loading, router, user]);

  if (loading || isCheckingOnboarding) {
    return (
      <View style={{ flex: 1, backgroundColor: '#371F7E', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#CFFB75" />
      </View>
    );
  }

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: '#371F7E',
        },
        tabBarStyle: {
          display: 'none',
        },
      }}>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="requests" options={{ title: 'Requests' }} />
    </Tabs>
  );
}
