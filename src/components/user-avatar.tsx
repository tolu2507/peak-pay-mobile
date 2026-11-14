import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

interface UserAvatarProps {
  photo?: string;
  initials: string;
  size?: number;
}

// The user's photo, or their initials on the brand orange when none is set.
export function UserAvatar({ photo, initials, size = 60 }: UserAvatarProps) {
  const radius = size / 2;
  if (photo) {
    return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: radius, backgroundColor: '#F3F3F3' }} />;
  }
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: radius }]}>
      <ThemedText style={[styles.initials, { fontSize: size * 0.34, lineHeight: size * 0.44 }]}>{initials}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#FF7A00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFF',
    fontWeight: '700',
  },
});
