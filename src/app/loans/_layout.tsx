import { Stack } from 'expo-router';

// start works out the step from the backend and replaces itself with it:
// address -> statement -> (review) -> apply -> offer.
export default function LoansLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="start" />
      <Stack.Screen name="address" />
      <Stack.Screen name="statement" />
      <Stack.Screen name="status" />
      <Stack.Screen name="apply" />
      <Stack.Screen name="offer" options={{ gestureEnabled: false }} />
      <Stack.Screen name="repayment" />
    </Stack>
  );
}
