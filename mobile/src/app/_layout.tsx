import { useEffect, useState } from 'react';
import { loadAiSettings } from '../lib/ai/settings';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Lexend_400Regular,
  Lexend_600SemiBold,
  Lexend_700Bold,
  Lexend_800ExtraBold,
} from '@expo-google-fonts/lexend';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { colors } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { ready, user } = useAuth();
  const [fontsLoaded] = useFonts({
    Lexend_400Regular,
    Lexend_600SemiBold,
    Lexend_700Bold,
    Lexend_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [aiLoaded, setAiLoaded] = useState(false);
  useEffect(() => {
    loadAiSettings().finally(() => setAiLoaded(true));
  }, []);

  const loaded = ready && fontsLoaded && aiLoaded;
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);
  if (!loaded) return null;

  const signedIn = !!user;
  const onboarded = !!user?.profile.onboarded;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="journal" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ai-settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="meal/[id]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="workout/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="workout/player" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
