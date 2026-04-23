import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import GlowModal from '../components/GlowModal';

const IS_WEB = Platform.OS === 'web';
let dbFns: any = null;
let Haptics: any = null;
if (!IS_WEB) { dbFns = require('../db/database'); Haptics = require('expo-haptics'); }
const haptic = (t: string) => { if (!Haptics) return; if (t === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };

const PROFILE_EMOJIS = ['🌸','🌷','🌹','🌻','🌺','💐','🪷','🌿','🍀','🌙','⭐','✨','💎','👑','🦋','🐰','🐱','🐻','🎀','💖','💜','💙','🧸','🍓','🍑','🫐','🧁','☕','🔥','⚡','🏋️','🎯','🎮','🎧','🏄','🚀','🐺','🦁','🐉','🦅','🎸','🏀','⚽','🏔️','🌊','🍺','🎬','🕶️','💪','🧊','🏎️','♠️','🐸'];

interface Props { onDone: () => void; }

export default function EditProfileScreen({ onDone }: Props) {
  const { colors } = useTheme();
  const [nickname, setNickname] = useState('');
  const [emoji, setEmoji] = useState('🌸');
  const [modal, setModal] = useState<any>({ visible: false, title: '' });

  useEffect(() => {
    if (!IS_WEB) {
      Promise.all([dbFns.getSetting('nickname'), dbFns.getSetting('profile_emoji')]).then(([n, e]: any) => {
        if (n) setNickname(n);
        if (e) setEmoji(e);
      });
    }
  }, []);

  const save = async () => {
    if (!nickname.trim()) return;
    if (!IS_WEB) {
      await dbFns.setSetting('nickname', nickname.trim());
      await dbFns.setSetting('profile_emoji', emoji);
    }
    haptic('success');
    setModal({ visible: true, emoji: '✅', title: '프로필 수정 완료!', buttons: [{ text: '확인', onPress: () => { setModal((m: any) => ({ ...m, visible: false })); onDone(); }, style: 'primary' }] });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <GlowModal visible={modal.visible} emoji={modal.emoji} title={modal.title} buttons={modal.buttons} onClose={() => setModal((m: any) => ({ ...m, visible: false }))} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>프로필 수정</Text>
          <TouchableOpacity onPress={onDone}><Text style={{ fontSize: 14, color: colors.textSec }}>취소</Text></TouchableOpacity>
        </View>
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 40 }}>{emoji}</Text>
          </View>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 10 }}>{nickname || '닉네임'}</Text>
        </View>
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSec, marginBottom: 6 }}>닉네임</Text>
        <TextInput value={nickname} onChangeText={t => setNickname(t.slice(0, 12))} placeholder="닉네임을 입력해주세요" placeholderTextColor={colors.textLight}
          style={{ padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, fontSize: 15, color: colors.text, backgroundColor: colors.card, marginBottom: 4 }} />
        <Text style={{ fontSize: 11, color: colors.textLight, marginBottom: 20, textAlign: 'right' }}>{nickname.length}/12</Text>
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSec, marginBottom: 8 }}>프로필 아이콘</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
          {PROFILE_EMOJIS.map(e => (
            <TouchableOpacity key={e} onPress={() => { haptic('light'); setEmoji(e); }} activeOpacity={0.7}
              style={{ width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center', backgroundColor: emoji === e ? colors.primaryBg : colors.toggleBg, borderWidth: emoji === e ? 2 : 0, borderColor: colors.primary }}>
              <Text style={{ fontSize: 24 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={save} disabled={!nickname.trim()} activeOpacity={0.8}
          style={{ paddingVertical: 15, borderRadius: 14, alignItems: 'center', backgroundColor: nickname.trim() ? colors.primary : colors.border }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>저장하기</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
