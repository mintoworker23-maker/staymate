import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import React from 'react';
import { Platform } from 'react-native';

import { useAuthStore } from '@/context/auth-store';
import {
  clearDevicePushNotifications,
  configurePushNotificationChannel,
  configurePushNotifications,
  getRouteFromNotificationResponse,
  registerDeviceForPushNotifications,
} from '@/lib/push-notifications';

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const previousUidRef = React.useRef<string | null>(null);
  const lastHandledResponseIdRef = React.useRef<string>('');

  const handleNotificationResponse = React.useCallback(
    (response: Notifications.NotificationResponse | null | undefined) => {
      const identifier = response?.notification.request.identifier ?? '';
      if (!identifier || lastHandledResponseIdRef.current === identifier) {
        return;
      }

      const route = getRouteFromNotificationResponse(response);
      if (!route) return;

      lastHandledResponseIdRef.current = identifier;
      const normalizedPath = route.replace(/^\//, '');
      void Linking.openURL(Linking.createURL(normalizedPath));
    },
    []
  );

  React.useEffect(() => {
    if (Platform.OS === 'web') return;

    configurePushNotifications();
    void configurePushNotificationChannel();
    void Notifications.getLastNotificationResponseAsync().then(handleNotificationResponse);

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response);
    });

    return () => {
      responseSubscription.remove();
    };
  }, [handleNotificationResponse]);

  React.useEffect(() => {
    if (Platform.OS === 'web') return;

    const previousUid = previousUidRef.current;
    const nextUid = user?.uid ?? null;

    if (previousUid && previousUid !== nextUid) {
      void clearDevicePushNotifications(previousUid);
    }

    previousUidRef.current = nextUid;

    if (!nextUid) return;
    void registerDeviceForPushNotifications(nextUid);
  }, [user?.uid]);

  return <>{children}</>;
}
