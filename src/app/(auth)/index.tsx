import React, { useState } from 'react';
import { StyleSheet, Image, View, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurCarousel } from '@/shared/ui/molecules/blur-carousel';
import { Button } from '@/shared/ui/base/button';
import { StaggeredText } from '@/shared/ui/organisms/staggered-text';
import { DarkIcon } from '@/assets/svg/darkicon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_DATA = [
  {
    image: require('@/assets/images/onboarding_1.png'),
    title: 'Welcome to Peakpay',
    subtitle: 'Control your money and control your world.',
  },
  {
    image: require('@/assets/images/onboarding_3.png'),
    title: 'Smart Invoicing',
    subtitle: 'Generate professional invoices in seconds.',
  },
  {
    image: require('@/assets/images/onboarding_2.png'),
    title: 'Global Payments',
    subtitle: 'Send and receive money across borders with ease.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);

  const renderItem = ({ item }: { item: typeof ONBOARDING_DATA[0] }) => (
    <Image
      source={item.image}
      style={styles.carouselImage}
      resizeMode="cover"
    />
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <DarkIcon />
          </View>
        </View>

        <View style={styles.carouselContainer}>
          <BlurCarousel
            data={ONBOARDING_DATA}
            renderItem={renderItem}
            itemWidth={SCREEN_WIDTH * 0.7}
            spacing={0}
            horizontalSpacing={(SCREEN_WIDTH - SCREEN_WIDTH * 0.8) / 2.5}
            onIndexChange={(index) => setActiveIndex(index)}
          />
        </View>

        <View style={styles.content}>
          <StaggeredText
            texts={ONBOARDING_DATA.map(d => d.title)}
            activeIndex={activeIndex}
            fontSize={32}
            color="#000000"
            height={80}
          />
          <ThemedText style={styles.subtitle}>
            {ONBOARDING_DATA[activeIndex].subtitle}
          </ThemedText>

          <Button
            onPress={() => router.push('/(auth)/auth-options')}
            width={SCREEN_WIDTH - 48}
            height={56}
            backgroundColor="#FF8300"
            borderRadius={16}
          >
            <ThemedText style={styles.buttonText}>Get Started</ThemedText>
          </Button>

          <View style={styles.skipButton}>
            <ThemedText onPress={() => router.push('/(auth)/auth-options')} style={styles.skipText}>Skip</ThemedText>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'flex-end',
    marginTop: 10,
    marginBottom: 30,
  },
  logo: {
    width: 50,
    height: 50,
  },
  carouselContainer: {
    height: SCREEN_WIDTH * 1.0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    marginTop: -10,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  skipButton: {
    marginTop: 14,
    width: '100%'
  },
  skipText: {
    color: '#1E9F85',
    fontSize: 16,
    fontWeight: '600',
    textAlign: "right"
  },
});
