import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Database and Theme Imports
import { initDb } from '../src/db/client';
import { ThemeProvider } from '../context/ThemeContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [status, setStatus] = useState('Starting SwiftBill...');

  useEffect(() => {
    async function startApp() {
      // Safety timeout: If DB doesn't respond in 5s, force open
      const safetyTimeout = setTimeout(() => {
        if (!dbReady) {
          console.warn('[System] DB Init timed out, forcing open');
          setDbReady(true);
          SplashScreen.hideAsync().catch(() => {});
        }
      }, 5000);

      try {
        console.log('[System] App Start');
        await initDb((msg) => {
          setStatus(msg);
        });
        clearTimeout(safetyTimeout);
        setDbReady(true);
        setTimeout(async () => {
          await SplashScreen.hideAsync().catch(() => {});
        }, 800);
      } catch (e: any) {
        console.error('[System] App Init Error:', e);
        clearTimeout(safetyTimeout);
        setDbReady(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    }
    startApp();
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066FF" />
        <Text style={styles.statusText}>{status}</Text>
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
    color: '#0066FF'
  }
});
