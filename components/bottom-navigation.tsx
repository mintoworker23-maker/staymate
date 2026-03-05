import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

export type BottomNavigationItem = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  onPress?: () => void;
  accessibilityLabel?: string;
  badgeCount?: number;
};

type BottomNavigationProps = {
  items: BottomNavigationItem[];
  activeIndex?: number;
  onChange?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
};

const NAV_WIDTH = 308;
const NAV_HEIGHT = 83;
const NAV_RADIUS = 40;
const NAV_PADDING = 10;
const ACTIVE_SIZE = 74;

export function BottomNavigation({
  items,
  activeIndex = 0,
  onChange,
  style,
}: BottomNavigationProps) {
  const clampedIndex = Math.max(0, Math.min(activeIndex, Math.max(items.length - 1, 0)));
  const slotWidth = useMemo(() => {
    if (items.length === 0) return 0;
    return (NAV_WIDTH - NAV_PADDING * 2) / items.length;
  }, [items.length]);

  const leftForIndex = useCallback(
    (index: number) => NAV_PADDING + slotWidth * index + slotWidth / 2 - ACTIVE_SIZE / 2,
    [slotWidth]
  );

  const indicatorX = useRef(new Animated.Value(leftForIndex(clampedIndex))).current;

  useEffect(() => {
    Animated.spring(indicatorX, {
      toValue: leftForIndex(clampedIndex),
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
      mass: 0.8,
    }).start();
  }, [clampedIndex, indicatorX, leftForIndex]);

  return (
    <View style={[styles.container, style]}>
      {items.length > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.activePill, { transform: [{ translateX: indicatorX }] }]}
        />
      ) : null}
      {items.map((item, index) => {
        const isActive = index === clampedIndex;
        const badgeCount = Math.max(0, Math.floor(item.badgeCount ?? 0));
        const badgeLabel = badgeCount > 99 ? '99+' : String(badgeCount);

        return (
          <Pressable
            key={`${item.icon}-${index}`}
            onPress={() => {
              onChange?.(index);
              item.onPress?.();
            }}
            accessibilityRole="button"
            accessibilityLabel={item.accessibilityLabel}
            style={styles.item}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons
                name={item.icon}
                size={isActive ? 31 : 28}
                color={isActive ? '#FFFFFF' : '#3F1D84'}
              />
              {badgeCount > 0 ? (
                <View style={styles.badge}>
                  <Animated.Text style={styles.badgeText}>{badgeLabel}</Animated.Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: NAV_WIDTH,
    height: NAV_HEIGHT,
    borderRadius: NAV_RADIUS,
    backgroundColor: '#A787E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: NAV_PADDING,
    position: 'relative',
  },
  item: {
    flex: 1,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#DF3E57',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 10,
    fontFamily: 'Prompt-Bold',
  },
  activePill: {
    position: 'absolute',
    width: ACTIVE_SIZE,
    height: ACTIVE_SIZE,
    borderRadius: ACTIVE_SIZE / 2,
    backgroundColor: '#3A2286',
    top: (NAV_HEIGHT - ACTIVE_SIZE) / 2,
  },
});
