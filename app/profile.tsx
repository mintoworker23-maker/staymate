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

import { BrandedPromptModal } from '@/components/branded-prompt-modal';
import { useAuthStore } from '@/context/auth-store';
import { subscribeToUserProfile, updateUserProfile } from '@/lib/user-profile';
import type { UserProfileInput } from '@/types/user-profile';

type ContactRowId = 'full-name' | 'age' | 'phone' | 'whatsapp' | 'email';

type ContactRow = {
  id: ContactRowId;
  label: string;
  value: string;
  editable: boolean;
};

const MIN_AGE = 16;
const MAX_AGE = 99;

const CONTACT_ROW_LABELS: Record<ContactRowId, string> = {
  'full-name': 'Full name',
  age: 'Age',
  phone: 'Phone number',
  whatsapp: 'WhatsApp number',
  email: 'Email address',
};

function isValidKenyaMobileNumber(value: string) {
  return (
    /^0(7\d{8}|1\d{8})$/.test(value) ||
    /^(7\d{8}|1\d{8})$/.test(value) ||
    /^254(7\d{8}|1\d{8})$/.test(value) ||
    /^\+254(7\d{8}|1\d{8})$/.test(value)
  );
}

function sanitizePhoneInput(value: string) {
  const trimmed = value.replace(/\s+/g, '');
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');
  return `${hasPlus ? '+' : ''}${digitsOnly}`;
}

function buildContactRows(args: {
  fullName: string;
  age: number;
  phoneNumber: string;
  whatsAppNumber: string;
  email: string;
}): ContactRow[] {
  return [
    {
      id: 'full-name',
      label: CONTACT_ROW_LABELS['full-name'],
      value: args.fullName || 'Not set',
      editable: true,
    },
    {
      id: 'age',
      label: CONTACT_ROW_LABELS.age,
      value: args.age > 0 ? String(args.age) : 'Not set',
      editable: true,
    },
    {
      id: 'phone',
      label: CONTACT_ROW_LABELS.phone,
      value: args.phoneNumber || 'Not set',
      editable: true,
    },
    {
      id: 'whatsapp',
      label: CONTACT_ROW_LABELS.whatsapp,
      value: args.whatsAppNumber || 'Not set',
      editable: true,
    },
    {
      id: 'email',
      label: CONTACT_ROW_LABELS.email,
      value: args.email || 'Not set',
      editable: false,
    },
  ];
}

