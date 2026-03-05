import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ImageSourcePropType, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import { useChatStore } from '@/context/chat-store';

type MessageUserButtonProps = {
  target: {
    matchPersonId: string;
    name: string;
    age: number;
    avatar: ImageSourcePropType;
    isVerified?: boolean;
    whatsappNumber?: string;
  };
  variant?: 'icon' | 'pill';
  label?: string;
  style?: StyleProp<ViewStyle>;
};

export function MessageUserButton({
  target,
  variant = 'pill',
  label = 'Message',
  style,
}: MessageUserButtonProps) {
  const router = useRouter();
  const { upsertConversationFromMatch } = useChatStore();

  const handlePress = React.useCallback(() => {
    const conversationId = upsertConversationFromMatch(target, { matched: false });
    if (!conversationId) return;
    router.push(`/chat/${conversationId}`);
  }, [router, target, upsertConversationFromMatch]);

  if (variant === 'icon') {
    return (
      <Pressable style={[styles.iconButton, style]} onPress={handlePress}>
        <MaterialCommunityIcons name="chat-outline" size={34} color="#FFFFFF" />
      </Pressable>
    );
  }

  return (
    <Pressable style={[styles.pillButton, style]} onPress={handlePress}>
      <MaterialCommunityIcons name="chat-outline" size={22} color="#1B1533" />
      <Text style={styles.pillText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#5A37AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillButton: {
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 24,
    backgroundColor: '#D5FF78',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pillText: {
    color: '#1B1533',
    fontSize: 18,
    fontFamily: 'Prompt-Bold',
  },
});
