import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_LOGIN_EMAIL_KEY = 'staymate:last-login-email';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function saveLastLoginEmail(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized) return;

  await AsyncStorage.setItem(LAST_LOGIN_EMAIL_KEY, normalized);
}

export async function getLastLoginEmail(): Promise<string | null> {
  const value = await AsyncStorage.getItem(LAST_LOGIN_EMAIL_KEY);
  if (!value) return null;

  const normalized = normalizeEmail(value);
  return normalized || null;
}

export async function clearLastLoginEmail(): Promise<void> {
  await AsyncStorage.removeItem(LAST_LOGIN_EMAIL_KEY);
}
