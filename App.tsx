import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TabNavigator from './src/navigation/TabNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { ThemeProvider, useTheme } from './src/constants/ThemeContext';
import { Colors } from './src/constants/theme';

let openDatabase: any = null;
let loadAll: any = null;
let setupCategories: any = null;
let getSetting: any = null;

if (Platform.OS !== 'web') {
  const db = require('./src/db/database');
  const store = require('./src/store/useAppStore');
  const catInit = require('./src/db/initCategories');
  openDatabase = db.openDatabase;
  loadAll = () => store.useAppStore.getState().loadAll();
  setupCategories = catInit.setupCategories;
  getSetting = db.getSetting;
}

function AppContent() {
  const { isDark, colors } = useTheme();
  const [ready, setReady] = useState(Platform.OS === 'web');
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'web') { setChecking(false); return; }
    async function init() {
      try {
        const db = await openDatabase();
        await setupCategories(db);
        await loadAll();
        setReady(true);
        const done = await getSetting('onboarding_done');
        if (!done) setShowOnboarding(true);
        setChecking(false);
      } catch (err) {
        console.error('Init failed:', err);
        setError(String(err));
        setChecking(false);
      }
    }
    init();
  }, []);

  if (!ready || checking) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        {error ? (
          <><Text style={{ fontSize: 48 }}>😥</Text><Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 8 }}>앱 초기화 실패</Text></>
        ) : (
          <><Text style={{ fontSize: 48 }}>🌸</Text><Text style={{ fontSize: 28, fontWeight: '700', color: colors.primary, marginTop: 8 }}>GlowDay</Text><ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} /></>
        )}
      </View>
    );
  }

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  const navTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, border: colors.border } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.bg, border: colors.border } };

  return (
    <NavigationContainer theme={navTheme}>
      <TabNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4 },
});
