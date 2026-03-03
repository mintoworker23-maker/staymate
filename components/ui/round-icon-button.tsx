import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
  GestureResponderEvent,
} from 'react-native';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';

export interface RoundIconButtonProps {
  /** name of the icon (SF Symbol) */
  name: IconSymbolName;
  size?: number;
  color?: string;
  /** background colour of the round container */
  backgroundColor?: string;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  /** optional colored ring around the button */
  ringColor?: string;
  ringWidth?: number;
}

export function RoundIconButton({
  name,
  size = 24,
  color = '#fff',
  backgroundColor = '#000',
  onPress,
  style,
  disabled = false,
  ringColor,
  ringWidth = 0,
}: RoundIconButtonProps) {
  return (
    <TouchableOpacity
      style={
        [
          styles.container,
          { backgroundColor, borderColor: ringColor, borderWidth: ringWidth },
          style,
        ]
      }
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
    >
      <IconSymbol name={name} size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
