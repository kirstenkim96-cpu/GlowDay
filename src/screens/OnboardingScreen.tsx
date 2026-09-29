import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform, ScrollView, Animated, Image, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';

const IS_WEB = Platform.OS === 'web';
let dbFns: any = null;
let Haptics: any = null;
if (!IS_WEB) { dbFns = require('../db/database'); Haptics = require('expo-haptics'); }
const haptic = (t: string) => { if (!Haptics) return; if (t === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };

const PROFILE_EMOJIS = [
  // 자연/꽃
  '🌸','🌷','🌹','🌻','🌺','🪷','🌿','🍀','🌙','☀️',
  // 빛/보석
  '⭐','✨','💎','👑','🦋','🔥','⚡','🌊','🏔️','🌈',
  // 동물
  '🐰','🐱','🐻','🐺','🦁','🐉','🦅','🐸','🦊','🐧',
  // 하트/감정
  '💖','💜','💙','🖤','🤍','💪','🧊','♠️',
  // 취미/스포츠
  '🎸','🎮','🎧','🏀','⚽','🏄','🏋️','🏎️','🎯','🎬',
  // 음식/음료
  '☕','🍓','🍑','🫐','🍺','🧁',
  // 기타
  '🚀','🕶️','🧸','🎀',
];

interface Props { onComplete: () => void; }

export default function OnboardingScreen({ onComplete }: Props) {
  const { colors } = useTheme();
  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState('');
  const [emoji, setEmoji] = useState('🌸');
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [step]);

  const goNext = () => { if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); scaleAnim.setValue(0.9); fadeAnim.setValue(0); setStep(1); };

  const handleComplete = async () => {
    if (!nickname.trim()) return;
    if (!IS_WEB) {
      await dbFns.setSetting('nickname', nickname.trim());
      await dbFns.setSetting('profile_emoji', emoji);
      await dbFns.setSetting('onboarding_done', '1');
    }
    haptic('success');
    onComplete();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {step === 0 ? (
        <Animated.View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          <Image source={require('../../assets/icon.png')} style={{ width: 100, height: 100, borderRadius: 24, marginBottom: 20 }} />
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.primary, letterSpacing: -0.5, marginBottom: 8 }}>GlowDay</Text>
          <Text style={{ fontSize: 15, color: colors.textSec, textAlign: 'center', lineHeight: 22, marginBottom: 40 }}>
            뷰티 루틴을 캘린더로 관리하고{'\n'}매일 빛나는 하루를 만들어요
          </Text>
          <TouchableOpacity onPress={goNext} activeOpacity={0.8}
            style={{ width: '100%', paddingVertical: 16, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>시작하기</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 30 }}>
            <View style={{ width: 24, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
            <View style={{ width: 8, height: 6, borderRadius: 3, backgroundColor: colors.border }} />
          </View>
        </Animated.View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          <ScrollView contentContainerStyle={{ padding: 28, paddingTop: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 6 }}>프로필 설정</Text>
            <Text style={{ fontSize: 14, color: colors.textSec, marginBottom: 30 }}>나만의 프로필을 만들어보세요</Text>
            <View style={{ alignItems: 'center', marginBottom: 30 }}>
              <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4 }}>
                <Text style={{ fontSize: 44 }}>{emoji}</Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12 }}>{nickname || '닉네임을 입력해주세요'}</Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSec, marginBottom: 8 }}>닉네임</Text>
            <TextInput value={nickname} onChangeText={(t) => setNickname(t.slice(0, 12))} placeholder="예: 글로우킹, 빛나는하루" placeholderTextColor={colors.textLight}
              style={{ padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, fontSize: 16, color: colors.text, backgroundColor: colors.card, marginBottom: 6 }} />
            <Text style={{ fontSize: 11, color: colors.textLight, marginBottom: 24, textAlign: 'right' }}>{nickname.length}/12</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSec, marginBottom: 10 }}>프로필 아이콘</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32, justifyContent: 'center' }}>
              {PROFILE_EMOJIS.map(e => (
                <TouchableOpacity key={e} onPress={() => { haptic('light'); setEmoji(e); }} activeOpacity={0.7}
                  style={{ width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: emoji === e ? colors.primaryBg : colors.toggleBg, borderWidth: emoji === e ? 2 : 0, borderColor: colors.primary }}>
                  <Text style={{ fontSize: 26 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={handleComplete} disabled={!nickname.trim()} activeOpacity={0.8}
              style={{ paddingVertical: 16, borderRadius: 16, alignItems: 'center', backgroundColor: nickname.trim() ? colors.primary : colors.border, shadowColor: nickname.trim() ? colors.primary : 'transparent', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: nickname.trim() ? 4 : 0 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>완료</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 24, justifyContent: 'center' }}>
              <View style={{ width: 8, height: 6, borderRadius: 3, backgroundColor: colors.border }} />
              <View style={{ width: 24, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
