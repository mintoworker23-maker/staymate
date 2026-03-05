import { ImageSourcePropType } from 'react-native';

export type ChatMessage = {
  id: string;
  sender: 'me' | 'them';
  text: string;
  imageUri?: string;
  kind?: 'whatsapp-request';
  requestStatus?: 'pending' | 'accepted' | 'denied';
  deliveryStatus?: 'sending' | 'sent' | 'failed';
  sentAt: number;
};

export type ChatConversation = {
  id: string;
  matchPersonId?: string;
  name: string;
  age: number;
  isVerified: boolean;
  online: boolean;
  unreadCount: number;
  lastReadAt: number;
  whatsappNumber: string;
  canOpenWhatsapp: boolean;
  whatsappRequestState: 'none' | 'outgoing-pending' | 'incoming-pending';
  avatar: ImageSourcePropType;
  messages: ChatMessage[];
};

export const chatConversations: ChatConversation[] = [];

export function getConversationById(id: string | undefined) {
  if (!id) return chatConversations[0];
  return chatConversations.find((item) => item.id === id) ?? chatConversations[0];
}
