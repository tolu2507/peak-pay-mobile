import React from 'react';
import { StyleSheet, Image, View, ImageBackground, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/shared/ui/base/button';
import { StaggeredText } from '@/shared/ui/organisms/staggered-text';
import { LightIcon } from '@/assets/svg/lighticon';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AuthOptionsScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <ImageBackground
        source={require('@/assets/images/onboarding_2.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.6)']}
          style={styles.gradient}
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <View style={styles.logos}>
              <LightIcon />
            </View>
          </View>

          <View style={styles.content}>
            <StaggeredText
              texts={['Welcome to Peakpay']}
              fontSize={32}
              color="#FFF"
              height={80}
            />
            <ThemedText style={styles.subtitle}>Make your life more colourful.</ThemedText>

            <Button
              onPress={() => router.push('/(auth)/signup')}
              width={SCREEN_WIDTH - 48}
              height={56}
              backgroundColor="#FF7A00"
              borderRadius={16}
            >
              <ThemedText style={styles.buttonText}>Sign Up</ThemedText>
            </Button>

            <TouchableOpacity 
              style={styles.loginContainer}
              onPress={() => router.push('/(auth)/login')}
            >
              <ThemedText style={styles.loginText}>Log In</ThemedText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'flex-end',
    marginTop: 30,
  },
  logo: {
    width: 60,
    height: 60,
    tintColor: '#FFF',
  },
  logos: {
    width: 45,
    height: 45,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 40,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16, fontWeight: 400,
    color: '#DDD',
    marginBottom: 32,
    textAlign: 'center',
    marginTop: -10,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  loginContainer: {
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  loginText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
