import React from 'react';
import { ImageSourcePropType } from 'react-native';

import {
  chatConversations as initialChatConversations,
  type ChatConversation,
  type ChatMessage,
} from '@/data/chats';

type MatchConversationTarget = {
  matchPersonId: string;
  name: string;
  age: number;
  avatar: ImageSourcePropType;
  whatsappNumber?: string;
};

type UpsertConversationOptions = {
  matched?: boolean;
};

type ChatStoreValue = {
  conversations: ChatConversation[];
  getConversationById: (id?: string) => ChatConversation | undefined;
  upsertConversationFromMatch: (
    target: MatchConversationTarget,
    options?: UpsertConversationOptions
  ) => string;
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
};

const ChatStoreContext = React.createContext<ChatStoreValue | null>(null);

export function ChatStoreProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = React.useState<ChatConversation[]>(() =>
    initialChatConversations.map((conversation) => ({
      ...conversation,
      messages: [...conversation.messages],
    }))
  );

  const getConversationById = React.useCallback(
    (id?: string) => {
      if (conversations.length === 0) return undefined;
      if (!id) return conversations[0];
      return conversations.find((conversation) => conversation.id === id) ?? conversations[0];
    },
    [conversations]
  );

  const upsertConversationFromMatch = React.useCallback(
    (target: MatchConversationTarget, options?: UpsertConversationOptions) => {
      const normalizedName = target.name.trim().toLowerCase();
      const firstName = normalizedName.split(/\s+/)[0] ?? normalizedName;
      const now = Date.now();
      const matchIntro = `You matched with ${target.name}, say hi.`;
      const neutralIntro = `Say hi to ${target.name}.`;
      const introText = options?.matched ? matchIntro : neutralIntro;
      let conversationId = '';

      setConversations((prev) => {
        const existing = prev.find((conversation) => {
          const conversationName = conversation.name.trim().toLowerCase();
          return (
            conversation.matchPersonId === target.matchPersonId ||
            conversationName === normalizedName ||
            conversationName === firstName
          );
        });

        if (existing) {
          conversationId = existing.id;
          return prev.map((conversation) => {
            if (conversation.id !== existing.id) return conversation;

            let nextMessages = conversation.messages;
            if (options?.matched) {
              const hasMatchIntro = conversation.messages.some((message) => message.text === matchIntro);
              if (!hasMatchIntro) {
                nextMessages = [
                  ...conversation.messages,
                  {
                    id: `${existing.id}-${now}-matched`,
                    sender: 'them',
                    text: matchIntro,
                    sentAt: now,
                  },
                ];
              }
            }

            return {
              ...conversation,
              matchPersonId: target.matchPersonId,
              name: target.name,
              age: target.age,
              avatar: target.avatar,
              whatsappNumber: target.whatsappNumber ?? conversation.whatsappNumber,
              messages: nextMessages,
            };
          });
        }

        const newConversationId = `c-${target.matchPersonId}-${now}`;
        conversationId = newConversationId;
        return [
          ...prev,
          {
            id: newConversationId,
            matchPersonId: target.matchPersonId,
            name: target.name,
            age: target.age,
            online: true,
            unreadCount: 0,
            whatsappNumber: target.whatsappNumber ?? '254700000000',
            avatar: target.avatar,
            messages: [
              {
                id: `${newConversationId}-${now}-start`,
                sender: 'them',
                text: introText,
                sentAt: now,
              },
            ],
          },
        ];
      });

      return conversationId;
    },
    []
  );

  const deleteConversation = React.useCallback((conversationId: string) => {
    setConversations((prev) => prev.filter((conversation) => conversation.id !== conversationId));
  }, []);

  const appendMessage = React.useCallback((conversationId: string, message: ChatMessage) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              unreadCount: 0,
              messages: [...conversation.messages, message],
            }
          : conversation
      )
    );
  }, []);

  const updateConversation = React.useCallback(
    (
      conversationId: string,
      updater: (conversation: ChatConversation) => ChatConversation
    ) => {
      setConversations((prev) =>
        prev.map((conversation) =>
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
      setConversations((prev) =>
        prev.map((conversation) =>
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
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: conversation.messages.filter((message) => message.id !== messageId),
            }
          : conversation
      )
    );
  }, []);

  const value = React.useMemo<ChatStoreValue>(
    () => ({
      conversations,
      getConversationById,
      upsertConversationFromMatch,
      deleteConversation,
      appendMessage,
      updateConversation,
      updateMessage,
      deleteMessage,
    }),
    [
      appendMessage,
      conversations,
      deleteConversation,
      deleteMessage,
      getConversationById,
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
