import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/useAuthStore';

// The API can create and update a transaction PIN but has no endpoint to read
// it back, so the record id from creation is remembered on the device, per user.
const keyFor = () => {
  const user = useAuthStore.getState().user;
  return `transaction-pin-id:${user?.id || user?.email || 'unknown'}`;
};

export async function saveTransactionPinId(id: unknown) {
  if (typeof id !== 'string' || !id) return;
  try {
    await AsyncStorage.setItem(keyFor(), id);
  } catch {
    // Not fatal: changing the PIN falls back to the user id.
  }
}

// The saved PIN id, or the user's id when it was created on another device
// (a user has exactly one PIN, so the backend can resolve it from the user).
export async function getTransactionPinId(): Promise<string | null> {
  try {
    const saved = await AsyncStorage.getItem(keyFor());
    if (saved) return saved;
  } catch {
    // fall through
  }
  return useAuthStore.getState().user?.id ?? null;
}
