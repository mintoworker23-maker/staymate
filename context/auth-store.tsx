import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import React from 'react';
import { AppState } from 'react-native';

import { auth } from '@/lib/firebase';
import { setUserOnlineStatus } from '@/lib/user-profile';

type AuthStoreValue = {
  user: User | null;
  loading: boolean;
  signOutCurrentUser: () => Promise<void>;
};

const AuthStoreContext = React.createContext<AuthStoreValue | null>(null);

export function AuthStoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const previousUidRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      const previousUid = previousUidRef.current;
      const nextUid = nextUser?.uid ?? null;

      if (previousUid && previousUid !== nextUid) {
        void setUserOnlineStatus(previousUid, false).catch(() => {});
      }
      if (nextUid) {
        void setUserOnlineStatus(nextUid, true).catch(() => {});
      }

      previousUidRef.current = nextUid;
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  React.useEffect(() => {
    const uid = user?.uid;
    if (!uid) {
      return;
    }

    void setUserOnlineStatus(uid, true).catch(() => {});
    const heartbeat = setInterval(() => {
      void setUserOnlineStatus(uid, true).catch(() => {});
    }, 60_000);

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void setUserOnlineStatus(uid, true).catch(() => {});
        return;
      }

      void setUserOnlineStatus(uid, false).catch(() => {});
    });

    return () => {
      clearInterval(heartbeat);
      appStateSubscription.remove();
      void setUserOnlineStatus(uid, false).catch(() => {});
    };
  }, [user?.uid]);

  const signOutCurrentUser = React.useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      await setUserOnlineStatus(uid, false).catch(() => {});
    }
    await signOut(auth);
  }, []);

  const value = React.useMemo<AuthStoreValue>(
    () => ({
      user,
      loading,
      signOutCurrentUser,
    }),
    [loading, signOutCurrentUser, user]
  );

  return <AuthStoreContext.Provider value={value}>{children}</AuthStoreContext.Provider>;
}

export function useAuthStore() {
  const context = React.useContext(AuthStoreContext);
  if (!context) {
    throw new Error('useAuthStore must be used within AuthStoreProvider');
  }

  return context;
}
