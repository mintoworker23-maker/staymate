import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNotificationStore, type AppNotification } from '@/context/notification-store';
import { goBackOrReplace } from '@/lib/navigation';

function getNotificationIcon(notificationType: AppNotification['type']) {
  if (notificationType === 'chat') return 'chat-outline';
  if (notificationType === 'match-request') return 'account-arrow-right-outline';
  if (notificationType === 'match') return 'handshake-outline';
  return 'bell-outline';
}

function formatNotificationTime(createdAt: number) {
  const elapsedMs = Date.now() - createdAt;
  if (elapsedMs < 60_000) return 'Now';
  if (elapsedMs < 3_600_000) return `${Math.max(1, Math.floor(elapsedMs / 60_000))}m ago`;
  if (elapsedMs < 86_400_000) return `${Math.floor(elapsedMs / 3_600_000)}h ago`;
  if (elapsedMs < 172_800_000) return 'Yesterday';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(createdAt));
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotificationStore();

  const handleBackPress = React.useCallback(() => {
    goBackOrReplace(router, '/home');
  }, [router]);

  const handleNotificationPress = React.useCallback(
    (notification: AppNotification) => {
      markAsRead(notification.id);
      if (!notification.route) return;
      router.push(notification.route as Href);
    },
    [markAsRead, router]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBackPress}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>{`${unreadCount} unread`}</Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.secondaryButton} onPress={markAllAsRead}>
          <Text style={styles.secondaryButtonText}>Mark all read</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={clearAll}>
          <Text style={styles.secondaryButtonText}>Clear all</Text>
        </Pressable>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.notificationCard, !item.read ? styles.notificationCardUnread : null]}
            onPress={() => handleNotificationPress(item)}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons
                name={getNotificationIcon(item.type)}
                size={22}
                color={item.read ? '#D8CBFF' : '#F6D84E'}
              />
            </View>
            <View style={styles.notificationContent}>
              <View style={styles.notificationTopRow}>
                <Text style={styles.notificationTitle}>{item.title}</Text>
                <Text style={styles.notificationTime}>{formatNotificationTime(item.createdAt)}</Text>
              </View>
              <Text style={styles.notificationBody}>{item.body}</Text>
              {!item.read ? <View style={styles.unreadDot} /> : null}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons name="bell-sleep-outline" size={34} color="#C9B8F8" />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyBody}>
              New chats, match requests, and activity updates will show up here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#371F7E',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3A2286',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Prompt-Bold',
  },
  subtitle: {
    color: '#DCCAFF',
    fontSize: 12,
    fontFamily: 'Prompt-SemiBold',
    marginTop: -2,
  },
  headerPlaceholder: {
    width: 44,
  },
  actionsRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#A98BEA',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4D2B9D',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Prompt-SemiBold',
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 36,
    gap: 10,
  },
  notificationCard: {
    borderRadius: 18,
    backgroundColor: '#4D2B9D',
    borderWidth: 1.2,
    borderColor: '#6F4ABC',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 12,
  },
  notificationCardUnread: {
    borderColor: '#F6D84E',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3A2286',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  notificationTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Prompt-Bold',
  },
  notificationTime: {
    color: '#DCCAFF',
    fontSize: 12,
    fontFamily: 'Prompt-SemiBold',
  },
  notificationBody: {
    marginTop: 3,
    color: '#EBDDFF',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Prompt',
    paddingRight: 12,
  },
  unreadDot: {
    position: 'absolute',
    right: 0,
    top: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F6D84E',
  },
  emptyWrap: {
    marginTop: 70,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Prompt-Bold',
  },
  emptyBody: {
    marginTop: 4,
    color: '#E6D8FF',
    fontSize: 14,
    fontFamily: 'Prompt-SemiBold',
    textAlign: 'center',
    lineHeight: 20,
  },
});
