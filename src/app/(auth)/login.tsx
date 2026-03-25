import React, { useState } from 'react';
import { StyleSheet, View, Dimensions, TextInput, ScrollView } from 'react-native';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { email, password, setEmail, setPassword, login, isLoading } = useLoginStore();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show('Please fill in all fields', { type: 'error', position: "top", backgroundColor: "#FF3B30" });
      return;
    }

    try {
      await login();
      Toast.show('Login successful!', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
      router.replace('/(tabs)');
    } catch (error) {
      // Error is handled by store and apiClient (which shows Toast)
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

            <ThemedText style={styles.forgotPassword}>Forgot Password?</ThemedText>
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
    color: '#666',
    marginTop: 8,
  },
  form: {
    marginTop: 20,
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
  signupContainer: {
    marginTop: 24,
  },
  signupText: {
    fontSize: 14,
    color: '#666',
  },
  linkText: {
    color: '#FF7A00',
    fontWeight: '600',
  },
});
