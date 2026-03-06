import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
import { MediaReviewModal } from '@/components/media-review-modal';
import { type ChatMessage } from '@/data/chats';
import { useChatStore } from '@/context/chat-store';
import { useNotificationStore } from '@/context/notification-store';
import { pickSingleImageFromLibrary } from '@/lib/media-picker';
import { goBackOrReplace } from '@/lib/navigation';
import { getUserProfile } from '@/lib/user-profile';

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function createClientMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChatDetailScreen() {
  const router = useRouter();
  const handleBackPress = React.useCallback(() => {
    goBackOrReplace(router, '/chat');
  }, [router]);
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const chatId = Array.isArray(id) ? id[0] : id;

  const {
    getConversationById,
    markConversationRead,
    requestWhatsappAccess,
    respondToWhatsappRequest,
    appendMessage,
    deleteMessage,
  } = useChatStore();
  const { markNotificationsByRoute } = useNotificationStore();

  const conversation = getConversationById(chatId);
  const [draft, setDraft] = React.useState('');
  const [selectedAttachmentUri, setSelectedAttachmentUri] = React.useState<string | null>(null);
  const [selectedAttachmentCaption, setSelectedAttachmentCaption] = React.useState('');
  const [reviewingAttachmentUri, setReviewingAttachmentUri] = React.useState<string | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = React.useState<string[]>([]);
  const [pendingDeleteMessageIds, setPendingDeleteMessageIds] = React.useState<string[] | null>(null);
  const messageListRef = React.useRef<FlatList<ChatMessage>>(null);

  React.useEffect(() => {
    setDraft('');
    setSelectedAttachmentUri(null);
    setSelectedAttachmentCaption('');
    setReviewingAttachmentUri(null);
    setSelectedMessageIds([]);
    setPendingDeleteMessageIds(null);
  }, [chatId]);

  React.useEffect(() => {
    if (!conversation || conversation.messages.length === 0) return;

    requestAnimationFrame(() => {
      messageListRef.current?.scrollToEnd({ animated: true });
    });
  }, [conversation, conversation?.messages.length]);

  React.useEffect(() => {
    if (!conversation || conversation.unreadCount <= 0) return;

    void markConversationRead(conversation.id);
    markNotificationsByRoute(`/chat/${conversation.id}`);
  }, [conversation, markConversationRead, markNotificationsByRoute]);

  const sendMessage = React.useCallback(() => {
    if (!conversation) return;

    const text = draft.trim();
    if (!text) return;

    const conversationId = conversation.id;
    const now = Date.now();

    appendMessage(conversationId, {
      id: createClientMessageId(`${conversationId}-me`),
      sender: 'me',
      text,
      sentAt: now,
    });
    setDraft('');
  }, [appendMessage, conversation, draft]);

  const pickImageAttachment = React.useCallback(async () => {
    const selectedUri = await pickSingleImageFromLibrary({ quality: 0.85, allowsEditing: false });
    if (!selectedUri) return;
    setReviewingAttachmentUri(selectedUri);
  }, []);

  const confirmImageAttachment = React.useCallback(() => {
    if (!conversation || !selectedAttachmentUri) return;

    const now = Date.now();
    const caption = selectedAttachmentCaption.trim();

    appendMessage(conversation.id, {
      id: createClientMessageId(`${conversation.id}-image`),
      sender: 'me',
      text: caption,
      imageUri: selectedAttachmentUri,
      sentAt: now,
    });

    setSelectedAttachmentUri(null);
    setSelectedAttachmentCaption('');
  }, [appendMessage, conversation, selectedAttachmentCaption, selectedAttachmentUri]);

  const openWhatsAppWithTranscript = React.useCallback(async () => {
    if (!conversation) return;

    if (!conversation.canOpenWhatsapp) {
      Alert.alert(
        'WhatsApp access required',
        `Send ${conversation.name} a WhatsApp access request first. You can only open WhatsApp after they accept.`
      );
      return;
    }

    const transcript = conversation.messages
      .map((message) => {
        if (message.imageUri && message.text.trim().length === 0) {
          return `${message.sender === 'me' ? 'Me' : conversation.name}: [Image attachment]`;
        }

        return `${message.sender === 'me' ? 'Me' : conversation.name}: ${message.text}`;
      })
      .join('\n');

    const whatsappText = encodeURIComponent(
      `Hi ${conversation.name}, continuing our StayMate chat on WhatsApp.\n\n${transcript}`
    );
    let phone = conversation.whatsappNumber.replace(/\D/g, '');
    if (!phone && conversation.matchPersonId) {
      const profile = await getUserProfile(conversation.matchPersonId).catch(() => null);
      const fallbackNumber = profile?.whatsAppNumber.trim() || profile?.phoneNumber.trim() || '';
      phone = fallbackNumber.replace(/\D/g, '');
    }

    if (!phone) {
      Alert.alert(
        'WhatsApp not available',
        `${conversation.name} has not added a WhatsApp number yet.`
      );
      return;
    }
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
  }, [conversation]);

  const handleWhatsappHeaderPress = React.useCallback(() => {
    if (!conversation) return;

    void (async () => {
      if (conversation.canOpenWhatsapp) {
        await openWhatsAppWithTranscript();
        return;
      }

      const requestResult = await requestWhatsappAccess(conversation.id);
      if (requestResult === 'already-granted') {
        await openWhatsAppWithTranscript();
        return;
      }
      if (requestResult === 'pending') {
        Alert.alert(
          'Request pending',
          `You already sent a WhatsApp access request to ${conversation.name}.`
        );
        return;
      }
      if (requestResult === 'incoming-pending') {
        Alert.alert(
          'Incoming request pending',
          `You have an incoming WhatsApp request from ${conversation.name}. Accept or decline it from the chat message.`
        );
        return;
      }
      if (requestResult === 'unavailable') {
        Alert.alert('Request failed', 'Unable to send WhatsApp request right now.');
        return;
      }

      Alert.alert(
        'Request sent',
        `Your WhatsApp access request has been sent to ${conversation.name}.`
      );
    })();
  }, [conversation, openWhatsAppWithTranscript, requestWhatsappAccess]);

  const handleRespondToWhatsappRequest = React.useCallback(
    (decision: 'accepted' | 'denied') => {
      if (!conversation) return;

      void respondToWhatsappRequest(conversation.id, decision).then((didRespond) => {
        if (!didRespond) {
          Alert.alert('Action failed', 'Unable to update WhatsApp request right now.');
        }
      });
    },
    [conversation, respondToWhatsappRequest]
  );

  const openDeletePrompt = React.useCallback((ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) return;
    setPendingDeleteMessageIds(uniqueIds);
  }, []);

  const confirmDeleteMessages = React.useCallback(() => {
    if (!conversation || !pendingDeleteMessageIds || pendingDeleteMessageIds.length === 0) return;

    const idsToDelete = Array.from(new Set(pendingDeleteMessageIds));
    idsToDelete.forEach((messageId) => {
      deleteMessage(conversation.id, messageId);
    });
    setSelectedMessageIds((prev) => prev.filter((id) => !idsToDelete.includes(id)));
    setPendingDeleteMessageIds(null);
  }, [conversation, deleteMessage, pendingDeleteMessageIds]);

  const handleMessagePress = React.useCallback(
    (messageId: string, mine: boolean) => {
      if (selectedMessageIds.length === 0) return;
      if (!mine) return;
      setSelectedMessageIds((current) => {
        if (current.includes(messageId)) {
          return current.filter((id) => id !== messageId);
        }

        return [...current, messageId];
      });
    },
    [selectedMessageIds.length]
  );

  const handleMessageLongPress = React.useCallback((messageId: string, mine: boolean) => {
    if (!mine) return;
    setSelectedMessageIds((current) => (current.includes(messageId) ? current : [...current, messageId]));
  }, []);

  const deleteSelectedMessages = React.useCallback(() => {
    openDeletePrompt(selectedMessageIds);
  }, [openDeletePrompt, selectedMessageIds]);

  const onSwipeDelete = React.useCallback(
    (message: ChatMessage) => {
      if (message.sender !== 'me') return;
      if (selectedMessageIds.length > 0) return;
      openDeletePrompt([message.id]);
    },
    [openDeletePrompt, selectedMessageIds.length]
  );

  const retryFailedMessage = React.useCallback(
    (message: ChatMessage) => {
      if (!conversation || message.deliveryStatus !== 'failed') return;

      const now = Date.now();
      deleteMessage(conversation.id, message.id);
      appendMessage(conversation.id, {
        ...message,
        id: createClientMessageId(`${conversation.id}-retry`),
        sentAt: now,
      });
    },
    [appendMessage, conversation, deleteMessage]
  );

  const renderMessage = React.useCallback(
    ({ item }: { item: ChatMessage }) => {
      const mine = item.sender === 'me';
      const hasImage = Boolean(item.imageUri);
      const hasText = item.text.trim().length > 0;
      const isSelectionMode = selectedMessageIds.length > 0;
      const isSelected = selectedMessageIds.includes(item.id);
      const canSwipeDelete = !isSelectionMode && mine;
      const deliveryStatus = mine ? item.deliveryStatus ?? 'sent' : 'sent';

      const bubbleSelectionStyle = isSelected ? styles.selectedMessageBubble : null;
      const isWhatsappRequest = item.kind === 'whatsapp-request';
      const showIncomingRequestActions =
        !mine &&
        item.requestStatus === 'pending' &&
        conversation?.whatsappRequestState === 'incoming-pending';

      if (isWhatsappRequest) {
        const requestText =
          item.requestStatus === 'accepted'
            ? mine
              ? 'You approved WhatsApp access.'
              : `${conversation?.name ?? 'User'} approved your WhatsApp access request.`
            : item.requestStatus === 'denied'
              ? mine
                ? 'You declined WhatsApp access.'
                : `${conversation?.name ?? 'User'} declined your WhatsApp access request.`
              : mine
                ? 'You requested WhatsApp access.'
                : `${conversation?.name ?? 'User'} requested WhatsApp access.`;

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
              onLongPress={mine ? () => handleMessageLongPress(item.id, mine) : undefined}
              onPress={() => handleMessagePress(item.id, mine)}
              delayLongPress={250}
              style={[styles.messageRow, mine ? styles.messageRowMine : styles.messageRowTheirs]}>
              <View
                style={[
                  styles.requestBubble,
                  mine ? styles.requestBubbleMine : styles.requestBubbleTheirs,
                  bubbleSelectionStyle,
                ]}>
                <View style={styles.requestRow}>
                  <MaterialCommunityIcons
                    name="shield-lock-outline"
                    size={18}
                    color={mine ? '#1B1533' : '#FFFFFF'}
                  />
                  <Text style={mine ? styles.requestTextMine : styles.requestTextTheirs}>
                    {requestText}
                  </Text>
                </View>

                {showIncomingRequestActions ? (
                  <View style={styles.requestActionsRow}>
                    <Pressable
                      style={[styles.requestActionButton, styles.requestDeclineButton]}
                      onPress={() => handleRespondToWhatsappRequest('denied')}>
                      <Text style={styles.requestDeclineText}>Decline</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.requestActionButton, styles.requestAcceptButton]}
                      onPress={() => handleRespondToWhatsappRequest('accepted')}>
                      <Text style={styles.requestAcceptText}>Accept</Text>
                    </Pressable>
                  </View>
                ) : null}
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
            onLongPress={mine ? () => handleMessageLongPress(item.id, mine) : undefined}
            onPress={() => handleMessagePress(item.id, mine)}
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
            {mine && deliveryStatus === 'sending' ? (
              <Text style={styles.sendingText}>Sending...</Text>
            ) : null}
            {mine && deliveryStatus === 'failed' ? (
              <Pressable
                style={styles.retryButton}
                onPress={() => retryFailedMessage(item)}>
                <MaterialCommunityIcons name="refresh" size={12} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Swipeable>
      );
    },
    [
      conversation,
      handleMessageLongPress,
      handleMessagePress,
      handleRespondToWhatsappRequest,
      onSwipeDelete,
      retryFailedMessage,
      selectedMessageIds,
    ]
  );

  if (!conversation) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Chat not found</Text>
          <Pressable style={styles.emptyBackButton} onPress={handleBackPress}>
            <Text style={styles.emptyBackText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <View style={styles.header}>
          <Pressable style={styles.headerButton} onPress={handleBackPress}>
            <MaterialCommunityIcons name="arrow-left" size={34} color="#FFFFFF" />
          </Pressable>

          <View style={styles.userMeta}>
            <Image source={conversation.avatar} style={styles.avatar} />
            <View>
              <Text style={styles.userName}>{conversation.name}</Text>
              <Text style={styles.userStatus}>{conversation.online ? 'Online' : 'Offline'}</Text>
            </View>
          </View>

          <Pressable style={styles.headerButton} onPress={handleWhatsappHeaderPress}>
            <MaterialCommunityIcons
              name={conversation.canOpenWhatsapp ? 'whatsapp' : 'lock-outline'}
              size={30}
              color={conversation.canOpenWhatsapp ? '#FFFFFF' : '#D8CBFF'}
            />
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

      <MediaReviewModal
        visible={Boolean(reviewingAttachmentUri)}
        uri={reviewingAttachmentUri}
        title="Review your attachment"
        confirmLabel="Use photo"
        onClose={() => {
          setReviewingAttachmentUri(null);
        }}
        onConfirm={(uri) => {
          setReviewingAttachmentUri(null);
          setSelectedAttachmentUri(uri);
          setSelectedAttachmentCaption('');
        }}
      />

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
            label: 'Delete',
            tone: 'destructive',
            onPress: confirmDeleteMessages,
          },
        ]}
        onClose={() => setPendingDeleteMessageIds(null)}
      />
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
  requestBubble: {
    maxWidth: '84%',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  requestBubbleMine: {
    backgroundColor: '#C8ED72',
    borderBottomRightRadius: 10,
  },
  requestBubbleTheirs: {
    backgroundColor: '#5833A9',
    borderBottomLeftRadius: 10,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  requestTextMine: {
    flex: 1,
    color: '#1B1533',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Prompt-SemiBold',
  },
  requestTextTheirs: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Prompt-SemiBold',
  },
  requestActionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  requestActionButton: {
    minWidth: 78,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestDeclineButton: {
    backgroundColor: 'rgba(197, 54, 90, 0.26)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
  },
  requestAcceptButton: {
    backgroundColor: '#D5FF78',
  },
  requestDeclineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Prompt-SemiBold',
  },
  requestAcceptText: {
    color: '#1B1533',
    fontSize: 12,
    fontFamily: 'Prompt-Bold',
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
  sendingText: {
    marginTop: 4,
    marginRight: 6,
    color: '#D8CBFF',
    fontSize: 11,
    fontFamily: 'Prompt-SemiBold',
    alignSelf: 'flex-end',
  },
  retryButton: {
    marginTop: 4,
    marginRight: 4,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    backgroundColor: '#C5365A',
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Prompt-Bold',
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
});
