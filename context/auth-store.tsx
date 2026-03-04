import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import React from 'react';

import { auth } from '@/lib/firebase';

type AuthStoreValue = {
  user: User | null;
  loading: boolean;
  signOutCurrentUser: () => Promise<void>;
};

const AuthStoreContext = React.createContext<AuthStoreValue | null>(null);

export function AuthStoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOutCurrentUser = React.useCallback(async () => {
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
