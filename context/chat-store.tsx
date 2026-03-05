import React from 'react';
import { ImageSourcePropType } from 'react-native';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';

import { useAuthStore } from '@/context/auth-store';
import {
  chatConversations as initialChatConversations,
  type ChatConversation,
  type ChatMessage,
} from '@/data/chats';
import { db } from '@/lib/firebase';

type MatchConversationTarget = {
  matchPersonId: string;
  name: string;
  age: number;
  isVerified?: boolean;
  avatar: ImageSourcePropType;
  whatsappNumber?: string;
};

type UpsertConversationOptions = {
  matched?: boolean;
};

type WhatsappRequestResult =
  | 'sent'
  | 'already-granted'
  | 'pending'
  | 'incoming-pending'
  | 'unavailable';

type ChatSyncProfile = {
  matchPersonId: string;
  name: string;
  age: number;
  isVerified?: boolean;
  avatar: ImageSourcePropType;
  online?: boolean;
  whatsappNumber?: string;
};

type ChatStoreValue = {
  conversations: ChatConversation[];
  totalUnreadCount: number;
  getConversationById: (id?: string) => ChatConversation | undefined;
  markConversationRead: (conversationId: string) => Promise<void>;
  upsertConversationFromMatch: (
    target: MatchConversationTarget,
    options?: UpsertConversationOptions
  ) => string;
  requestWhatsappAccess: (conversationId: string) => Promise<WhatsappRequestResult>;
  respondToWhatsappRequest: (
    conversationId: string,
    decision: 'accepted' | 'denied'
  ) => Promise<boolean>;
  deleteConversation: (conversationId: string) => void;
  appendMessage: (conversationId: string, message: ChatMessage) => void;
  updateConversation: (
    conversationId: string,
    updater: (conversation: ChatConversation) => ChatConversation
  ) => void;
  updateMessage: (
    conversationId: string,
    messageId: string,
    updater: (message: ChatMessage) => ChatMessage
  ) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  syncConversationsWithProfiles: (profiles: ChatSyncProfile[]) => void;
};

type FirestoreConversationProfile = {
  name?: string;
  age?: number;
  isVerified?: boolean;
  avatarUrl?: string;
  whatsappNumber?: string;
  whatsAppNumber?: string;
};

type FirestoreConversationDoc = {
  participants?: string[];
  participantProfiles?: Record<string, FirestoreConversationProfile>;
  lastReadAtByUid?: Record<string, number>;
  whatsappAccessByUid?: Record<string, boolean>;
  whatsappRequestPendingByUid?: Record<string, boolean>;
  updatedAt?: number;
  createdAt?: number;
  lastMessageText?: string;
  lastMessageSentAt?: number;
  lastMessageSenderId?: string;
};

type FirestoreMessageDoc = {
  senderId?: string;
  text?: string;
  imageUri?: string;
  kind?: ChatMessage['kind'];
  requestStatus?: ChatMessage['requestStatus'];
  sentAt?: number;
};

const DEFAULT_CHAT_AVATAR = require('@/assets/images/image.png');
const ChatStoreContext = React.createContext<ChatStoreValue | null>(null);

function buildConversationId(currentUserId: string, otherUserId: string) {
  return [currentUserId, otherUserId].sort().join('_');
}

function imageSourceToUri(source: ImageSourcePropType) {
  if (typeof source !== 'object' || source === null) return '';
  if (!('uri' in source)) return '';

  const uri = source.uri;
  return typeof uri === 'string' ? uri : '';
}

function avatarFromUri(uri: string | undefined): ImageSourcePropType {
  if (uri && uri.trim().length > 0) {
    return { uri };
  }

  return DEFAULT_CHAT_AVATAR;
}

function asBooleanRecord(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const next: Record<string, boolean> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, itemValue]) => {
    if (typeof itemValue === 'boolean') {
      next[key] = itemValue;
    }
  });

  return next;
}

function asNumberRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const next: Record<string, number> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, itemValue]) => {
    if (typeof itemValue === 'number' && Number.isFinite(itemValue)) {
      next[key] = itemValue;
    }
  });

  return next;
}

function getLatestIncomingSentAt(messages: ChatMessage[]) {
  return messages.reduce((latest, message) => {
    if (message.sender !== 'them') return latest;
    return Math.max(latest, message.sentAt);
  }, 0);
}

function getUnreadCount(messages: ChatMessage[], lastReadAt: number) {
  return messages.filter((message) => message.sender === 'them' && message.sentAt > lastReadAt).length;
}

