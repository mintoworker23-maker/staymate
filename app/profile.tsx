import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Image,
  ImageSourcePropType,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ContactRow = {
  id: string;
  label: string;
  value: string;
};

const initialContactRows: ContactRow[] = [
  { id: 'phone-1', label: 'Phone number', value: '+254769107256' },
  { id: 'email', label: 'Email address', value: 'basicbciso@g...' },
  { id: 'phone-2', label: 'Phone number', value: '+254769107256' },
  { id: 'phone-3', label: 'Phone number', value: '+254769107256' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const [contactRows, setContactRows] = React.useState<ContactRow[]>(initialContactRows);
  const [profileAvatar, setProfileAvatar] = React.useState<ImageSourcePropType>(
    require('@/assets/images/image.png')
  );
  const [imageSlots, setImageSlots] = React.useState<(ImageSourcePropType | null)[]>([
    require('@/assets/images/image.png'),
    require('@/assets/images/home-profile.png'),
    null,
    null,
  ]);
  const [editorVisible, setEditorVisible] = React.useState(false);
  const [editingRowId, setEditingRowId] = React.useState<string | null>(null);
  const [editingValue, setEditingValue] = React.useState('');

  const addImageAt = React.useCallback(async (slotIndex: number) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow media access to add profile photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.length) return;

    const selected = result.assets[0];
    setImageSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = { uri: selected.uri };
      return next;
    });
  }, []);

  const removeImageAt = (slotIndex: number) => {
    setImageSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
  };

  const editingRow = React.useMemo(
    () => contactRows.find((row) => row.id === editingRowId) ?? null,
    [contactRows, editingRowId]
  );

  const openEditor = (row: ContactRow) => {
    setEditingRowId(row.id);
    setEditingValue(row.value);
    setEditorVisible(true);
  };

  const closeEditor = () => {
    setEditorVisible(false);
    setEditingRowId(null);
    setEditingValue('');
  };

  const applyEdit = () => {
    if (!editingRowId) return;
    const nextValue = editingValue.trim();
    if (!nextValue) return;

    setContactRows((prev) =>
      prev.map((row) => (row.id === editingRowId ? { ...row, value: nextValue } : row))
    );
    closeEditor();
  };

  const pickProfileImage = React.useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow media access to update your profile image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.length) return;

    const selected = result.assets[0];
    setProfileAvatar({ uri: selected.uri });
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={34} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.centerSection}>
          <View style={styles.avatarWrap}>
            <Image source={profileAvatar} style={styles.mainAvatar} />
            <Pressable style={styles.avatarEditButton} onPress={pickProfileImage}>
              <MaterialCommunityIcons name="pencil-outline" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          <Text style={styles.userName}>Teddy, 21</Text>

          <Pressable style={styles.editProfileButton}>
            <Text style={styles.editProfileText}>Edit profile</Text>
          </Pressable>
        </View>

        <View style={styles.galleryCard}>
          {imageSlots.map((slot, index) => {
            const hasImage = Boolean(slot);
            return (
              <View key={`slot-${index}`} style={styles.slotWrap}>
                {hasImage ? (
                  <Image source={slot as ImageSourcePropType} style={styles.slotImage} />
                ) : (
                  <Pressable
                    style={[styles.slotImage, styles.emptySlot]}
                    onPress={() => {
                      void addImageAt(index);
                    }}>
                    <MaterialCommunityIcons name="plus-circle-outline" size={34} color="#FFFFFF" />
                  </Pressable>
                )}

                {hasImage ? (
                  <Pressable style={styles.removeImageButton} onPress={() => removeImageAt(index)}>
                    <MaterialCommunityIcons name="close-circle-outline" size={26} color="#FFFFFF" />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={styles.detailsList}>
          {contactRows.map((row) => (
            <Pressable key={row.id} style={styles.detailRow} onPress={() => openEditor(row)}>
              <Text style={styles.detailLabel}>{row.label}</Text>
              <View style={styles.detailValueWrap}>
                <Text style={styles.detailValue}>{row.value}</Text>
                <MaterialCommunityIcons name="chevron-right" size={30} color="#FFFFFF" />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal transparent visible={editorVisible} animationType="fade" onRequestClose={closeEditor}>
        <View style={styles.editorOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.editorSheetWrap}>
            <View style={styles.editorSheet}>
              <View style={styles.editorHeader}>
                <Text style={styles.editorTitle}>{editingRow?.label ?? 'Edit field'}</Text>
                <Pressable style={styles.editorCloseButton} onPress={closeEditor}>
                  <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
                </Pressable>
              </View>

              <View style={styles.editorInputWrap}>
                <TextInput
                  value={editingValue}
                  onChangeText={setEditingValue}
                  placeholder="Enter value"
                  placeholderTextColor="#CBBDF0"
                  style={styles.editorInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Pressable style={styles.applyButton} onPress={applyEdit}>
                <Text style={styles.applyButtonText}>Apply changes</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#371F7E',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  topRow: {
    height: 56,
    justifyContent: 'center',
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5A37AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSection: {
    alignItems: 'center',
    marginTop: 8,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  mainAvatar: {
    width: 140,
    height: 212,
    borderRadius: 24,
    resizeMode: 'cover',
  },
  avatarEditButton: {
    position: 'absolute',
    right: -20,
    bottom: 10,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FF4D7E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 36,
    fontFamily: 'Prompt-Bold',
  },
  editProfileButton: {
    marginTop: 10,
    width: 220,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#A787E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editProfileText: {
    color: '#1A1433',
    fontSize: 18,
    fontFamily: 'Prompt-SemiBold',
  },
  galleryCard: {
    marginTop: 20,
    backgroundColor: '#4D2B9D',
    borderRadius: 22,
    padding: 10,
    flexDirection: 'row',
    gap: 8,
  },
  slotWrap: {
    flex: 1,
    position: 'relative',
  },
  slotImage: {
    width: '100%',
    height: 138,
    borderRadius: 18,
    resizeMode: 'cover',
  },
  emptySlot: {
    backgroundColor: '#3D2388',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageButton: {
    position: 'absolute',
    right: -8,
    bottom: -10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF4D7E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsList: {
    marginTop: 14,
    gap: 10,
  },
  detailRow: {
    minHeight: 92,
    borderRadius: 24,
    backgroundColor: '#5130A5',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Prompt-SemiBold',
  },
  detailValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    maxWidth: '62%',
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Prompt-SemiBold',
  },
  editorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 8, 39, 0.52)',
    justifyContent: 'flex-end',
  },
  editorSheetWrap: {
    width: '100%',
  },
  editorSheet: {
    backgroundColor: '#371F7E',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24,
    minHeight: 248,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editorTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 28,
    fontFamily: 'Prompt-SemiBold',
  },
  editorCloseButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#5A37AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorInputWrap: {
    marginTop: 20,
    minHeight: 62,
    borderRadius: 20,
    backgroundColor: '#5130A5',
    borderWidth: 2,
    borderColor: '#623CB9',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  editorInput: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Prompt-SemiBold',
  },
  applyButton: {
    marginTop: 20,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#A787E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: '#1A1433',
    fontSize: 20,
    lineHeight: 24,
    fontFamily: 'Prompt-SemiBold',
  },
});
