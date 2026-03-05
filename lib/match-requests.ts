import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
  type DocumentData,
  type FirestoreError,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';

export type MatchRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export type MatchRequest = {
  id: string;
  fromUid: string;
  toUid: string;
  status: MatchRequestStatus;
  createdAt: number;
  updatedAt: number;
};

function toMatchRequest(id: string, data: DocumentData): MatchRequest {
  return {
    id,
    fromUid: String(data.fromUid ?? ''),
    toUid: String(data.toUid ?? ''),
    status: (data.status as MatchRequestStatus) ?? 'pending',
    createdAt: Number(data.createdAt ?? Date.now()),
    updatedAt: Number(data.updatedAt ?? Date.now()),
  };
}

function buildMatchRequestId(fromUid: string, toUid: string) {
  return `${fromUid}__${toUid}`;
}

export async function sendMatchRequest(fromUid: string, toUid: string): Promise<void> {
  const cleanedFromUid = fromUid.trim();
  const cleanedToUid = toUid.trim();
  if (!cleanedFromUid || !cleanedToUid || cleanedFromUid === cleanedToUid) return;

  const now = Date.now();
  const requestRef = doc(db, 'matchRequests', buildMatchRequestId(cleanedFromUid, cleanedToUid));

  await setDoc(
    requestRef,
    {
      fromUid: cleanedFromUid,
      toUid: cleanedToUid,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );
}

export async function updateMatchRequestStatus(args: {
  fromUid: string;
  toUid: string;
  status: MatchRequestStatus;
}) {
  const cleanedFromUid = args.fromUid.trim();
  const cleanedToUid = args.toUid.trim();
  if (!cleanedFromUid || !cleanedToUid) return;

  const now = Date.now();
  const requestRef = doc(db, 'matchRequests', buildMatchRequestId(cleanedFromUid, cleanedToUid));
  await setDoc(
    requestRef,
    {
      fromUid: cleanedFromUid,
      toUid: cleanedToUid,
      status: args.status,
      updatedAt: now,
    },
    { merge: true }
  );
}

export function subscribeToIncomingMatchRequests(
  uid: string,
  onChange: (requests: MatchRequest[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const requestsRef = collection(db, 'matchRequests');
  const incomingQuery = query(requestsRef, where('toUid', '==', uid));

  return onSnapshot(
    incomingQuery,
    (snapshot) => {
      const requests = snapshot.docs
        .map((entry) => toMatchRequest(entry.id, entry.data()))
        .filter((entry) => entry.status === 'pending')
        .sort((left, right) => right.updatedAt - left.updatedAt);
      onChange(requests);
    },
    (error) => {
      onError?.(error);
    }
  );
}

export function subscribeToOutgoingMatchRequests(
  uid: string,
  onChange: (requests: MatchRequest[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const requestsRef = collection(db, 'matchRequests');
  const outgoingQuery = query(requestsRef, where('fromUid', '==', uid));

  return onSnapshot(
    outgoingQuery,
    (snapshot) => {
      const requests = snapshot.docs
        .map((entry) => toMatchRequest(entry.id, entry.data()))
        .filter((entry) => entry.status === 'pending')
        .sort((left, right) => right.updatedAt - left.updatedAt);
      onChange(requests);
    },
    (error) => {
      onError?.(error);
    }
  );
}

export function subscribeToAcceptedMatchRequests(
  uid: string,
  onChange: (requests: MatchRequest[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const requestsRef = collection(db, 'matchRequests');
  const incomingAcceptedQuery = query(requestsRef, where('toUid', '==', uid));
  const outgoingAcceptedQuery = query(requestsRef, where('fromUid', '==', uid));

  let incoming: MatchRequest[] = [];
  let outgoing: MatchRequest[] = [];

  function emitMerged() {
    const merged = [...incoming, ...outgoing]
      .filter((entry) => entry.status === 'accepted')
      .sort((left, right) => right.updatedAt - left.updatedAt);
    onChange(merged);
  }

  const unsubscribeIncoming = onSnapshot(
    incomingAcceptedQuery,
    (snapshot) => {
      incoming = snapshot.docs.map((entry) => toMatchRequest(entry.id, entry.data()));
      emitMerged();
    },
    (error) => {
      onError?.(error);
    }
  );

  const unsubscribeOutgoing = onSnapshot(
    outgoingAcceptedQuery,
    (snapshot) => {
      outgoing = snapshot.docs.map((entry) => toMatchRequest(entry.id, entry.data()));
      emitMerged();
    },
    (error) => {
      onError?.(error);
    }
  );

  return () => {
    unsubscribeIncoming();
    unsubscribeOutgoing();
  };
}