function mapConversationToState(args: {
  conversationId: string;
  currentUserId: string;
  data: FirestoreConversationDoc;
}): ChatConversation {
  const participants = Array.isArray(args.data.participants) ? args.data.participants : [];
  const otherUserId = participants.find((participant) => participant !== args.currentUserId) ?? '';
  const profiles = args.data.participantProfiles ?? {};
  const otherProfile = profiles[otherUserId] ?? {};
  const whatsappNumberRaw = String(
    otherProfile.whatsappNumber ?? otherProfile.whatsAppNumber ?? ''
  ).trim();
  const accessByUid = asBooleanRecord(args.data.whatsappAccessByUid);
  const pendingByUid = asBooleanRecord(args.data.whatsappRequestPendingByUid);
  const lastReadAtByUid = asNumberRecord(args.data.lastReadAtByUid);
  const lastReadAt = Number(lastReadAtByUid[args.currentUserId] ?? 0);
  const canOpenWhatsapp = accessByUid[args.currentUserId] === true;
  const hasOutgoingWhatsappRequest = pendingByUid[args.currentUserId] === true;
  const hasIncomingWhatsappRequest = otherUserId ? pendingByUid[otherUserId] === true : false;
  const whatsappRequestState: ChatConversation['whatsappRequestState'] = hasOutgoingWhatsappRequest
    ? 'outgoing-pending'
    : hasIncomingWhatsappRequest
      ? 'incoming-pending'
      : 'none';
  const whatsappNumber =
    canOpenWhatsapp && whatsappNumberRaw !== '254700000000' ? whatsappNumberRaw : '';

  const lastMessageText = String(args.data.lastMessageText ?? '').trim();
  const lastMessageSentAt = Number(args.data.lastMessageSentAt ?? 0);
  const lastMessageSenderId = String(args.data.lastMessageSenderId ?? '');
  const hasPreview = lastMessageText.length > 0;
  const canComputeUnreadFromPreview = lastReadAt > 0;

  return {
    id: args.conversationId,
    matchPersonId: otherUserId || undefined,
    name: String(otherProfile.name ?? 'User'),
    age: Number(otherProfile.age ?? 18),
    isVerified: Boolean(otherProfile.isVerified),
    online: false,
    unreadCount:
      canComputeUnreadFromPreview &&
      hasPreview &&
      lastMessageSenderId !== args.currentUserId &&
      lastMessageSentAt > lastReadAt
        ? 1
        : 0,
    lastReadAt,
    whatsappNumber,
    canOpenWhatsapp,
    whatsappRequestState,
    avatar: avatarFromUri(otherProfile.avatarUrl),
    messages: hasPreview
      ? [
          {
            id: `${args.conversationId}-preview-${lastMessageSentAt || 0}`,
            sender: lastMessageSenderId === args.currentUserId ? 'me' : 'them',
            text: lastMessageText,
            sentAt: lastMessageSentAt || Number(args.data.updatedAt ?? Date.now()),
          },
        ]
      : [],
  };
}

function mapMessageToState(args: {
  messageId: string;
  currentUserId: string;
  data: FirestoreMessageDoc;
}): ChatMessage {
  const senderId = String(args.data.senderId ?? '');

  return {
    id: args.messageId,
    sender: senderId === args.currentUserId ? 'me' : 'them',
    text: String(args.data.text ?? ''),
    imageUri: typeof args.data.imageUri === 'string' ? args.data.imageUri : undefined,
    kind: args.data.kind,
    requestStatus: args.data.requestStatus,
    deliveryStatus: 'sent',
    sentAt: Number(args.data.sentAt ?? Date.now()),
  };
}

