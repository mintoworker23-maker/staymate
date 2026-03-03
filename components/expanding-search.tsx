import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  Animated,
  Easing,
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

type ExpandingSearchProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  style?: StyleProp<ViewStyle>;
  collapsedSize?: number;
  expandedWidth?: number;
  backgroundColor?: string;
  iconColor?: string;
  clearOnClose?: boolean;
};

export function ExpandingSearch({
  value,
  onChangeText,
  placeholder = 'Search...',
  placeholderTextColor = '#C6B9EC',
  style,
  collapsedSize = 62,
  expandedWidth = 240,
  backgroundColor = '#5A37AF',
  iconColor = '#FFFFFF',
  clearOnClose = true,
}: ExpandingSearchProps) {
  const [open, setOpen] = React.useState(false);
  const animatedWidth = React.useRef(new Animated.Value(collapsedSize)).current;
  const inputRef = React.useRef<TextInput>(null);
  const focusTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: open ? expandedWidth : collapsedSize,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      if (!open && clearOnClose) {
        onChangeText('');
      }
    });

    if (open) {
      focusTimerRef.current = setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
    } else {
      inputRef.current?.blur();
    }

    return () => {
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
    };
  }, [animatedWidth, clearOnClose, collapsedSize, expandedWidth, onChangeText, open]);

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          width: animatedWidth,
          height: collapsedSize,
          borderRadius: collapsedSize / 2,
          backgroundColor,
        },
        style,
      ]}>
      {open ? (
        <View style={styles.expandedInner}>
          <MaterialCommunityIcons name="magnify" size={22} color={iconColor} />
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: iconColor }]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={placeholderTextColor}
            selectionColor={iconColor}
          />
          <Pressable onPress={() => setOpen(false)} style={styles.iconButton}>
            <MaterialCommunityIcons name="close" size={20} color={iconColor} />
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.collapsedButton} onPress={() => setOpen(true)}>
          <MaterialCommunityIcons name="magnify" size={30} color={iconColor} />
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  collapsedButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedInner: {
    flex: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Prompt-SemiBold',
    paddingVertical: 0,
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
