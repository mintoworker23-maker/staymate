import React from 'react';

type MatchFeedStoreValue = {
  rejectedPersonIds: string[];
  matchedPersonIds: string[];
  rejectPerson: (personId: string) => void;
  markMatched: (personId: string) => void;
  resetFeedDecisions: () => void;
  isRejected: (personId: string) => boolean;
  isMatched: (personId: string) => boolean;
};

const MatchFeedStoreContext = React.createContext<MatchFeedStoreValue | null>(null);

export function MatchFeedStoreProvider({ children }: { children: React.ReactNode }) {
  const [rejectedPersonIds, setRejectedPersonIds] = React.useState<string[]>([]);
  const [matchedPersonIds, setMatchedPersonIds] = React.useState<string[]>([]);

  const rejectPerson = React.useCallback((personId: string) => {
    if (!personId) return;
    setRejectedPersonIds((prev) => (prev.includes(personId) ? prev : [...prev, personId]));
  }, []);

  const markMatched = React.useCallback((personId: string) => {
    if (!personId) return;
    setMatchedPersonIds((prev) => (prev.includes(personId) ? prev : [...prev, personId]));
  }, []);

  const resetFeedDecisions = React.useCallback(() => {
    setRejectedPersonIds([]);
    setMatchedPersonIds([]);
  }, []);

  const isRejected = React.useCallback(
    (personId: string) => {
      if (!personId) return false;
      return rejectedPersonIds.includes(personId);
    },
    [rejectedPersonIds]
  );

  const isMatched = React.useCallback(
    (personId: string) => {
      if (!personId) return false;
      return matchedPersonIds.includes(personId);
    },
    [matchedPersonIds]
  );

  const value = React.useMemo<MatchFeedStoreValue>(
    () => ({
      rejectedPersonIds,
      matchedPersonIds,
      rejectPerson,
      markMatched,
      resetFeedDecisions,
      isRejected,
      isMatched,
    }),
    [
      isMatched,
      isRejected,
      markMatched,
      matchedPersonIds,
      rejectPerson,
      rejectedPersonIds,
      resetFeedDecisions,
    ]
  );

  return <MatchFeedStoreContext.Provider value={value}>{children}</MatchFeedStoreContext.Provider>;
}

export function useMatchFeedStore() {
  const context = React.useContext(MatchFeedStoreContext);
  if (!context) {
    throw new Error('useMatchFeedStore must be used within MatchFeedStoreProvider');
  }

  return context;
}