function toProfileUpdate(
  rowId: ContactRowId,
  rawValue: string
): { updates: Partial<UserProfileInput> } | { error: string } {
  switch (rowId) {
    case 'full-name': {
      if (rawValue.length < 2) {
        return { error: 'Full name must have at least 2 characters.' };
      }
      return { updates: { fullName: rawValue } };
    }
    case 'age': {
      const numericAge = Number(rawValue);
      if (!Number.isInteger(numericAge) || numericAge < MIN_AGE || numericAge > MAX_AGE) {
        return { error: `Age must be between ${MIN_AGE} and ${MAX_AGE}.` };
      }
      return { updates: { age: numericAge } };
    }
    case 'phone': {
      if (!isValidKenyaMobileNumber(rawValue)) {
        return { error: 'Use a valid Kenya mobile number.' };
      }
      return { updates: { phoneNumber: rawValue } };
    }
    case 'whatsapp': {
      if (!isValidKenyaMobileNumber(rawValue)) {
        return { error: 'Use a valid Kenya WhatsApp number.' };
      }
      return { updates: { whatsAppNumber: rawValue } };
    }
    case 'email': {
      return { error: 'Email is managed by your sign-in account.' };
    }
    default: {
      return { error: 'This field cannot be updated.' };
    }
  }
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, loading, signOutCurrentUser } = useAuthStore();
  const [contactRows, setContactRows] = React.useState<ContactRow[]>(
    buildContactRows({
      fullName: '',
      age: 0,
      phoneNumber: '',
      whatsAppNumber: '',
      email: user?.email ?? '',
    })
  );
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
  const [logoutPromptVisible, setLogoutPromptVisible] = React.useState(false);
  const [editingRowId, setEditingRowId] = React.useState<ContactRowId | null>(null);
  const [editingValue, setEditingValue] = React.useState('');
  const [profileLoading, setProfileLoading] = React.useState(true);

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/start');
    }
  }, [loading, router, user]);

  React.useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      setContactRows(
        buildContactRows({
          fullName: '',
          age: 0,
          phoneNumber: '',
          whatsAppNumber: '',
          email: '',
        })
      );
      return;
    }

    setProfileLoading(true);
    const unsubscribe = subscribeToUserProfile(user.uid, (profile) => {
      setContactRows(
        buildContactRows({
          fullName: profile?.fullName ?? '',
          age: profile?.age ?? 0,
          phoneNumber: profile?.phoneNumber ?? '',
          whatsAppNumber: profile?.whatsAppNumber ?? '',
          email: profile?.email ?? user.email ?? '',
        })
      );
      setProfileLoading(false);
    });

    return unsubscribe;
  }, [user]);

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
  const profileName = React.useMemo(
    () => contactRows.find((row) => row.id === 'full-name')?.value ?? 'Your name',
    [contactRows]
  );
  const profileAge = React.useMemo(
    () => contactRows.find((row) => row.id === 'age')?.value ?? '',
    [contactRows]
  );
  const editorKeyboardType = React.useMemo(() => {
    if (editingRowId === 'age') return 'number-pad' as const;
    if (editingRowId === 'phone' || editingRowId === 'whatsapp') return 'phone-pad' as const;
    if (editingRowId === 'email') return 'email-address' as const;
    return 'default' as const;
  }, [editingRowId]);

  const openEditor = (row: ContactRow) => {
    if (!row.editable) {
      Alert.alert('Locked field', 'Email is managed by your sign-in account.');
      return;
    }

    setEditingRowId(row.id);
    setEditingValue(row.value === 'Not set' ? '' : row.value);
    setEditorVisible(true);
  };

  const closeEditor = () => {
    setEditorVisible(false);
    setEditingRowId(null);
    setEditingValue('');
  };

  const applyEdit = () => {
    if (!editingRowId || !user) return;

    const nextValue = editingValue.trim();
    if (!nextValue) {
      Alert.alert('Missing value', 'Enter a value before applying changes.');
      return;
    }

    const result = toProfileUpdate(editingRowId, nextValue);
    if ('error' in result) {
      Alert.alert('Invalid value', result.error);
      return;
    }

    const normalizedDisplayValue =
      editingRowId === 'phone' || editingRowId === 'whatsapp'
        ? sanitizePhoneInput(nextValue)
        : nextValue;

    const previousRows = contactRows;
    setContactRows((prev) =>
      prev.map((row) =>
        row.id === editingRowId ? { ...row, value: normalizedDisplayValue } : row
      )
    );

    closeEditor();

    void (async () => {
      try {
        await updateUserProfile(user.uid, result.updates);
      } catch {
        setContactRows(previousRows);
        Alert.alert('Update failed', 'Unable to save changes right now. Please try again.');
      }
    })();
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

  const handleLogout = React.useCallback(() => {
    setLogoutPromptVisible(true);
  }, []);

  const confirmLogout = React.useCallback(() => {
    void (async () => {
      try {
        await signOutCurrentUser();
      } finally {
        setLogoutPromptVisible(false);
        router.replace('/start');
      }
    })();
  }, [router, signOutCurrentUser]);

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

          <Text style={styles.userName}>
            {profileAge && profileAge !== 'Not set' ? `${profileName}, ${profileAge}` : profileName}
          </Text>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Log out</Text>
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

        {profileLoading ? <Text style={styles.loadingText}>Loading profile...</Text> : null}

        <View style={styles.detailsList}>
          {contactRows.map((row) => (
            <Pressable key={row.id} style={styles.detailRow} onPress={() => openEditor(row)}>
              <Text style={styles.detailLabel}>{row.label}</Text>
              <View style={styles.detailValueWrap}>
                <Text style={styles.detailValue}>{row.value}</Text>
                {row.editable ? (
                  <MaterialCommunityIcons name="chevron-right" size={30} color="#FFFFFF" />
                ) : (
                  <MaterialCommunityIcons name="lock-outline" size={20} color="#FFFFFF" />
                )}
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <BrandedPromptModal
        visible={logoutPromptVisible}
        title="Log out of StayMate?"
        description="You will be returned to the start screen."
        actions={[
          {
            label: 'Log out',
            tone: 'destructive',
            onPress: confirmLogout,
          },
        ]}
        onClose={() => setLogoutPromptVisible(false)}
      />

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
                  onChangeText={(value) => {
                    if (editingRowId === 'phone' || editingRowId === 'whatsapp') {
                      setEditingValue(sanitizePhoneInput(value).slice(0, 16));
                      return;
                    }

                    setEditingValue(value);
                  }}
                  placeholder="Enter value"
                  placeholderTextColor="#CBBDF0"
                  keyboardType={editorKeyboardType}
                  style={styles.editorInput}
                  autoCapitalize={editingRowId === 'full-name' ? 'words' : 'none'}
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
  logoutButton: {
    marginTop: 10,
    width: 220,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#D84C74',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
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
  loadingText: {
    marginTop: 14,
    color: '#E5D7FF',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Prompt-SemiBold',
    textAlign: 'center',
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
    gap: 6,
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
