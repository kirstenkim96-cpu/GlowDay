import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Animated, Dimensions, Platform } from 'react-native';
import { useTheme } from '../constants/ThemeContext';

const W = Dimensions.get('window').width;
const H = Dimensions.get('window').height;
let Haptics: any = null;
if (Platform.OS !== 'web') { Haptics = require('expo-haptics'); }

const MESSAGES = [
  { emoji: '🎉', title: '완벽한 하루!' },
  { emoji: '✨', title: '빛나는 하루!' },
  { emoji: '🌟', title: '루틴 마스터!' },
  { emoji: '💖', title: '오늘도 Glow!' },
];

interface Props { visible: boolean; onClose: () => void; doneCount: number; totalCount: number; streak: number; }

function Confetti({ delay, left, color, size, shape }: any) {
  const fall = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const wobble = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const dur = 2000 + Math.random() * 1500;
    Animated.parallel([
      Animated.timing(fall, { toValue: 1, duration: dur, delay, useNativeDriver: true }),
      Animated.timing(spin, { toValue: 1, duration: dur, delay, useNativeDriver: true }),
      Animated.loop(Animated.sequence([
        Animated.timing(wobble, { toValue: 1, duration: 300 + Math.random() * 400, useNativeDriver: true }),
        Animated.timing(wobble, { toValue: -1, duration: 300 + Math.random() * 400, useNativeDriver: true }),
      ])),
    ]).start();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', top: 0, left, width: size, height: shape === 'rect' ? size * 2.5 : size,
      borderRadius: shape === 'circle' ? size / 2 : shape === 'rect' ? 2 : 0, backgroundColor: color,
      opacity: fall.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
      transform: [
        { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [-20, H + 20] }) },
        { translateX: wobble.interpolate({ inputRange: [-1, 1], outputRange: [-15, 15] }) },
        { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] }) },
      ],
    }} />
  );
}

export default function CelebrationModal({ visible, onClose, doneCount, totalCount, streak }: Props) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const emojiScale = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;
  const [msg] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
  const [confetti] = useState(() => Array.from({ length: 35 }, (_, i) => ({
    left: Math.random() * W, delay: Math.random() * 800,
    color: ['#D4537E', '#EF9F27', '#1D9E75', '#8B5CF6', '#F472B6', '#06B6D4', '#FFD700'][i % 7],
    size: 6 + Math.random() * 8, shape: ['circle', 'rect', 'square'][Math.floor(Math.random() * 3)],
  })));

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.5); fadeAnim.setValue(0); emojiScale.setValue(0); cardSlide.setValue(30);
      if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        Animated.sequence([
          Animated.spring(emojiScale, { toValue: 1, tension: 60, friction: 5, useNativeDriver: true }),
          Animated.spring(cardSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
        ]).start();
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', opacity: fadeAnim }}>
        {confetti.map((c, i) => <Confetti key={i} {...c} />)}
        <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={onClose} />
        <Animated.View style={{
          width: 300, borderRadius: 28, overflow: 'hidden', backgroundColor: colors.card,
          transform: [{ scale: scaleAnim }], shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.2, shadowRadius: 30, elevation: 10,
        }}>
          <View style={{ height: 190, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary, position: 'relative', overflow: 'hidden' }}>
            <View style={{ position: 'absolute', left: -30, top: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <View style={{ position: 'absolute', right: -20, bottom: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)' }} />
            {['✦','✧','✦','✧'].map((s, i) => (
              <Text key={i} style={{ position: 'absolute', top: [18,25,100,80][i], left: [40,200,30,210][i], fontSize: [12,9,10,11][i], color: 'rgba(255,255,255,0.5)' }}>{s}</Text>
            ))}
            <Animated.Text style={{ fontSize: 56, transform: [{ scale: emojiScale }] }}>{msg.emoji}</Animated.Text>
          </View>
          <Animated.View style={{ padding: 30, paddingTop: 28, paddingBottom: 38, alignItems: 'center', transform: [{ translateY: cardSlide }] }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 }}>{msg.title}</Text>
            <Text style={{ fontSize: 13, color: colors.textSec, marginBottom: 22 }}>오늘의 루틴을 모두 완료했어요</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24, width: '100%' }}>
              <View style={{ flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', backgroundColor: colors.secondary + '10', borderWidth: 1, borderColor: colors.secondary + '20' }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: colors.secondary }}>{doneCount}/{totalCount}</Text>
                <Text style={{ fontSize: 11, color: colors.textSec, marginTop: 3 }}>루틴 완료</Text>
              </View>
              <View style={{ flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', backgroundColor: colors.streak + '10', borderWidth: 1, borderColor: colors.streak + '20' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 16 }}>🔥</Text>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: colors.streak }}>{streak}</Text>
                </View>
                <Text style={{ fontSize: 11, color: colors.textSec, marginTop: 3 }}>일 연속</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.8} style={{
              width: '100%', paddingVertical: 16, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center',
              shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
            }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>오늘도 수고했어요 💖</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
