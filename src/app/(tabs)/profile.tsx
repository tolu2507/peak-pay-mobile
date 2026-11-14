import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';
import { Toast } from '@/shared/ui/molecules/Toast';
import { Shadows } from '@/constants/theme';
import { useCurrentUser } from '@/hooks/use-current-user';
import { UserAvatar } from '@/components/user-avatar';
import { Skeleton } from '@/shared/ui/base/skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  showChevron?: boolean;
}

const SettingItem = ({ icon, label, onPress, color = '#000', showChevron = true }: SettingItemProps) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress}>
    <View style={styles.settingLeft}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}10` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <ThemedText style={styles.settingLabel}>{label}</ThemedText>
    </View>
    {showChevron && <Ionicons name="chevron-forward" size={18} color="#CCC" />}
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  // Real name from /users/me/ (the login response may only carry the email).
  const { fullName, email, initials, photo, loading, changePhoto } = useCurrentUser();

  const handleLogout = async () => {
    await logout();
    Toast.show('Logged out successfully', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
    router.replace('/(auth)');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>Profile</ThemedText>
          </View>

          {/* User Profile Card */}
          <View style={styles.profileCard}>
            <TouchableOpacity style={styles.avatarContainer} onPress={changePhoto} activeOpacity={0.8}>
              <UserAvatar photo={photo} initials={initials} size={60} />
            </TouchableOpacity>
            <View style={styles.userInfo}>
              {loading && !fullName ? (
                <Skeleton width={140} height={18} radius={6} style={{ marginBottom: 8 }} />
              ) : (
                <ThemedText style={styles.userName}>{fullName || email}</ThemedText>
              )}
              <ThemedText style={styles.userEmail}>{email}</ThemedText>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={changePhoto}>
              <Ionicons name="create-outline" size={20} color="#FF7A00" />
            </TouchableOpacity>
          </View>

          {/* Settings Sections */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionHeader}>Personal Settings</ThemedText>
            <SettingItem icon="person-outline" label="Account Information" onPress={() => router.push('/account' as any)} />
            {/* Hidden for now; no linked-accounts screen yet.
            <SettingItem icon="card-outline" label="Linked Bank Accounts" onPress={() => {}} /> */}
            <SettingItem icon="gift-outline" label="Referrals" onPress={() => router.push('/referrals')} />
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionHeader}>Security</ThemedText>
            <SettingItem icon="lock-closed-outline" label="Change Transaction PIN" onPress={() => router.push('/change-pin' as any)} />
            <SettingItem icon="finger-print-outline" label="Biometric Authentication" onPress={() => router.push('/biometrics' as any)} />
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionHeader}>Support & More</ThemedText>
            <SettingItem icon="help-circle-outline" label="Help Center" onPress={() => {}} />
            <SettingItem icon="document-text-outline" label="Terms & Conditions" onPress={() => router.push('/legal?url=https://www.mypeakpay.com/terms&title=Terms%20and%20Conditions' as any)} />
            <SettingItem icon="log-out-outline" label="Log Out" onPress={handleLogout} color="#FF3B30" showChevron={false} />
          </View>
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
  scrollContent: {
    paddingHorizontal: 24,
    // Clear the floating tab bar.
    paddingBottom: 140,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    ...Shadows.card,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#4B4B55',
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6E6E78',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
});
