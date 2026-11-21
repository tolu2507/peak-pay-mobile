import { ThemedText } from '@/components/themed-text';
import { SkeletonCard, SkeletonGroup, SkeletonHero } from '@/shared/ui/base/skeleton';
import { ThemedView } from '@/components/themed-view';
import { nextKycRoute } from '@/constants/kyc-routes';
import { loanRouteFor } from '@/constants/loan';
import { Button } from '@/shared/ui/base/button';
import { Toast } from '@/shared/ui/molecules/Toast';
import { useAuthStore } from '@/store/useAuthStore';
import { isLoanKycReady, useKYCStore } from '@/store/useKYCStore';
import { useLoanStore } from '@/store/useLoanStore';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { openLoansTab } from '@/lib/loans-tab';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Every "Request loan" button opens this screen. It asks the backend where the
// customer's application stands and opens the right step, like the web.
export default function LoanStartScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [failed, setFailed] = useState(false);

  const route = useCallback(async () => {
    setFailed(false);
    try {
      const kyc = useKYCStore.getState();
      // Loans need every KYC step done; phone verification is exempt.
      if (!isLoanKycReady(kyc)) {
        // Check the server before sending the user back to KYC.
        await kyc.syncKycProgress();
        if (!isLoanKycReady(useKYCStore.getState())) {
          Toast.show('Complete your KYC to take a loan.', { type: 'error', position: 'top', backgroundColor: '#FF3B30' });
          router.replace((nextKycRoute() ?? '/kyc/phone') as any);
          return;
        }
      }
      const loans = useLoanStore.getState();
      loans.prepareDraft(useAuthStore.getState().user?.id ?? null);
      const eligibility = await loans.getEligibility();
      // One loan at a time: while one is being repaid, the customer manages it instead.
      if (eligibility.has_running_loan) {
        openLoansTab(navigation);
        return;
      }
      const address = eligibility.can_apply || eligibility.application_status === 'open'
        ? null
        : await loans.loadCurrentAddress().catch(() => null);
      router.replace(loanRouteFor(eligibility, address));
    } catch {
      setFailed(true);
    }
  }, [router, navigation]);

  useEffect(() => {
    void route();
  }, [route]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.center}>
          {failed ? (
            <>
              <ThemedText style={styles.title}>We couldn&apos;t check your eligibility</ThemedText>
              <ThemedText style={styles.body}>Please check your connection and try again.</ThemedText>
              <Button onPress={() => void route()} width={SCREEN_WIDTH - 48} height={56} backgroundColor="#FF7A00" borderRadius={16}>
                <ThemedText style={styles.buttonText}>Try again</ThemedText>
              </Button>
            </>
          ) : (
            <SkeletonGroup style={{ alignSelf: 'stretch', gap: 16 }}>
              <SkeletonHero />
              <SkeletonCard lines={2} />
              <ThemedText style={styles.body}>Checking your loan eligibility…</ThemedText>
            </SkeletonGroup>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  safeArea: { flex: 1, paddingHorizontal: 24 },
  backBtn: { marginTop: 20, marginLeft: -8, alignSelf: 'flex-start' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 80 },
  title: { fontSize: 18, fontWeight: '700', color: '#000', textAlign: 'center' },
  body: { fontSize: 14, color: '#4B4B55', textAlign: 'center' },
  buttonText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
