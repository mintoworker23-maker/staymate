import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandedPromptModal } from '@/components/branded-prompt-modal';
import { BottomNavigation } from '@/components/bottom-navigation';
import { ExpandingSearch } from '@/components/expanding-search';
import { type ChatConversation } from '@/data/chats';
import { useChatStore } from '@/context/chat-store';

const chatTags = [
  { key: 'all', label: 'All Chats' },
  { key: 'unread', label: 'Unread' },
  { key: 'online', label: 'Online' },
  { key: 'offline', label: 'Offline' },
] as const;

type ChatTag = (typeof chatTags)[number]['key'];

function getChatPreview(chat: ChatConversation) {
  const lastMessage = chat.messages[chat.messages.length - 1];
  return lastMessage
    ? (lastMessage.text.trim() || (lastMessage.imageUri ? 'Photo attachment' : 'Start chatting'))
    : 'Start chatting';
}

function ChatRow({
  item,
  onPress,
  onLongPress,
  onSwipeDelete,
  selected,
  swipeEnabled,
}: {
  item: ChatConversation;
  onPress: () => void;
  onLongPress: () => void;
  onSwipeDelete: () => void;
  selected: boolean;
  swipeEnabled: boolean;
}) {
  const preview = getChatPreview(item);

  return (
    <Swipeable
      enabled={swipeEnabled}
      overshootRight={false}
      onSwipeableOpen={onSwipeDelete}
      renderRightActions={() => (
        <View style={styles.swipeDeleteWrap}>
          <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FFFFFF" />
        </View>
      )}>
      <Pressable
        style={[styles.chatRow, selected ? styles.chatRowSelected : null]}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={250}>
        <Image source={item.avatar} style={styles.avatar} />
        <View style={styles.chatMeta}>
          <Text style={styles.chatName}>{`${item.name}, ${item.age}`}</Text>
          <Text style={styles.chatPreview}>{preview}</Text>
        </View>
        <View style={styles.rowRight}>
          {item.online ? <View style={styles.onlineDot} /> : null}
          {item.unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Swipeable>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const { conversations, deleteConversation } = useChatStore();
  const [selectedChatIds, setSelectedChatIds] = React.useState<string[]>([]);
  const [pendingDeleteChatIds, setPendingDeleteChatIds] = React.useState<string[] | null>(null);
  const [activeTag, setActiveTag] = React.useState<ChatTag>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredConversations = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const byTag = conversations.filter((chat) => {
      if (activeTag === 'unread') return chat.unreadCount > 0;
      if (activeTag === 'online') return chat.online;
      if (activeTag === 'offline') return !chat.online;
      return true;
    });

    if (!query) return byTag;

    return byTag.filter((chat) => {
      const preview = getChatPreview(chat).toLowerCase();
      return chat.name.toLowerCase().includes(query) || preview.includes(query);
    });
  }, [activeTag, conversations, searchQuery]);

  const promptDeleteChats = React.useCallback((chatIds: string[]) => {
    const uniqueIds = Array.from(new Set(chatIds));
    if (uniqueIds.length === 0) return;
    setPendingDeleteChatIds(uniqueIds);
  }, []);

  const handleChatPress = React.useCallback(
    (chatId: string) => {
      if (selectedChatIds.length === 0) {
        router.push(`/chat/${chatId}`);
        return;
      }

      setSelectedChatIds((current) =>
        current.includes(chatId) ? current.filter((id) => id !== chatId) : [...current, chatId]
      );
    },
    [router, selectedChatIds.length]
  );

  const handleChatLongPress = React.useCallback((chatId: string) => {
    setSelectedChatIds((current) => (current.includes(chatId) ? current : [...current, chatId]));
  }, []);

  const deletePendingChats = React.useCallback(() => {
    if (!pendingDeleteChatIds || pendingDeleteChatIds.length === 0) return;

    pendingDeleteChatIds.forEach((id) => deleteConversation(id));
    setSelectedChatIds((current) => current.filter((id) => !pendingDeleteChatIds.includes(id)));
    setPendingDeleteChatIds(null);
  }, [deleteConversation, pendingDeleteChatIds]);

  const deleteSelectedChats = React.useCallback(() => {
    promptDeleteChats(selectedChatIds);
  }, [promptDeleteChats, selectedChatIds]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
        <ExpandingSearch value={searchQuery} onChangeText={setSearchQuery} placeholder="Search chats..." />
      </View>

      <View style={styles.chipRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScrollContent}
          style={styles.chipScroll}>
          {chatTags.map((tag) => (
            <Pressable
              key={tag.key}
              style={[styles.chip, activeTag === tag.key ? styles.chipActive : styles.chipInactive]}
              onPress={() => setActiveTag(tag.key)}>
              <Text
                style={[
                  styles.chipText,
                  activeTag === tag.key ? styles.chipTextActive : styles.chipTextInactive,
                ]}>
                {tag.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatRow
            item={item}
            onPress={() => handleChatPress(item.id)}
            onLongPress={() => handleChatLongPress(item.id)}
            onSwipeDelete={() => promptDeleteChats([item.id])}
            selected={selectedChatIds.includes(item.id)}
            swipeEnabled={selectedChatIds.length === 0}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {searchQuery.trim().length > 0 ? 'No chats found.' : 'No chats yet.'}
          </Text>
        }
      />

      {selectedChatIds.length > 0 ? (
        <View style={styles.selectionBar}>
          <View style={styles.selectionMeta}>
            <MaterialCommunityIcons name="check-circle-outline" size={20} color="#D8CBFF" />
            <Text style={styles.selectionText}>{`${selectedChatIds.length} selected`}</Text>
          </View>

          <View style={styles.selectionActions}>
            <Pressable style={styles.selectionActionButton} onPress={() => setSelectedChatIds([])}>
              <MaterialCommunityIcons name="close" size={22} color="#FFFFFF" />
            </Pressable>
            <Pressable style={styles.selectionDeleteButton} onPress={deleteSelectedChats}>
              <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FFFFFF" />
              <Text style={styles.selectionDeleteText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <BottomNavigation
        style={styles.navigation}
        activeIndex={2}
        onChange={(index) => {
          if (index === 0) {
            router.push('/');
          }
          if (index === 1) {
            router.push('/explore');
          }
          if (index === 3) {
            router.push('/requests');
          }
        }}
        items={[
          { icon: 'home' },
          { icon: 'target' },
          { icon: 'chat-outline' },
          { icon: 'handshake-outline' },
        ]}
      />

      <BrandedPromptModal
        visible={Boolean(pendingDeleteChatIds?.length)}
        title="Delete chat?"
        description={
          pendingDeleteChatIds?.length
            ? `${pendingDeleteChatIds.length} chat${pendingDeleteChatIds.length > 1 ? 's' : ''} will be deleted.`
            : undefined
        }
        actions={[
          {
            label: 'Delete for everyone',
            tone: 'destructive',
            onPress: deletePendingChats,
          },
          {
            label: 'Delete for me',
            tone: 'destructive',
            onPress: deletePendingChats,
          },
        ]}
        onClose={() => setPendingDeleteChatIds(null)}
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
  header: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Prompt-SemiBold',
  },
  chipRow: {
    height: 52,
    marginTop: 10,
    marginBottom: 10,
    justifyContent: 'center',
  },
  chipScroll: {
    height: 52,
  },
  chipScrollContent: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 8,
  },
  chip: {
    minWidth: 96,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#D5FF78',
  },
  chipInactive: {
    backgroundColor: '#5A37AF',
  },
  chipText: {
    fontSize: 15,
    lineHeight: 18,
    fontFamily: 'Prompt-SemiBold',
    includeFontPadding: false,
  },
  chipTextActive: {
    color: '#1A1433',
  },
  chipTextInactive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 0,
    paddingBottom: 145,
    gap: 8,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5833A9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 96,
  },
  chatRowSelected: {
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
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  chatMeta: {
    marginLeft: 14,
    flex: 1,
  },
  chatName: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 24,
    fontFamily: 'Prompt-Bold',
  },
  chatPreview: {
    color: '#FFFFFF',
    opacity: 0.95,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Prompt-SemiBold',
    marginTop: 2,
  },
  rowRight: {
    marginLeft: 10,
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 24,
    gap: 8,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CCFA72',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#CCFA72',
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#1A1433',
    fontSize: 11,
    fontFamily: 'Prompt-Bold',
    lineHeight: 12,
  },
  navigation: {
    position: 'absolute',
    bottom: 34,
    alignSelf: 'center',
  },
  selectionBar: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 116,
    minHeight: 66,
    borderRadius: 33,
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
  emptyText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Prompt-SemiBold',
    opacity: 0.9,
    textAlign: 'center',
    marginTop: 20,
  },
});
