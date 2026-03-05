import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  ViewStyle,
  ImageSourcePropType,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

export interface ProfileCardProps {
  image: ImageSourcePropType;
  name: string;
  age?: number;
  role?: string;
  score?: number; // 0-100
  /** optional action buttons to render beneath the profile picture */
  actions?: React.ReactNode;
  style?: ViewStyle;
}

export function ProfileCard({
  image,
  name,
  age,
  role,
  score,
  actions,
  style,
}: ProfileCardProps) {
  const progress = typeof score === 'number' ? Math.min(Math.max(score, 0), 100) : undefined;

  return (
    <ThemedView
      style={[styles.container, style]}
      lightColor="#ffffff"
      darkColor="#222222"
    >
      {/* image wrapper so we can position overlays (progress bar / badge) */}
      <View style={styles.imageWrapper}>
        <Image source={image} style={styles.image} />
        {typeof progress === 'number' && (
          <View style={[styles.topProgressBar, { width: `${progress}%` }]} />
        )}
        {typeof progress === 'number' && (
          <View style={styles.badge}>
            <IconSymbol name="arrow.clockwise" size={16} color="#000" />
            <ThemedText type="defaultSemiBold" style={styles.badgeText}>
              {progress}%
            </ThemedText>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <ThemedText type="title">{name}</ThemedText>
        {age != null && <ThemedText>{age}</ThemedText>}
        {role && <ThemedText>{role}</ThemedText>}
      </View>
      {typeof progress === 'number' && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
          <ThemedText style={styles.progressLabel}>{progress}%</ThemedText>
        </View>
      )}
      {actions && <View style={styles.actions}>{actions}</View>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
    resizeMode: 'cover',
  },
  imageWrapper: {
    position: 'relative',
  },
  info: {
    alignItems: 'center',
    gap: 2,
  },
  progressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4caf50',
  },
  progressLabel: {
    position: 'absolute',
    right: 4,
    top: -18,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  topProgressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 4,
    backgroundColor: '#b3ff66',
    borderTopLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#e6ffcc',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
  },
});
