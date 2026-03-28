// src/screens/SettingsScreen.tsx
// Phase 0: 스켈레톤 (Phase 7에서 설정 구현)

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '../constants/theme';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>설정</Text>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderEmoji}>⚙️</Text>
        <Text style={styles.placeholderTitle}>Phase 7에서 구현 예정</Text>
        <Text style={styles.placeholderSub}>알림 설정, 다크모드, 데이터 관리</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },
  title: { ...Typography.subtitle },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  placeholderEmoji: { fontSize: 48 },
  placeholderTitle: { ...Typography.sectionHeader, color: Colors.textSecondary },
  placeholderSub: { ...Typography.caption },
});
