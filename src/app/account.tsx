import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ScreenHeader } from '@/components/screen-header';
import { UserAvatar } from '@/components/user-avatar';
import { Shadows } from '@/constants/theme';
import { useCurrentUser } from '@/hooks/use-current-user';

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.row}>
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <ThemedText style={styles.rowValue}>{value || '—'}</ThemedText>
    </View>
  );
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
  closed: 'Closed',
};

// Read-only: names come from the BVN/NIN check, so they can't be edited here.
export default function AccountInformationScreen() {
  const { user, firstName, middleName, lastName, email, initials, photo, changePhoto } = useCurrentUser();
  const joined = user?.date_joined
    ? new Date(user.date_joined).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const phoneVerified = user?.is_phone_verified === true || user?.is_phone_verified === 'true';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Account Information" />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={changePhoto} activeOpacity={0.8}>
              <UserAvatar photo={photo} initials={initials} size={96} />
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={16} color="#FFF" />
              </View>
            </TouchableOpacity>
            <ThemedText style={styles.changePhoto} onPress={changePhoto}>Change photo</ThemedText>
          </View>

          <View style={styles.card}>
            <Row label="First name" value={firstName} />
            {!!middleName && <Row label="Middle name" value={middleName} />}
            <Row label="Last name" value={lastName} />
            <Row label="Email address" value={email} />
            <Row label="Phone number" value={user?.phone_number ? `${user.phone_number}${phoneVerified ? '  ✓' : ''}` : null} />
          </View>

          <View style={styles.card}>
            <Row label="Account status" value={STATUS_LABELS[user?.account_status] || user?.account_status} />
            <Row label="Referral code" value={user?.referral_code} />
            <Row label="Member since" value={joined} />
          </View>

          <ThemedText style={styles.note}>
            Your name is taken from your BVN/NIN verification. Contact support if anything here is wrong.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 28, marginTop: 4 },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF7A00',
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhoto: { color: '#FF7A00', fontWeight: '600', marginTop: 12, fontSize: 14 },
  card: {
    backgroundColor: '#F9F9F9',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 20,
    ...Shadows.card,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 16,
  },
  rowLabel: { fontSize: 14, color: '#6E6E78' },
  rowValue: { fontSize: 15, fontWeight: '600', color: '#000', flexShrink: 1, textAlign: 'right' },
  note: { fontSize: 13, color: '#6E6E78', lineHeight: 20, textAlign: 'center', marginTop: 4 },
});
