import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApp, getApps, type FirebaseOptions } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyDacXfHBWEBPtIe-6SR-fFT7Td5iwbZjGY',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'staymate-daec2.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'staymate-daec2',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'staymate-daec2.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '594475556076',
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ??
    '1:594475556076:web:1bddf9c2bfcf372b6f59c9',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ?? 'G-FREFLVQ06P',
};

function ensureFirebaseConfig(config: FirebaseOptions) {
  const requiredKeys: Array<keyof FirebaseOptions> = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];

  const missingKeys = requiredKeys.filter((key) => !config[key]);
  if (missingKeys.length > 0) {
    throw new Error(`Missing Firebase config value(s): ${missingKeys.join(', ')}`);
  }
}

ensureFirebaseConfig(firebaseConfig);

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth =
  Platform.OS === 'web'
    ? getAuth(firebaseApp)
    : (() => {
        try {
          const maybePersistenceFactory = (
            FirebaseAuth as unknown as {
              getReactNativePersistence?: (storage: typeof AsyncStorage) => unknown;
            }
          ).getReactNativePersistence;

          if (typeof maybePersistenceFactory !== 'function') {
            return getAuth(firebaseApp);
          }

          return initializeAuth(firebaseApp, {
            persistence: maybePersistenceFactory(AsyncStorage) as never,
          });
        } catch {
          return getAuth(firebaseApp);
        }
      })();

export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

let analyticsInstance: import('firebase/analytics').Analytics | null = null;

export async function getFirebaseAnalytics() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  if (analyticsInstance) {
    return analyticsInstance;
  }

  try {
    const analyticsModule = await import('firebase/analytics');
    const supported = await analyticsModule.isSupported();
    if (!supported) {
      return null;
    }

    analyticsInstance = analyticsModule.getAnalytics(firebaseApp);
    return analyticsInstance;
  } catch {
    return null;
  }
}
