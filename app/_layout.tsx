import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from '../context/ThemeContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    console.log('[Boot] useEffect triggered in _layout.tsx');
    // Force hide immediately on mount to prevent any splash screen lock
    SplashScreen.hideAsync().then(() => {
      console.log('[Boot] Splash screen hidden successfully');
    }).catch((e) => {
      console.error('[Boot] Splash screen hide failed:', e);
    });

    async function startEngine() {
      try {
        console.log('[Boot] startEngine() began');
        // 2. Start the Database in the background
        const { initDb } = await import('../src/db/client');
        console.log('[Boot] db client imported');
        await initDb();
        console.log('[System] Database Engine Connected');
      } catch (e) {
        console.error('[System] Engine Failure', e);
      } finally {
        setReady(true);
        console.log('[Boot] setReady(true) called after DB init');
      }
    }
    startEngine();
  }, []);

  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.statusText}>Starting SwiftBill...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="create-invoice" options={{ headerShown: true, title: 'New Invoice' }} />
        <Stack.Screen name="create-bom" options={{ headerShown: true, title: 'New BOM' }} />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '700',
    color: '#4F46E5'
  }
});
