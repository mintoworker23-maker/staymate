import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type PromptAction = {
  label: string;
  onPress: () => void;
  tone?: 'default' | 'destructive';
};

type BrandedPromptModalProps = {
  visible: boolean;
  title: string;
  description?: string;
  actions: PromptAction[];
  onClose: () => void;
};

export function BrandedPromptModal({
  visible,
  title,
  description,
  actions,
  onClose,
}: BrandedPromptModalProps) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}

          <View style={styles.actions}>
            {actions.map((action, index) => (
              <Pressable
                key={`${action.label}-${index}`}
                style={[
                  styles.actionButton,
                  action.tone === 'destructive' ? styles.destructiveButton : styles.defaultButton,
                ]}
                onPress={() => {
                  action.onPress();
                  onClose();
                }}>
                <Text
                  style={[
                    styles.actionText,
                    action.tone === 'destructive' ? styles.destructiveText : styles.defaultText,
                  ]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}

            <Pressable style={[styles.actionButton, styles.cancelButton]} onPress={onClose}>
              <Text style={[styles.actionText, styles.cancelText]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 12, 36, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  sheet: {
    width: '100%',
    borderRadius: 24,
    padding: 16,
    backgroundColor: '#4A2A95',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 19,
    fontFamily: 'Prompt-Bold',
  },
  description: {
    marginTop: 6,
    color: '#FFFFFF',
    opacity: 0.92,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Prompt-SemiBold',
  },
  actions: {
    marginTop: 14,
    gap: 10,
  },
  actionButton: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultButton: {
    backgroundColor: '#5A37AF',
  },
  destructiveButton: {
    backgroundColor: '#C5365A',
  },
  cancelButton: {
    backgroundColor: '#3B237F',
  },
  actionText: {
    fontSize: 15,
    fontFamily: 'Prompt-Bold',
  },
  defaultText: {
    color: '#FFFFFF',
  },
  destructiveText: {
    color: '#FFFFFF',
  },
  cancelText: {
    color: '#D8CBFF',
  },
});
