import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  type UserCredential,
} from 'firebase/auth';

import { auth } from '@/lib/firebase';

export async function registerWithEmailAndPassword(
  email: string,
  password: string
): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function loginWithEmailAndPassword(
  email: string,
  password: string
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

// Backward-compatible alias while callers migrate.
export const signInOrCreateWithPassword = loginWithEmailAndPassword;
export const signInOrCreateWithCode = loginWithEmailAndPassword;
