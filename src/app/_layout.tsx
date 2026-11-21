import { GlobalModal } from '@/components/GlobalModal';
import { ToastProviderWithViewport } from '@/shared/ui/molecules/Toast';
import { useAuthStore } from '@/store/useAuthStore';
import { useGlobalStore } from '@/store/useGlobalStore';
import NetInfo from '@react-native-community/netinfo';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { initialize, SmileConfig } from '@smile_identity/react-native-expo';
import { INTER_FONTS } from '@/constants/fonts';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// Keep the splash screen up until Inter has loaded, so text never flashes in
// the system font.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Create configuration object with your Smile ID portal credentials
const config = new SmileConfig(
  '8652',              // Partner ID from Smile ID portal
  'phIgLF6HA3KpyEke2diWoizliisdh+QMI+ongCN+PQdknOntX741aWsw9Tl+Dn1UqlID+eRhRw0oGKDAnPxzFWs8SFynlWesuS7VOuL3XlxPRpH6HAyhmNSvSNMCvHKepNOIaMygpf05egwV1keK3lPXjwrVlvB9uSazjHdB+JA=',              // Authentication token
  'https://api.smileidentity.com/v1/',  // Production lambda URL
  'https://testapi.smileidentity.com/v1/'   // Test lambda URL
);

// Start the SDK once per app launch. Calling this during render restarted it
// on every navigation, which could cut off a selfie capture in progress.
// false = live (production) environment, same as the web.
initialize(false, true, config).catch((error) => console.error('SmileID initialize failed:', error));

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated } = useAuthStore();
  const { setConnected, showError } = useGlobalStore();
  const segments = useSegments();
  const router = useRouter();
  const [fontsLoaded, fontError] = useFonts(INTER_FONTS);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setConnected(!!state.isConnected);
      if (!state.isConnected) {
        showError('No internet connection. Please check your network.');
      }
    });

    return () => unsubscribe();
  }, []);

  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    // The navigator isn't mounted until the fonts are ready.
    if (!fontsReady) return;
    const inAuthGroup = segments[0] === '(auth)';
    const isPublicRoute = inAuthGroup || (segments[0] as string) === 'legal';

    if (!isAuthenticated && !isPublicRoute) {
      // Redirect to login if not authenticated and not in auth/public route
      router.replace('/(auth)');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to tabs if authenticated and in auth group
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, fontsReady]);

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsReady]);

  // If the font fails to load, carry on with the system font.
  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ToastProviderWithViewport>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="legal" options={{ presentation: 'modal' }} />
          </Stack>
          <GlobalModal />
        </ThemeProvider>
      </ToastProviderWithViewport>
    </GestureHandlerRootView>
  );
}
