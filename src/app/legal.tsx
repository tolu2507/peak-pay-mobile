import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity} from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LegalScreen() {
  const { url, title } = useLocalSearchParams<{ url: string; title: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <ThemedText style={styles.title}>{title || 'Legal'}</ThemedText>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.webviewContainer}>
        {loading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#FF7A00" />
          </View>
        )}
        <WebView
          source={{ uri: url || 'https://www.mypeakpay.com/privacy' }}
          style={styles.webview}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    zIndex: 1,
  },
});
