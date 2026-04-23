import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Platform, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import GlowModal from '../components/GlowModal';
import EditProfileScreen from './EditProfileScreen';
import { useTheme, ACCENTS, AccentKey } from '../constants/ThemeContext';

const IS_WEB = Platform.OS === 'web';
let dbFns: any = null;
let Haptics: any = null;
let Notifications: any = null;
Notifications = null; // Expo Go 미지원
let Sharing: any = null;
let FileSystem: any = null;
if (!IS_WEB) {
  dbFns = require('../db/database');
  Haptics = require('expo-haptics');
  
  try { Sharing = require('expo-sharing'); } catch {}
  try { FileSystem = require('expo-file-system'); } catch {}
}
const haptic = (t: string) => { if (!Haptics) return; if (t === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); else if (t === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };

async function scheduleNotifications(amOn: boolean, pmOn: boolean) {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (amOn) { await Notifications.scheduleNotificationAsync({ content: { title: '☀️ 아침 루틴 시간이에요!', body: '오늘도 빛나는 하루를 시작해볼까요?', sound: true }, trigger: { hour: 7, minute: 0, repeats: true, type: 'daily' } }); }
    if (pmOn) { await Notifications.scheduleNotificationAsync({ content: { title: '🌙 저녁 루틴 시간이에요!', body: '오늘 하루도 수고했어요, 루틴으로 마무리!', sound: true }, trigger: { hour: 21, minute: 0, repeats: true, type: 'daily' } }); }
  } catch (e) { console.log('Notification error:', e); }
}

function SettingRow({ icon, label, sub, right, colors }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.toggleBg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 17 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>{label}</Text>
        {sub && <Text style={{ fontSize: 11, color: colors.textSec, marginTop: 1 }}>{sub}</Text>}
      </View>
      {right}
    </View>
  );
}

