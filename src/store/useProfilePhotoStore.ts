import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// The API has no profile-picture field yet, so the photo a user picks is kept
// on this device only, keyed by their email so accounts don't share photos.
interface ProfilePhotoState {
  photos: Record<string, string>;
  setPhoto: (userKey: string, uri: string) => void;
  removePhoto: (userKey: string) => void;
}

export const useProfilePhotoStore = create<ProfilePhotoState>()(
  persist(
    (set) => ({
      photos: {},
      setPhoto: (userKey, uri) => set((state) => ({ photos: { ...state.photos, [userKey]: uri } })),
      removePhoto: (userKey) =>
        set((state) => {
          const { [userKey]: _removed, ...rest } = state.photos;
          return { photos: rest };
        }),
    }),
    {
      name: 'profile-photo-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
