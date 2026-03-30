import React from 'react';
import { Stack } from 'expo-router';

export default function KYCLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="bvn" />
      <Stack.Screen name="liveness-intro" />
      <Stack.Screen name="smileid-verify" />
      <Stack.Screen name="camera" />
      <Stack.Screen name="next-of-kin" />
      <Stack.Screen name="employment" />
      <Stack.Screen name="pep-details" />
      <Stack.Screen name="bank-details" />
      <Stack.Screen name="create-pin" />
    </Stack>
  );
}
