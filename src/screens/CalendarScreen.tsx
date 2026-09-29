import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform, Modal, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Categories } from '../constants/theme';
import { useTheme } from '../constants/ThemeContext';
import { today, DAY_NAMES, getDaysInMonth, getFirstDayOfMonth } from '../utils/date';
import GlowModal from '../components/GlowModal';

const IS_WEB = Platform.OS === 'web';
let dbFns: any = null;
let catFns: any = null;
let Haptics: any = null;
if (!IS_WEB) { dbFns = require('../db/database'); catFns = require('../db/categories'); Haptics = require('expo-haptics'); }
const haptic = (t?: string) => { if (!Haptics) return; if (t === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); else if (t === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const CYCLE_PRESETS = [
  { label: '3일마다', days: 3 },
  { label: '주 1회', days: 7 },
  { label: '격주', days: 14 },
  { label: '월 1회', days: 30 },
];

function getCatInfo(category: string) {
  try { if (catFns) { const m = catFns.getAllCategoriesMap(); return m[category] || Categories.other; } } catch {}
  return (Categories as any)[category] || Categories.other;
}

function getDday(lastUsed: string | null, cycleDays: number): { text: string; isToday: boolean; daysLeft: number } {
  if (!lastUsed) return { text: '오늘이에요', isToday: true, daysLeft: 0 };
  const last = new Date(lastUsed + 'T00:00:00');
  const now = new Date(today() + 'T00:00:00');
  const diff = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  const remaining = cycleDays - diff;
  if (remaining <= 0) return { text: '오늘이에요', isToday: true, daysLeft: 0 };
  return { text: 'D-' + remaining, isToday: false, daysLeft: remaining };
}

export default function CalendarScreen() {
  const { colors } = useTheme();
  const todayStr = today();
  const todayD = new Date();
  const [viewYear, setViewYear] = useState(todayD.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayD.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [monthRates, setMonthRates] = useState<Record<string, number | null>>({});
  const [monthEvents, setMonthEvents] = useState<Record<string, any[]>>({});
  const [selectedRoutines, setSelectedRoutines] = useState<any[]>([]);
  const [selectedLogs, setSelectedLogs] = useState<Record<string, boolean>>({});
  const [cycleItems, setCycleItems] = useState<any[]>([]);
  const [modal, setModal] = useState<any>({ visible: false, title: '' });

  // Add cycle
  const [showAddCycle, setShowAddCycle] = useState(false);
  const [newCycleName, setNewCycleName] = useState('');
  const [newCycleDays, setNewCycleDays] = useState(7);
  const [customDaysInput, setCustomDaysInput] = useState('');
  const [newCycleStartDate, setNewCycleStartDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(todayD.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(todayD.getMonth());

  // Edit cycle
  const [showEditCycle, setShowEditCycle] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editDays, setEditDays] = useState(7);
  const [editCustomDays, setEditCustomDays] = useState('');

  const dim = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const getDateStr = (d: number) => `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const loadMonthData = useCallback(async () => {
    if (IS_WEB) return;
    try {
      const rates: Record<string, number | null> = {};
      for (let d = 1; d <= dim; d++) { const ds = getDateStr(d); if (ds <= todayStr) { rates[ds] = await dbFns.getCompletionRate(ds); } }
      setMonthRates(rates);
      const allEv = await dbFns.getAllEvents();
      const evMap: Record<string, any[]> = {};
      allEv.forEach((e: any) => { if (!evMap[e.date]) evMap[e.date] = []; evMap[e.date].push(e); });
      setMonthEvents(evMap);
      const items = await dbFns.getAllCycleItems();
      setCycleItems(items);
    } catch (e) { console.error(e); }
  }, [viewYear, viewMonth, dim]);

  const loadSelectedDate = useCallback(async () => {
    if (IS_WEB) return;
    try {
      const [rts, lgs] = await Promise.all([dbFns.getRoutinesForDate(selectedDate), dbFns.getLogsForDate(selectedDate)]);
      setSelectedRoutines(rts); setSelectedLogs(lgs);
    } catch (e) { console.error(e); }
  }, [selectedDate]);

  useFocusEffect(useCallback(() => { loadMonthData(); }, [loadMonthData]));
  useFocusEffect(useCallback(() => { loadSelectedDate(); }, [loadSelectedDate]));

  const prevMonth = () => { haptic(); if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); } else setViewMonth(viewMonth - 1); };
  const nextMonth = () => { haptic(); const now = new Date(); if (viewYear === now.getFullYear() && viewMonth >= now.getMonth()) return; if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); } else setViewMonth(viewMonth + 1); };
  const getColor = (rate: number | null) => { if (rate === null || rate === undefined) return 'transparent'; if (rate >= 80) return '#1D9E75'; if (rate >= 50) return '#EF9F27'; if (rate > 0) return '#E05577'; return '#e0ded8'; };

  // Cycle CRUD
  const handleAddCycle = async () => {
    if (!newCycleName.trim()) return;
    haptic('success');
    const startDate = newCycleStartDate || null;
    // If start date provided, calculate last_used so D-day counts from start
    let lastUsed = null;
    if (startDate) {
      // Set last_used to startDate minus cycle_days so that "today" relative to start is correct
      const start = new Date(startDate + 'T00:00:00');
      const adjusted = new Date(start.getTime() - newCycleDays * 24 * 60 * 60 * 1000);
      lastUsed = adjusted.toISOString().split('T')[0];
    }
    const db = dbFns.getDB();
    await db.runAsync('INSERT INTO cycle_items (id, name, icon, cycle_days, category, last_used) VALUES (?, ?, ?, ?, ?, ?)',
      ['cy_' + Date.now(), newCycleName.trim(), '✨', newCycleDays, 'skincare', lastUsed]);
    setNewCycleName(''); setNewCycleDays(7); setCustomDaysInput(''); setNewCycleStartDate('');
    setShowAddCycle(false);
    loadMonthData();
  };

  const handleMarkUsed = async (item: any) => {
    haptic('success');
    await dbFns.markCycleItemUsed(item.id, todayStr);
    loadMonthData();
  };

  const handleUndoMark = async (item: any) => {
    haptic('medium');
    const db = dbFns.getDB();
    await db.runAsync('UPDATE cycle_items SET last_used = NULL WHERE id = ?', [item.id]);
    loadMonthData();
  };

  const handleDeleteCycle = (item: any) => {
    setModal({ visible: true, emoji: '🗑️', title: '"' + item.name + '" 삭제할까요?', buttons: [
      { text: '취소', onPress: () => setModal((m: any) => ({ ...m, visible: false })), style: 'default' },
      { text: '삭제', onPress: async () => { setModal((m: any) => ({ ...m, visible: false })); haptic('medium'); await dbFns.deleteCycleItem(item.id); loadMonthData(); }, style: 'danger' },
    ] });
  };

  const handleSaveEdit = async () => {
    if (!editItem || !editName.trim()) return;
    haptic('success');
    const days = editCustomDays ? parseInt(editCustomDays) : editDays;
    await dbFns.updateCycleItem(editItem.id, { name: editName.trim(), cycle_days: days > 0 ? days : 7 });
    setShowEditCycle(false); setEditItem(null);
    loadMonthData();
  };

  const handleCycleItemTap = (item: any) => {
    const dday = getDday(item.last_used, item.cycle_days);
    const cycleLabel = item.cycle_days === 7 ? '주 1회' : item.cycle_days === 14 ? '격주' : item.cycle_days === 30 ? '월 1회' : item.cycle_days + '일마다';
    const isUsedToday = item.last_used === todayStr;

    const buttons: any[] = [];
    if (!isUsedToday) {
      buttons.push({ text: '사용 완료', onPress: () => { setModal((m: any) => ({ ...m, visible: false })); handleMarkUsed(item); }, style: 'primary' });
    }
    if (isUsedToday) {
      buttons.push({ text: '사용 취소 (되돌리기)', onPress: () => { setModal((m: any) => ({ ...m, visible: false })); handleUndoMark(item); }, style: 'default' });
    }
    buttons.push({ text: '수정', onPress: () => {
      setModal((m: any) => ({ ...m, visible: false }));
      setEditItem(item); setEditName(item.name); setEditDays(item.cycle_days); setEditCustomDays('');
      setShowEditCycle(true);
    }, style: 'default' });
    buttons.push({ text: '삭제', onPress: () => { setModal((m: any) => ({ ...m, visible: false })); handleDeleteCycle(item); }, style: 'danger' });
    buttons.push({ text: '닫기', onPress: () => setModal((m: any) => ({ ...m, visible: false })), style: 'default' });

    setModal({ visible: true, emoji: '✨', title: item.name, message: cycleLabel + (item.last_used ? ' · 마지막 사용 ' + item.last_used.slice(5).replace('-', '/') : ''), buttons });
  };

  const selRate = monthRates[selectedDate] ?? null;
  const selDone = selectedRoutines.filter(r => selectedLogs[r.id]).length;
  const selParts = selectedDate.split('-');
  const selEvents = monthEvents[selectedDate] || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <GlowModal visible={modal.visible} emoji={modal.emoji} title={modal.title} message={modal.message} buttons={modal.buttons} onClose={() => setModal((m: any) => ({ ...m, visible: false }))} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 }}>
          <TouchableOpacity onPress={prevMonth} style={{ padding: 8 }}><Text style={{ fontSize: 22, color: colors.textSec }}>‹</Text></TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{viewYear}년 {MONTHS[viewMonth]}</Text>
          <TouchableOpacity onPress={nextMonth} style={{ padding: 8 }}><Text style={{ fontSize: 22, color: viewYear === todayD.getFullYear() && viewMonth >= todayD.getMonth() ? colors.textLight : colors.textSec }}>›</Text></TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            {DAY_NAMES.map(d => (
              <View key={d} style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '500', color: d === '일' ? '#E8789A' : d === '토' ? '#6B9BD2' : colors.textSec }}>{d}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {Array(firstDay).fill(null).map((_, i) => <View key={'e' + i} style={{ width: '14.28%', aspectRatio: 1 }} />)}
            {Array.from({ length: dim }, (_, i) => {
              const d = i + 1; const ds = getDateStr(d);
              const rate = monthRates[ds] ?? null;
              const hasEvent = (monthEvents[ds] || []).length > 0;
              const isToday = ds === todayStr; const isSel = ds === selectedDate; const isFuture = ds > todayStr;
              return (
                <TouchableOpacity key={d} onPress={() => { if (!isFuture) { haptic(); setSelectedDate(ds); } }}
                  style={{ width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
                    backgroundColor: isSel ? colors.primaryBg : 'transparent',
                    borderWidth: isToday ? 2 : isSel ? 1.5 : 0,
                    borderColor: isToday ? colors.primary : isSel ? colors.primary + '40' : 'transparent' }}>
                    <Text style={{ fontSize: 14, fontWeight: isToday ? '700' : '400', color: isFuture ? colors.textLight : isToday ? colors.primary : colors.text }}>{d}</Text>
                    {(rate !== null || hasEvent) && !isFuture && (
                      <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
                        {rate !== null && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: getColor(rate) }} />}
                        {hasEvent && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#5B8FD4' }} />}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Legend */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14, paddingTop: 10 }}>
          {[{ c: '#1D9E75', l: '80%+' }, { c: '#EF9F27', l: '50-79%' }, { c: '#E05577', l: '~49%' }, { c: '#5B8FD4', l: '일정' }].map(x => (
            <View key={x.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: x.c }} />
              <Text style={{ fontSize: 10, color: colors.textSec }}>{x.l}</Text>
            </View>
          ))}
        </View>

        {/* Selected Date */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{parseInt(selParts[1])}월 {parseInt(selParts[2])}일</Text>
                <Text style={{ fontSize: 12, color: colors.textSec }}>{DAY_NAMES[new Date(selectedDate + 'T00:00:00').getDay()]}요일</Text>
                {selectedDate === todayStr && <View style={{ backgroundColor: colors.primaryBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 10, fontWeight: '600', color: colors.primary }}>오늘</Text></View>}
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: selRate !== null ? getColor(selRate) : colors.textLight }}>{selRate !== null ? selRate + '%' : '-'}</Text>
            </View>
            {selectedRoutines.length === 0 && selEvents.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <Text style={{ fontSize: 13, color: colors.textSec }}>{selectedDate > todayStr ? '아직 지나지 않은 날이에요' : '이 날은 루틴이 없어요'}</Text>
              </View>
            ) : (
              <View style={{ gap: 6 }}>
                {selectedRoutines.map(r => {
                  const cat = getCatInfo(r.category); const done = !!selectedLogs[r.id];
                  return (
                    <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 10, backgroundColor: done ? cat.color + '08' : colors.toggleBg }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: done ? cat.color : cat.color + '30' }} />
                      <Text style={{ fontSize: 12.5, color: done ? colors.textSec : colors.text, textDecorationLine: done ? 'line-through' : 'none', flex: 1 }}>{r.name}</Text>
                      <Text style={{ fontSize: 10, color: cat.color, fontWeight: '500' }}>{r.time_slot}</Text>
                      {done && <Text style={{ fontSize: 10, color: '#1D9E75', fontWeight: '600' }}>✓</Text>}
                    </View>
                  );
                })}
                {selectedRoutines.length > 0 && <Text style={{ fontSize: 11, color: colors.textSec, textAlign: 'center', marginTop: 4 }}>{selDone}/{selectedRoutines.length} 완료</Text>}
                {selEvents.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>📌 일정</Text>
                    {selEvents.map((ev: any) => {
                      const eCat = (Categories as any)[ev.category] || Categories.other;
                      return (
                        <View key={ev.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 10, backgroundColor: eCat.color + '08', marginBottom: 4 }}>
                          <Text style={{ fontSize: 14 }}>{eCat.icon}</Text>
                          <Text style={{ fontSize: 12.5, color: colors.text, flex: 1 }}>{ev.title}</Text>
                          <Text style={{ fontSize: 10, color: colors.textSec }}>{ev.time}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* 스페셜 케어 */}
        <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>스페셜 케어</Text>
            <TouchableOpacity onPress={() => { haptic(); setShowAddCycle(true); }} style={{ backgroundColor: colors.primaryBg, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>+ 추가</Text>
            </TouchableOpacity>
          </View>
          {cycleItems.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 24, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>✨</Text>
              <Text style={{ fontSize: 13, color: colors.textSec }}>스페셜 케어 항목을 추가해보세요</Text>
              <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 4 }}>마스크팩, 각질케어, 헤어팩 등</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              {cycleItems.map((item, idx) => {
                const dday = getDday(item.last_used, item.cycle_days);
                const cycleLabel = item.cycle_days === 7 ? "주 1회" : item.cycle_days === 14 ? "격주" : item.cycle_days === 30 ? "월 1회" : item.cycle_days + "일마다";
                const lastLabel = item.last_used ? "마지막 사용 " + item.last_used.slice(5).replace("-", "/") : "아직 사용 기록 없음";
                return (
                  <View key={item.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderBottomWidth: idx < cycleItems.length - 1 ? 1 : 0, borderBottomColor: colors.borderLight }}>
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: dday.isToday ? colors.primaryBg : colors.toggleBg, justifyContent: "center", alignItems: "center" }}>
                      <Text style={{ fontSize: 22 }}>✨</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>{item.name}</Text>
                      <Text style={{ fontSize: 11, color: colors.textSec, marginTop: 2 }}>{cycleLabel} · {lastLabel}</Text>
                    </View>
                    {dday.isToday ? (
                      <TouchableOpacity onPress={() => handleMarkUsed(item)} activeOpacity={0.7} style={{ backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>오늘이에요</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ backgroundColor: colors.toggleBg, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 }}>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textSec }}>{dday.text}</Text>
                      </View>
                    )}
                    <TouchableOpacity onPress={() => handleCycleItemTap(item)} hitSlop={{top:12,bottom:12,left:12,right:12}} style={{width:32,height:32,borderRadius:8,justifyContent:"center",alignItems:"center"}}>
                      <Text style={{fontSize:18,color:colors.textLight}}>⋯</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Cycle Modal */}
      <Modal visible={showAddCycle} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowAddCycle(false)} />
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 20 }}>스페셜 케어 추가</Text>

            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSec, marginBottom: 6 }}>항목 이름</Text>
            <TextInput value={newCycleName} onChangeText={setNewCycleName} placeholder="예: 마스크팩, 각질케어" placeholderTextColor={colors.textLight}
              style={{ padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, fontSize: 14, color: colors.text, backgroundColor: colors.bg, marginBottom: 16 }} />

            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSec, marginBottom: 8 }}>사용 주기</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {CYCLE_PRESETS.map(p => (
                <TouchableOpacity key={p.days} onPress={() => { haptic(); setNewCycleDays(p.days); setCustomDaysInput(''); }}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: newCycleDays === p.days && !customDaysInput ? colors.primaryBg : colors.toggleBg, borderWidth: newCycleDays === p.days && !customDaysInput ? 2 : 0, borderColor: colors.primary }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: newCycleDays === p.days && !customDaysInput ? colors.primary : colors.textSec }}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: 12, color: colors.textSec }}>직접 입력:</Text>
              <TextInput value={customDaysInput} onChangeText={(t) => { const n = t.replace(/[^0-9]/g, ''); setCustomDaysInput(n); if (parseInt(n) > 0) setNewCycleDays(parseInt(n)); }}
                placeholder="일" placeholderTextColor={colors.textLight} keyboardType="number-pad"
                style={{ width: 60, padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: customDaysInput ? colors.primary : colors.border, fontSize: 14, color: colors.text, backgroundColor: colors.bg, textAlign: 'center' }} />
              <Text style={{ fontSize: 12, color: colors.textSec }}>일마다</Text>
            </View>

            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSec, marginBottom: 6 }}>시작일 (선택)</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: newCycleStartDate ? colors.primary : colors.border, backgroundColor: colors.bg, marginBottom: 20 }}>
              <Text style={{ fontSize: 14, color: newCycleStartDate ? colors.text : colors.textLight }}>{newCycleStartDate || "탭하여 날짜 선택 (비우면 오늘부터)"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleAddCycle} disabled={!newCycleName.trim()} activeOpacity={0.8}
              style={{ paddingVertical: 15, borderRadius: 14, alignItems: 'center', backgroundColor: newCycleName.trim() ? colors.primary : colors.border }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>추가하기</Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Cycle Modal */}
      <Modal visible={showEditCycle} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowEditCycle(false)} />
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 20 }}>스페셜 케어 수정</Text>

            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSec, marginBottom: 6 }}>항목 이름</Text>
            <TextInput value={editName} onChangeText={setEditName} placeholderTextColor={colors.textLight}
              style={{ padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, fontSize: 14, color: colors.text, backgroundColor: colors.bg, marginBottom: 16 }} />

            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSec, marginBottom: 8 }}>사용 주기</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {CYCLE_PRESETS.map(p => (
                <TouchableOpacity key={p.days} onPress={() => { haptic(); setEditDays(p.days); setEditCustomDays(''); }}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: editDays === p.days && !editCustomDays ? colors.primaryBg : colors.toggleBg, borderWidth: editDays === p.days && !editCustomDays ? 2 : 0, borderColor: colors.primary }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: editDays === p.days && !editCustomDays ? colors.primary : colors.textSec }}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Text style={{ fontSize: 12, color: colors.textSec }}>직접 입력:</Text>
              <TextInput value={editCustomDays} onChangeText={(t) => { const n = t.replace(/[^0-9]/g, ''); setEditCustomDays(n); if (parseInt(n) > 0) setEditDays(parseInt(n)); }}
                placeholder="일" placeholderTextColor={colors.textLight} keyboardType="number-pad"
                style={{ width: 60, padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: editCustomDays ? colors.primary : colors.border, fontSize: 14, color: colors.text, backgroundColor: colors.bg, textAlign: 'center' }} />
              <Text style={{ fontSize: 12, color: colors.textSec }}>일마다</Text>
            </View>

            <TouchableOpacity onPress={handleSaveEdit} disabled={!editName.trim()} activeOpacity={0.8}
              style={{ paddingVertical: 15, borderRadius: 14, alignItems: 'center', backgroundColor: editName.trim() ? colors.primary : colors.border }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>수정 완료</Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <View style={{ width: 320, backgroundColor: colors.card, borderRadius: 20, padding: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <TouchableOpacity onPress={() => { if (pickerMonth === 0) { setPickerYear(pickerYear - 1); setPickerMonth(11); } else setPickerMonth(pickerMonth - 1); }}><Text style={{ fontSize: 18, color: colors.textSec, padding: 8 }}>‹</Text></TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>{pickerYear}년 {MONTHS[pickerMonth]}</Text>
              <TouchableOpacity onPress={() => { if (pickerMonth === 11) { setPickerYear(pickerYear + 1); setPickerMonth(0); } else setPickerMonth(pickerMonth + 1); }}><Text style={{ fontSize: 18, color: colors.textSec, padding: 8 }}>›</Text></TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row", marginBottom: 4 }}>
              {DAY_NAMES.map(d => <View key={d} style={{ flex: 1, alignItems: "center" }}><Text style={{ fontSize: 10, color: colors.textSec }}>{d}</Text></View>)}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {Array(getFirstDayOfMonth(pickerYear, pickerMonth)).fill(null).map((_, i) => <View key={"pe"+i} style={{ width: "14.28%", height: 36 }} />)}
              {Array.from({ length: getDaysInMonth(pickerYear, pickerMonth) }, (_, i) => {
                const d = i + 1;
                const ds = pickerYear + "-" + String(pickerMonth + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
                const sel = ds === newCycleStartDate;
                return <TouchableOpacity key={d} onPress={() => { haptic(); setNewCycleStartDate(ds); }} style={{ width: "14.28%", height: 36, justifyContent: "center", alignItems: "center" }}><View style={{ width: 30, height: 30, borderRadius: 8, justifyContent: "center", alignItems: "center", backgroundColor: sel ? colors.primaryBg : "transparent", borderWidth: sel ? 2 : 0, borderColor: colors.primary }}><Text style={{ fontSize: 13, color: sel ? colors.primary : colors.text }}>{d}</Text></View></TouchableOpacity>;
              })}
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
              <TouchableOpacity onPress={() => { setNewCycleStartDate(""); setShowDatePicker(false); }} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", backgroundColor: colors.toggleBg }}><Text style={{ fontSize: 14, fontWeight: "600", color: colors.textSec }}>오늘부터</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", backgroundColor: colors.primary }}><Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>확인</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
