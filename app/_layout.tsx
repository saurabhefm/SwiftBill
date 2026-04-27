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
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    async function startApp() {
      // Safety timeout: If DB doesn't respond in 5s, force open
      const timeout = setTimeout(() => {
        if (!dbReady) {
          console.warn('App: DB Init timed out, forcing open');
          setDbReady(true);
          SplashScreen.hideAsync().catch(() => {});
        }
      }, 5000);

      try {
        console.log('App: Start');
        await initDb((msg, p) => {
          setStatus(msg);
          setProgress(40 + (p * 0.6));
        });
        clearTimeout(timeout);
        setDbReady(true);
        setTimeout(async () => {
          await SplashScreen.hideAsync().catch(() => {});
        }, 800);
      } catch (e: any) {
        console.error('App Init Error:', e);
        clearTimeout(timeout);
        setDbReady(true);
      }
    }
    startApp();
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066FF" />
        <Text style={styles.statusText}>{status}</Text>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.versionText}>SwiftBill v1.0.5 - Stable</Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: true }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="create-invoice" options={{ title: 'New Invoice' }} />
        <Stack.Screen name="create-bom" options={{ title: 'New BOM' }} />
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
    padding: 30
  },
  statusText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '700',
    color: '#0066FF'
  },
  progressBg: {
    marginTop: 15,
    width: '100%',
    height: 8,
    backgroundColor: '#EEEEEE',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0066FF'
  },
  versionText: {
    position: 'absolute',
    bottom: 30,
    color: '#999999',
    fontSize: 12
  }
});
