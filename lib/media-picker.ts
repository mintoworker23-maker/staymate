import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking, Platform } from 'react-native';

type PickSingleImageOptions = {
  quality?: number;
  allowsEditing?: boolean;
};

type MediaPermissionResult = {
  granted: boolean;
  canAskAgain?: boolean;
  status?: ImagePicker.PermissionStatus;
  accessPrivileges?: 'all' | 'limited' | 'none';
};

function hasGalleryPermission(permission: MediaPermissionResult | null | undefined) {
  if (!permission) return false;
  return permission.granted || (Platform.OS === 'ios' && permission.accessPrivileges === 'limited');
}

function parsePickerError(error: unknown) {
  if (error instanceof Error) return error.message.toLowerCase();
  if (typeof error === 'string') return error.toLowerCase();
  return '';
}

function isPermissionError(detail: string) {
  const keywords = ['permission', 'denied', 'not granted', 'access', 'missing', 'unauthorized'];
  return keywords.some((kw) => detail.includes(kw));
}

async function openAppSettings() {
  try {
    await Linking.openSettings();
  } catch {
    Alert.alert('Settings unavailable', 'Please open your phone settings manually to allow photo access.');
  }
}

export async function pickSingleImageFromLibrary(
  options: PickSingleImageOptions = {}
): Promise<string | null> {
  const launchPicker = async () =>
    ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: options.allowsEditing ?? false,
      quality: options.quality ?? 0.85,
      selectionLimit: 1,
    });

  const getUriFromResult = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets?.length) return null;
    const selected = result.assets[0];
    if (selected.type !== 'image' && !selected.uri.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
      Alert.alert('Select a photo', 'Please choose an image file.');
      return null;
    }
    return selected.uri;
  };

  try {
    const existingPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!hasGalleryPermission(existingPermission)) {
      if (existingPermission.canAskAgain) {
        const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!hasGalleryPermission(requested)) {
          Alert.alert(
            'Permission needed',
            'Allow photo access to select profile images. You can enable this in phone settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: openAppSettings },
            ]
          );
          return null;
        }
      } else {
        Alert.alert(
          'Photo access needed',
          'We need access to your photos to let you choose a profile image. Please enable it in phone settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: openAppSettings },
          ]
        );
        return null;
      }
    }

    const result = await launchPicker();
    return getUriFromResult(result);
  } catch (error) {
    const detail = parsePickerError(error);
    console.error('[media-picker] Failed to open gallery:', error);

    if (isPermissionError(detail)) {
      Alert.alert(
        'Permission error',
        'Unable to access gallery due to a permission issue. Please check your phone settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openAppSettings },
        ]
      );
    } else {
      Alert.alert(
        'Gallery unavailable',
        'We were unable to open your gallery. Please try again or restart the app.'
      );
    }
    return null;
  }
}
