import React from 'react';

import { useAuthStore } from '@/context/auth-store';
import {
  type MatchRequest,
  sendMatchRequest,
  subscribeToAcceptedMatchRequests,
  subscribeToIncomingMatchRequests,
  subscribeToOutgoingMatchRequests,
  updateMatchRequestStatus,
} from '@/lib/match-requests';

type MatchRequestStoreValue = {
  incomingRequests: MatchRequest[];
  outgoingRequests: MatchRequest[];
  incomingRequestUserIds: string[];
  outgoingRequestUserIds: string[];
  matchedUserIds: string[];
  incomingCount: number;
  hasIncomingFrom: (uid: string) => boolean;
  hasOutgoingTo: (uid: string) => boolean;
  hasMatchedWith: (uid: string) => boolean;
  sendRequest: (targetUid: string) => Promise<void>;
  respondToIncomingRequest: (
    fromUid: string,
    decision: 'accepted' | 'rejected'
  ) => Promise<void>;
  cancelOutgoingRequest: (toUid: string) => Promise<void>;
};

const MatchRequestStoreContext = React.createContext<MatchRequestStoreValue | null>(null);

export function MatchRequestStoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const [incomingRequests, setIncomingRequests] = React.useState<MatchRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = React.useState<MatchRequest[]>([]);
  const [acceptedRequests, setAcceptedRequests] = React.useState<MatchRequest[]>([]);

  React.useEffect(() => {
    const uid = user?.uid ?? '';
    if (!uid) {
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setAcceptedRequests([]);
      return;
    }

    const unsubscribeIncoming = subscribeToIncomingMatchRequests(uid, setIncomingRequests);
    const unsubscribeOutgoing = subscribeToOutgoingMatchRequests(uid, setOutgoingRequests);
    const unsubscribeAccepted = subscribeToAcceptedMatchRequests(uid, setAcceptedRequests);

    return () => {
      unsubscribeIncoming();
      unsubscribeOutgoing();
      unsubscribeAccepted();
    };
  }, [user?.uid]);

  const matchedUserIds = React.useMemo(() => {
    const currentUid = user?.uid?.trim() ?? '';
    if (!currentUid) return [];

    return Array.from(
      new Set(
        acceptedRequests
          .map((request) => {
            const fromUid = request.fromUid.trim();
            const toUid = request.toUid.trim();
            if (!fromUid || !toUid) return '';
            return fromUid === currentUid ? toUid : fromUid;
          })
          .filter((uid) => uid.length > 0)
      )
    );
  }, [acceptedRequests, user?.uid]);

  const incomingRequestUserIds = React.useMemo(
    () =>
      Array.from(
        new Set(
          incomingRequests
            .map((request) => request.fromUid.trim())
            .filter((uid) => uid.length > 0 && !matchedUserIds.includes(uid))
        )
      ),
    [incomingRequests, matchedUserIds]
  );

  const outgoingRequestUserIds = React.useMemo(
    () =>
      Array.from(
        new Set(
          outgoingRequests
            .map((request) => request.toUid.trim())
            .filter((uid) => uid.length > 0 && !matchedUserIds.includes(uid))
        )
      ),
    [matchedUserIds, outgoingRequests]
  );

  const hasIncomingFrom = React.useCallback(
    (uid: string) => incomingRequestUserIds.includes(uid.trim()),
    [incomingRequestUserIds]
  );

  const hasOutgoingTo = React.useCallback(
    (uid: string) => outgoingRequestUserIds.includes(uid.trim()),
    [outgoingRequestUserIds]
  );

  const hasMatchedWith = React.useCallback(
    (uid: string) => matchedUserIds.includes(uid.trim()),
    [matchedUserIds]
  );

  const sendRequest = React.useCallback(
    async (targetUid: string) => {
      const currentUid = user?.uid?.trim() ?? '';
      const cleanedTargetUid = targetUid.trim();
      if (!currentUid || !cleanedTargetUid || currentUid === cleanedTargetUid) return;

      await sendMatchRequest(currentUid, cleanedTargetUid);
    },
    [user?.uid]
  );

  const respondToIncomingRequest = React.useCallback(
    async (fromUid: string, decision: 'accepted' | 'rejected') => {
      const currentUid = user?.uid?.trim() ?? '';
      const cleanedFromUid = fromUid.trim();
      if (!currentUid || !cleanedFromUid) return;

      await updateMatchRequestStatus({
        fromUid: cleanedFromUid,
        toUid: currentUid,
        status: decision,
      });
    },
    [user?.uid]
  );

  const cancelOutgoingRequest = React.useCallback(
    async (toUid: string) => {
      const currentUid = user?.uid?.trim() ?? '';
      const cleanedToUid = toUid.trim();
      if (!currentUid || !cleanedToUid) return;

      await updateMatchRequestStatus({
        fromUid: currentUid,
        toUid: cleanedToUid,
        status: 'cancelled',
      });
    },
    [user?.uid]
  );

  const value = React.useMemo<MatchRequestStoreValue>(
    () => ({
      incomingRequests,
      outgoingRequests,
      incomingRequestUserIds,
      outgoingRequestUserIds,
      matchedUserIds,
      incomingCount: incomingRequestUserIds.length,
      hasIncomingFrom,
      hasOutgoingTo,
      hasMatchedWith,
      sendRequest,
      respondToIncomingRequest,
      cancelOutgoingRequest,
    }),
    [
      cancelOutgoingRequest,
      hasIncomingFrom,
      hasMatchedWith,
      hasOutgoingTo,
      incomingRequestUserIds,
      incomingRequests,
      matchedUserIds,
      outgoingRequestUserIds,
      outgoingRequests,
      respondToIncomingRequest,
      sendRequest,
    ]
  );

  return (
    <MatchRequestStoreContext.Provider value={value}>
      {children}
    </MatchRequestStoreContext.Provider>
  );
}

export function useMatchRequestStore() {
  const context = React.useContext(MatchRequestStoreContext);
  if (!context) {
    throw new Error('useMatchRequestStore must be used within MatchRequestStoreProvider');
  }

  return context;
}
