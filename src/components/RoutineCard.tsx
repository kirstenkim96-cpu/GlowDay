// src/components/RoutineCard.tsx
// 루틴 체크리스트 카드 컴포넌트

import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { Colors, Categories, CategoryKey, Radius, Shadows, Spacing } from '../constants/theme';

interface RoutineCardProps {
  name: string;
  category: CategoryKey;
  done: boolean;
  onToggle: () => void;
  onPress?: () => void;
  index?: number;
}

export default function RoutineCard({ name, category, done, onToggle, onPress, index = 0 }: RoutineCardProps) {
  const cat = Categories[category] || Categories.other;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleToggle = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onToggle();
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[
          styles.card,
          done && { backgroundColor: `${cat.color}08` },
          { borderLeftColor: done ? cat.color : `${cat.color}30` },
        ]}
        activeOpacity={0.7}
        onPress={handleToggle}
        onLongPress={onPress}
      >
        {/* Checkbox */}
        <TouchableOpacity onPress={handleToggle} style={[
          styles.checkbox,
          done
            ? { backgroundColor: cat.color, borderColor: cat.color }
            : { borderColor: `${cat.color}40` },
        ]}>
          {done && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </TouchableOpacity>

        {/* Icon */}
        <Text style={styles.icon}>{cat.icon}</Text>

        {/* Content */}
        <View style={styles.content}>
          <Text style={[
            styles.name,
            done && styles.nameDone,
          ]}>{name}</Text>
          <Text style={styles.categoryLabel}>{cat.label}</Text>
        </View>

        {/* Status */}
        {done && (
          <View style={[styles.statusBadge, { backgroundColor: `${Colors.secondary}12` }]}>
            <Text style={[styles.statusText, { color: Colors.secondary }]}>완료</Text>
          </View>
        )}

        {/* More button */}
        {onPress && (
          <TouchableOpacity onPress={onPress} style={styles.moreBtn}>
            <Text style={styles.moreText}>⋯</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.border,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 11,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    marginTop: -1,
  },
  icon: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  nameDone: {
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  categoryLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  moreBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    fontSize: 16,
    color: Colors.textLight,
  },
});
