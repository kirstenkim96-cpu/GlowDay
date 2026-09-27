import React, { useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Platform, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import GlowModal from '../components/GlowModal';
import EditProfileScreen from './EditProfileScreen';
import { useTheme, ACCENTS, AccentKey } from '../constants/ThemeContext';

const IS_WEB = Platform.OS === 'web';
let dbFns: any = null;
let Haptics: any = null;
let Sharing: any = null;
let FileSystem: any = null;
let notifUtils: any = null;
if (!IS_WEB) {
  dbFns = require('../db/database');
  Haptics = require('expo-haptics');
  notifUtils = require('../utils/notifications');
  try { Sharing = require('expo-sharing'); } catch {}
  try { FileSystem = require('expo-file-system'); } catch {}
}
const haptic = (t: string) => {
  if (!Haptics) return;
  if (t === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (t === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const ITEM_H = 44;

function WheelPicker({ data, selected, onSelect, colors }: any) {
  const loopData = [...data, ...data, ...data];
  const ref = useRef<FlatList>(null);
  const idx = data.indexOf(selected);
  const startIdx = data.length + idx;

  React.useEffect(() => {
    if (ref.current && idx >= 0) {
      setTimeout(() => { ref.current?.scrollToIndex({ index: startIdx, animated: false }); }, 100);
    }
  }, []);

  return (
    <View style={{ height: ITEM_H * 3, overflow: "hidden", width: 70 }}>
      <View style={{ position: "absolute", top: ITEM_H, left: 0, right: 0, height: ITEM_H, backgroundColor: colors.primaryBg, borderRadius: 10, zIndex: -1 }} />
      <FlatList
        ref={ref}
        data={loopData}
        keyExtractor={(item, i) => item + "_" + i}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_H }}
        getItemLayout={(_, index) => ({ length: ITEM_H, offset: ITEM_H * index, index })}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
          const realIdx = i % data.length;
          if (data[realIdx]) onSelect(data[realIdx]);
          if (i < data.length || i >= data.length * 2) {
            ref.current?.scrollToIndex({ index: data.length + realIdx, animated: false });
          }
        }}
        renderItem={({ item }) => {
          const isSel = item === selected;
          return (
            <View style={{ height: ITEM_H, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: isSel ? 18 : 14, fontWeight: isSel ? "700" : "400", color: isSel ? colors.primary : colors.textLight }}>{item}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

function SettingRow({ icon, label, sub, right, colors }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.toggleBg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 17 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>{label}</Text>
        {sub ? <Text style={{ fontSize: 11, color: colors.textSec, marginTop: 1 }}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

function SectionLabel({ text, colors }: { text: string; colors: any }) {
  return <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSec, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, marginTop: 20 }}>{text}</Text>;
}

export default function SettingsScreen() {
  const { mode, isDark, accentKey, setMode, setAccent, colors } = useTheme();
  const navigation = useNavigation<any>();
  const [amNotif, setAmNotif] = useState(true);
  const [pmNotif, setPmNotif] = useState(true);
  const [waterReminder, setWaterReminder] = useState(false);
  const [waterIntervalMin, setWaterIntervalMin] = useState(120);
  const [amTime, setAmTime] = useState('07:00');
  const [pmTime, setPmTime] = useState('21:00');
  const [streak, setStreak] = useState<any>(null);
  const [routineCount, setRoutineCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [nickname, setNickname] = useState('GlowDay 사용자');
  const [profileEmoji, setProfileEmoji] = useState('🌸');
  const [modal, setModal] = useState<any>({ visible: false, title: '' });
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showRoutineList, setShowRoutineList] = useState(false);
  const [showEventList, setShowEventList] = useState(false);
  const [allRoutines, setAllRoutines] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [showAlarmSetting, setShowAlarmSetting] = useState<string | null>(null);
  const [pickerHour, setPickerHour] = useState('07');
  const [pickerMin, setPickerMin] = useState('00');

  const load = useCallback(async () => {
    if (IS_WEB) { setStreak({ current_streak: 5, longest_streak: 14, protection_used: 0 }); return; }
    try {
      const st = await dbFns.getStreak(); setStreak(st);
      const rts = await dbFns.getAllRoutines(); setRoutineCount(rts.length); setAllRoutines(rts);
      const evts = await dbFns.getAllEvents(); setEventCount(evts.length); setAllEvents(evts);
      const amVal = await dbFns.getSetting('am_notif');
      const pmVal = await dbFns.getSetting('pm_notif');
      setAmNotif(amVal !== '0'); setPmNotif(pmVal !== '0');
      const nick = await dbFns.getSetting('nickname');
      const pEmoji = await dbFns.getSetting('profile_emoji');
      if (nick) setNickname(nick);
      if (pEmoji) setProfileEmoji(pEmoji);
      const wr = await dbFns.getSetting('water_reminder');
      const wi = await dbFns.getSetting('water_interval_min');
      setWaterReminder(wr === '1');
      if (wi) setWaterIntervalMin(parseInt(wi));
      const at = await dbFns.getSetting('am_time'); if (at) setAmTime(at);
      const pt = await dbFns.getSetting('pm_time'); if (pt) setPmTime(pt);
    } catch (e) { console.error(e); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleNotif = async (type: 'am' | 'pm', value: boolean) => {
    haptic('light');
    if (type === 'am') setAmNotif(value); else setPmNotif(value);
    if (!IS_WEB) {
      await dbFns.setSetting(type === 'am' ? 'am_notif' : 'pm_notif', value ? '1' : '0');
      try { await notifUtils.rescheduleAll(dbFns); } catch {}
    }
  };

  const toggleWaterReminder = async (value: boolean) => {
    haptic('light');
    setWaterReminder(value);
    if (dbFns) await dbFns.setSetting('water_reminder', value ? '1' : '0');
  };

  const cycleTheme = () => {
    haptic('light');
    const next = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
    setMode(next);
  };

  const openTimePicker = (type: string) => {
    const time = type === 'am' ? amTime : pmTime;
    setPickerHour(time.split(':')[0]);
    setPickerMin(time.split(':')[1]);
    setShowAlarmSetting(type);
  };

  const saveTimePicker = () => {
    const time = pickerHour + ':' + pickerMin;
    if (showAlarmSetting === 'am') { setAmTime(time); if (dbFns) dbFns.setSetting('am_time', time); }
    else if (showAlarmSetting === 'pm') { setPmTime(time); if (dbFns) dbFns.setSetting('pm_time', time); }
    haptic('success');
    setShowAlarmSetting(null);
  };

  const changeWaterInterval = (delta: number) => {
    haptic('light');
    const next = Math.max(30, waterIntervalMin + delta);
    setWaterIntervalMin(next);
    if (dbFns) dbFns.setSetting('water_interval_min', String(next));
  };

  const formatInterval = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return m + '분';
    if (m === 0) return h + '시간';
    return h + '시간 ' + m + '분';
  };

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
      }
    } catch (e) { console.error(e); }
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
        }
        haptic('success');
        setModal({ visible: true, emoji: '✨', title: '초기화 완료!', buttons: [{ text: '확인', onPress: () => { setModal((m: any) => ({ ...m, visible: false })); load(); }, style: 'primary' }] });
      }, style: 'danger' },
    ] });
  };

  const ACCENT_KEYS: AccentKey[] = ['pink', 'navy', 'green', 'purple', 'orange'];
  const modeLabel = mode === 'system' ? '시스템 설정' : isDark ? '다크 모드' : '라이트 모드';
  const modeIcon = mode === 'system' ? '📱' : isDark ? '🌙' : '☀️';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <GlowModal visible={modal.visible} emoji={modal.emoji} title={modal.title} message={modal.message} buttons={modal.buttons} onClose={() => setModal((m: any) => ({ ...m, visible: false }))} />
      <Modal visible={showEditProfile} animationType="slide">
        <EditProfileScreen onDone={() => { setShowEditProfile(false); load(); }} />
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>설정</Text>
        </View>

        {/* Profile */}
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
          <SectionLabel text="밝기 설정" colors={colors} />
          <TouchableOpacity onPress={cycleTheme} activeOpacity={0.7}>
            <SettingRow colors={colors} icon={modeIcon} label="화면 모드" sub={modeLabel}
              right={<View style={{ backgroundColor: colors.primaryBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}><Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{modeLabel}</Text></View>} />
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

          <SectionLabel text="알림 설정" colors={colors} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <SettingRow colors={colors} icon="☀️" label="아침 루틴 알림" sub={'매일 ' + amTime}
                right={<Switch value={amNotif} onValueChange={(v) => toggleNotif('am', v)} trackColor={{ false: colors.toggleBg, true: colors.primary + '80' }} thumbColor={amNotif ? colors.primary : '#f4f3f4'} />} />
            </View>
            {amNotif && <TouchableOpacity onPress={() => openTimePicker('am')} style={{ padding: 8 }}><Text style={{ fontSize: 14 }}>⚙️</Text></TouchableOpacity>}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <SettingRow colors={colors} icon="🌙" label="저녁 루틴 알림" sub={'매일 ' + pmTime}
                right={<Switch value={pmNotif} onValueChange={(v) => toggleNotif('pm', v)} trackColor={{ false: colors.toggleBg, true: colors.primary + '80' }} thumbColor={pmNotif ? colors.primary : '#f4f3f4'} />} />
            </View>
            {pmNotif && <TouchableOpacity onPress={() => openTimePicker('pm')} style={{ padding: 8 }}><Text style={{ fontSize: 14 }}>⚙️</Text></TouchableOpacity>}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <SettingRow colors={colors} icon="💧" label="물 마시기 알림" sub={waterReminder ? waterIntervalMin + '분 마다' : '꺼짐'}
                right={<Switch value={waterReminder} onValueChange={(v) => toggleWaterReminder(v)} trackColor={{ false: colors.toggleBg, true: colors.primary + '80' }} thumbColor={waterReminder ? colors.primary : '#f4f3f4'} />} />
            </View>
            {waterReminder && <TouchableOpacity onPress={() => setShowAlarmSetting('water')} style={{ padding: 8 }}><Text style={{ fontSize: 14 }}>⚙️</Text></TouchableOpacity>}
          </View>

          <SectionLabel text="스트릭" colors={colors} />
          <SettingRow colors={colors} icon="🔥" label="현재 스트릭" sub={`${streak?.current_streak ?? 0}일 연속`}
            right={<Text style={{ fontSize: 16, fontWeight: '700', color: colors.streak }}>{streak?.current_streak ?? 0}일</Text>} />
          <SettingRow colors={colors} icon="🏆" label="최장 스트릭"
            right={<Text style={{ fontSize: 14, fontWeight: '600', color: colors.accent }}>{streak?.longest_streak ?? 0}일</Text>} />
          <SettingRow colors={colors} icon="🛡️" label="스트릭 보호권" sub={streak?.protection_used ? '이번 주 사용 완료' : '이번 주 1회 남음'}
            right={<Text style={{ fontSize: 14, fontWeight: '600', color: streak?.protection_used ? colors.textLight : colors.accent }}>{streak?.protection_used ? '0/1' : '1/1'}</Text>} />

          <SectionLabel text="루틴 관리" colors={colors} />
          <TouchableOpacity onPress={() => { haptic("light"); setShowRoutineList(true); }} activeOpacity={0.7}>
            <SettingRow colors={colors} icon="📋" label="등록된 루틴"
              right={<Text style={{ fontSize: 14, fontWeight: "600", color: colors.primary }}>{routineCount}개 ›</Text>} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { haptic("light"); setShowEventList(true); }} activeOpacity={0.7}>
            <SettingRow colors={colors} icon="📅" label="등록된 일정"
              right={<Text style={{ fontSize: 14, fontWeight: "600", color: colors.textSec }}>{eventCount}개 ›</Text>} />
          </TouchableOpacity>

          <SectionLabel text="데이터" colors={colors} />
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

      {/* Time Picker Modal (AM/PM) */}
      {(showAlarmSetting === 'am' || showAlarmSetting === 'pm') && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={() => setShowAlarmSetting(null)} />
          <View style={{ width: 300, backgroundColor: colors.card, borderRadius: 20, padding: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 20 }}>
              {showAlarmSetting === 'am' ? '☀️ 아침 알림 시간' : '🌙 저녁 알림 시간'}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <WheelPicker data={HOURS} selected={pickerHour} onSelect={setPickerHour} colors={colors} />
              <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>:</Text>
              <WheelPicker data={MINUTES} selected={pickerMin} onSelect={setPickerMin} colors={colors} />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, textAlign: 'center', marginBottom: 16 }}>{pickerHour}:{pickerMin}</Text>
            <TouchableOpacity onPress={saveTimePicker} activeOpacity={0.8}
              style={{ paddingVertical: 13, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Water Interval Modal */}
      {showAlarmSetting === 'water' && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={() => setShowAlarmSetting(null)} />
          <View style={{ width: 300, backgroundColor: colors.card, borderRadius: 20, padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 20 }}>💧 물 마시기 간격</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 16 }}>
              <TouchableOpacity onPress={() => changeWaterInterval(-30)}
                style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.toggleBg, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 22, color: colors.textSec }}>−</Text>
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: colors.primary }}>{formatInterval(waterIntervalMin)}</Text>
              </View>
              <TouchableOpacity onPress={() => changeWaterInterval(30)}
                style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 22, color: colors.primary }}>+</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity onPress={() => { haptic('success'); setShowAlarmSetting(null); }} activeOpacity={0.8}
              style={{ width: '100%', paddingVertical: 13, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* Routine List Modal */}
      <Modal visible={showRoutineList} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowRoutineList(false)} />
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: "70%" }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 16 }} />
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 16 }}>📋 등록된 루틴 ({routineCount}개)</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {allRoutines.map(r => {
                const catMap: any = { skincare: "스킨케어", supplement: "영양제", haircare: "헤어케어", bodycare: "바디케어" };
                const days = JSON.parse(r.repeat_days || "[]");
                const dayLabel = days.length === 7 ? "매일" : days.length === 5 && !days.includes(0) && !days.includes(6) ? "주중" : days.map((d: number) => ["일","월","화","수","목","금","토"][d]).join(",");
                return (
                  <TouchableOpacity key={r.id} onPress={() => { setShowRoutineList(false); setTimeout(() => { navigation.navigate("Add", { editRoutine: r }); }, 300); }} activeOpacity={0.7}
                    style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                    <Text style={{ fontSize: 16 }}>{r.icon || "🌸"}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "500", color: colors.text }}>{r.name}</Text>
                      <Text style={{ fontSize: 11, color: colors.textSec }}>{r.time_slot === "AM" ? "아침" : "저녁"} · {catMap[r.category] || r.category} · {dayLabel}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textLight }}>›</Text>
                  </TouchableOpacity>
                );
              })}
              {allRoutines.length === 0 && <Text style={{ fontSize: 13, color: colors.textSec, textAlign: "center", paddingVertical: 20 }}>등록된 루틴이 없어요</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* Event List Modal */}
      <Modal visible={showEventList} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowEventList(false)} />
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: "70%" }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 16 }} />
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 16 }}>📅 등록된 일정 ({eventCount}개)</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {allEvents.map(ev => (
                <TouchableOpacity key={ev.id} onPress={() => { setShowEventList(false); setTimeout(() => { navigation.navigate("Add", { editEvent: ev }); }, 300); }} activeOpacity={0.7}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                  <Text style={{ fontSize: 16 }}>{ev.category === "salon" ? "💇" : ev.category === "clinic" ? "🏥" : "🌸"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "500", color: colors.text }}>{ev.title}</Text>
                    <Text style={{ fontSize: 11, color: colors.textSec }}>{ev.date} {ev.time}{ev.memo ? " · " + ev.memo : ""}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textLight }}>›</Text>
                </TouchableOpacity>
              ))}
              {allEvents.length === 0 && <Text style={{ fontSize: 13, color: colors.textSec, textAlign: "center", paddingVertical: 20 }}>등록된 일정이 없어요</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
