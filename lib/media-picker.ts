import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

type PickSingleImageOptions = {
  quality?: number;
  allowsEditing?: boolean;
};

type MediaPermissionResult = {
  granted: boolean;
  accessPrivileges?: 'all' | 'limited' | 'none';
};

function hasGalleryPermission(permission: MediaPermissionResult | null | undefined) {
  return Boolean(permission && (permission.granted || permission.accessPrivileges === 'limited'));
}

function isImageAsset(asset: ImagePicker.ImagePickerAsset) {
  if (!asset.type) return true;
  return asset.type === 'image';
}

function parsePickerError(error: unknown) {
  return error instanceof Error ? error.message.toLowerCase() : '';
}

export async function pickSingleImageFromLibrary(
  options: PickSingleImageOptions = {}
): Promise<string | null> {
  const launchPicker = async () =>
    ImagePicker.launchImageLibraryAsync({
      allowsEditing: options.allowsEditing ?? false,
      quality: options.quality ?? 0.9,
    });

  const getUriFromResult = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets?.length) return null;

    const selected = result.assets[0];
    if (!isImageAsset(selected)) {
      Alert.alert('Select a photo', 'Please choose an image file.');
      return null;
    }

    return selected.uri;
  };

  try {
    const firstAttempt = await launchPicker();
    return getUriFromResult(firstAttempt);
  } catch (firstError) {
    const detail = parsePickerError(firstError);
    const isPermissionIssue =
      detail.includes('permission') ||
      detail.includes('denied') ||
      detail.includes('not granted') ||
      detail.includes('access');

    if (!isPermissionIssue) {
      console.error('[media-picker] Failed to open gallery', firstError);
      Alert.alert('Gallery unavailable', 'Unable to open your gallery right now. Please try again.');
      return null;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!hasGalleryPermission(permission)) {
        Alert.alert(
          'Permission needed',
          'Allow photo access in phone settings, then try selecting an image again.'
        );
        return null;
      }

      const secondAttempt = await launchPicker();
      return getUriFromResult(secondAttempt);
    } catch (secondError) {
      console.error('[media-picker] Failed after requesting permission', secondError);
      Alert.alert('Gallery unavailable', 'Unable to open your gallery right now. Please try again.');
      return null;
    }
  }
}
