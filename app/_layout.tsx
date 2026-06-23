/**
 * Root layout — defines the Expo Router stack and shared header styling.
 * Screens: welcome (index), recent notes, new note, results, FHIR export.
 * Colors and status-bar style follow the OS light/dark appearance.
 */

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fontWeight, useThemeColors } from '../constants/theme';

export default function RootLayout() {
  const colors = useThemeColors();
  const scheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
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
