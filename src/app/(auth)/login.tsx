import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Dimensions, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/shared/ui/base/button';
import { useAuthStore } from '@/store/useAuthStore';
import { useLoginStore } from '@/store/useLoginStore';
import { Toast } from '@/shared/ui/molecules/Toast';
import { DarkIcon } from '@/assets/svg/darkicon';
import { FloatingLabelInput } from '@/shared/ui/molecules/floating-label-input';
import {
  disableBiometricLogin,
  enableBiometricLogin,
  getBiometricSupport,
  getSavedBiometricEmail,
  unlockCredentials,
  type BiometricSupport,
} from '@/lib/biometrics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { email, password, setEmail, setPassword, login, isLoading, notice } = useLoginStore();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  // Set when this phone has biometric sign-in turned on (Profile > Security).
  const [biometric, setBiometric] = useState<(BiometricSupport & { email: string }) | null>(null);

  useEffect(() => {
    (async () => {
      const [savedEmail, support] = await Promise.all([getSavedBiometricEmail(), getBiometricSupport()]);
      if (savedEmail && support.available) setBiometric({ ...support, email: savedEmail });
    })();
  }, []);

  const finishLogin = () => {
    useLoginStore.getState().setNotice(null);
    Toast.show('Login successful!', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
    router.replace('/(tabs)');
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show('Please fill in all fields', { type: 'error', position: "top", backgroundColor: "#FF3B30" });
      return;
    }

    try {
      await login();
      // Keep the saved biometric password current (e.g. after a reset).
      if (biometric && biometric.email.toLowerCase() === email.trim().toLowerCase()) {
        await enableBiometricLogin({ email: biometric.email, password }).catch(() => undefined);
      }
      finishLogin();
    } catch (error) {
      // Error is handled by store and apiClient (which shows Toast)
    }
  };

  const handleBiometricLogin = async () => {
    const creds = await unlockCredentials();
    if (!creds) return;
    setEmail(creds.email);
    setPassword(creds.password);
    try {
      await login();
      finishLogin();
    } catch (error: any) {
      // The saved password no longer works (changed elsewhere): forget it.
      if (error?.response?.status === 400 || error?.response?.status === 401) {
        await disableBiometricLogin();
        setBiometric(null);
        setPassword('');
        Toast.show(`Your password has changed. Log in with it, then turn ${biometric?.label ?? 'biometrics'} back on in Profile.`, { type: 'error', position: "top", backgroundColor: "#FF3B30" });
      }
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.logo}>
              <DarkIcon />
            </View>
          </View>

          <ThemedText type="title" style={styles.title}>Login to your account</ThemedText>
          <ThemedText style={styles.subtitle}>Enter your details to continue</ThemedText>
          {notice && <ThemedText style={styles.notice}>{notice}</ThemedText>}

          <View style={styles.form}>
            <FloatingLabelInput
              label="Email Address"
              placeholder="e.g sample@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              icon="mail-outline"
            />

            <FloatingLabelInput
              label="Password"
              placeholder="••••••••"
              secureTextEntry={!isPasswordVisible}
              value={password}
              onChangeText={setPassword}
              icon="lock-closed-outline"
              rightIcon={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
              onRightIconPress={() => setIsPasswordVisible(!isPasswordVisible)}
            />

            <ThemedText
              style={styles.forgotPassword}
              onPress={() => router.push({ pathname: '/(auth)/forgot-password', params: { email } })}
            >
              Forgot Password?
            </ThemedText>
          </View>

          <View style={styles.footer}>
            <Button 
              onPress={handleLogin}
              isLoading={isLoading}
              width={SCREEN_WIDTH - 48}
              height={56}
              backgroundColor="#FF7A00"
              borderRadius={16}
            >
              <ThemedText style={styles.buttonText}>Log In</ThemedText>
            </Button>
            
            {biometric && (
              <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometricLogin} disabled={isLoading}>
                <Ionicons name={biometric.icon} size={22} color="#FF7A00" />
                <ThemedText style={styles.biometricText}>Sign in with {biometric.label}</ThemedText>
              </TouchableOpacity>
            )}

            <View style={styles.signupContainer}>
              <ThemedText style={styles.signupText}>
                Don’t have an account? <ThemedText style={styles.linkText} onPress={() => router.push('/(auth)/signup')}>Sign Up</ThemedText>
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'flex-start',
    marginTop: 20,
    marginBottom: 40,
  },
  logo: {
    width: 50,
    height: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#4B4B55',
    marginTop: 8,
  },
  form: {
    marginTop: 20,
  },
  notice: {
    fontSize: 14,
    color: '#B35F00',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    overflow: 'hidden',
  },
  forgotPassword: {
    color: '#FF7A00',
    textAlign: 'right',
    fontWeight: '600',
  },
  footer: {
    marginTop: 60,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    height: 56,
    width: SCREEN_WIDTH - 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FF7A00',
  },
  biometricText: {
    color: '#FF7A00',
    fontSize: 16,
    fontWeight: '700',
  },
  signupContainer: {
    marginTop: 24,
  },
  signupText: {
    fontSize: 14,
    color: '#4B4B55',
  },
  linkText: {
    color: '#FF7A00',
    fontWeight: '600',
  },
});
