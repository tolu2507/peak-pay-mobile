import { GlobalModal } from '@/components/GlobalModal';
import { ToastProviderWithViewport } from '@/shared/ui/molecules/Toast';
import { useAuthStore } from '@/store/useAuthStore';
import { useGlobalStore } from '@/store/useGlobalStore';
import NetInfo from '@react-native-community/netinfo';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { initialize, SmileConfig } from '@smile_identity/react-native-expo';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// Create configuration object with your Smile ID portal credentials
const config = new SmileConfig(
  '7980',              // Partner ID from Smile ID portal
  'SHfz36RcDFgkCHSI3i4YB+R+8BC/nVdoYJaNBCqk1RBXRGBj++oEv21GRtUd+/JfoflvBYSkt3iMImS0aUC0FRxLvJ0pJfSCGujdn3+UHlKIuerGJ6FF2IyToZpuPxR8AERUWeYosh3KN704/6n/tikoU6l0in45724abPp1jyM=',              // Authentication token
  'https://prod-lambda-url.com',  // Production lambda URL
  'https://test-lambda-url.com'   // Test lambda URL
);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated } = useAuthStore();
  const { setConnected, showError } = useGlobalStore();
  const segments = useSegments();
  const router = useRouter();
  // Initialize with configuration object
  initialize(true, true, config);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setConnected(!!state.isConnected);
      if (!state.isConnected) {
        showError('No internet connection. Please check your network.');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated and not in auth group
      router.replace('/(auth)');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to tabs if authenticated and in auth group
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ToastProviderWithViewport>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          <GlobalModal />
        </ThemeProvider>
      </ToastProviderWithViewport>
    </GestureHandlerRootView>
  );
}