export default function SettingsScreen() {
  const { mode, isDark, accentKey, setMode, setAccent, colors } = useTheme();
  const [amNotif, setAmNotif] = useState(true);
  const [pmNotif, setPmNotif] = useState(true);
  const [streak, setStreak] = useState<any>(null);
  const [routineCount, setRoutineCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [nickname, setNickname] = useState('GlowDay 사용자');
  const [profileEmoji, setProfileEmoji] = useState('🌸');
  const [modal, setModal] = useState<any>({ visible: false, title: '' });
  const [showEditProfile, setShowEditProfile] = useState(false);

  const load = useCallback(async () => {
    if (IS_WEB) { setStreak({ current_streak: 5, longest_streak: 14, protection_used: 0 }); return; }
    try {
      const st = await dbFns.getStreak(); setStreak(st);
      const rts = await dbFns.getAllRoutines(); setRoutineCount(rts.length);
      const evts = await dbFns.getAllEvents(); setEventCount(evts.length);
      const amVal = await dbFns.getSetting('am_notif');
      const pmVal = await dbFns.getSetting('pm_notif');
      setAmNotif(amVal !== '0'); setPmNotif(pmVal !== '0');
      const nick = await dbFns.getSetting('nickname');
      const pEmoji = await dbFns.getSetting('profile_emoji');
      if (nick) setNickname(nick);
      if (pEmoji) setProfileEmoji(pEmoji);
    } catch (e) { console.error(e); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleNotif = async (type: 'am' | 'pm', value: boolean) => {
    haptic('light');
    if (value && Notifications) {
      try { const { status } = await Notifications.requestPermissionsAsync(); if (status !== 'granted') { setModal({ visible: true, emoji: '🔔', title: '알림 권한이 필요해요', buttons: [{ text: '확인', onPress: () => setModal((m: any) => ({ ...m, visible: false })), style: 'primary' }] }); return; } } catch {}
    }
    const newAm = type === 'am' ? value : amNotif;
    const newPm = type === 'pm' ? value : pmNotif;
    if (type === 'am') setAmNotif(value); else setPmNotif(value);
    if (!IS_WEB) { await dbFns.setSetting(type === 'am' ? 'am_notif' : 'pm_notif', value ? '1' : '0'); await scheduleNotifications(newAm, newPm); }
  };

  const cycleTheme = () => { haptic('light'); setMode(isDark ? 'light' : 'dark'); };

  const handleExportData = async () => {
    if (IS_WEB) return;
    haptic('light');
    try {
      const allR = await dbFns.getAllRoutines();
      const allE = await dbFns.getAllEvents();
      const st = await dbFns.getStreak();
      const settings: any = {};
      for (const k of ['nickname', 'profile_emoji', 'accent_color', 'theme_mode', 'am_notif', 'pm_notif']) {
        settings[k] = await dbFns.getSetting(k);
      }
      const backup = JSON.stringify({ routines: allR, events: allE, streak: st, settings }, null, 2);

      if (Sharing && FileSystem && await Sharing.isAvailableAsync()) {
        const path = FileSystem.documentDirectory + 'glowday_backup.json';
        await FileSystem.writeAsStringAsync(path, backup);
        await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'GlowDay 백업' });
      } else {
        setModal({ visible: true, emoji: '📤', title: '백업 준비 완료', message: '공유 기능을 사용할 수 없어요', buttons: [{ text: '확인', onPress: () => setModal((m: any) => ({ ...m, visible: false })), style: 'primary' }] });
      }
    } catch (e) {
      console.error(e);
      setModal({ visible: true, emoji: '😥', title: '내보내기 실패', buttons: [{ text: '확인', onPress: () => setModal((m: any) => ({ ...m, visible: false })), style: 'primary' }] });
    }
  };

  const handleResetStreak = () => {
    setModal({ visible: true, emoji: '🔥', title: '스트릭을 초기화할까요?', buttons: [
      { text: '취소', onPress: () => setModal((m: any) => ({ ...m, visible: false })), style: 'default' },
      { text: '초기화', onPress: async () => { setModal((m: any) => ({ ...m, visible: false })); if (!IS_WEB) await dbFns.updateStreak({ current_streak: 0, longest_streak: streak?.longest_streak ?? 0, last_completed_date: '', protection_used: 0, protection_date: null }); haptic('medium'); load(); }, style: 'danger' },
    ] });
  };

  const handleResetData = () => {
    setModal({ visible: true, emoji: '⚠️', title: '모든 데이터를 삭제할까요?', message: '루틴, 기록, 스트릭이 전부 사라져요.\n이 작업은 되돌릴 수 없어요.', buttons: [
      { text: '취소', onPress: () => setModal((m: any) => ({ ...m, visible: false })), style: 'default' },
      { text: '전체 삭제', onPress: async () => {
        setModal((m: any) => ({ ...m, visible: false }));
        if (!IS_WEB) {
          const db = dbFns.getDB();
          await db.execAsync('DELETE FROM routine_logs; DELETE FROM routines; DELETE FROM beauty_events; DELETE FROM custom_categories; DELETE FROM settings;');
          await dbFns.updateStreak({ current_streak: 0, longest_streak: 0, last_completed_date: '', protection_used: 0, protection_date: null });
          if (Notifications) await Notifications.cancelAllScheduledNotificationsAsync();
        }
        haptic('success');
        setModal({ visible: true, emoji: '✨', title: '초기화 완료!', buttons: [{ text: '확인', onPress: () => { setModal((m: any) => ({ ...m, visible: false })); load(); }, style: 'primary' }] });
      }, style: 'danger' },
    ] });
  };

  const ACCENT_KEYS: AccentKey[] = ['pink', 'navy', 'green', 'purple', 'orange'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <GlowModal visible={modal.visible} emoji={modal.emoji} title={modal.title} message={modal.message} buttons={modal.buttons} onClose={() => setModal((m: any) => ({ ...m, visible: false }))} />
      <Modal visible={showEditProfile} animationType="slide"><EditProfileScreen onDone={() => { setShowEditProfile(false); load(); }} /></Modal>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 }}><Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>설정</Text></View>

        <TouchableOpacity onPress={() => { haptic('light'); setShowEditProfile(true); }} activeOpacity={0.7}
          style={{ marginHorizontal: 20, marginTop: 8, padding: 18, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 24 }}>{profileEmoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{nickname}</Text>
            <Text style={{ fontSize: 12, color: colors.textSec }}>{streak?.current_streak ?? 0}일째 빛나는 중 ✨</Text>
          </View>
          <Text style={{ fontSize: 14, color: colors.textLight }}>›</Text>
        </TouchableOpacity>

        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSec, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, marginTop: 20 }}>밝기 설정</Text>
          <TouchableOpacity onPress={cycleTheme} activeOpacity={0.7}>
            <SettingRow colors={colors} icon={isDark ? '🌙' : '☀️'} label="화면 모드" sub={isDark ? '다크 모드' : '라이트 모드'}
              right={<View style={{ backgroundColor: colors.primaryBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}><Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{isDark ? '다크 모드' : '라이트 모드'}</Text></View>} />
          </TouchableOpacity>

          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSec, marginTop: 14, marginBottom: 10 }}>테마 컬러</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {ACCENT_KEYS.map(key => {
              const a = ACCENTS[key]; const sel = accentKey === key;
              return (
                <TouchableOpacity key={key} onPress={() => { haptic('light'); setAccent(key); }} activeOpacity={0.7}
                  style={{ flex: 1, alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: sel ? a.primary + '15' : colors.card, borderWidth: sel ? 2 : 1, borderColor: sel ? a.primary : colors.border }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: a.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 16 }}>{a.emoji}</Text>
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: sel ? a.primary : colors.textSec, textAlign: 'center' }}>{a.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSec, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, marginTop: 24 }}>알림 설정</Text>
          <SettingRow colors={colors} icon="☀️" label="아침 루틴 알림" sub="매일 07:00"
            right={<Switch value={amNotif} onValueChange={(v) => toggleNotif('am', v)} trackColor={{ false: colors.toggleBg, true: colors.primary + '80' }} thumbColor={amNotif ? colors.primary : '#f4f3f4'} />} />
          <SettingRow colors={colors} icon="🌙" label="저녁 루틴 알림" sub="매일 21:00"
            right={<Switch value={pmNotif} onValueChange={(v) => toggleNotif('pm', v)} trackColor={{ false: colors.toggleBg, true: colors.primary + '80' }} thumbColor={pmNotif ? colors.primary : '#f4f3f4'} />} />

          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSec, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, marginTop: 20 }}>스트릭</Text>
          <SettingRow colors={colors} icon="🔥" label="현재 스트릭" sub={`${streak?.current_streak ?? 0}일 연속`}
            right={<Text style={{ fontSize: 16, fontWeight: '700', color: colors.streak }}>{streak?.current_streak ?? 0}일</Text>} />
          <SettingRow colors={colors} icon="🏆" label="최장 스트릭"
            right={<Text style={{ fontSize: 14, fontWeight: '600', color: colors.accent }}>{streak?.longest_streak ?? 0}일</Text>} />
          <SettingRow colors={colors} icon="🛡️" label="스트릭 보호권" sub={streak?.protection_used ? '이번 주 사용 완료' : '이번 주 1회 남음'}
            right={<Text style={{ fontSize: 14, fontWeight: '600', color: streak?.protection_used ? colors.textLight : colors.accent }}>{streak?.protection_used ? '0/1' : '1/1'}</Text>} />

          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSec, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, marginTop: 20 }}>루틴 관리</Text>
          <SettingRow colors={colors} icon="📋" label="등록된 루틴"
            right={<Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>{routineCount}개</Text>} />
          <SettingRow colors={colors} icon="📅" label="등록된 일정"
            right={<Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSec }}>{eventCount}개</Text>} />

          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSec, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, marginTop: 20 }}>데이터</Text>
          <TouchableOpacity onPress={handleExportData} activeOpacity={0.7}>
            <SettingRow colors={colors} icon="📤" label="데이터 내보내기" sub="JSON 형식 백업"
              right={<Text style={{ fontSize: 12, color: colors.primary, fontWeight: '500' }}>내보내기 ›</Text>} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleResetStreak} activeOpacity={0.7}>
            <SettingRow colors={colors} icon="🔄" label="스트릭 초기화" sub="현재 스트릭만 리셋"
              right={<Text style={{ fontSize: 12, color: colors.danger, fontWeight: '500' }}>초기화 ›</Text>} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleResetData} activeOpacity={0.7}>
            <SettingRow colors={colors} icon="🗑️" label="전체 데이터 삭제" sub="루틴, 기록, 스트릭 모두 삭제"
              right={<Text style={{ fontSize: 12, color: colors.danger, fontWeight: '500' }}>삭제 ›</Text>} />
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center', paddingVertical: 30 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSec }}>GlowDay v1.0.0</Text>
          <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 3 }}>뷰티 루틴 캘린더 💖</Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
