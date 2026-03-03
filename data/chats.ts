import { ImageSourcePropType } from 'react-native';

export type ChatMessage = {
  id: string;
  sender: 'me' | 'them';
  text: string;
  imageUri?: string;
  kind?: 'whatsapp-request';
  requestStatus?: 'pending' | 'accepted' | 'denied';
  sentAt: number;
};

export type ChatConversation = {
  id: string;
  matchPersonId?: string;
  name: string;
  age: number;
  online: boolean;
  unreadCount: number;
  whatsappNumber: string;
  avatar: ImageSourcePropType;
  messages: ChatMessage[];
};

export const chatConversations: ChatConversation[] = [];

export function getConversationById(id: string | undefined) {
  if (!id) return chatConversations[0];
  return chatConversations.find((item) => item.id === id) ?? chatConversations[0];
}
