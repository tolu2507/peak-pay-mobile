import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LoanHeader, OutlineButton, PrimaryButton, TextLink, loanStyles as ls } from '@/components/loans/loan-ui';
import { EligibilityReviewCard } from '@/components/loans/eligibility-review-card';
import { useLoanStore } from '@/store/useLoanStore';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Shown while the customer waits on us: their documents are being reviewed,
// or an application is open without a decision yet.
export default function LoanStatusScreen() {
  const router = useRouter();
  const eligibility = useLoanStore((state) => state.eligibility);

  // Opened directly (e.g. after the app restarted): work out the step again.
  if (!eligibility) return <Redirect href="/loans/start" />;
  // The statement went past 14 days: a new one is needed.
  if (eligibility.assessment_status === 'statement_outdated') return <Redirect href="/loans/statement" />;

  const applicationOpen = eligibility.application_status === 'open';

  return (
    <ThemedView style={ls.container}>
      <SafeAreaView style={ls.safeArea}>
        <ScrollView contentContainerStyle={ls.scrollContent} showsVerticalScrollIndicator={false}>
          <LoanHeader title={applicationOpen ? 'Application open' : 'Review in progress'} step={applicationOpen ? undefined : 2} />

          {applicationOpen ? (
            <>
              <View style={styles.icon}>
                <Ionicons name="time-outline" size={36} color="#FF7A00" />
              </View>
              <ThemedText style={styles.title}>Your loan application is open</ThemedText>
              <ThemedText style={[ls.body, styles.center]}>
                Your current application is awaiting a decision. You can request another loan once it is closed.
              </ThemedText>
            </>
          ) : (
            <EligibilityReviewCard />
          )}

          <View style={ls.footer}>
            {applicationOpen ? (
              <PrimaryButton label="Return to dashboard" onPress={() => router.replace('/(tabs)')} />
            ) : (
              <>
                <PrimaryButton label="Check review status" onPress={() => router.replace('/loans/start')} />
                <OutlineButton label="Update documents" onPress={() => router.replace('/loans/address')} />
                <TextLink label="Return to dashboard" onPress={() => router.replace('/(tabs)')} />
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF4E8',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 48,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#000', textAlign: 'center', marginTop: 20, marginBottom: 8 },
  center: { textAlign: 'center' },
});
