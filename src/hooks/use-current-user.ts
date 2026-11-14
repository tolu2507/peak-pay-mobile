import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import userService from '@/api/services/user.service';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfilePhotoStore } from '@/store/useProfilePhotoStore';

// The login response doesn't always include the user's name, so fetch
// /users/me/ and merge it into the saved user. Every screen then shows the
// real name instead of a placeholder.
export function useCurrentUser() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [loading, setLoading] = useState(!user?.first_name);

  const refresh = useCallback(async () => {
    try {
      const me = await userService.getMe();
      updateUser(me);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  }, [updateUser]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const firstName: string = user?.first_name || user?.firstName || '';
  const middleName: string = user?.middle_name || '';
  const lastName: string = user?.last_name || user?.lastName || '';
  const email: string = user?.email || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || user?.name || '';
  const initials = (`${firstName[0] ?? ''}${lastName[0] ?? ''}` || email[0] || 'P').toUpperCase();

  const photoKey = (user?.email || user?.id || '').toLowerCase();
  const photo = useProfilePhotoStore((s) => (photoKey ? s.photos[photoKey] : undefined));
  const setPhoto = useProfilePhotoStore((s) => s.setPhoto);
  const removePhoto = useProfilePhotoStore((s) => s.removePhoto);

  const pickFrom = useCallback(
    async (source: 'camera' | 'library') => {
      if (!photoKey) return;
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', `Allow PeakPay to access your ${source === 'camera' ? 'camera' : 'photos'} in Settings.`);
        return;
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      const asset = result.canceled ? null : result.assets[0];
      if (!asset) return;
      // Stored as a data URI so it survives the OS clearing the picker cache.
      const uri = asset.base64 ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` : asset.uri;
      setPhoto(photoKey, uri);
    },
    [photoKey, setPhoto],
  );

  const changePhoto = useCallback(() => {
    const buttons: Parameters<typeof Alert.alert>[2] = [
      { text: 'Take Photo', onPress: () => void pickFrom('camera') },
      { text: 'Choose from Library', onPress: () => void pickFrom('library') },
    ];
    if (photo) buttons.push({ text: 'Remove Photo', style: 'destructive', onPress: () => removePhoto(photoKey) });
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Profile Picture', undefined, buttons);
  }, [pickFrom, photo, photoKey, removePhoto]);

  return { user, loading, refresh, firstName, middleName, lastName, fullName, email, initials, photo, changePhoto };
}
