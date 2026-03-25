import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useGlobalStore } from '@/store/useGlobalStore';
import { GlobalModal } from '@/components/GlobalModal';
import NetInfo from '@react-native-community/netinfo';
import { ToastProviderWithViewport } from '@/shared/ui/molecules/Toast';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated } = useAuthStore();
  const { setConnected, showError } = useGlobalStore();
  const segments = useSegments();
  const router = useRouter();

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
