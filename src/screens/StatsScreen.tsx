// src/screens/StatsScreen.tsx
// Phase 0: 스켈레톤 (Phase 6에서 통계 구현)

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '../constants/theme';

export default function StatsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>통계</Text>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderEmoji}>📊</Text>
        <Text style={styles.placeholderTitle}>Phase 6에서 구현 예정</Text>
        <Text style={styles.placeholderSub}>달성률 차트, 카테고리 분포, 기록 히스토리</Text>
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
