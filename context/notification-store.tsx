import React from 'react';

import { useAuthStore } from '@/context/auth-store';
import { useChatStore } from '@/context/chat-store';
import { useMatchRequestStore } from '@/context/match-request-store';

export type AppNotification = {
  id: string;
  type: 'chat' | 'match-request' | 'match' | 'system';
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
  route?: string;
};

type NotificationStoreValue = {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
};

const MAX_NOTIFICATIONS = 120;
const NotificationStoreContext = React.createContext<NotificationStoreValue | null>(null);

function createNotificationId() {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function NotificationStoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const { conversations } = useChatStore();
  const { incomingRequestUserIds, matchedUserIds } = useMatchRequestStore();
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);

  const hasHydratedChatsRef = React.useRef(false);
  const hasHydratedIncomingRef = React.useRef(false);
  const hasHydratedMatchesRef = React.useRef(false);
  const previousChatUnreadRef = React.useRef<Map<string, number>>(new Map());
  const previousIncomingSetRef = React.useRef<Set<string>>(new Set());
  const previousMatchedSetRef = React.useRef<Set<string>>(new Set());

  const addNotification = React.useCallback(
    (payload: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
      setNotifications((previous) => {
        const next: AppNotification = {
          id: createNotificationId(),
          createdAt: Date.now(),
          read: false,
          ...payload,
        };

        return [next, ...previous].slice(0, MAX_NOTIFICATIONS);
      });
    },
    []
  );

  React.useEffect(() => {
    if (!user) {
      setNotifications([]);
      hasHydratedChatsRef.current = false;
      hasHydratedIncomingRef.current = false;
      hasHydratedMatchesRef.current = false;
      previousChatUnreadRef.current = new Map();
      previousIncomingSetRef.current = new Set();
      previousMatchedSetRef.current = new Set();
    }
  }, [user]);

  React.useEffect(() => {
    if (!user) return;

    const nextUnreadMap = new Map<string, number>();
    conversations.forEach((conversation) => {
      nextUnreadMap.set(conversation.id, conversation.unreadCount);
    });

    if (!hasHydratedChatsRef.current) {
      hasHydratedChatsRef.current = true;
      previousChatUnreadRef.current = nextUnreadMap;
      return;
    }

    const previousUnreadMap = previousChatUnreadRef.current;
    conversations.forEach((conversation) => {
      const previousUnread = previousUnreadMap.get(conversation.id) ?? 0;
      const currentUnread = conversation.unreadCount;
      if (currentUnread > previousUnread) {
        addNotification({
          type: 'chat',
          title: `New chat from ${conversation.name}`,
          body: currentUnread > 1 ? `${currentUnread} unread messages` : '1 unread message',
          route: `/chat/${conversation.id}`,
        });
      }
    });

    previousChatUnreadRef.current = nextUnreadMap;
  }, [addNotification, conversations, user]);

  React.useEffect(() => {
    if (!user) return;

    const nextIncoming = new Set(incomingRequestUserIds);
    if (!hasHydratedIncomingRef.current) {
      hasHydratedIncomingRef.current = true;
      previousIncomingSetRef.current = nextIncoming;
      return;
    }

    const previousIncoming = previousIncomingSetRef.current;
    nextIncoming.forEach((uid) => {
      if (!previousIncoming.has(uid)) {
        addNotification({
          type: 'match-request',
          title: 'New match request',
          body: 'Someone sent you a roommate request.',
          route: '/requests',
        });
      }
    });

    previousIncomingSetRef.current = nextIncoming;
  }, [addNotification, incomingRequestUserIds, user]);

  React.useEffect(() => {
    if (!user) return;

    const nextMatched = new Set(matchedUserIds);
    if (!hasHydratedMatchesRef.current) {
      hasHydratedMatchesRef.current = true;
      previousMatchedSetRef.current = nextMatched;
      return;
    }

    const previousMatched = previousMatchedSetRef.current;
    nextMatched.forEach((uid) => {
      if (!previousMatched.has(uid)) {
        addNotification({
          type: 'match',
          title: "It's a match!",
          body: 'You matched with someone. Start chatting now.',
          route: '/chat',
        });
      }
    });

    previousMatchedSetRef.current = nextMatched;
  }, [addNotification, matchedUserIds, user]);

  const markAsRead = React.useCallback((id: string) => {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  }, []);

  const markAllAsRead = React.useCallback(() => {
    setNotifications((previous) => previous.map((notification) => ({ ...notification, read: true })));
  }, []);

  const clearAll = React.useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = React.useMemo(
    () => notifications.reduce((total, notification) => total + (notification.read ? 0 : 1), 0),
    [notifications]
  );

  const value = React.useMemo<NotificationStoreValue>(
    () => ({
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      clearAll,
    }),
    [clearAll, markAllAsRead, markAsRead, notifications, unreadCount]
  );

  return (
    <NotificationStoreContext.Provider value={value}>
      {children}
    </NotificationStoreContext.Provider>
  );
}

export function useNotificationStore() {
  const context = React.useContext(NotificationStoreContext);
  if (!context) {
    throw new Error('useNotificationStore must be used within NotificationStoreProvider');
  }

  return context;
}
