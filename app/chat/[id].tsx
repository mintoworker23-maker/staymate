import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandedPromptModal } from '@/components/branded-prompt-modal';
import { type ChatMessage } from '@/data/chats';
import { useChatStore } from '@/context/chat-store';

const replyPool = [
  'Sounds good.',
  'Perfect, let us do that.',
  'Can we meet tomorrow?',
  'I am available after 5 PM.',
  'Thanks for the update.',
];

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

type DeletedMessageEntry = {
  message: ChatMessage;
  index: number;
};

export default function ChatDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const chatId = Array.isArray(id) ? id[0] : id;

  const {
    getConversationById,
    appendMessage,
    updateConversation,
    updateMessage,
  } = useChatStore();

  const conversation = getConversationById(chatId);
  const [draft, setDraft] = React.useState('');
  const [selectedAttachmentUri, setSelectedAttachmentUri] = React.useState<string | null>(null);
  const [selectedAttachmentCaption, setSelectedAttachmentCaption] = React.useState('');
  const [selectedMessageIds, setSelectedMessageIds] = React.useState<string[]>([]);
  const [pendingDeleteMessageIds, setPendingDeleteMessageIds] = React.useState<string[] | null>(null);
  const [lastDeletedBatch, setLastDeletedBatch] = React.useState<DeletedMessageEntry[] | null>(null);
  const messageListRef = React.useRef<FlatList<ChatMessage>>(null);
  const replyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const whatsappResponseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationRef = React.useRef(conversation);
  const nextSimulatedWhatsAppStatusRef = React.useRef<'accepted' | 'denied'>('denied');

  React.useEffect(() => {
    setDraft('');
    setSelectedAttachmentUri(null);
    setSelectedAttachmentCaption('');
    setSelectedMessageIds([]);
    setPendingDeleteMessageIds(null);
    setLastDeletedBatch(null);
  }, [chatId]);

  React.useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  React.useEffect(() => {
    return () => {
      if (replyTimerRef.current) {
        clearTimeout(replyTimerRef.current);
      }
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
      if (whatsappResponseTimerRef.current) {
        clearTimeout(whatsappResponseTimerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!conversation || conversation.messages.length === 0) return;

    requestAnimationFrame(() => {
      messageListRef.current?.scrollToEnd({ animated: true });
    });
  }, [conversation, conversation?.messages.length]);

  const sendMessage = React.useCallback(() => {
    if (!conversation) return;

    const text = draft.trim();
    if (!text) return;

    const conversationId = conversation.id;
    const now = Date.now();

    appendMessage(conversationId, {
      id: `${conversationId}-${now}-me`,
      sender: 'me',
      text,
      sentAt: now,
    });
    setDraft('');

    if (replyTimerRef.current) {
      clearTimeout(replyTimerRef.current);
    }

    replyTimerRef.current = setTimeout(() => {
      const replyTime = Date.now();
      const replyText = replyPool[Math.floor(Math.random() * replyPool.length)];

      updateConversation(conversationId, (prev) => ({
        ...prev,
        online: true,
        messages: [
          ...prev.messages,
          {
            id: `${conversationId}-${replyTime}-them`,
            sender: 'them',
            text: replyText,
            sentAt: replyTime,
          },
        ],
      }));
    }, 700);
  }, [appendMessage, conversation, draft, updateConversation]);

  const pickImageAttachment = React.useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow media access to attach images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) return;

    const selected = result.assets[0];
    setSelectedAttachmentUri(selected.uri);
    setSelectedAttachmentCaption('');
  }, []);

  const confirmImageAttachment = React.useCallback(() => {
    if (!conversation || !selectedAttachmentUri) return;

    const now = Date.now();
    const caption = selectedAttachmentCaption.trim();

    appendMessage(conversation.id, {
      id: `${conversation.id}-${now}-image`,
      sender: 'me',
      text: caption,
      imageUri: selectedAttachmentUri,
      sentAt: now,
    });

    setSelectedAttachmentUri(null);
    setSelectedAttachmentCaption('');
  }, [appendMessage, conversation, selectedAttachmentCaption, selectedAttachmentUri]);

  const openWhatsAppWithTranscript = React.useCallback(async () => {
    const active = conversationRef.current;
    if (!active) return;

    const transcript = active.messages
      .map((message) => {
        if (message.kind === 'whatsapp-request') {
          const status = message.requestStatus ?? 'pending';
          return `${message.sender === 'me' ? 'Me' : active.name}: WhatsApp request (${status})`;
        }

        if (message.imageUri && message.text.trim().length === 0) {
          return `${message.sender === 'me' ? 'Me' : active.name}: [Image attachment]`;
        }

        return `${message.sender === 'me' ? 'Me' : active.name}: ${message.text}`;
      })
      .join('\n');

    const whatsappText = encodeURIComponent(
      `Hi ${active.name}, continuing our StayMate chat on WhatsApp.\n\n${transcript}`
    );
    const phone = active.whatsappNumber.replace(/\D/g, '');
    const nativeUrl = `whatsapp://send?phone=${phone}&text=${whatsappText}`;
    const webUrl = `https://wa.me/${phone}?text=${whatsappText}`;

    try {
      if (await Linking.canOpenURL(nativeUrl)) {
        await Linking.openURL(nativeUrl);
        return;
      }

      await Linking.openURL(webUrl);
    } catch {
      Alert.alert('WhatsApp unavailable', 'Unable to open WhatsApp on this device right now.');
    }
  }, []);

  const simulateRemoteWhatsAppDecision = React.useCallback(
    (requestMessageId: string, status: 'accepted' | 'denied') => {
      if (!conversation) return;

      if (whatsappResponseTimerRef.current) {
        clearTimeout(whatsappResponseTimerRef.current);
      }

      whatsappResponseTimerRef.current = setTimeout(() => {
        const activeConversation = conversationRef.current;
        if (!activeConversation || activeConversation.id !== conversation.id) return;

        updateMessage(conversation.id, requestMessageId, (message) => ({
          ...message,
          requestStatus: status,
        }));

        const now = Date.now();
        appendMessage(conversation.id, {
          id: `${conversation.id}-${now}-wa-response`,
          sender: 'them',
          kind: 'whatsapp-request',
          requestStatus: status,
          text:
            status === 'accepted'
              ? 'I accepted your WhatsApp request. Tap WhatsApp again to continue there.'
              : 'I denied your WhatsApp request for now.',
          sentAt: now,
        });
      }, 1050);
    },
    [appendMessage, conversation, updateMessage]
  );

  const updateWhatsAppRequestStatus = React.useCallback(
    (messageId: string, status: 'accepted' | 'denied') => {
      if (!conversation) return;

      updateMessage(conversation.id, messageId, (message) => ({
        ...message,
        requestStatus: status,
      }));
    },
    [conversation, updateMessage]
  );

  const sendWhatsAppRequest = React.useCallback(() => {
    if (!conversation) return;

    const hasAcceptedRequest = conversation.messages.some(
      (message) =>
        message.kind === 'whatsapp-request' &&
        message.sender === 'me' &&
        message.requestStatus === 'accepted'
    );
    if (hasAcceptedRequest) {
      void openWhatsAppWithTranscript();
      return;
    }

    const hasPendingRequest = conversation.messages.some(
      (message) =>
        message.kind === 'whatsapp-request' &&
        message.sender === 'me' &&
        message.requestStatus === 'pending'
    );
    if (hasPendingRequest) {
      Alert.alert('Request pending', 'You already sent a WhatsApp request in this chat.');
      return;
    }

    const requestTime = Date.now();
    appendMessage(conversation.id, {
      id: `${conversation.id}-${requestTime}-wa-request`,
      sender: 'me',
      kind: 'whatsapp-request',
      requestStatus: 'pending',
      text: 'Requested to move this chat to WhatsApp.',
      sentAt: requestTime,
    });

    const simulatedStatus = nextSimulatedWhatsAppStatusRef.current;
    nextSimulatedWhatsAppStatusRef.current = simulatedStatus === 'accepted' ? 'denied' : 'accepted';
    simulateRemoteWhatsAppDecision(`${conversation.id}-${requestTime}-wa-request`, simulatedStatus);
  }, [appendMessage, conversation, openWhatsAppWithTranscript, simulateRemoteWhatsAppDecision]);

  const queueUndoBatch = React.useCallback((entries: DeletedMessageEntry[]) => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }

    setLastDeletedBatch(entries);
    undoTimerRef.current = setTimeout(() => {
      setLastDeletedBatch(null);
    }, 5000);
  }, []);

  const openDeletePrompt = React.useCallback((ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) return;
    setPendingDeleteMessageIds(uniqueIds);
  }, []);

  const confirmDeleteMessages = React.useCallback(() => {
    if (!conversation || !pendingDeleteMessageIds || pendingDeleteMessageIds.length === 0) return;

    const idsToDelete = new Set(pendingDeleteMessageIds);
    let deletedEntries: DeletedMessageEntry[] = [];

    updateConversation(conversation.id, (prev) => {
      deletedEntries = prev.messages
        .map((message, index) => ({ message, index }))
        .filter((entry) => idsToDelete.has(entry.message.id));

      if (deletedEntries.length === 0) return prev;

      return {
        ...prev,
        messages: prev.messages.filter((message) => !idsToDelete.has(message.id)),
      };
    });

    if (deletedEntries.length > 0) {
      queueUndoBatch(deletedEntries);
    }

    setSelectedMessageIds((prev) => prev.filter((id) => !idsToDelete.has(id)));
    setPendingDeleteMessageIds(null);
  }, [conversation, pendingDeleteMessageIds, queueUndoBatch, updateConversation]);

  const undoDeleteMessages = React.useCallback(() => {
    if (!conversation || !lastDeletedBatch || lastDeletedBatch.length === 0) return;

    updateConversation(conversation.id, (prev) => {
      const restoredMessages = [...prev.messages];
      const existingIds = new Set(prev.messages.map((entry) => entry.id));
      const orderedEntries = [...lastDeletedBatch].sort((a, b) => a.index - b.index);

      for (const entry of orderedEntries) {
        if (existingIds.has(entry.message.id)) continue;
        const insertAt = Math.min(Math.max(entry.index, 0), restoredMessages.length);
        restoredMessages.splice(insertAt, 0, entry.message);
        existingIds.add(entry.message.id);
      }

      return {
        ...prev,
        messages: restoredMessages,
      };
    });

    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }
    setLastDeletedBatch(null);
  }, [conversation, lastDeletedBatch, updateConversation]);

  const handleMessagePress = React.useCallback(
    (messageId: string) => {
      if (selectedMessageIds.length === 0) return;
      setSelectedMessageIds((current) => {
        if (current.includes(messageId)) {
          return current.filter((id) => id !== messageId);
        }

        return [...current, messageId];
      });
    },
    [selectedMessageIds.length]
  );

  const handleMessageLongPress = React.useCallback((messageId: string) => {
    setSelectedMessageIds((current) => (current.includes(messageId) ? current : [...current, messageId]));
  }, []);

  const deleteSelectedMessages = React.useCallback(() => {
    openDeletePrompt(selectedMessageIds);
  }, [openDeletePrompt, selectedMessageIds]);

  const onSwipeDelete = React.useCallback(
    (message: ChatMessage) => {
      if (selectedMessageIds.length > 0) return;
      openDeletePrompt([message.id]);
    },
    [openDeletePrompt, selectedMessageIds.length]
  );

  const renderMessage = React.useCallback(
    ({ item }: { item: ChatMessage }) => {
      const mine = item.sender === 'me';
      const hasImage = Boolean(item.imageUri);
      const hasText = item.text.trim().length > 0;
      const requestStatus = item.requestStatus ?? 'pending';
      const isWhatsAppRequest = item.kind === 'whatsapp-request';
      const isSelectionMode = selectedMessageIds.length > 0;
      const isSelected = selectedMessageIds.includes(item.id);
      const canSwipeDelete = !isSelectionMode;

      const bubbleSelectionStyle = isSelected ? styles.selectedMessageBubble : null;

      if (isWhatsAppRequest) {
        return (
          <Swipeable
            enabled={canSwipeDelete}
            overshootRight={false}
            onSwipeableOpen={() => onSwipeDelete(item)}
            renderRightActions={() => (
              <View style={styles.swipeDeleteWrap}>
                <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FFFFFF" />
              </View>
            )}>
            <Pressable
              onLongPress={() => handleMessageLongPress(item.id)}
              onPress={() => handleMessagePress(item.id)}
              delayLongPress={250}
              style={[styles.messageRow, mine ? styles.messageRowMine : styles.messageRowTheirs]}>
              <View
                style={[
                  styles.messageBubble,
                  mine ? styles.messageBubbleMine : styles.messageBubbleTheirs,
                  styles.requestBubble,
                  bubbleSelectionStyle,
                ]}>
                <View style={styles.requestHeader}>
                  <MaterialCommunityIcons name="whatsapp" size={18} color={mine ? '#1B1533' : '#FFFFFF'} />
                  <Text style={mine ? styles.messageTextMine : styles.messageTextTheirs}>{item.text}</Text>
                </View>

                {requestStatus === 'pending' && !mine ? (
                  <View style={styles.requestActions}>
                    <Pressable
                      style={[styles.requestActionButton, styles.requestAcceptButton]}
                      onPress={() => updateWhatsAppRequestStatus(item.id, 'accepted')}>
                      <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                    </Pressable>
                    <Pressable
                      style={[styles.requestActionButton, styles.requestDenyButton]}
                      onPress={() => updateWhatsAppRequestStatus(item.id, 'denied')}>
                      <MaterialCommunityIcons name="close" size={18} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.requestStatusBadge,
                      requestStatus === 'accepted'
                        ? styles.requestStatusAccepted
                        : requestStatus === 'denied'
                          ? styles.requestStatusDenied
                          : styles.requestStatusPending,
                    ]}>
                    <Text style={styles.requestStatusText}>
                      {requestStatus === 'accepted'
                        ? 'Accepted'
                        : requestStatus === 'denied'
                          ? 'Denied'
                          : 'Pending'}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.messageTime, mine ? styles.messageTimeMine : styles.messageTimeTheirs]}>
                {formatTime(item.sentAt)}
              </Text>
            </Pressable>
          </Swipeable>
        );
      }

      return (
        <Swipeable
          enabled={canSwipeDelete}
          overshootRight={false}
          onSwipeableOpen={() => onSwipeDelete(item)}
          renderRightActions={() => (
            <View style={styles.swipeDeleteWrap}>
              <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FFFFFF" />
            </View>
          )}>
          <Pressable
            onLongPress={() => handleMessageLongPress(item.id)}
            onPress={() => handleMessagePress(item.id)}
            delayLongPress={250}
            style={[styles.messageRow, mine ? styles.messageRowMine : styles.messageRowTheirs]}>
            <View
              style={[
                styles.messageBubble,
                mine ? styles.messageBubbleMine : styles.messageBubbleTheirs,
                hasImage && styles.messageBubbleWithImage,
                bubbleSelectionStyle,
              ]}>
              {hasImage ? (
                <Image
                  source={{ uri: item.imageUri }}
                  style={[styles.messageImage, hasText ? styles.messageImageWithCaption : null]}
                />
              ) : null}
              {hasText ? (
                <Text style={mine ? styles.messageTextMine : styles.messageTextTheirs}>{item.text}</Text>
              ) : null}
            </View>
            <Text style={[styles.messageTime, mine ? styles.messageTimeMine : styles.messageTimeTheirs]}>
              {formatTime(item.sentAt)}
            </Text>
          </Pressable>
        </Swipeable>
      );
    },
    [handleMessageLongPress, handleMessagePress, onSwipeDelete, selectedMessageIds, updateWhatsAppRequestStatus]
  );

  if (!conversation) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Chat not found</Text>
          <Pressable style={styles.emptyBackButton} onPress={() => router.back()}>
            <Text style={styles.emptyBackText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <View style={styles.header}>
          <Pressable style={styles.headerButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={34} color="#FFFFFF" />
          </Pressable>

          <View style={styles.userMeta}>
            <Image source={conversation.avatar} style={styles.avatar} />
            <View>
              <Text style={styles.userName}>{conversation.name}</Text>
              <Text style={styles.userStatus}>{conversation.online ? 'Online' : 'Offline'}</Text>
            </View>
          </View>

          <Pressable style={styles.headerButton} onPress={sendWhatsAppRequest}>
            <MaterialCommunityIcons name="whatsapp" size={30} color="#FFFFFF" />
          </Pressable>
        </View>

        <FlatList
          ref={messageListRef}
          data={conversation.messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        />

        {selectedMessageIds.length > 0 ? (
          <View style={styles.selectionBar}>
            <View style={styles.selectionMeta}>
              <MaterialCommunityIcons name="check-circle-outline" size={20} color="#D8CBFF" />
              <Text style={styles.selectionText}>{`${selectedMessageIds.length} selected`}</Text>
            </View>

            <View style={styles.selectionActions}>
              <Pressable style={styles.selectionActionButton} onPress={() => setSelectedMessageIds([])}>
                <MaterialCommunityIcons name="close" size={22} color="#FFFFFF" />
              </Pressable>
              <Pressable style={styles.selectionDeleteButton} onPress={deleteSelectedMessages}>
                <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FFFFFF" />
                <Text style={styles.selectionDeleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.composerWrap}>
            <Pressable style={styles.inputIcon} onPress={pickImageAttachment}>
              <MaterialCommunityIcons name="paperclip" size={29} color="#FFFFFF" />
            </Pressable>

            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Type something..."
              placeholderTextColor="#AFA2D7"
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />

            <Pressable style={styles.inputIcon} onPress={sendMessage}>
              <MaterialCommunityIcons name="send" size={29} color="#FFFFFF" />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal visible={Boolean(selectedAttachmentUri)} transparent animationType="fade">
        <View style={styles.attachmentOverlay}>
          <View style={styles.attachmentSheet}>
            <View style={styles.attachmentHeader}>
              <Text style={styles.attachmentTitle}>Selected image</Text>
              <Pressable
                style={styles.attachmentCloseButton}
                onPress={() => {
                  setSelectedAttachmentUri(null);
                  setSelectedAttachmentCaption('');
                }}>
                <MaterialCommunityIcons name="close" size={22} color="#FFFFFF" />
              </Pressable>
            </View>

            {selectedAttachmentUri ? (
              <Image source={{ uri: selectedAttachmentUri }} style={styles.attachmentPreviewImage} />
            ) : null}

            <View style={styles.attachmentCaptionWrap}>
              <TextInput
                style={styles.attachmentCaptionInput}
                value={selectedAttachmentCaption}
                onChangeText={setSelectedAttachmentCaption}
                placeholder="Add caption..."
                placeholderTextColor="#AFA2D7"
              />
            </View>

            <Pressable style={styles.attachmentSendButton} onPress={confirmImageAttachment}>
              <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.attachmentSendText}>Send image</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <BrandedPromptModal
        visible={Boolean(pendingDeleteMessageIds?.length)}
        title="Delete message?"
        description={
          pendingDeleteMessageIds?.length
            ? `${pendingDeleteMessageIds.length} selected message${pendingDeleteMessageIds.length > 1 ? 's' : ''} will be deleted.`
            : undefined
        }
        actions={[
          {
            label: 'Delete for everyone',
            tone: 'destructive',
            onPress: confirmDeleteMessages,
          },
          {
            label: 'Delete for me',
            tone: 'destructive',
            onPress: confirmDeleteMessages,
          },
        ]}
        onClose={() => setPendingDeleteMessageIds(null)}
      />

      {lastDeletedBatch ? (
        <View
          style={[
            styles.undoBar,
            selectedMessageIds.length > 0 ? styles.undoBarAboveSelection : styles.undoBarAboveComposer,
          ]}>
          <Text style={styles.undoText}>
            {`${lastDeletedBatch.length} message${lastDeletedBatch.length > 1 ? 's' : ''} deleted`}
          </Text>
          <Pressable style={styles.undoButton} onPress={undoDeleteMessages}>
            <Text style={styles.undoButtonText}>Undo</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#371F7E',
    paddingTop: 10,
  },
  keyboardWrap: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#5A37AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 12,
    gap: 10,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E2E2E2',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 24,
    fontFamily: 'Prompt-Bold',
  },
  userStatus: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Prompt-SemiBold',
    opacity: 0.92,
  },
  messagesContent: {
    paddingTop: 26,
    paddingHorizontal: 22,
    paddingBottom: 14,
    gap: 22,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageRow: {
    maxWidth: '100%',
  },
  messageRowMine: {
    alignItems: 'flex-end',
  },
  messageRowTheirs: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '72%',
    borderRadius: 26,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectedMessageBubble: {
    borderWidth: 2,
    borderColor: '#D5FF78',
  },
  swipeDeleteWrap: {
    width: 78,
    marginVertical: 4,
    borderRadius: 22,
    backgroundColor: '#CF365A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubbleWithImage: {
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  requestBubble: {
    minWidth: 230,
    gap: 10,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requestActionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestAcceptButton: {
    backgroundColor: '#18A957',
  },
  requestDenyButton: {
    backgroundColor: '#DF3E57',
  },
  requestStatusBadge: {
    alignSelf: 'flex-start',
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestStatusAccepted: {
    backgroundColor: 'rgba(24, 169, 87, 0.22)',
  },
  requestStatusDenied: {
    backgroundColor: 'rgba(223, 62, 87, 0.22)',
  },
  requestStatusPending: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  requestStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 14,
    fontFamily: 'Prompt-SemiBold',
  },
  messageImage: {
    width: 180,
    height: 220,
    borderRadius: 20,
    backgroundColor: '#2E1A63',
  },
  messageImageWithCaption: {
    marginBottom: 8,
  },
  messageBubbleMine: {
    backgroundColor: '#C8ED72',
    borderBottomRightRadius: 10,
  },
  messageBubbleTheirs: {
    backgroundColor: '#5833A9',
    borderBottomLeftRadius: 10,
  },
  messageTextMine: {
    color: '#1B1533',
    fontSize: 14,
    fontFamily: 'Prompt-SemiBold',
  },
  messageTextTheirs: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Prompt-SemiBold',
  },
  messageTime: {
    marginTop: 6,
    fontSize: 11,
    fontFamily: 'Prompt-SemiBold',
    opacity: 0.95,
  },
  messageTimeMine: {
    color: '#FFFFFF',
    marginRight: 4,
  },
  messageTimeTheirs: {
    color: '#FFFFFF',
    marginLeft: 2,
  },
  composerWrap: {
    marginHorizontal: 22,
    marginTop: 14,
    marginBottom: 26,
    minHeight: 74,
    borderRadius: 37,
    backgroundColor: '#5833A9',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectionBar: {
    marginHorizontal: 22,
    marginTop: 14,
    marginBottom: 26,
    minHeight: 74,
    borderRadius: 37,
    backgroundColor: '#5833A9',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Prompt-SemiBold',
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectionActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6B45BF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionDeleteButton: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 12,
    backgroundColor: '#C5365A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  selectionDeleteText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Prompt-Bold',
  },
  inputIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Prompt-SemiBold',
    paddingVertical: 0,
  },
  attachmentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 14, 43, 0.85)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  attachmentSheet: {
    borderRadius: 24,
    backgroundColor: '#47288F',
    padding: 14,
    gap: 12,
  },
  attachmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attachmentTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Prompt-Bold',
  },
  attachmentCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#5A37AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentPreviewImage: {
    width: '100%',
    height: 340,
    borderRadius: 18,
    backgroundColor: '#2E1A63',
  },
  attachmentCaptionWrap: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#5833A9',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  attachmentCaptionInput: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Prompt-SemiBold',
    paddingVertical: 0,
  },
  attachmentSendButton: {
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1DAF5A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  attachmentSendText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Prompt-Bold',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 14,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Prompt-Bold',
  },
  emptyBackButton: {
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 18,
    backgroundColor: '#5A37AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBackText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Prompt-SemiBold',
  },
  undoBar: {
    position: 'absolute',
    left: 22,
    right: 22,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#5A37AF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  undoBarAboveComposer: {
    bottom: 110,
  },
  undoBarAboveSelection: {
    bottom: 110,
  },
  undoText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Prompt-SemiBold',
  },
  undoButton: {
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 10,
    backgroundColor: '#D5FF78',
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoButtonText: {
    color: '#1A1433',
    fontSize: 12,
    fontFamily: 'Prompt-Bold',
  },
});
