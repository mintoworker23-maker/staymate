import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImageManipulator from 'expo-image-manipulator';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type MediaReviewModalProps = {
  visible: boolean;
  uri: string | null;
  title?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (uri: string) => void;
};

function normalizeRotation(value: number) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function MediaReviewModal({
  visible,
  uri,
  title = 'Review your photo',
  confirmLabel = 'Upload',
  onClose,
  onConfirm,
}: MediaReviewModalProps) {
  const [rotation, setRotation] = React.useState(0);
  const [flipHorizontal, setFlipHorizontal] = React.useState(false);
  const [flipVertical, setFlipVertical] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!visible) {
      setRotation(0);
      setFlipHorizontal(false);
      setFlipVertical(false);
      setSaving(false);
    }
  }, [visible]);

  const hasTransforms = rotation !== 0 || flipHorizontal || flipVertical;

  const handleConfirm = React.useCallback(() => {
    if (!uri || saving) return;

    if (!hasTransforms) {
      onConfirm(uri);
      return;
    }

    const actions: ImageManipulator.Action[] = [];
    if (rotation !== 0) {
      actions.push({ rotate: rotation });
    }
    if (flipHorizontal) {
      actions.push({ flip: ImageManipulator.FlipType.Horizontal });
    }
    if (flipVertical) {
      actions.push({ flip: ImageManipulator.FlipType.Vertical });
    }

    setSaving(true);
    void ImageManipulator.manipulateAsync(uri, actions, {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
    })
      .then((result) => {
        onConfirm(result.uri);
      })
      .catch(() => {
        // If transform fails, still allow user to continue with original image.
        onConfirm(uri);
      })
      .finally(() => {
        setSaving(false);
      });
  }, [flipHorizontal, flipVertical, hasTransforms, onConfirm, rotation, saving, uri]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Pressable style={styles.headerButton} onPress={onClose} disabled={saving}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>
          <View style={styles.titleWrap}>
            <Text style={styles.brandText}>StayMate</Text>
            <Text style={styles.titleText}>{title}</Text>
          </View>
          <Pressable
            style={[styles.confirmButton, saving ? styles.disabledButton : null]}
            onPress={handleConfirm}
            disabled={saving || !uri}>
            {saving ? (
              <ActivityIndicator color="#1B1533" size="small" />
            ) : (
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.previewWrap}>
          {uri ? (
            <Image
              source={{ uri }}
              style={[
                styles.previewImage,
                {
                  transform: [
                    { rotate: `${rotation}deg` },
                    { scaleX: flipHorizontal ? -1 : 1 },
                    { scaleY: flipVertical ? -1 : 1 },
                  ],
                },
              ]}
            />
          ) : null}
        </View>

        <View style={styles.toolbar}>
          <Pressable
            style={styles.toolButton}
            onPress={() => setRotation((prev) => normalizeRotation(prev - 90))}
            disabled={saving}>
            <MaterialCommunityIcons name="rotate-left" size={22} color="#FFFFFF" />
            <Text style={styles.toolLabel}>Left</Text>
          </Pressable>
          <Pressable
            style={styles.toolButton}
            onPress={() => setRotation((prev) => normalizeRotation(prev + 90))}
            disabled={saving}>
            <MaterialCommunityIcons name="rotate-right" size={22} color="#FFFFFF" />
            <Text style={styles.toolLabel}>Right</Text>
          </Pressable>
          <Pressable
            style={styles.toolButton}
            onPress={() => setFlipHorizontal((prev) => !prev)}
            disabled={saving}>
            <MaterialCommunityIcons name="flip-horizontal" size={22} color="#FFFFFF" />
            <Text style={styles.toolLabel}>Flip H</Text>
          </Pressable>
          <Pressable
            style={styles.toolButton}
            onPress={() => setFlipVertical((prev) => !prev)}
            disabled={saving}>
            <MaterialCommunityIcons name="flip-vertical" size={22} color="#FFFFFF" />
            <Text style={styles.toolLabel}>Flip V</Text>
          </Pressable>
          <Pressable
            style={styles.toolButton}
            onPress={() => {
              setRotation(0);
              setFlipHorizontal(false);
              setFlipVertical(false);
            }}
            disabled={saving}>
            <MaterialCommunityIcons name="backup-restore" size={22} color="#FFFFFF" />
            <Text style={styles.toolLabel}>Reset</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#2B186A',
  },
  headerRow: {
    minHeight: 74,
    paddingHorizontal: 14,
    paddingTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4E2DA0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
  },
  brandText: {
    color: '#D5FF78',
    fontSize: 12,
    lineHeight: 14,
    fontFamily: 'Prompt-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 22,
    fontFamily: 'Prompt-SemiBold',
  },
  confirmButton: {
    minWidth: 92,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 14,
    backgroundColor: '#D5FF78',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.72,
  },
  confirmText: {
    color: '#1B1533',
    fontSize: 15,
    fontFamily: 'Prompt-Bold',
  },
  previewWrap: {
    flex: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    maxHeight: '92%',
    borderRadius: 24,
    resizeMode: 'contain',
    backgroundColor: '#3C2088',
  },
  toolbar: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  toolButton: {
    flex: 1,
    minHeight: 62,
    borderRadius: 16,
    backgroundColor: '#4E2DA0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  toolLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Prompt-SemiBold',
  },
});
