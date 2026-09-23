import '../global.css';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { AppStateProvider } from '../src/context/AppStateProvider';
import SplashAnimation from '../src/components/SplashAnimation';
import { fontAssets } from '../src/theme';

SplashScreen.preventAutoHideAsync();

// Don't hold the splash hostage to a network probe that may never land.
const MAX_SPLASH_MS = 6000;

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);
  const [dataReady, setDataReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [splashGone, setSplashGone] = useState(false);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  useEffect(() => {
    const timer = setTimeout(() => setDataReady(true), MAX_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <AppStateProvider onReady={() => setDataReady(true)}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="ob2" />
            <Stack.Screen name="ob3" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="add-proxy" options={{ presentation: 'modal' }} />
            <Stack.Screen
              name="test-running"
              options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
            />
          </Stack>
        </AppStateProvider>
      </SafeAreaView>
      {!splashGone ? (
        <SplashAnimation
          dismiss={introDone && dataReady}
          onIntroDone={() => setIntroDone(true)}
          onHidden={() => setSplashGone(true)}
        />
      ) : null}
      <StatusBar style={splashGone ? 'dark' : 'light'} />
    </SafeAreaProvider>
  );
}
