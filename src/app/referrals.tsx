import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import UserService, { type ReferralSummary } from '@/api/services/user.service';
import { Button } from '@/shared/ui/base/button';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Invite links open the web signup (/signup?ref=CODE), same as the web app's
// links. Set EXPO_PUBLIC_WEB_URL if the web app lives elsewhere.
const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || 'https://www.mypeakpay.com').replace(/\/+$/, '');

export default function ReferralsScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setError(null);
    UserService.getReferralSummary()
      .then(setSummary)
      .catch(() => setError("We couldn't load your referrals. Please try again."))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const inviteLink = summary?.referral_code
    ? `${WEB_URL}/signup?ref=${encodeURIComponent(summary.referral_code)}`
    : '';

  const share = (message: string) => {
    Share.share({ message }).catch(() => undefined);
  };

  const total = summary?.referral_count ?? 0;
  const completed = summary?.kyc_completed_referral_count ?? 0;
  const stats = [
    { label: 'Total referrals', hint: 'Friends who signed up with your code', value: total, icon: 'people-outline', color: '#FF7A00', background: '#FFF7ED' },
    { label: 'Completed KYC', hint: 'Finished every verification step', value: completed, icon: 'shield-checkmark-outline', color: '#1E9F85', background: '#ECFDF5' },
    { label: 'Pending KYC', hint: 'Signed up but still verifying', value: Math.max(total - completed, 0), icon: 'hourglass-outline', color: '#666', background: '#F9F9F9' },
  ] as const;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.title}>
              Referrals
            </ThemedText>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ThemedText style={styles.description}>Track friends you've invited to Peakpay</ThemedText>

          {isLoading ? (
            <ActivityIndicator size="large" color="#FF7A00" style={{ marginTop: 60 }} />
          ) : error ? (
            <View style={styles.content}>
              <ThemedText style={styles.error}>{error}</ThemedText>
              <Button onPress={load} width={SCREEN_WIDTH - 48} height={56} backgroundColor="#FF7A00" borderRadius={16}>
                <ThemedText style={styles.buttonText}>Try again</ThemedText>
              </Button>
            </View>
          ) : summary ? (
            <View style={styles.content}>
              {stats.map((stat) => (
                <View key={stat.label} style={[styles.statCard, { backgroundColor: stat.background }]}>
                  <View style={styles.statHeader}>
                    <Ionicons name={stat.icon} size={18} color={stat.color} />
                    <ThemedText style={styles.statLabel}>{stat.label}</ThemedText>
                  </View>
                  <ThemedText style={styles.statValue}>{stat.value}</ThemedText>
                  <ThemedText style={styles.statHint}>{stat.hint}</ThemedText>
                </View>
              ))}

              <View style={styles.inviteCard}>
                <ThemedText style={styles.sectionTitle}>Share your invite</ThemedText>

                <ThemedText style={styles.fieldLabel}>Your referral code</ThemedText>
                <View style={styles.row}>
                  <ThemedText style={styles.code} selectable>{summary.referral_code}</ThemedText>
                  <TouchableOpacity style={styles.outlineBtn} onPress={() => share(summary.referral_code)}>
                    <Ionicons name="share-outline" size={16} color="#333" />
                    <ThemedText style={styles.outlineBtnText}>Share code</ThemedText>
                  </TouchableOpacity>
                </View>

                <ThemedText style={[styles.fieldLabel, { marginTop: 20 }]}>Invite link</ThemedText>
                <ThemedText style={styles.link} selectable>{inviteLink}</ThemedText>
                <Button
                  onPress={() => share(`Join me on Peakpay! Sign up with my invite link: ${inviteLink}`)}
                  width={SCREEN_WIDTH - 88}
                  height={52}
                  backgroundColor="#FF7A00"
                  borderRadius={16}
                >
                  <ThemedText style={styles.buttonText}>Share invite link</ThemedText>
                </Button>
              </View>
            </View>
          ) : null}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 24,
    paddingBottom: 10,
  },
  titleContainer: {
    flex: 1,
    marginRight: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    marginTop: 10,
    marginBottom: 10,
    marginLeft: -8,
  },
  title: {
    fontSize: 20,
    lineHeight: 32,
    fontWeight: '700',
    color: '#000',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  content: {
    marginTop: 20,
    gap: 12,
  },
  error: {
    fontSize: 14,
    color: '#FF3B30',
    marginBottom: 12,
  },
  statCard: {
    borderRadius: 16,
    padding: 16,
    ...Shadows.card,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statValue: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    color: '#000',
    marginTop: 8,
  },
  statHint: {
    fontSize: 12,
    color: '#666',
  },
  inviteCard: {
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    ...Shadows.card,
    backgroundColor: '#FFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  code: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#000',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  outlineBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  link: {
    fontSize: 13,
    color: '#333',
    marginTop: 4,
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
