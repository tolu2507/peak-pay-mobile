import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

// Biometric sign-in keeps the user's email and password in the device's
// secure keychain/keystore and releases them only after Face ID / fingerprint
// succeeds. Nothing leaves the device until the normal login call is made.

const CREDENTIALS_KEY = 'peakpay.biometric.credentials';

export interface BiometricCredentials {
  email: string;
  password: string;
}

export interface BiometricSupport {
  available: boolean;
  label: string;
  icon: 'scan-outline' | 'finger-print-outline';
}

export async function getBiometricSupport(): Promise<BiometricSupport> {
  try {
    const [hasHardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    return {
      available: hasHardware && enrolled,
      label: face ? 'Face ID' : 'Fingerprint',
      icon: face ? 'scan-outline' : 'finger-print-outline',
    };
  } catch {
    return { available: false, label: 'Biometrics', icon: 'finger-print-outline' };
  }
}

export async function authenticate(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function isBiometricLoginEnabled(): Promise<boolean> {
  try {
    return !!(await SecureStore.getItemAsync(CREDENTIALS_KEY));
  } catch {
    return false;
  }
}

export async function getSavedBiometricEmail(): Promise<string | null> {
  const creds = await readCredentials();
  return creds?.email ?? null;
}

export async function enableBiometricLogin(credentials: BiometricCredentials) {
  await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify(credentials), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function disableBiometricLogin() {
  try {
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
  } catch {
    // already gone
  }
}

// Prompts for Face ID / fingerprint and returns the saved credentials, or null
// if the user cancels or nothing is saved.
export async function unlockCredentials(): Promise<BiometricCredentials | null> {
  const creds = await readCredentials();
  if (!creds) return null;
  const ok = await authenticate('Sign in to PeakPay');
  return ok ? creds : null;
}

async function readCredentials(): Promise<BiometricCredentials | null> {
  try {
    const raw = await SecureStore.getItemAsync(CREDENTIALS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.email && parsed?.password ? parsed : null;
  } catch {
    return null;
  }
}
