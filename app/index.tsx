import { useRouter } from 'expo-router';
import React from 'react';

import { useAuthStore } from '@/context/auth-store';
import { useOnboardingProfileStore } from '@/context/onboarding-profile-store';
import {
  getUserProfile,
  hasMinimumProfilePhotos,
  isUserProfileComplete,
} from '@/lib/user-profile';

export default function LaunchScreen() {
  const router = useRouter();
  const { user, loading } = useAuthStore();
  const { resetDraft, setAccountEmail } = useOnboardingProfileStore();
  const hasNavigatedRef = React.useRef(false);

  React.useEffect(() => {
    if (loading || hasNavigatedRef.current) {
      return;
    }

    let isCancelled = false;
    void (async () => {
      if (!user) {
        if (!isCancelled) {
          hasNavigatedRef.current = true;
          router.replace('/start');
        }
        return;
      }

      try {
        const existingProfile = await getUserProfile(user.uid);
        if (isCancelled) return;

        if (isUserProfileComplete(existingProfile)) {
          hasNavigatedRef.current = true;
          router.replace(
            hasMinimumProfilePhotos(existingProfile) ? '/home' : '/question-photos'
          );
          return;
        }

        resetDraft();
        if (user.email) {
          setAccountEmail(user.email);
        }
        hasNavigatedRef.current = true;
        router.replace('/question-basic-info');
      } catch {
        if (!isCancelled) {
          hasNavigatedRef.current = true;
          router.replace('/start');
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [loading, resetDraft, router, setAccountEmail, user]);

  return null;
}