export function ChatStoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const [conversations, setConversations] = React.useState<ChatConversation[]>(() =>
    initialChatConversations.map((conversation) => ({
      ...conversation,
      isVerified: conversation.isVerified ?? false,
      lastReadAt: conversation.lastReadAt ?? 0,
      canOpenWhatsapp: conversation.canOpenWhatsapp ?? false,
      whatsappRequestState: conversation.whatsappRequestState ?? 'none',
      messages: [...conversation.messages],
    }))
  );
  const activeUserIdRef = React.useRef<string | null>(null);
  const conversationUnsubscribeRef = React.useRef<(() => void) | null>(null);
  const messageListenersRef = React.useRef<Map<string, () => void>>(new Map());
  const conversationsRef = React.useRef<ChatConversation[]>([]);

  const currentUserDisplayName = React.useMemo(() => {
    const fromProfile = user?.displayName?.trim();
    if (fromProfile) return fromProfile;

    const emailPrefix = user?.email?.split('@')[0]?.trim() ?? '';
    if (emailPrefix.length > 0) return emailPrefix;

    return 'StayMate User';
  }, [user?.displayName, user?.email]);

  React.useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const clearMessageListeners = React.useCallback(() => {
    messageListenersRef.current.forEach((unsubscribe) => unsubscribe());
    messageListenersRef.current.clear();
  }, []);

  React.useEffect(() => {
    const currentUserId = user?.uid ?? null;

    if (conversationUnsubscribeRef.current) {
      conversationUnsubscribeRef.current();
      conversationUnsubscribeRef.current = null;
    }
    clearMessageListeners();

    if (!currentUserId) {
      activeUserIdRef.current = null;
      setConversations([]);
      return;
    }

    activeUserIdRef.current = currentUserId;

    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUserId)
    );

    conversationUnsubscribeRef.current = onSnapshot(
      chatsQuery,
      (snapshot) => {
        const mappedConversations = snapshot.docs.map((entry) =>
          mapConversationToState({
            conversationId: entry.id,
            currentUserId,
            data: entry.data() as FirestoreConversationDoc,
          })
        );

        const nextIds = new Set(mappedConversations.map((conversation) => conversation.id));
        messageListenersRef.current.forEach((unsubscribe, conversationId) => {
          if (!nextIds.has(conversationId)) {
            unsubscribe();
            messageListenersRef.current.delete(conversationId);
          }
        });

        setConversations((previous) => {
          const previousById = new Map(previous.map((conversation) => [conversation.id, conversation]));

          const nextConversations = mappedConversations.map((conversation) => {
            const previousConversation = previousById.get(conversation.id);
            if (previousConversation) {
              const effectiveLastReadAt =
                conversation.lastReadAt > 0 ? conversation.lastReadAt : previousConversation.lastReadAt;
              const mergedMessages =
                previousConversation.messages.length > 0
                  ? previousConversation.messages
                  : conversation.messages;

              return {
                ...conversation,
                lastReadAt: effectiveLastReadAt,
                messages: mergedMessages,
                unreadCount: getUnreadCount(mergedMessages, effectiveLastReadAt),
              };
            }

            return conversation;
          });

          return nextConversations.sort((left, right) => {
            const leftSentAt = left.messages[left.messages.length - 1]?.sentAt ?? 0;
            const rightSentAt = right.messages[right.messages.length - 1]?.sentAt ?? 0;
            return rightSentAt - leftSentAt;
          });
        });

        mappedConversations.forEach((conversation) => {
          if (messageListenersRef.current.has(conversation.id)) return;

          const messagesQuery = query(
            collection(db, 'chats', conversation.id, 'messages'),
            orderBy('sentAt', 'asc')
          );
          const unsubscribeMessages = onSnapshot(messagesQuery, (messageSnapshot) => {
            const mappedMessages = messageSnapshot.docs
              .map((entry) =>
                mapMessageToState({
                  messageId: entry.id,
                  currentUserId,
                  data: entry.data() as FirestoreMessageDoc,
                })
              )
              .sort((left, right) => left.sentAt - right.sentAt);

            setConversations((previous) =>
              previous.map((item) =>
                item.id === conversation.id
                  ? (() => {
                      const localPendingMessages = item.messages.filter(
                        (message) =>
                          (message.deliveryStatus === 'sending' || message.deliveryStatus === 'failed') &&
                          !mappedMessages.some((syncedMessage) => syncedMessage.id === message.id)
                      );
                      const mergedMessages = [...mappedMessages, ...localPendingMessages].sort(
                        (left, right) => left.sentAt - right.sentAt
                      );
                      const latestIncomingSentAt = getLatestIncomingSentAt(mergedMessages);
                      const effectiveLastReadAt =
                        item.lastReadAt > 0 ? item.lastReadAt : latestIncomingSentAt;

                      return {
                        ...item,
                        lastReadAt: effectiveLastReadAt,
                        messages: mergedMessages,
                        unreadCount: getUnreadCount(mergedMessages, effectiveLastReadAt),
                      };
                    })()
                  : item
              )
            );
          });

          messageListenersRef.current.set(conversation.id, unsubscribeMessages);
        });
      },
      () => {
        // Permission errors are handled in UI entry points.
      }
    );

    return () => {
      if (conversationUnsubscribeRef.current) {
        conversationUnsubscribeRef.current();
        conversationUnsubscribeRef.current = null;
      }
      clearMessageListeners();
    };
  }, [clearMessageListeners, user?.uid]);

  const getConversationById = React.useCallback(
    (id?: string) => {
      if (!id) return undefined;
      return conversations.find((conversation) => conversation.id === id);
    },
    [conversations]
  );

  const totalUnreadCount = React.useMemo(
    () => conversations.filter((conversation) => conversation.unreadCount > 0).length,
    [conversations]
  );

  const markConversationRead = React.useCallback(async (conversationId: string) => {
    const currentUserId = activeUserIdRef.current;
    if (!currentUserId) return;

    const activeConversation = conversationsRef.current.find(
      (conversation) => conversation.id === conversationId
    );
    if (!activeConversation) return;

    const latestIncomingSentAt = getLatestIncomingSentAt(activeConversation.messages);

    if (latestIncomingSentAt <= activeConversation.lastReadAt && activeConversation.unreadCount <= 0) {
      return;
    }

    const nextReadAt = Math.max(Date.now(), latestIncomingSentAt);

    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              lastReadAt: nextReadAt,
              unreadCount: 0,
            }
          : conversation
      )
    );

    await setDoc(
      doc(db, 'chats', conversationId),
      {
        lastReadAtByUid: {
          [currentUserId]: nextReadAt,
        },
      },
      { merge: true }
    ).catch(() => {});
  }, []);

  const upsertConversationFromMatch = React.useCallback(
    (target: MatchConversationTarget, _options?: UpsertConversationOptions) => {
      const currentUserId = activeUserIdRef.current;
      const otherUserId = target.matchPersonId.trim();
      if (!currentUserId || !otherUserId) return '';

      const conversationId = buildConversationId(currentUserId, otherUserId);
      const now = Date.now();
      const targetAvatarUri = imageSourceToUri(target.avatar);

      void setDoc(
        doc(db, 'chats', conversationId),
        {
          participants: [currentUserId, otherUserId],
          participantProfiles: {
            [currentUserId]: {
              name: currentUserDisplayName,
              age: 0,
            },
            [otherUserId]: {
              name: target.name,
              age: target.age,
              isVerified: Boolean(target.isVerified),
              avatarUrl: targetAvatarUri,
            },
          },
          lastReadAtByUid: {
            [currentUserId]: now,
            [otherUserId]: 0,
          },
          whatsappAccessByUid: {
            [currentUserId]: false,
            [otherUserId]: false,
          },
          whatsappRequestPendingByUid: {
            [currentUserId]: false,
            [otherUserId]: false,
          },
          updatedAt: now,
          createdAt: now,
        },
        { merge: true }
      ).catch(() => {});

      setConversations((previous) => {
        const existing = previous.find((conversation) => conversation.id === conversationId);
        if (existing) {
          return previous.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  matchPersonId: otherUserId,
                  name: target.name,
                  age: target.age,
                  isVerified: Boolean(target.isVerified),
                  avatar: target.avatar,
                  lastReadAt: conversation.lastReadAt ?? 0,
                  whatsappNumber: conversation.whatsappNumber ?? '',
                  canOpenWhatsapp: conversation.canOpenWhatsapp,
                  whatsappRequestState: conversation.whatsappRequestState,
                }
              : conversation
          );
        }

        return [
          ...previous,
          {
            id: conversationId,
            matchPersonId: otherUserId,
            name: target.name,
            age: target.age,
            isVerified: Boolean(target.isVerified),
            online: false,
            unreadCount: 0,
            lastReadAt: now,
            whatsappNumber: '',
            canOpenWhatsapp: false,
            whatsappRequestState: 'none',
            avatar: target.avatar,
            messages: [],
          },
        ];
      });

      return conversationId;
    },
    [currentUserDisplayName]
  );

  const deleteConversation = React.useCallback((conversationId: string) => {
    setConversations((previous) => previous.filter((conversation) => conversation.id !== conversationId));
    void deleteDoc(doc(db, 'chats', conversationId)).catch(() => {});
  }, []);

  const appendMessage = React.useCallback((conversationId: string, message: ChatMessage) => {
    const currentUserId = activeUserIdRef.current;
    if (!currentUserId) return;

    const sentAt = Date.now();
    const text = message.text.trim();
    const previewText = text || (message.imageUri ? 'Photo attachment' : 'New message');
    const messageId =
      message.id.trim().length > 0
        ? message.id
        : `${conversationId}-${sentAt}-${Math.random().toString(36).slice(2, 8)}`;
    const normalizedMessage: ChatMessage = {
      ...message,
      id: messageId,
      text,
      sentAt,
      imageUri:
        typeof message.imageUri === 'string' && message.imageUri.trim().length > 0
          ? message.imageUri
          : undefined,
      deliveryStatus: message.sender === 'me' ? 'sending' : 'sent',
    };
    const messagePayload: {
      senderId: string;
      text: string;
      sentAt: number;
      imageUri?: string;
      kind?: ChatMessage['kind'];
      requestStatus?: ChatMessage['requestStatus'];
    } = {
      senderId: currentUserId,
      text,
      sentAt,
    };

    if (typeof normalizedMessage.imageUri === 'string') {
      messagePayload.imageUri = normalizedMessage.imageUri;
    }
    if (normalizedMessage.kind) {
      messagePayload.kind = normalizedMessage.kind;
    }
    if (normalizedMessage.requestStatus) {
      messagePayload.requestStatus = normalizedMessage.requestStatus;
    }

    const activeConversation = conversationsRef.current.find((entry) => entry.id === conversationId);
    const otherUserId = activeConversation?.matchPersonId?.trim() ?? '';
    const otherAvatarUri = activeConversation ? imageSourceToUri(activeConversation.avatar) : '';

    const conversationPayload: {
      updatedAt: number;
      lastMessageText: string;
      lastMessageSentAt: number;
      lastMessageSenderId: string;
      participants?: string[];
      participantProfiles?: Record<string, FirestoreConversationProfile>;
    } = {
      updatedAt: sentAt,
      lastMessageText: previewText,
      lastMessageSentAt: sentAt,
      lastMessageSenderId: currentUserId,
    };

    if (otherUserId) {
      conversationPayload.participants = [currentUserId, otherUserId];
      conversationPayload.participantProfiles = {
        [currentUserId]: {
          name: currentUserDisplayName,
        },
        [otherUserId]: {
          name: activeConversation?.name ?? 'User',
          age: activeConversation?.age ?? 18,
          isVerified: activeConversation?.isVerified ?? false,
          avatarUrl: otherAvatarUri,
        },
      };
    }

    // Optimistically render messages so chat feels instant, then keep Firestore as source of truth.
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: [
                ...conversation.messages.filter((entry) => entry.id !== messageId),
                normalizedMessage,
              ],
            }
          : conversation
      )
    );

    const markLocalMessageStatus = (status: ChatMessage['deliveryStatus']) => {
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: conversation.messages.map((entry) =>
                  entry.id === messageId ? { ...entry, deliveryStatus: status } : entry
                ),
              }
            : conversation
        )
      );
    };

    void setDoc(doc(db, 'chats', conversationId), conversationPayload, { merge: true })
      .then(() =>
        setDoc(doc(db, 'chats', conversationId, 'messages', messageId), messagePayload, {
          merge: true,
        })
      )
      .then(() => {
        markLocalMessageStatus('sent');
      })
      .catch((error) => {
        console.error('[chat] Failed to send message', error);
        markLocalMessageStatus('failed');
      });
  }, [currentUserDisplayName]);

  const requestWhatsappAccess = React.useCallback(
    async (conversationId: string): Promise<WhatsappRequestResult> => {
      const currentUserId = activeUserIdRef.current;
      if (!currentUserId) return 'unavailable';

      const activeConversation = conversationsRef.current.find(
        (conversation) => conversation.id === conversationId
      );
      const otherUserId = activeConversation?.matchPersonId?.trim() ?? '';
      if (!activeConversation || !otherUserId) return 'unavailable';

      if (activeConversation.canOpenWhatsapp) return 'already-granted';
      if (activeConversation.whatsappRequestState === 'outgoing-pending') return 'pending';
      if (activeConversation.whatsappRequestState === 'incoming-pending') return 'incoming-pending';

      const sentAt = Date.now();
      appendMessage(conversationId, {
        id: `${conversationId}-wa-request-${sentAt}`,
        sender: 'me',
        text: 'Requested WhatsApp access.',
        kind: 'whatsapp-request',
        requestStatus: 'pending',
        sentAt,
      });

      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, whatsappRequestState: 'outgoing-pending' }
            : conversation
        )
      );

      await setDoc(
        doc(db, 'chats', conversationId),
        {
          whatsappRequestPendingByUid: {
            [currentUserId]: true,
            [otherUserId]: false,
          },
          whatsappAccessByUid: {
            [currentUserId]: false,
          },
        },
        { merge: true }
      ).catch(() => {
        // Local chat message remains; UI retry is available from chat.
      });

      return 'sent';
    },
    [appendMessage]
  );

  const respondToWhatsappRequest = React.useCallback(
    async (conversationId: string, decision: 'accepted' | 'denied'): Promise<boolean> => {
      const currentUserId = activeUserIdRef.current;
      if (!currentUserId) return false;

      const activeConversation = conversationsRef.current.find(
        (conversation) => conversation.id === conversationId
      );
      const requesterUid = activeConversation?.matchPersonId?.trim() ?? '';
      if (!activeConversation || !requesterUid) return false;
      if (activeConversation.whatsappRequestState !== 'incoming-pending') return false;

      const sentAt = Date.now();
      appendMessage(conversationId, {
        id: `${conversationId}-wa-response-${sentAt}`,
        sender: 'me',
        text:
          decision === 'accepted'
            ? 'Accepted WhatsApp access request.'
            : 'Declined WhatsApp access request.',
        kind: 'whatsapp-request',
        requestStatus: decision,
        sentAt,
      });

      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, whatsappRequestState: 'none' }
            : conversation
        )
      );

      await setDoc(
        doc(db, 'chats', conversationId),
        {
          whatsappRequestPendingByUid: {
            [requesterUid]: false,
            [currentUserId]: false,
          },
          whatsappAccessByUid: {
            [requesterUid]: decision === 'accepted',
          },
        },
        { merge: true }
      ).catch(() => {
        // Message is still sent in chat; receiver can retry if needed.
      });

      return true;
    },
    [appendMessage]
  );

  const updateConversation = React.useCallback(
    (
      conversationId: string,
      updater: (conversation: ChatConversation) => ChatConversation
    ) => {
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === conversationId ? updater(conversation) : conversation
        )
      );
    },
    []
  );

  const updateMessage = React.useCallback(
    (
      conversationId: string,
      messageId: string,
      updater: (message: ChatMessage) => ChatMessage
    ) => {
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: conversation.messages.map((message) =>
                  message.id === messageId ? updater(message) : message
                ),
              }
            : conversation
        )
      );
    },
    []
  );

  const deleteMessage = React.useCallback((conversationId: string, messageId: string) => {
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: conversation.messages.filter((message) => message.id !== messageId),
            }
          : conversation
      )
    );

    void deleteDoc(doc(db, 'chats', conversationId, 'messages', messageId)).catch(() => {});
  }, []);

  const syncConversationsWithProfiles = React.useCallback((profiles: ChatSyncProfile[]) => {
    const byId = new Map(profiles.map((profile) => [profile.matchPersonId, profile]));

    setConversations((previous) =>
      previous
        .map((conversation) => {
          if (!conversation.matchPersonId) return conversation;
          const profile = byId.get(conversation.matchPersonId);
          if (!profile) return conversation;

          return {
            ...conversation,
            name: profile.name,
            age: profile.age,
            isVerified:
              typeof profile.isVerified === 'boolean'
                ? profile.isVerified
                : conversation.isVerified,
            online: typeof profile.online === 'boolean' ? profile.online : conversation.online,
            avatar: profile.avatar,
            whatsappNumber: conversation.canOpenWhatsapp
              ? profile.whatsappNumber ?? conversation.whatsappNumber
              : '',
          };
        })
    );
  }, []);

  const value = React.useMemo<ChatStoreValue>(
    () => ({
      conversations,
      totalUnreadCount,
      getConversationById,
      markConversationRead,
      upsertConversationFromMatch,
      requestWhatsappAccess,
      respondToWhatsappRequest,
      deleteConversation,
      appendMessage,
      updateConversation,
      updateMessage,
      deleteMessage,
      syncConversationsWithProfiles,
    }),
    [
      appendMessage,
      conversations,
      deleteConversation,
      deleteMessage,
      getConversationById,
      markConversationRead,
      requestWhatsappAccess,
      respondToWhatsappRequest,
      syncConversationsWithProfiles,
      totalUnreadCount,
      upsertConversationFromMatch,
      updateConversation,
      updateMessage,
    ]
  );

  return <ChatStoreContext.Provider value={value}>{children}</ChatStoreContext.Provider>;
}

export function useChatStore() {
  const context = React.useContext(ChatStoreContext);
  if (!context) {
    throw new Error('useChatStore must be used within ChatStoreProvider');
  }

  return context;
}
