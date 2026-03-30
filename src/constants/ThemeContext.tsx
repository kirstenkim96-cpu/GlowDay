import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, Platform } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';
type AccentKey = 'pink' | 'navy' | 'green' | 'purple' | 'orange';

const ACCENTS = {
  pink: { primary: '#D4537E', primaryDark: '#E8789A', label: '글로우 핑크', emoji: '🌸' },
  navy: { primary: '#2B5EA7', primaryDark: '#5B8FD4', label: '클래식 네이비', emoji: '🌊' },
  green: { primary: '#1D8E65', primaryDark: '#2DBF8E', label: '프레시 그린', emoji: '🌿' },
  purple: { primary: '#7C4DBC', primaryDark: '#A87EDB', label: '라벤더 퍼플', emoji: '💜' },
  orange: { primary: '#D4732C', primaryDark: '#E8965A', label: '웜 오렌지', emoji: '🔥' },
};

function makeColors(isDark: boolean, accent: AccentKey) {
  const a = ACCENTS[accent];
  const p = isDark ? a.primaryDark : a.primary;
  if (!isDark) return {
    bg: '#FDFCFB', card: '#FFFFFF', surface: accent === 'pink' ? '#FBEAF0' : accent === 'navy' ? '#E8EEF6' : accent === 'green' ? '#E8F5EE' : accent === 'purple' ? '#F0EAF8' : '#FFF0E6',
    text: '#2C2C2A', textSec: '#888780', textLight: '#c0bdb8',
    border: '#f0eeeb', borderLight: '#f5f3f0', toggleBg: '#f5f3f0',
    primary: p, primaryBg: p + '12', primaryLight: p + '20',
    secondary: '#1D9E75', secondaryBg: '#1D9E7512',
    accent: '#EF9F27', streak: '#FF6B35', streakBg: '#FF6B3512',
    danger: '#E8789A', shadow: '#000',
  };
  return {
    bg: '#1A1A1E', card: '#2A2A2E', surface: '#2A2A2E',
    text: '#EEECEA', textSec: '#9C9A92', textLight: '#5A5955',
    border: '#3A3A3E', borderLight: '#333338', toggleBg: '#333338',
    primary: p, primaryBg: p + '18', primaryLight: p + '25',
    secondary: '#2DBF8E', secondaryBg: '#2DBF8E18',
    accent: '#F5B74C', streak: '#FF8A5C', streakBg: '#FF8A5C18',
    danger: '#F09AAF', shadow: '#000',
  };
}

const defaultColors = makeColors(false, 'pink');

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  accentKey: AccentKey;
  setMode: (m: ThemeMode) => void;
  setAccent: (a: AccentKey) => void;
  colors: typeof defaultColors;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system', isDark: false, accentKey: 'pink',
  setMode: () => {}, setAccent: () => {},
  colors: defaultColors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const sys = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [accentKey, setAccentState] = useState<AccentKey>('pink');
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') { setDbReady(true); return; }
    const loadSettings = async () => {
      try {
        const dbFns = require('../db/database');
        const m = await dbFns.getSetting('theme_mode');
        const a = await dbFns.getSetting('accent_color');
        if (m === 'light' || m === 'dark' || m === 'system') setModeState(m);
        if (a && ACCENTS[a as AccentKey]) setAccentState(a as AccentKey);
      } catch {}
      setDbReady(true);
    };
    setTimeout(loadSettings, 100);
  }, []);

  const setMode = async (m: ThemeMode) => {
    setModeState(m);
    if (Platform.OS !== 'web') {
      try { const dbFns = require('../db/database'); await dbFns.setSetting('theme_mode', m); } catch {}
    }
  };
  const setAccent = async (a: AccentKey) => {
    setAccentState(a);
    if (Platform.OS !== 'web') {
      try { const dbFns = require('../db/database'); await dbFns.setSetting('accent_color', a); } catch {}
    }
  };

  const isDark = mode === 'system' ? sys === 'dark' : mode === 'dark';
  const colors = makeColors(isDark, accentKey);

  return (
    <ThemeContext.Provider value={{ mode, isDark, accentKey, setMode, setAccent, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext); }
export { ACCENTS };
export type { AccentKey };
