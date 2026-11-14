import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ScreenHeader } from '@/components/screen-header';

// The API has no notifications endpoint yet. When it does, load the list here
// and render it in place of the empty state.
export default function NotificationsScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Notifications" />
        <View style={styles.empty}>
          <View style={styles.iconCircle}>
            <Ionicons name="notifications-outline" size={36} color="#FF7A00" />
          </View>
          <ThemedText style={styles.emptyTitle}>No notifications yet</ThemedText>
          <ThemedText style={styles.emptyText}>
            Updates about your loan, repayments and account will show up here.
          </ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  safeArea: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF2E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6E6E78', textAlign: 'center', lineHeight: 22 },
});
