import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TabNavigator from './src/navigation/TabNavigator';
import { Colors } from './src/constants/theme';

let openDatabase: any = null;
let loadAll: any = null;
let setupCategories: any = null;

if (Platform.OS !== 'web') {
  const db = require('./src/db/database');
  const store = require('./src/store/useAppStore');
  const catInit = require('./src/db/initCategories');
  openDatabase = db.openDatabase;
  loadAll = () => store.useAppStore.getState().loadAll();
  setupCategories = catInit.setupCategories;
}

export default function App() {
  const [ready, setReady] = useState(Platform.OS === 'web');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    async function init() {
      try {
        const db = await openDatabase();
        await setupCategories(db);
        await loadAll();
        setReady(true);
      } catch (err) {
        console.error('Init failed:', err);
        setError(String(err));
      }
    }
    init();
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        {error ? (<><Text style={{fontSize:48}}>😥</Text><Text style={{fontSize:18,fontWeight:'600',color:Colors.text,marginTop:8}}>앱 초기화 실패</Text><Text style={{fontSize:12,color:Colors.textSecondary,marginTop:8,paddingHorizontal:40,textAlign:'center'}}>{error}</Text></>)
        : (<><Text style={{fontSize:48}}>🌸</Text><Text style={{fontSize:28,fontWeight:'700',color:Colors.primary,letterSpacing:-0.5,marginTop:8}}>GlowDay</Text><ActivityIndicator size="small" color={Colors.primary} style={{marginTop:16}}/></>)}
      </View>
    );
  }

  return (<SafeAreaProvider><NavigationContainer><TabNavigator /></NavigationContainer></SafeAreaProvider>);
}

const styles = StyleSheet.create({
  loading: { flex:1,justifyContent:'center',alignItems:'center',backgroundColor:Colors.background,gap:4 },
});
