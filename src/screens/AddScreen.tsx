import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Categories } from '../constants/theme';
import GlowModal from '../components/GlowModal';
import { DEFAULT_CATEGORIES, getCustomCategories, addCustomCategory, deleteCustomCategory, getAllCategoriesMap, getAvailableColors, getAvailableIcons } from '../db/categories';

const IS_WEB = Platform.OS === 'web';
let dbFns: any = null;
let Haptics: any = null;
if (!IS_WEB) { dbFns = require('../db/database'); Haptics = require('expo-haptics'); }
const haptic = (t: string) => { if (!Haptics) return; if (t === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); else if (t === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };
const DN = ['일','월','화','수','목','금','토'];

export default function AddScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const er = route.params?.editRoutine || null;
  const isEdit = !!er;

  const [cat, setCat] = useState('');
  const [name, setName] = useState('');
  const [ts, setTs] = useState<'AM'|'PM'>('AM');
  const [days, setDays] = useState([0,1,2,3,4,5,6]);
  const [modal, setModal] = useState<any>({ visible: false, title: '' });
  const [customCats, setCustomCats] = useState<any[]>([]);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#8B5CF6');
  const [newCatIcon, setNewCatIcon] = useState('🌸');

  const loadCats = () => {
    if (!IS_WEB) setCustomCats(getCustomCategories());
  };

  useFocusEffect(React.useCallback(() => { loadCats(); }, []));

  useEffect(() => {
    if (er) { setCat(er.category); setName(er.name); setTs(er.time_slot); setDays(JSON.parse(er.repeat_days)); }
    else { setCat(''); setName(''); setTs('AM'); setDays([0,1,2,3,4,5,6]); }
  }, [er]);

  const toggleDay = (d: number) => { haptic('light'); setDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d].sort()); };

  const allCatsMap = IS_WEB ? { ...Categories } : getAllCategoriesMap();
  const defaultKeys = Object.keys(DEFAULT_CATEGORIES);
  const customKeys = customCats.map(c => c.id);
  const allKeys = [...defaultKeys, ...customKeys];

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) {
      setModal({ visible: true, emoji: '📝', title: '카테고리 이름을 입력해주세요', buttons: [{ text: '확인', onPress: () => setModal((m: any) => ({ ...m, visible: false })), style: 'primary' }] });
      return;
    }
    if (!IS_WEB) {
      const id = 'custom_' + Date.now();
      const success = await addCustomCategory({ id, label: newCatName.trim(), color: newCatColor, icon: newCatIcon });
      if (!success) {
        setModal({ visible: true, emoji: '⚠️', title: '카테고리는 최대 50개까지 가능해요', buttons: [{ text: '확인', onPress: () => setModal((m: any) => ({ ...m, visible: false })), style: 'primary' }] });
        return;
      }
      loadCats();
      setCat(id);
    }
    haptic('success');
    setShowNewCat(false);
    setNewCatName('');
  };

  const handleDeleteCategory = (c: any) => {
    setModal({
      visible: true, emoji: '🗑️', title: `"${c.label}" 카테고리를 삭제할까요?`,
      buttons: [
        { text: '취소', onPress: () => setModal((m: any) => ({ ...m, visible: false })), style: 'default' },
        { text: '삭제', onPress: async () => {
          setModal((m: any) => ({ ...m, visible: false }));
          if (!IS_WEB) await deleteCustomCategory(c.id);
          haptic('medium');
          if (cat === c.id) setCat('');
          loadCats();
        }, style: 'danger' },
      ],
    });
  };

  const save = async () => {
    if (!cat || !name.trim()) { setModal({ visible: true, emoji: '📝', title: '카테고리와 이름을 입력해주세요', buttons: [{ text: '확인', onPress: () => setModal((m: any) => ({ ...m, visible: false })), style: 'primary' }] }); return; }
    if (days.length === 0) { setModal({ visible: true, emoji: '📅', title: '반복 요일을 선택해주세요', buttons: [{ text: '확인', onPress: () => setModal((m: any) => ({ ...m, visible: false })), style: 'primary' }] }); return; }
    if (!IS_WEB) {
      const catInfo = allCatsMap[cat] || { icon: '🌸' };
      if (isEdit) { await dbFns.updateRoutine(er.id, { name: name.trim(), category: cat, time_slot: ts, icon: catInfo.icon, repeat_days: JSON.stringify(days) }); }
      else { await dbFns.addRoutine({ id: 'r_' + Date.now(), name: name.trim(), category: cat, time_slot: ts, icon: catInfo.icon, repeat_days: JSON.stringify(days), active: 1 }); }
    }
    haptic('success');
    setModal({ visible: true, emoji: isEdit ? '✅' : '✨', title: isEdit ? '수정 완료!' : '루틴 추가 완료!', buttons: [{ text: '확인', onPress: () => { setModal((m: any) => ({ ...m, visible: false })); nav.navigate('Home'); }, style: 'primary' }] });
  };

  const del = () => {
    if (!isEdit) return;
    setModal({ visible: true, emoji: '🗑️', title: '"' + er.name + '" 삭제할까요?', buttons: [
      { text: '취소', onPress: () => setModal((m: any) => ({ ...m, visible: false })), style: 'default' },
      { text: '삭제', onPress: async () => { setModal((m: any) => ({ ...m, visible: false })); if (!IS_WEB) await dbFns.deleteRoutine(er.id); haptic('medium'); nav.navigate('Home'); }, style: 'danger' },
    ] });
  };

  const ok = cat && name.trim() && days.length > 0;
  const COLORS = getAvailableColors();
  const ICONS = getAvailableIcons();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFB' }} edges={['top']}>
      <GlowModal visible={modal.visible} emoji={modal.emoji} title={modal.title} message={modal.message} buttons={modal.buttons} onClose={() => setModal((m: any) => ({ ...m, visible: false }))} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#2C2C2A' }}>{isEdit ? '루틴 수정' : '새 루틴 추가'}</Text>
        </View>

        {/* Categories */}
        <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#888780', marginBottom: 8 }}>카테고리</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {/* Default categories */}
            {defaultKeys.map(key => {
              const c = DEFAULT_CATEGORIES[key];
              const sel = cat === key;
              return (
                <TouchableOpacity key={key} onPress={() => { haptic('light'); setCat(key); setShowNewCat(false); }} activeOpacity={0.7}
                  style={{ width: '47%', padding: 14, borderRadius: 14, backgroundColor: sel ? c.color + '15' : '#fff', borderWidth: sel ? 2 : 1.5, borderColor: sel ? c.color : '#f0eeeb' }}>
                  <Text style={{ fontSize: 24 }}>{c.icon}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: sel ? c.color : '#2C2C2A', marginTop: 4 }}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
            {/* Custom categories */}
            {customCats.map(c => {
              const sel = cat === c.id;
              return (
                <TouchableOpacity key={c.id} onPress={() => { haptic('light'); setCat(c.id); setShowNewCat(false); }}
                  onLongPress={() => handleDeleteCategory(c)} activeOpacity={0.7}
                  style={{ width: '47%', padding: 14, borderRadius: 14, backgroundColor: sel ? c.color + '15' : '#fff', borderWidth: sel ? 2 : 1.5, borderColor: sel ? c.color : '#f0eeeb' }}>
                  <Text style={{ fontSize: 24 }}>{c.icon}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: sel ? c.color : '#2C2C2A', marginTop: 4 }}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
            {/* + New category button */}
            <TouchableOpacity onPress={() => { haptic('light'); setShowNewCat(!showNewCat); setCat(''); }} activeOpacity={0.7}
              style={{ width: '47%', padding: 14, borderRadius: 14, backgroundColor: showNewCat ? '#D4537E08' : '#fff', borderWidth: showNewCat ? 2 : 1.5, borderColor: showNewCat ? '#D4537E' : '#f0eeeb', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 24 }}>➕</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: showNewCat ? '#D4537E' : '#888780', marginTop: 4 }}>새 카테고리</Text>
              <Text style={{ fontSize: 10, color: '#c0bdb8', marginTop: 2 }}>{customCats.length}/50</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* New category form */}
        {showNewCat && (
          <View style={{ marginHorizontal: 20, marginTop: 14, padding: 16, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f0eeeb' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#2C2C2A', marginBottom: 12 }}>✨ 새 카테고리 만들기</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#888780', marginBottom: 6 }}>카테고리 이름</Text>
            <TextInput value={newCatName} onChangeText={setNewCatName} placeholder="예: 마사지, 네일케어" placeholderTextColor="#c0bdb8"
              style={{ padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#f0eeeb', fontSize: 14, color: '#2C2C2A', backgroundColor: '#fafaf9', marginBottom: 14 }} />

            <Text style={{ fontSize: 12, fontWeight: '600', color: '#888780', marginBottom: 6 }}>아이콘 선택</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {ICONS.map(icon => (
                  <TouchableOpacity key={icon} onPress={() => { haptic('light'); setNewCatIcon(icon); }}
                    style={{ width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: newCatIcon === icon ? newCatColor + '20' : '#f5f3f0', borderWidth: newCatIcon === icon ? 2 : 0, borderColor: newCatColor }}>
                    <Text style={{ fontSize: 22 }}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={{ fontSize: 12, fontWeight: '600', color: '#888780', marginBottom: 6 }}>색상 선택</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {COLORS.map(color => (
                <TouchableOpacity key={color} onPress={() => { haptic('light'); setNewCatColor(color); }}
                  style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: color, borderWidth: newCatColor === color ? 3 : 0, borderColor: '#2C2C2A' }} />
              ))}
            </View>

            {/* Preview */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: newCatColor + '10', marginBottom: 14 }}>
              <Text style={{ fontSize: 22 }}>{newCatIcon}</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: newCatColor }}>{newCatName || '미리보기'}</Text>
            </View>

            <TouchableOpacity onPress={handleCreateCategory} activeOpacity={0.8}
              style={{ paddingVertical: 13, borderRadius: 12, alignItems: 'center', backgroundColor: newCatName.trim() ? '#D4537E' : '#e8e6e3' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>카테고리 생성</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Routine form */}
        {cat ? (<>
          <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#888780', marginBottom: 6 }}>루틴 이름</Text>
            <TextInput value={name} onChangeText={setName} placeholder="예: 비타민C 세럼 바르기" placeholderTextColor="#c0bdb8"
              style={{ padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#f0eeeb', fontSize: 14, color: '#2C2C2A', backgroundColor: '#fff' }} />
          </View>
          <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#888780', marginBottom: 6 }}>시간대</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(['AM', 'PM'] as const).map(s => (
                <TouchableOpacity key={s} onPress={() => { haptic('light'); setTs(s); }} activeOpacity={0.7}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: ts === s ? 2 : 1.5, borderColor: ts === s ? '#D4537E' : '#f0eeeb', backgroundColor: ts === s ? '#D4537E08' : '#fff' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: ts === s ? '#D4537E' : '#888780' }}>{s === 'AM' ? '☀️ 아침' : '🌙 저녁'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#888780', marginBottom: 6 }}>반복 요일</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {DN.map((d, i) => (
                <TouchableOpacity key={d} onPress={() => toggleDay(i)} activeOpacity={0.7}
                  style={{ width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: days.includes(i) ? '#D4537E' : '#fff', borderWidth: days.includes(i) ? 0 : 1.5, borderColor: '#f0eeeb' }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: days.includes(i) ? '#fff' : '#888780' }}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              {[{ l: '매일', d: [0, 1, 2, 3, 4, 5, 6] }, { l: '주중', d: [1, 2, 3, 4, 5] }, { l: '주말', d: [0, 6] }].map(q => (
                <TouchableOpacity key={q.l} onPress={() => { haptic('light'); setDays(q.d); }}
                  style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: '#D4537E10' }}>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: '#D4537E' }}>{q.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ paddingHorizontal: 20, marginTop: 24, gap: 10 }}>
            <TouchableOpacity onPress={save} disabled={!ok} activeOpacity={0.8}
              style={{ paddingVertical: 15, borderRadius: 14, alignItems: 'center', backgroundColor: ok ? '#D4537E' : '#e8e6e3' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{isEdit ? '수정 완료' : '저장하기'}</Text>
            </TouchableOpacity>
            {isEdit && (
              <TouchableOpacity onPress={del} activeOpacity={0.8}
                style={{ paddingVertical: 15, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#E8789A' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#E8789A' }}>삭제하기</Text>
              </TouchableOpacity>
            )}
          </View>
        </>) : null}
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
