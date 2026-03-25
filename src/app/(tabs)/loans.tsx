import React from 'react';
import { StyleSheet, View, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/shared/ui/base/button';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LoansScreen() {
  const router = useRouter();
  const hasLoans = false; // Mocking empty state

  if (!hasLoans) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.title}>Loans</ThemedText>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.emptyContent}>
            <View style={styles.illustrationContainer}>
              <Image 
                source={require('@/assets/images/peakpay_logo.png')} // Reusing logo as placeholder for the loan illustration
                style={styles.illustration}
                resizeMode="contain"
              />
            </View>
            <ThemedText style={styles.emptyText}>
              You haven’t taken any loans yet.{'\n'}
              Unlock up to <ThemedText style={styles.boldAmount}>₦5,500,000</ThemedText> today!
            </ThemedText>

            <View style={styles.btnWrapper}>
              <Button
                onPress={() => router.push('/loans/apply')}
                width={SCREEN_WIDTH - 48}
                height={56}
                backgroundColor="#FF7A00"
                borderRadius={16}
              >
                <ThemedText style={styles.buttonText}>Take A Loan</ThemedText>
              </Button>
            </View>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Existing loans UI would go here */}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 10,
    marginBottom: 40,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  illustrationContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  illustration: {
    width: 120,
    height: 120,
    opacity: 0.8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    fontWeight: '400',
  },
  boldAmount: {
    fontWeight: '700',
    color: '#000',
  },
  btnWrapper: {
    width: '100%',
  },
  buttonText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '700',
  },
});
