// src/components/ProgressCard.tsx
// 오늘의 진행률 카드

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing } from '../constants/theme';

interface ProgressCardProps {
  done: number;
  total: number;
}

export default function ProgressCard({ done, total }: ProgressCardProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const getMessage = () => {
    if (pct === 100) return '완벽한 하루! ✨';
    if (pct >= 80) return '거의 다 했어요! 💪';
    if (pct >= 50) return '절반 넘었어요!';
    return '오늘도 화이팅! 🌸';
  };

  return (
    <View style={styles.card}>
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      {/* Ring */}
      <View style={styles.ringContainer}>
        <View style={styles.ringOuter}>
          <Text style={styles.ringText}>{pct}%</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.message}>{getMessage()}</Text>
        <Text style={styles.count}>전체 {done}/{total} 완료</Text>
        {/* Progress bar */}
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${pct}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.xl,
    marginTop: 14,
    padding: 18,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  decorCircle1: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle2: {
    position: 'absolute',
    right: 30,
    bottom: -30,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  ringContainer: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  ringText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  info: {
    flex: 1,
  },
  message: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  count: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 3,
  },
  barBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: 'white',
  },
});
