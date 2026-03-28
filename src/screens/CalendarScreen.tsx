import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Categories } from '../constants/theme';
import { today, DAY_NAMES, formatDate, getDaysInMonth, getFirstDayOfMonth } from '../utils/date';

const IS_WEB = Platform.OS === 'web';
let dbFns: any = null;
let catFns: any = null;
let Haptics: any = null;
if (!IS_WEB) {
  dbFns = require('../db/database');
  catFns = require('../db/categories');
  Haptics = require('expo-haptics');
}
const haptic = (t: string) => { if (!Haptics) return; Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

export default function CalendarScreen() {
  const todayStr = today();
  const todayD = new Date();
  const [viewYear, setViewYear] = useState(todayD.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayD.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [monthRates, setMonthRates] = useState<Record<string, number | null>>({});
  const [selectedRoutines, setSelectedRoutines] = useState<any[]>([]);
  const [selectedLogs, setSelectedLogs] = useState<Record<string, boolean>>({});

  const dim = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const getDateStr = (d: number) => `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const loadMonthData = useCallback(async () => {
    if (IS_WEB) {
      const rates: Record<string, number | null> = {};
      for (let d = 1; d <= dim; d++) {
        const ds = getDateStr(d);
        if (ds <= todayStr) rates[ds] = Math.floor(Math.random() * 100);
      }
      setMonthRates(rates);
      return;
    }
    try {
      const rates: Record<string, number | null> = {};
      for (let d = 1; d <= dim; d++) {
        const ds = getDateStr(d);
        if (ds <= todayStr) {
          const rate = await dbFns.getCompletionRate(ds);
          rates[ds] = rate;
        }
      }
      setMonthRates(rates);
    } catch (e) { console.error(e); }
  }, [viewYear, viewMonth, dim]);

  const loadSelectedDate = useCallback(async () => {
    if (IS_WEB) { setSelectedRoutines([]); return; }
    try {
      const [rts, lgs] = await Promise.all([
        dbFns.getRoutinesForDate(selectedDate),
        dbFns.getLogsForDate(selectedDate),
      ]);
      setSelectedRoutines(rts);
      setSelectedLogs(lgs);
    } catch (e) { console.error(e); }
  }, [selectedDate]);

  useFocusEffect(useCallback(() => { loadMonthData(); }, [loadMonthData]));
  useFocusEffect(useCallback(() => { loadSelectedDate(); }, [loadSelectedDate]));

  const prevMonth = () => {
    haptic('light');
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    haptic('light');
    const now = new Date();
    if (viewYear === now.getFullYear() && viewMonth >= now.getMonth()) return;
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  const getColor = (rate: number | null) => {
    if (rate === null || rate === undefined) return 'transparent';
    if (rate >= 80) return '#1D9E75';
    if (rate >= 50) return '#EF9F27';
    if (rate > 0) return '#E8789A';
    return '#e0ded8';
  };

  const selRate = monthRates[selectedDate] ?? null;
  const selDone = selectedRoutines.filter(r => selectedLogs[r.id]).length;
  const selParts = selectedDate.split('-');

  const getCatInfo = (category: string) => {
    try {
      if (catFns) {
        const map = catFns.getAllCategoriesMap();
        return map[category] || Categories.other;
      }
    } catch {}
    return (Categories as any)[category] || Categories.other;
  };

  // 이번 주 데이터
  const weekStart = new Date(todayD);
  weekStart.setDate(todayD.getDate() - todayD.getDay());
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const ds = formatDate(d);
    return { day: DAY_NAMES[i], date: ds, rate: monthRates[ds] ?? null, isToday: ds === todayStr };
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFB' }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 }}>
          <TouchableOpacity onPress={prevMonth} style={{ padding: 8 }}><Text style={{ fontSize: 22, color: '#888780' }}>‹</Text></TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#2C2C2A' }}>{viewYear}년 {MONTHS[viewMonth]}</Text>
          <TouchableOpacity onPress={nextMonth} style={{ padding: 8 }}><Text style={{ fontSize: 22, color: viewYear === todayD.getFullYear() && viewMonth >= todayD.getMonth() ? '#e0ded8' : '#888780' }}>›</Text></TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            {DAY_NAMES.map(d => (
              <View key={d} style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '500', color: d === '일' ? '#E8789A' : d === '토' ? '#6B9BD2' : '#888780' }}>{d}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {Array(firstDay).fill(null).map((_, i) => <View key={'e' + i} style={{ width: '14.28%', aspectRatio: 1 }} />)}
            {Array.from({ length: dim }, (_, i) => {
              const d = i + 1;
              const ds = getDateStr(d);
              const rate = monthRates[ds] ?? null;
              const isToday = ds === todayStr;
              const isSel = ds === selectedDate;
              const isFuture = ds > todayStr;
              return (
                <TouchableOpacity key={d} onPress={() => { if (!isFuture) { haptic('light'); setSelectedDate(ds); } }}
                  style={{ width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <View style={{
                    width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
                    backgroundColor: isSel ? '#D4537E12' : 'transparent',
                    borderWidth: isToday ? 2 : isSel ? 1.5 : 0,
                    borderColor: isToday ? '#D4537E' : isSel ? '#D4537E40' : 'transparent',
                  }}>
                    <Text style={{
                      fontSize: 14, fontWeight: isToday ? '700' : '400',
                      color: isFuture ? '#d0cec8' : isToday ? '#D4537E' : '#2C2C2A',
                    }}>{d}</Text>
                    {rate !== null && !isFuture && (
                      <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 2, backgroundColor: getColor(rate) }} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Legend */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14, paddingTop: 10 }}>
          {[{ c: '#1D9E75', l: '80%+' }, { c: '#EF9F27', l: '50-79%' }, { c: '#E8789A', l: '~49%' }].map(x => (
            <View key={x.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: x.c }} />
              <Text style={{ fontSize: 10, color: '#888780' }}>{x.l}</Text>
            </View>
          ))}
        </View>

        {/* Selected Date Detail */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f0eeeb' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#2C2C2A' }}>
                  {parseInt(selParts[1])}월 {parseInt(selParts[2])}일
                </Text>
                <Text style={{ fontSize: 12, color: '#888780' }}>
                  {DAY_NAMES[new Date(selectedDate + 'T00:00:00').getDay()]}요일
                </Text>
                {selectedDate === todayStr && (
                  <View style={{ backgroundColor: '#D4537E12', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#D4537E' }}>오늘</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: selRate !== null ? getColor(selRate) : '#c0bdb8' }}>
                {selRate !== null ? selRate + '%' : '-'}
              </Text>
            </View>

            {selectedRoutines.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <Text style={{ fontSize: 13, color: '#888780' }}>
                  {selectedDate > todayStr ? '아직 지나지 않은 날이에요' : '이 날은 루틴이 없어요'}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 6 }}>
                {selectedRoutines.map(r => {
                  const cat = getCatInfo(r.category);
                  const done = !!selectedLogs[r.id];
                  return (
                    <View key={r.id} style={{
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                      padding: 8, borderRadius: 10,
                      backgroundColor: done ? cat.color + '08' : '#fafaf9',
                    }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: done ? cat.color : cat.color + '30' }} />
                      <Text style={{ fontSize: 13, color: done ? '#888780' : '#2C2C2A', textDecorationLine: done ? 'line-through' : 'none', flex: 1 }}>{r.name}</Text>
                      <Text style={{ fontSize: 10, color: cat.color, fontWeight: '500' }}>{r.time_slot}</Text>
                      {done && <Text style={{ fontSize: 10, color: '#1D9E75', fontWeight: '600' }}>✓</Text>}
                    </View>
                  );
                })}
                <Text style={{ fontSize: 11, color: '#888780', textAlign: 'center', marginTop: 6 }}>
                  {selDone}/{selectedRoutines.length} 완료
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Weekly Chart */}
        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#2C2C2A', marginBottom: 12 }}>이번 주 현황</Text>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f0eeeb' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 6 }}>
              {weekData.map(w => {
                const rate = w.rate ?? 0;
                const h = Math.max(rate * 0.8, 5);
                const color = rate > 0 ? getColor(rate) : '#eee';
                return (
                  <View key={w.day} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: '600', color: rate > 0 ? color : '#c0bdb8' }}>
                      {rate > 0 ? rate + '%' : ''}
                    </Text>
                    <View style={{
                      width: '75%', height: h, borderRadius: 6,
                      backgroundColor: color, opacity: w.isToday ? 1 : 0.7,
                    }} />
                    <Text style={{
                      fontSize: 11, color: w.isToday ? '#D4537E' : '#888780',
                      fontWeight: w.isToday ? '700' : '400',
                    }}>{w.day}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
