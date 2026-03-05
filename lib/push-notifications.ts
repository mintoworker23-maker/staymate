import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';

type PushNotificationDataValue = string | number | boolean;
type PushNotificationData = Record<string, PushNotificationDataValue>;

type SendPushArgs = {
  targetUid: string;
  title: string;
  body: string;
  route?: string;
  data?: PushNotificationData;
};

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_TOKEN_PATTERN = /^ExponentPushToken\[[A-Za-z0-9_-]+\]$/;

let isNotificationHandlerConfigured = false;
let isAndroidChannelConfigured = false;

function normalizeRoute(route: string | undefined) {
  if (!route) return '';
  const trimmedRoute = route.trim();
  if (!trimmedRoute) return '';
  return trimmedRoute.startsWith('/') ? trimmedRoute : `/${trimmedRoute}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getProjectId() {
  const fromExpoConfig = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof fromExpoConfig === 'string' && fromExpoConfig.trim().length > 0) {
    return fromExpoConfig;
  }

  const fromEasConfig = Constants.easConfig?.projectId;
  if (typeof fromEasConfig === 'string' && fromEasConfig.trim().length > 0) {
    return fromEasConfig;
  }

  return '';
}

function isValidExpoPushToken(token: string) {
  return EXPO_PUSH_TOKEN_PATTERN.test(token.trim());
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function asBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined;
}

function getUserPushTokenFromData(data: unknown) {
  const record = asRecord(data);
  const topLevelToken = asString(record.expoPushToken).trim();

  const pushNotifications = asRecord(record.pushNotifications);
  const nestedToken = asString(pushNotifications.expoToken).trim();
  const nestedEnabled = asBoolean(pushNotifications.enabled);
  const topLevelEnabled = asBoolean(record.pushNotificationsEnabled);

  const resolvedToken = nestedToken || topLevelToken;
  if (!isValidExpoPushToken(resolvedToken)) {
    return '';
  }

  if (nestedEnabled === false) {
    return '';
  }

  if (nestedEnabled === undefined && topLevelEnabled === false) {
    return '';
  }

  return resolvedToken;
}

async function saveDevicePushState(args: {
  uid: string;
  token: string | null;
  permissionStatus: Notifications.PermissionStatus;
}) {
  const normalizedToken = args.token?.trim() ?? '';
  const enabled = normalizedToken.length > 0;

  await setDoc(
    doc(db, 'users', args.uid),
    {
      expoPushToken: enabled ? normalizedToken : '',
      pushNotificationsEnabled: enabled,
      pushNotifications: {
        expoToken: enabled ? normalizedToken : '',
        enabled,
        permissionStatus: args.permissionStatus,
        platform: Platform.OS,
        updatedAt: new Date().toISOString(),
      },
    },
    { merge: true }
  );
}

export function configurePushNotifications() {
  if (Platform.OS === 'web' || isNotificationHandlerConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  isNotificationHandlerConfigured = true;
}

export async function configurePushNotificationChannel() {
  if (Platform.OS !== 'android' || isAndroidChannelConfigured) {
    return;
  }

  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#F6D84E',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  isAndroidChannelConfigured = true;
}

export async function registerDeviceForPushNotifications(uid: string) {
  const normalizedUid = uid.trim();
  if (!normalizedUid || Platform.OS === 'web') {
    return {
      token: null as string | null,
      status: Notifications.PermissionStatus.DENIED,
    };
  }

  configurePushNotifications();
  await configurePushNotificationChannel();

  const existingPermission = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermission.status;
  if (finalStatus !== 'granted') {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermission.status;
  }

  if (finalStatus !== 'granted') {
    await saveDevicePushState({
      uid: normalizedUid,
      token: null,
      permissionStatus: finalStatus,
    }).catch(() => {});
    return { token: null as string | null, status: finalStatus };
  }

  const projectId = getProjectId();
  if (!projectId) {
    await saveDevicePushState({
      uid: normalizedUid,
      token: null,
      permissionStatus: finalStatus,
    }).catch(() => {});
    return { token: null as string | null, status: finalStatus };
  }

  const pushTokenResponse = await Notifications.getExpoPushTokenAsync({ projectId }).catch(
    () => null
  );
  const token = pushTokenResponse?.data?.trim() ?? '';

  await saveDevicePushState({
    uid: normalizedUid,
    token: token && isValidExpoPushToken(token) ? token : null,
    permissionStatus: finalStatus,
  }).catch(() => {});

  return {
    token: token && isValidExpoPushToken(token) ? token : null,
    status: finalStatus,
  };
}

export async function clearDevicePushNotifications(uid: string) {
  const normalizedUid = uid.trim();
  if (!normalizedUid) return;

  await saveDevicePushState({
    uid: normalizedUid,
    token: null,
    permissionStatus: Notifications.PermissionStatus.DENIED,
  }).catch(() => {});
}

export async function sendExpoPushMessage(args: {
  expoPushToken: string;
  title: string;
  body: string;
  route?: string;
  data?: PushNotificationData;
}) {
  const token = args.expoPushToken.trim();
  if (!isValidExpoPushToken(token)) {
    return false;
  }

  const route = normalizeRoute(args.route);
  const data: PushNotificationData = {
    ...(args.data ?? {}),
  };
  if (route) {
    data.route = route;
  }

  const response = await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      title: args.title,
      body: args.body,
      data,
      sound: 'default',
      channelId: Platform.OS === 'android' ? 'default' : undefined,
      priority: 'high',
    }),
  }).catch(() => null);

  if (!response?.ok) {
    return false;
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        data?: Array<{ status?: string; details?: { error?: string } }>;
      }
    | null;

  const ticket = payload?.data?.[0];
  if (!ticket) return false;
  if (ticket.status !== 'ok') return false;
  if (ticket.details?.error) return false;

  return true;
}

export async function sendPushToUser(args: SendPushArgs) {
  const targetUid = args.targetUid.trim();
  if (!targetUid) return false;

  const userSnapshot = await getDoc(doc(db, 'users', targetUid)).catch(() => null);
  if (!userSnapshot?.exists()) {
    return false;
  }

  const expoPushToken = getUserPushTokenFromData(userSnapshot.data());
  if (!expoPushToken) {
    return false;
  }

  return sendExpoPushMessage({
    expoPushToken,
    title: args.title,
    body: args.body,
    route: args.route,
    data: args.data,
  });
}

export function getRouteFromNotificationResponse(
  response: Notifications.NotificationResponse | null | undefined
) {
  if (!response) return '';

  const routeValue = asRecord(response.notification.request.content.data).route;
  return normalizeRoute(typeof routeValue === 'string' ? routeValue : '');
}
