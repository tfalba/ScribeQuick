/**
 * Root layout — defines the Expo Router stack and shared header styling.
 * Three screens: history (index), new note input, and the generated results.
 */

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors, fontWeight } from '../constants/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.textInverse,
          headerTitleStyle: { fontWeight: fontWeight.semibold },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Home', headerShown: false }} />
        <Stack.Screen name="notes" options={{ title: 'Recent Notes' }} />
        <Stack.Screen name="new-note" options={{ title: 'New Visit Note' }} />
        <Stack.Screen name="results" options={{ title: 'SOAP Note' }} />
        <Stack.Screen name="fhir" options={{ title: 'FHIR Export' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
