import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  type UserCredential,
} from 'firebase/auth';

import { auth } from '@/lib/firebase';

export async function signInOrCreateWithPassword(
  email: string,
  password: string
): Promise<UserCredential> {
  const methods = await fetchSignInMethodsForEmail(auth, email);

  if (methods.length === 0) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  return signInWithEmailAndPassword(auth, email, password);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

// Backward-compatible alias while route/file names are still based on "code".
export const signInOrCreateWithCode = signInOrCreateWithPassword;
