import { useTheme } from '../constants/ThemeContext';
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Categories } from '../constants/theme';
import { today, DAY_NAMES, formatDate, addDays } from '../utils/date';

const IS_WEB = Platform.OS === 'web';
let dbFns: any = null;
let catFns: any = null;
if (!IS_WEB) { dbFns = require('../db/database'); catFns = require('../db/categories'); }

const MILESTONES = [
  { days: 7, emoji: '🌟', label: '7일 연속', color: '#EF9F27', bg: '#FFF5E6' },
  { days: 30, emoji: '💎', label: '30일 연속', color: '#3B82F6', bg: '#EBF5FF' },
  { days: 100, emoji: '👑', label: '100일 연속', color: '#D4537E', bg: '#FDF2F8' },
];

function getCatInfo(category: string) {
  try { if (catFns) { const m = catFns.getAllCategoriesMap(); return m[category] || Categories.other; } } catch {}
  return (Categories as any)[category] || Categories.other;
}

export default function StatsScreen() {
  const { colors } = useTheme();
  const ts = today();
  const td = new Date();
  const [streak, setStreak] = useState<any>(null);
  const [badges, setBadges] = useState<Record<string, string>>({});
  const [weekData, setWeekData] = useState<any[]>([]);
  const [catStats, setCatStats] = useState<any[]>([]);
  const [missedRoutines, setMissedRoutines] = useState<any[]>([]);
  const [monthRate, setMonthRate] = useState(0);

  const load = useCallback(async () => {
    if (IS_WEB) {
      setStreak({ current_streak: 5, longest_streak: 14 });
      setWeekData(DAY_NAMES.map((d, i) => ({ day: d, rate: Math.floor(Math.random() * 100), isToday: i === td.getDay() })));
      return;
    }
    try {
      // 스트릭
      const st = await dbFns.getStreak();
      setStreak(st);

      // 뱃지
      const b: Record<string, string> = {};
      for (const m of MILESTONES) {
        const val = await dbFns.getSetting('badge_' + m.days);
        if (val) b[String(m.days)] = val;
      }
      setBadges(b);

      // 이번 주 데이터
      const weekStart = new Date(td);
      weekStart.setDate(td.getDate() - td.getDay());
      const wd = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const ds = formatDate(d);
        const rate = ds <= ts ? await dbFns.getCompletionRate(ds) : null;
        wd.push({ day: DAY_NAMES[i], date: ds, rate: rate ?? 0, isToday: ds === ts });
      }
      setWeekData(wd);

      // 월간 달성률
      const y = td.getFullYear(), m = td.getMonth();
      let mTotal = 0, mDone = 0;
      for (let d = 1; d <= td.getDate(); d++) {
        const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const rts = await dbFns.getRoutinesForDate(ds);
        const lgs = await dbFns.getLogsForDate(ds);
        mTotal += rts.length;
        mDone += rts.filter((r: any) => lgs[r.id]).length;
      }
      setMonthRate(mTotal > 0 ? Math.round((mDone / mTotal) * 100) : 0);

      // 카테고리별 통계
      const catMap: Record<string, { total: number; done: number }> = {};
      for (let d = 1; d <= td.getDate(); d++) {
        const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const rts = await dbFns.getRoutinesForDate(ds);
        const lgs = await dbFns.getLogsForDate(ds);
        rts.forEach((r: any) => {
          if (!catMap[r.category]) catMap[r.category] = { total: 0, done: 0 };
          catMap[r.category].total++;
          if (lgs[r.id]) catMap[r.category].done++;
        });
      }
      const cs = Object.entries(catMap).map(([k, v]) => ({
        ...getCatInfo(k), key: k, rate: Math.round((v.done / v.total) * 100), total: v.total,
      })).sort((a, b) => b.total - a.total);
      setCatStats(cs);

      // 가장 자주 빠지는 루틴
      const allR = await dbFns.getAllRoutines();
      const rStats = [];
      for (const r of allR) {
        let total = 0, done = 0;
        for (let d = 1; d <= td.getDate(); d++) {
          const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dayRts = await dbFns.getRoutinesForDate(ds);
          if (dayRts.find((x: any) => x.id === r.id)) {
            total++;
            const lgs = await dbFns.getLogsForDate(ds);
            if (lgs[r.id]) done++;
          }
        }
        if (total > 0) rStats.push({ ...r, rate: Math.round((done / total) * 100) });
      }
      setMissedRoutines(rStats.sort((a, b) => a.rate - b.rate).slice(0, 3));
    } catch (e) { console.error(e); }
  }, [ts]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const getColor = (rate: number) => rate >= 80 ? '#1D9E75' : rate >= 50 ? '#EF9F27' : '#E8789A';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>통계</Text>
          <Text style={{ fontSize: 12, color: colors.textSec }}>{td.getFullYear()}년 {td.getMonth() + 1}월</Text>
        </View>

        {/* Summary Cards */}
        <View style={{ flexDirection: 'row', gap: 9, paddingHorizontal: 20, paddingTop: 14 }}>
          {[
            { label: '월간 달성률', value: monthRate + '%', icon: '📈', color: colors.primary },
            { label: '현재 스트릭', value: (streak?.current_streak ?? 0) + '일', icon: '🔥', color: colors.streak },
            { label: '최장 스트릭', value: (streak?.longest_streak ?? 0) + '일', icon: '🏆', color: colors.accent },
          ].map((card, i) => (
            <View key={i} style={{ flex: 1, padding: 14, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
              <Text style={{ fontSize: 20 }}>{card.icon}</Text>
              <Text style={{ fontSize: 10, color: colors.textSec, marginTop: 4 }}>{card.label}</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: card.color, marginTop: 2 }}>{card.value}</Text>
            </View>
          ))}
        </View>

        {/* Badges */}
        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 }}>🏅 달성 뱃지</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {MILESTONES.map(m => {
              const earned = !!badges[String(m.days)];
              return (
                <View key={m.days} style={{
                  flex: 1, padding: 16, borderRadius: 16, alignItems: 'center',
                  backgroundColor: earned ? m.bg : '#f8f7f5',
                  borderWidth: 1.5, borderColor: earned ? m.color : '#e8e6e3',
                  opacity: earned ? 1 : 0.5,
                }}>
                  <Text style={{ fontSize: 32, marginBottom: 6 }}>{m.emoji}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: earned ? m.color : '#888780' }}>{m.label}</Text>
                  {earned ? (
                    <Text style={{ fontSize: 10, color: colors.textSec, marginTop: 3 }}>달성! ✓</Text>
                  ) : (
                    <Text style={{ fontSize: 10, color: colors.textLight, marginTop: 3 }}>
                      {streak ? `${m.days - streak.current_streak}일 남음` : '미달성'}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Weekly Chart */}
        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 }}>주간 달성률</Text>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, paddingTop: 28, paddingBottom: 28, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 6 }}>
              {weekData.map(w => {
                const h = Math.max((w.rate || 0) * 0.9, 5);
                const color = w.rate > 0 ? getColor(w.rate) : '#eee';
                return (
                  <View key={w.day} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: w.rate > 0 ? color : '#c0bdb8' }}>
                      {w.rate > 0 ? w.rate + '%' : '-'}
                    </Text>
                    <View style={{ width: '75%', height: h, borderRadius: 7, backgroundColor: color, opacity: w.isToday ? 1 : 0.7 }} />
                    <Text style={{ fontSize: 10, color: w.isToday ? '#D4537E' : '#888780', fontWeight: w.isToday ? '700' : '400' }}>{w.day}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Category Breakdown */}
        {catStats.length > 0 && (
          <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 }}>카테고리별 달성률</Text>
            <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, paddingTop: 28, paddingBottom: 28, borderWidth: 1, borderColor: colors.border }}>
              {catStats.map((cat, i) => (
                <View key={cat.key} style={{ marginBottom: i < catStats.length - 1 ? 14 : 0 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }}>{cat.icon} {cat.label}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: cat.color }}>{cat.rate}%</Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: '#f0eeeb' }}>
                    <View style={{ height: '100%', borderRadius: 3, width: cat.rate + '%', backgroundColor: cat.color }} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Most Missed */}
        {missedRoutines.length > 0 && (
          <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 }}>자주 빠지는 루틴 😅</Text>
            {missedRoutines.map((r, i) => {
              const cat = getCatInfo(r.category);
              return (
                <View key={r.id} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
                  backgroundColor: colors.card, borderRadius: 12, marginBottom: 8,
                  borderWidth: 1, borderColor: colors.border,
                }}>
                  <Text style={{ fontSize: 16 }}>{cat.icon}</Text>
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: colors.text }}>{r.name}</Text>
                  <View style={{ backgroundColor: getColor(r.rate) + '12', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: getColor(r.rate) }}>{r.rate}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Streak Protection Info */}
        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 28 }}>🛡️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>스트릭 보호권</Text>
              <Text style={{ fontSize: 11, color: colors.textSec, marginTop: 2 }}>
                {streak?.protection_used ? '이번 주 사용 완료' : '이번 주 1회 남음 — 하루 빠져도 스트릭 유지!'}
              </Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: streak?.protection_used ? '#c0bdb8' : '#EF9F27' }}>
              {streak?.protection_used ? '0/1' : '1/1'}
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
