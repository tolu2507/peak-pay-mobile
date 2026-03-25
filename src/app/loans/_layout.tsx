import { Stack } from 'expo-router';

export default function LoansLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="apply" />
      <Stack.Screen name="address" />
    </Stack>
  );
}
