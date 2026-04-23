import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Categories } from '../constants/theme';
import { useTheme } from '../constants/ThemeContext';
import GlowModal from '../components/GlowModal';
import { DEFAULT_CATEGORIES, getCustomCategories, addCustomCategory, deleteCustomCategory, getAllCategoriesMap, getAvailableColors, getAvailableIcons } from '../db/categories';
import { today } from '../utils/date';

const IS_WEB = Platform.OS === 'web';
let dbFns: any = null;
let Haptics: any = null;
if (!IS_WEB) { dbFns = require('../db/database'); Haptics = require('expo-haptics'); }
const haptic = (t: string) => { if (!Haptics) return; if (t === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); else if (t === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };
const DN = ['일','월','화','수','목','금','토'];
const EVENT_CATS = ['salon','clinic','other'] as const;

export default function AddScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const er = route.params?.editRoutine || null;
  const ee = route.params?.editEvent || null;
  const isEditRoutine = !!er;
  const isEditEvent = !!ee;

  const [mode, setMode] = useState<'routine'|'event'>(ee ? 'event' : 'routine');
  const [cat, setCat] = useState('');
  const [name, setName] = useState('');
  const [ts, setTs] = useState<'AM'|'PM'>('AM');
  const [days, setDays] = useState([0,1,2,3,4,5,6]);
  const [modal, setModal] = useState<any>({visible:false,title:''});
  const [customCats, setCustomCats] = useState<any[]>([]);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#8B5CF6');
  const [newCatIcon, setNewCatIcon] = useState('🌸');
  const [evCat, setEvCat] = useState('salon');
  const [evTitle, setEvTitle] = useState('');
  const [evDate, setEvDate] = useState(today());
  const [evTime, setEvTime] = useState('14:00');
  const [evMemo, setEvMemo] = useState('');

  const loadCats = () => { if (!IS_WEB) setCustomCats(getCustomCategories()); };
  useFocusEffect(React.useCallback(() => { loadCats(); }, []));

  useEffect(() => {
    if (er) { setMode('routine'); setCat(er.category); setName(er.name); setTs(er.time_slot); setDays(JSON.parse(er.repeat_days)); }
    else if (ee) { setMode('event'); setEvCat(ee.category); setEvTitle(ee.title); setEvDate(ee.date); setEvTime(ee.time); setEvMemo(ee.memo || ''); }
    else { setCat(''); setName(''); setTs('AM'); setDays([0,1,2,3,4,5,6]); setEvCat('salon'); setEvTitle(''); setEvDate(today()); setEvTime('14:00'); setEvMemo(''); }
  }, [er, ee]);

  const toggleDay = (d: number) => { haptic('light'); setDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d].sort()); };
  const allCatsMap = IS_WEB ? { ...Categories } : getAllCategoriesMap();
  const defaultKeys = Object.keys(DEFAULT_CATEGORIES).filter(k => k !== 'salon' && k !== 'clinic');

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) { setModal({ visible: true, emoji: '📝', title: '카테고리 이름을 입력해주세요', buttons: [{ text: '확인', onPress: () => setModal((m: any) => ({ ...m, visible: false })), style: 'primary' }] }); return; }
    if (!IS_WEB) { const id = 'custom_' + Date.now(); const success = await addCustomCategory({ id, label: newCatName.trim(), color: newCatColor, icon: newCatIcon }); if (!success) { setModal({ visible: true, emoji: '⚠️', title: '카테고리는 최대 50개까지 가능해요', buttons: [{ text: '확인', onPress: () => setModal((m: any) => ({ ...m, visible: false })), style: 'primary' }] }); return; } loadCats(); setCat(id); }
    haptic('success'); setShowNewCat(false); setNewCatName('');
  };

  const handleDeleteCategory = (c: any) => {
    setModal({ visible: true, emoji: '🗑️', title: `"${c.label}" 카테고리를 삭제할까요?`, buttons: [
      { text: '취소', onPress: () => setModal((m: any) => ({ ...m, visible: false })), style: 'default' },
      { text: '삭제', onPress: async () => { setModal((m: any) => ({ ...m, visible: false })); if (!IS_WEB) await deleteCustomCategory(c.id); haptic('medium'); if (cat === c.id) setCat(''); loadCats(); }, style: 'danger' },
    ] });
  };

  const saveRoutine = async () => {
    if (!cat || !name.trim()) { setModal({ visible: true, emoji: '📝', title: '카테고리와 이름을 입력해주세요', buttons: [{ text: '확인', onPress: () => setModal((m: any) => ({ ...m, visible: false })), style: 'primary' }] }); return; }
    if (days.length === 0) { setModal({ visible: true, emoji: '📅', title: '반복 요일을 선택해주세요', buttons: [{ text: '확인', onPress: () => setModal((m: any) => ({ ...m, visible: false })), style: 'primary' }] }); return; }
    if (!IS_WEB) { const c = allCatsMap[cat] || { icon: '🌸' }; if (isEditRoutine) { await dbFns.updateRoutine(er.id, { name: name.trim(), category: cat, time_slot: ts, icon: c.icon, repeat_days: JSON.stringify(days) }); } else { await dbFns.addRoutine({ id: 'r_' + Date.now(), name: name.trim(), category: cat, time_slot: ts, icon: c.icon, repeat_days: JSON.stringify(days), active: 1 }); } }
    haptic('success'); setModal({ visible: true, emoji: isEditRoutine ? '✅' : '✨', title: isEditRoutine ? '수정 완료!' : '루틴 추가 완료!', buttons: [{ text: '확인', onPress: () => { setModal((m: any) => ({ ...m, visible: false })); nav.navigate('Home'); }, style: 'primary' }] });
  };

  const saveEvent = async () => {
    if (!evTitle.trim()) { setModal({ visible: true, emoji: '📝', title: '일정 이름을 입력해주세요', buttons: [{ text: '확인', onPress: () => setModal((m: any) => ({ ...m, visible: false })), style: 'primary' }] }); return; }
    if (!IS_WEB) {
      if (isEditEvent) {
        const db = dbFns.getDB();
        await db.runAsync('UPDATE beauty_events SET title=?, category=?, date=?, time=?, memo=? WHERE id=?', [evTitle.trim(), evCat, evDate, evTime, evMemo, ee.id]);
      } else {
        await dbFns.addEvent({ id: 'e_' + Date.now(), title: evTitle.trim(), category: evCat, date: evDate, time: evTime, remind_before: 60, memo: evMemo, recurring: 0 });
      }
    }
    haptic('success');
    setModal({ visible: true, emoji: '📅', title: isEditEvent ? '일정 수정 완료!' : '일정 추가 완료!', buttons: [{ text: '확인', onPress: () => { setModal((m: any) => ({ ...m, visible: false })); setEvTitle(''); setEvMemo(''); nav.navigate('Home'); }, style: 'primary' }] });
  };

  const delRoutine = () => { if (!isEditRoutine) return; setModal({ visible: true, emoji: '🗑️', title: '"' + er.name + '" 삭제할까요?', buttons: [{ text: '취소', onPress: () => setModal((m: any) => ({ ...m, visible: false })), style: 'default' }, { text: '삭제', onPress: async () => { setModal((m: any) => ({ ...m, visible: false })); if (!IS_WEB) await dbFns.deleteRoutine(er.id); haptic('medium'); nav.navigate('Home'); }, style: 'danger' }] }); };

  const delEvent = () => { if (!isEditEvent) return; setModal({ visible: true, emoji: '🗑️', title: '"' + ee.title + '" 삭제할까요?', buttons: [{ text: '취소', onPress: () => setModal((m: any) => ({ ...m, visible: false })), style: 'default' }, { text: '삭제', onPress: async () => { setModal((m: any) => ({ ...m, visible: false })); if (!IS_WEB) await dbFns.deleteEvent(ee.id); haptic('medium'); nav.navigate('Home'); }, style: 'danger' }] }); };

  const ok = cat && name.trim() && days.length > 0;
  const COLORS = getAvailableColors();
  const ICONS = getAvailableIcons();

  return (<SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
    <GlowModal visible={modal.visible} emoji={modal.emoji} title={modal.title} message={modal.message} buttons={modal.buttons} onClose={() => setModal((m: any) => ({ ...m, visible: false }))} />
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}><Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{isEditRoutine ? '루틴 수정' : isEditEvent ? '일정 수정' : '새로 추가'}</Text></View>

      {/* Mode Toggle - only when not editing */}
      {!isEditRoutine && !isEditEvent && (
        <View style={{ flexDirection: 'row', marginHorizontal: 20, marginTop: 14, backgroundColor: colors.toggleBg, borderRadius: 12, padding: 3 }}>
          {[{ id: 'routine' as const, label: '루틴 추가', icon: '✅' }, { id: 'event' as const, label: '일정 추가', icon: '📅' }].map(m => (
            <TouchableOpacity key={m.id} onPress={() => { haptic('light'); setMode(m.id); }} activeOpacity={0.7}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 5, backgroundColor: mode === m.id ? colors.card : 'transparent', ...(mode === m.id ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 } : {}) }}>
              <Text style={{ fontSize: 14 }}>{m.icon}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: mode === m.id ? colors.primary : colors.textSec }}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {mode === 'routine' ? (
        <>
          <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSec, marginBottom: 8 }}>카테고리</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {defaultKeys.map(key => { const c = DEFAULT_CATEGORIES[key]; const sel = cat === key; return (
                <TouchableOpacity key={key} onPress={() => { haptic('light'); setCat(key); setShowNewCat(false); }} activeOpacity={0.7} style={{ width: '47%', padding: 14, borderRadius: 14, backgroundColor: sel ? c.color + '15' : colors.card, borderWidth: sel ? 2 : 1.5, borderColor: sel ? c.color : colors.border }}>
                  <Text style={{ fontSize: 24 }}>{c.icon}</Text><Text style={{ fontSize: 13, fontWeight: '600', color: sel ? c.color : colors.text, marginTop: 4 }}>{c.label}</Text>
                </TouchableOpacity>); })}
              {customCats.map(c => { const sel = cat === c.id; return (
                <TouchableOpacity key={c.id} onPress={() => { haptic('light'); setCat(c.id); setShowNewCat(false); }} onLongPress={() => handleDeleteCategory(c)} activeOpacity={0.7} style={{ width: '47%', padding: 14, borderRadius: 14, backgroundColor: sel ? c.color + '15' : colors.card, borderWidth: sel ? 2 : 1.5, borderColor: sel ? c.color : colors.border }}>
                  <Text style={{ fontSize: 24 }}>{c.icon}</Text><Text style={{ fontSize: 13, fontWeight: '600', color: sel ? c.color : colors.text, marginTop: 4 }}>{c.label}</Text>
                </TouchableOpacity>); })}
              <TouchableOpacity onPress={() => { haptic('light'); setShowNewCat(!showNewCat); setCat(''); }} activeOpacity={0.7} style={{ width: '47%', padding: 14, borderRadius: 14, backgroundColor: showNewCat ? colors.primaryBg : colors.card, borderWidth: showNewCat ? 2 : 1.5, borderColor: showNewCat ? colors.primary : colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24 }}>➕</Text><Text style={{ fontSize: 13, fontWeight: '600', color: showNewCat ? colors.primary : colors.textSec, marginTop: 4 }}>새 카테고리</Text><Text style={{ fontSize: 10, color: colors.textLight, marginTop: 2 }}>{customCats.length}/50</Text>
              </TouchableOpacity>
            </View>
          </View>
          {showNewCat && (
            <View style={{ marginHorizontal: 20, marginTop: 14, padding: 16, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12 }}>✨ 새 카테고리 만들기</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSec, marginBottom: 6 }}>카테고리 이름</Text>
              <TextInput value={newCatName} onChangeText={setNewCatName} placeholder="예: 마사지, 네일케어" placeholderTextColor={colors.textLight} style={{ padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, fontSize: 14, color: colors.text, backgroundColor: colors.bg, marginBottom: 14 }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSec, marginBottom: 6 }}>아이콘 선택</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}><View style={{ flexDirection: 'row', gap: 6 }}>
                {ICONS.map(icon => (<TouchableOpacity key={icon} onPress={() => { haptic('light'); setNewCatIcon(icon); }} style={{ width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: newCatIcon === icon ? newCatColor + '20' : colors.toggleBg, borderWidth: newCatIcon === icon ? 2 : 0, borderColor: newCatColor }}><Text style={{ fontSize: 22 }}>{icon}</Text></TouchableOpacity>))}
              </View></ScrollView>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSec, marginBottom: 6 }}>색상 선택</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {COLORS.map((color, idx) => (<TouchableOpacity key={color + idx} onPress={() => { haptic('light'); setNewCatColor(color); }} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: color, borderWidth: newCatColor === color ? 3 : 0, borderColor: colors.text }} />))}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: newCatColor + '10', marginBottom: 14 }}><Text style={{ fontSize: 22 }}>{newCatIcon}</Text><Text style={{ fontSize: 14, fontWeight: '600', color: newCatColor }}>{newCatName || '미리보기'}</Text></View>
              <TouchableOpacity onPress={handleCreateCategory} activeOpacity={0.8} style={{ paddingVertical: 13, borderRadius: 12, alignItems: 'center', backgroundColor: newCatName.trim() ? colors.primary : colors.border }}><Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>카테고리 생성</Text></TouchableOpacity>
            </View>
          )}
          {cat ? (<>
            <View style={{ paddingHorizontal: 20, marginTop: 18 }}><Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSec, marginBottom: 6 }}>루틴 이름</Text><TextInput value={name} onChangeText={setName} placeholder="예: 비타민C 세럼 바르기" placeholderTextColor={colors.textLight} style={{ padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, fontSize: 14, color: colors.text, backgroundColor: colors.card }} /></View>
            <View style={{ paddingHorizontal: 20, marginTop: 18 }}><Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSec, marginBottom: 6 }}>시간대</Text><View style={{ flexDirection: 'row', gap: 10 }}>{(['AM', 'PM'] as const).map(s => (<TouchableOpacity key={s} onPress={() => { haptic('light'); setTs(s); }} activeOpacity={0.7} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: ts === s ? 2 : 1.5, borderColor: ts === s ? colors.primary : colors.border, backgroundColor: ts === s ? colors.primaryBg : colors.card }}><Text style={{ fontSize: 13, fontWeight: '600', color: ts === s ? colors.primary : colors.textSec }}>{s === 'AM' ? '☀️ 아침' : '🌙 저녁'}</Text></TouchableOpacity>))}</View></View>
            <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSec, marginBottom: 6 }}>반복 요일</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>{DN.map((d, i) => (<TouchableOpacity key={d} onPress={() => toggleDay(i)} activeOpacity={0.7} style={{ width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: days.includes(i) ? colors.primary : colors.card, borderWidth: days.includes(i) ? 0 : 1.5, borderColor: colors.border }}><Text style={{ fontSize: 13, fontWeight: '500', color: days.includes(i) ? '#fff' : colors.textSec }}>{d}</Text></TouchableOpacity>))}</View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>{[{ l: '매일', d: [0,1,2,3,4,5,6] }, { l: '주중', d: [1,2,3,4,5] }, { l: '주말', d: [0,6] }].map(q => (<TouchableOpacity key={q.l} onPress={() => { haptic('light'); setDays(q.d); }} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primaryBg }}><Text style={{ fontSize: 12, fontWeight: '500', color: colors.primary }}>{q.l}</Text></TouchableOpacity>))}</View>
            </View>
            <View style={{ paddingHorizontal: 20, marginTop: 24, gap: 10 }}>
              <TouchableOpacity onPress={saveRoutine} disabled={!ok} activeOpacity={0.8} style={{ paddingVertical: 15, borderRadius: 14, alignItems: 'center', backgroundColor: ok ? colors.primary : colors.border }}><Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{isEditRoutine ? '수정 완료' : '저장하기'}</Text></TouchableOpacity>
              {isEditRoutine && <TouchableOpacity onPress={delRoutine} activeOpacity={0.8} style={{ paddingVertical: 15, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.danger }}><Text style={{ fontSize: 14, fontWeight: '600', color: colors.danger }}>삭제하기</Text></TouchableOpacity>}
            </View>
          </>) : null}
        </>
      ) : (
        <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSec, marginBottom: 8 }}>카테고리</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
            {EVENT_CATS.map(key => {
              const c = (Categories as any)[key] || Categories.other;
              const sel = evCat === key;
              return (
                <TouchableOpacity key={key} onPress={() => { haptic('light'); setEvCat(key); }} activeOpacity={0.7}
                  style={{ flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', backgroundColor: sel ? c.color + '15' : colors.card, borderWidth: sel ? 2 : 1.5, borderColor: sel ? c.color : colors.border }}>
                  <Text style={{ fontSize: 24 }}>{c.icon}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: sel ? c.color : colors.text, marginTop: 4 }}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSec, marginBottom: 6 }}>일정 이름</Text>
          <TextInput value={evTitle} onChangeText={setEvTitle} placeholder="예: 네일샵 예약" placeholderTextColor={colors.textLight}
            style={{ padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, fontSize: 14, color: colors.text, backgroundColor: colors.card, marginBottom: 14 }} />
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSec, marginBottom: 6 }}>날짜</Text>
              <TextInput value={evDate} onChangeText={setEvDate} placeholder="2026-04-22" placeholderTextColor={colors.textLight}
                style={{ padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, fontSize: 14, color: colors.text, backgroundColor: colors.card }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSec, marginBottom: 6 }}>시간</Text>
              <TextInput value={evTime} onChangeText={setEvTime} placeholder="14:00" placeholderTextColor={colors.textLight}
                style={{ padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, fontSize: 14, color: colors.text, backgroundColor: colors.card }} />
            </View>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSec, marginBottom: 6 }}>메모 (선택)</Text>
          <TextInput value={evMemo} onChangeText={setEvMemo} placeholder="메모를 입력하세요" placeholderTextColor={colors.textLight} multiline numberOfLines={3}
            style={{ padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, fontSize: 14, color: colors.text, backgroundColor: colors.card, marginBottom: 20, textAlignVertical: 'top', minHeight: 80 }} />
          <View style={{ gap: 10 }}>
            <TouchableOpacity onPress={saveEvent} disabled={!evTitle.trim()} activeOpacity={0.8}
              style={{ paddingVertical: 15, borderRadius: 14, alignItems: 'center', backgroundColor: evTitle.trim() ? colors.primary : colors.border }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{isEditEvent ? '수정 완료' : '일정 저장하기'}</Text>
            </TouchableOpacity>
            {isEditEvent && (
              <TouchableOpacity onPress={delEvent} activeOpacity={0.8}
                style={{ paddingVertical: 15, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.danger }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.danger }}>삭제하기</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      <View style={{ height: 60 }} />
    </ScrollView>
  </SafeAreaView>);
}
