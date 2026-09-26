import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Categories } from '../constants/theme';
import { useTheme } from '../constants/ThemeContext';
import { today, DAY_NAMES, addDays } from '../utils/date';
import GlowModal from '../components/GlowModal';
import CelebrationModal from '../components/CelebrationModal';

const IS_WEB = Platform.OS === 'web';
let dbFns: any = null;
let catFns: any = null;
let Haptics: any = null;
if (!IS_WEB) { dbFns = require('../db/database'); catFns = require('../db/categories'); Haptics = require('expo-haptics'); }
const haptic = (t: string) => { if (!Haptics) return; if (t === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); else if (t === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); else if (t === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };

function getCatInfo(category: string) {
  try { if (catFns) { const m = catFns.getAllCategoriesMap(); return m[category] || Categories.other; } } catch {}
  return (Categories as any)[category] || Categories.other;
}

function RoutineCard({ name, category, done, onToggle, onEdit, colors }: any) {
  const cat = getCatInfo(category);
  const sc = React.useRef(new Animated.Value(1)).current;
  const tap = () => { Animated.sequence([Animated.timing(sc,{toValue:0.95,duration:80,useNativeDriver:true}),Animated.timing(sc,{toValue:1,duration:120,useNativeDriver:true})]).start(); onToggle(); };
  return (
    <Animated.View style={{transform:[{scale:sc}],marginBottom:8}}>
      <TouchableOpacity onPress={tap} activeOpacity={0.7} style={{flexDirection:'row',alignItems:'center',padding:14,backgroundColor:done?cat.color+'08':colors.card,borderRadius:14,borderLeftWidth:4,borderLeftColor:done?cat.color:cat.color+'30',borderWidth:1,borderColor:done?cat.color+'20':colors.border,gap:11}}>
        <View style={{width:26,height:26,borderRadius:8,borderWidth:done?0:2,borderColor:cat.color+'40',backgroundColor:done?cat.color:'transparent',justifyContent:'center',alignItems:'center'}}>{done&&<Text style={{color:'#fff',fontSize:14,fontWeight:'700'}}>✓</Text>}</View>
        <Text style={{fontSize:18}}>{cat.icon}</Text>
        <View style={{flex:1}}><Text style={{fontSize:14,fontWeight:'500',color:done?colors.textSec:colors.text,textDecorationLine:done?'line-through':'none'}}>{name}</Text><Text style={{fontSize:11,color:colors.textSec,marginTop:1}}>{cat.label}</Text></View>
        {done&&<View style={{backgroundColor:colors.secondaryBg,paddingHorizontal:8,paddingVertical:2,borderRadius:6}}><Text style={{fontSize:10,fontWeight:'600',color:colors.secondary}}>완료</Text></View>}
        <TouchableOpacity onPress={onEdit} hitSlop={{top:12,bottom:12,left:12,right:12}} style={{width:32,height:32,borderRadius:8,justifyContent:'center',alignItems:'center'}}><Text style={{fontSize:18,color:colors.textLight}}>⋯</Text></TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const [slot, setSlot] = useState<'AM'|'PM'>('AM');
  const [routines, setRoutines] = useState<any[]>([]);
  const [logs, setLogs] = useState<Record<string,boolean>>({});
  const [streak, setStreak] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const [waterCups, setWaterCups] = useState(0);
  const [waterGoal, setWaterGoal] = useState(8);
  const [showWaterGoal, setShowWaterGoal] = useState(false);
  const [modal, setModal] = useState<any>({visible:false,title:''});
  const [showCeleb, setShowCeleb] = useState(false);
  const [newBadge, setNewBadge] = useState<any>(null);
  const nav = useNavigation<any>();
  const ts = today(), td = new Date();

  const load = useCallback(async () => {
    if (IS_WEB) { return; }
    try {
      const [r, l, s] = await Promise.all([dbFns.getRoutinesForDate(ts), dbFns.getLogsForDate(ts), dbFns.getStreak()]);
      setRoutines(r); setLogs(l); setStreak(s?.current_streak ?? 0);
      const wc = await dbFns.getWaterLog(ts); setWaterCups(wc);
      const wg = await dbFns.getSetting('water_goal'); if (wg) setWaterGoal(parseInt(wg));
      const allEvents = await dbFns.getAllEvents();
      const upcoming = allEvents.filter((e: any) => e.date >= ts).sort((a: any, b: any) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
      setEvents(upcoming.slice(0, 5));
    } catch (e) { console.error(e); }
  }, [ts]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const checkAndUpdateStreak = async (newLogs: Record<string,boolean>) => {
    if (IS_WEB) return;
    const allR = await dbFns.getRoutinesForDate(ts);
    const doneCount = allR.filter((r: any) => newLogs[r.id]).length;
    const rate = allR.length > 0 ? doneCount / allR.length : 0;
    const st = await dbFns.getStreak();
    if (rate >= 0.8 && st.last_completed_date !== ts) {
      const yesterday = addDays(ts, -1);
      let nc = 1;
      if (st.last_completed_date === yesterday) { nc = st.current_streak + 1; }
      else if (st.last_completed_date && st.last_completed_date !== '' && !st.protection_used) { nc = st.current_streak + 1; await dbFns.updateStreak({protection_used: 1, protection_date: ts}); }
      const nl2 = Math.max(st.longest_streak, nc);
      await dbFns.updateStreak({current_streak: nc, longest_streak: nl2, last_completed_date: ts});
      setStreak(nc);
      const milestones = [{days:7,emoji:'🌟',label:'7일 연속'},{days:30,emoji:'💎',label:'30일 연속'},{days:100,emoji:'👑',label:'100일 연속'}];
      for (const m of milestones) { if (nc >= m.days) { const ex = await dbFns.getSetting('badge_'+m.days); if (!ex) { await dbFns.setSetting('badge_'+m.days, ts); setNewBadge(m); } } }
    }
  };

  const toggle = async (id: string) => {
    haptic('light');
    if (IS_WEB) { setLogs(p => ({...p, [id]: !p[id]})); return; }
    await dbFns.toggleRoutineLog(id, ts);
    const nl = await dbFns.getLogsForDate(ts);
    setLogs(nl);
    await checkAndUpdateStreak(nl);
    if (routines.every(r => nl[r.id]) && routines.length > 0) { setShowCeleb(true); }
  };

  const moveRoutine = async (routine: any, direction: 'up' | 'down') => {
    if (IS_WEB) return;
    haptic('light');
    const sameSlot = routines.filter(r => r.time_slot === routine.time_slot);
    const idx = sameSlot.findIndex(r => r.id === routine.id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === sameSlot.length - 1)) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const db = dbFns.getDB();
    await db.runAsync('UPDATE routines SET sort_order = ? WHERE id = ?', [swapIdx, routine.id]);
    await db.runAsync('UPDATE routines SET sort_order = ? WHERE id = ?', [idx, sameSlot[swapIdx].id]);
    load();
  };

  const edit = (r: any) => {
    haptic('medium');
    const cat = getCatInfo(r.category);
    const sameSlot = routines.filter(x => x.time_slot === r.time_slot);
    const idx = sameSlot.findIndex(x => x.id === r.id);
    const buttons: any[] = [];
    if (idx > 0) buttons.push({text:'↑ 위로 이동',onPress:()=>{setModal((m:any)=>({...m,visible:false}));moveRoutine(r,'up');},style:'default'});
    if (idx < sameSlot.length - 1) buttons.push({text:'↓ 아래로 이동',onPress:()=>{setModal((m:any)=>({...m,visible:false}));moveRoutine(r,'down');},style:'default'});
    buttons.push({text:'수정',onPress:()=>{setModal((m:any)=>({...m,visible:false}));nav.navigate('Add',{editRoutine:r});},style:'primary'});
    buttons.push({text:'삭제',onPress:async()=>{haptic('warning');setModal((m:any)=>({...m,visible:false}));if(!IS_WEB)await dbFns.deleteRoutine(r.id);load();},style:'danger'});
    buttons.push({text:'취소',onPress:()=>setModal((m:any)=>({...m,visible:false})),style:'default'});
    setModal({visible:true,emoji:cat.icon,title:r.name,buttons});
  };

  const editEvent = (ev: any) => {
    haptic('medium');
    const cat = (Categories as any)[ev.category] || Categories.other;
    setModal({visible:true,emoji:cat.icon,title:ev.title,buttons:[
      {text:'수정',onPress:()=>{setModal((m:any)=>({...m,visible:false}));nav.navigate('Add',{editEvent:ev});},style:'primary'},
      {text:'삭제',onPress:async()=>{haptic('warning');setModal((m:any)=>({...m,visible:false}));if(!IS_WEB)await dbFns.deleteEvent(ev.id);load();},style:'danger'},
      {text:'취소',onPress:()=>setModal((m:any)=>({...m,visible:false})),style:'default'},
    ]});
  };

  const am = routines.filter(r => r.time_slot === 'AM'), pm = routines.filter(r => r.time_slot === 'PM');
  const cur = slot === 'AM' ? am : pm;
  const ds = (s: string) => (s === 'AM' ? am : pm).filter(r => logs[r.id]).length;
  const da = routines.filter(r => logs[r.id]).length, ta = routines.length, pct = ta > 0 ? Math.round((da / ta) * 100) : 0;

  return (
    <SafeAreaView style={{flex:1,backgroundColor:colors.bg}} edges={['top']}>
      <GlowModal visible={modal.visible} emoji={modal.emoji} title={modal.title} message={modal.message} buttons={modal.buttons} onClose={() => setModal((m:any)=>({...m,visible:false}))} />
      <CelebrationModal visible={showCeleb} onClose={() => setShowCeleb(false)} doneCount={da} totalCount={ta} streak={streak} />
      <GlowModal visible={!!newBadge} emoji={newBadge?.emoji} title={'🎊 뱃지 획득!'} message={newBadge?.label+' 달성!\n축하해요!'} buttons={[{text:'멋져요!',onPress:()=>setNewBadge(null),style:'primary'}]} onClose={() => setNewBadge(null)} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{flexDirection:'row',justifyContent:'space-between',paddingHorizontal:20,paddingTop:12}}>
          <View>
            <Text style={{fontSize:12,color:colors.textSec}}>{td.getFullYear()}년 {td.getMonth()+1}월 {td.getDate()}일 {DAY_NAMES[td.getDay()]}요일</Text>
            <Text style={{fontSize:22,fontWeight:'700',color:colors.text,marginTop:2}}>오늘의 루틴</Text>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:colors.streakBg,paddingHorizontal:12,paddingVertical:7,borderRadius:18}}>
            <Text style={{fontSize:20}}>🔥</Text>
            <View><Text style={{fontSize:17,fontWeight:'700',color:colors.streak}}>{streak}</Text><Text style={{fontSize:8,color:colors.textSec,marginTop:-2}}>일 연속</Text></View>
          </View>
        </View>

        {/* Progress */}
        <View style={{marginHorizontal:20,marginTop:14,padding:18,borderRadius:20,backgroundColor:colors.primary,flexDirection:'row',alignItems:'center',gap:14,overflow:'hidden',position:'relative'}}>
          <View style={{position:'absolute',right:-20,top:-20,width:70,height:70,borderRadius:35,backgroundColor:'rgba(255,255,255,0.1)'}} />
          <View style={{width:52,height:52,borderRadius:26,borderWidth:4,borderColor:'rgba(255,255,255,0.3)',backgroundColor:'rgba(255,255,255,0.1)',justifyContent:'center',alignItems:'center'}}>
            <Text style={{fontSize:14,fontWeight:'700',color:'#fff'}}>{pct}%</Text>
          </View>
          <View style={{flex:1}}>
            <Text style={{fontSize:15,fontWeight:'600',color:'#fff'}}>{pct===100?'완벽한 하루! ✨':pct>=80?'거의 다 했어요! 💪':pct>=50?'절반 넘었어요!':'오늘도 화이팅! 🌸'}</Text>
            <Text style={{fontSize:12,color:'rgba(255,255,255,0.8)',marginTop:3}}>전체 {da}/{ta} 완료</Text>
            <View style={{height:4,borderRadius:2,backgroundColor:'rgba(255,255,255,0.2)',marginTop:8}}><View style={{width:pct+'%',height:'100%',borderRadius:2,backgroundColor:'#fff'}} /></View>
          </View>
        </View>

        {/* AM/PM Toggle */}
        <View style={{flexDirection:'row',marginHorizontal:20,marginTop:16,backgroundColor:colors.toggleBg,borderRadius:12,padding:3}}>
          {(['AM','PM'] as const).map(s => {
            const a = slot === s;
            return (
              <TouchableOpacity key={s} onPress={() => {haptic('light');setSlot(s);}} activeOpacity={0.7}
                style={{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',paddingVertical:10,borderRadius:10,gap:5,backgroundColor:a?colors.card:'transparent',...(a?{shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.06,shadowRadius:4,elevation:1}:{})}}>
                <Text style={{fontSize:14}}>{s==='AM'?'☀️':'🌙'}</Text>
                <Text style={{fontSize:13,fontWeight:'600',color:a?colors.primary:colors.textSec}}>{s==='AM'?'아침':'저녁'}</Text>
                <View style={{backgroundColor:a?colors.primaryBg:colors.border,paddingHorizontal:6,paddingVertical:2,borderRadius:6}}>
                  <Text style={{fontSize:11,fontWeight:'600',color:a?colors.primary:colors.textSec}}>{ds(s)}/{(s==='AM'?am:pm).length}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Routine List */}
        <View style={{paddingHorizontal:20,paddingTop:12}}>
          {cur.length === 0 ? (
            <View style={{alignItems:'center',paddingVertical:40,gap:8}}>
              <Text style={{fontSize:40}}>{slot==='AM'?'☀️':'🌙'}</Text>
              <Text style={{fontSize:14,color:colors.textSec}}>{slot==='AM'?'아침':'저녁'} 루틴이 없어요</Text>
              <TouchableOpacity onPress={() => nav.navigate('Add',{editRoutine:null,editEvent:null,defaultSlot:slot})} style={{marginTop:8,backgroundColor:colors.primaryBg,paddingHorizontal:20,paddingVertical:10,borderRadius:12}}>
                <Text style={{fontSize:13,fontWeight:'600',color:colors.primary}}>+ 루틴 추가하기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            cur.map(r => <RoutineCard key={r.id} name={r.name} category={r.category} done={!!logs[r.id]} onToggle={() => toggle(r.id)} onEdit={() => edit(r)} colors={colors} />)
          )}
        </View>

        {/* Water Tracker */}
        <View style={{paddingHorizontal:20,paddingTop:12}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <Text style={{fontSize:16,fontWeight:'700',color:colors.text}}>물 마시기</Text>
            <TouchableOpacity onPress={() => {haptic('light');setShowWaterGoal(true);}} style={{flexDirection:'row',alignItems:'center',gap:4}}>
              <Text style={{fontSize:13,fontWeight:'500',color:waterCups>=waterGoal?'#1D9E75':colors.primary}}>{waterCups}/{waterGoal}잔</Text>
              <Text style={{fontSize:10,color:colors.textLight}}>⚙️</Text>
            </TouchableOpacity>
          </View>
          <View style={{backgroundColor:colors.card,borderRadius:14,borderWidth:1,borderColor:colors.border,padding:14}}>
            <View style={{flexDirection:'row',justifyContent:'center',flexWrap:'wrap',gap:8,marginBottom:14}}>
              {Array.from({length:waterGoal},(_,i) => {
                const filled = i < waterCups;
                return (
                  <View key={i} style={{width:36,height:36,borderRadius:10,backgroundColor:filled?(waterCups>=waterGoal?'#1D9E75':colors.primary):colors.toggleBg,borderWidth:filled?0:1.5,borderColor:colors.border,borderStyle:filled?'solid':'dashed',justifyContent:'center',alignItems:'center'}}>
                    <Text style={{fontSize:16,opacity:filled?1:0.3}}>💧</Text>
                  </View>
                );
              })}
            </View>
            <View style={{flexDirection:'row',gap:8}}>
              <TouchableOpacity onPress={async () => {if(waterCups<waterGoal+4){haptic('light');const nc=waterCups+1;setWaterCups(nc);if(dbFns)await dbFns.setWaterLog(ts,nc);if(nc>=waterGoal)haptic('success');}}} activeOpacity={0.7} style={{flex:1,paddingVertical:11,borderRadius:10,backgroundColor:colors.primary,alignItems:'center'}}>
                <Text style={{fontSize:14,fontWeight:'600',color:'#fff'}}>+ 한 잔</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => {if(waterCups>0){haptic('light');const nc=waterCups-1;setWaterCups(nc);if(dbFns)await dbFns.setWaterLog(ts,nc);}}} activeOpacity={0.7} style={{width:48,paddingVertical:11,borderRadius:10,backgroundColor:colors.toggleBg,alignItems:'center'}}>
                <Text style={{fontSize:14,color:colors.textSec}}>−</Text>
              </TouchableOpacity>
            </View>
            {waterCups >= waterGoal ? (
              <View style={{marginTop:10,padding:8,backgroundColor:'#1D9E7512',borderRadius:8,alignItems:'center'}}>
                <Text style={{fontSize:12,fontWeight:'600',color:'#1D9E75'}}>오늘 목표 달성 완료! ✨</Text>
              </View>
            ) : waterCups > 0 ? (
              <Text style={{fontSize:12,color:colors.textSec,textAlign:'center',marginTop:10}}>{waterGoal-waterCups}잔 더 마시면 오늘 목표 달성! 💪</Text>
            ) : null}
          </View>
        </View>

        {/* Events */}
        {events.length > 0 && (
          <View style={{paddingHorizontal:20,paddingTop:12}}>
            <Text style={{fontSize:16,fontWeight:'700',color:colors.text,marginBottom:10}}>📌 뷰티 일정</Text>
            {events.map(ev => {
              const cat = (Categories as any)[ev.category] || Categories.other;
              const isToday = ev.date === ts;
              const evDate = ev.date === ts ? '오늘' : ev.date === addDays(ts,1) ? '내일' : ev.date.slice(5).replace('-','/');
              return (
                <TouchableOpacity key={ev.id} onPress={() => editEvent(ev)} activeOpacity={0.7}
                  style={{flexDirection:'row',alignItems:'center',gap:12,padding:13,backgroundColor:colors.card,borderRadius:14,marginBottom:8,borderWidth:1,borderColor:colors.border}}>
                  <View style={{width:42,height:42,borderRadius:12,backgroundColor:cat.color+'15',justifyContent:'center',alignItems:'center'}}><Text style={{fontSize:20}}>{cat.icon}</Text></View>
                  <View style={{flex:1}}>
                    <Text style={{fontSize:14,fontWeight:'500',color:colors.text}}>{ev.title}</Text>
                    <Text style={{fontSize:11,color:colors.textSec,marginTop:1}}>{evDate} {ev.time}{ev.memo?' · '+ev.memo:''}</Text>
                  </View>
                  <View style={{backgroundColor:isToday?colors.primaryBg:colors.toggleBg,paddingHorizontal:8,paddingVertical:3,borderRadius:6}}>
                    <Text style={{fontSize:10,fontWeight:'600',color:isToday?colors.primary:colors.textSec}}>{evDate}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{height:40}} />
      </ScrollView>

      {/* Water Goal Modal */}
      {showWaterGoal && (
        <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.4)',justifyContent:'center',alignItems:'center',zIndex:100}}>
          <TouchableOpacity style={{position:'absolute',top:0,left:0,right:0,bottom:0}} activeOpacity={1} onPress={() => setShowWaterGoal(false)} />
          <View style={{width:280,backgroundColor:colors.card,borderRadius:20,padding:24,alignItems:'center'}}>
            <Text style={{fontSize:18,fontWeight:'700',color:colors.text,marginBottom:16}}>💧 목표 설정</Text>
            <Text style={{fontSize:13,color:colors.textSec,marginBottom:16}}>하루 목표 잔 수를 선택하세요</Text>
            <View style={{flexDirection:'row',alignItems:'center',gap:20,marginBottom:20}}>
              <TouchableOpacity onPress={() => {if(waterGoal>1){haptic('light');const ng=waterGoal-1;setWaterGoal(ng);if(dbFns)dbFns.setSetting('water_goal',String(ng));}}} style={{width:40,height:40,borderRadius:12,backgroundColor:colors.toggleBg,justifyContent:'center',alignItems:'center'}}>
                <Text style={{fontSize:20,color:colors.textSec}}>−</Text>
              </TouchableOpacity>
              <Text style={{fontSize:32,fontWeight:'700',color:colors.primary}}>{waterGoal}</Text>
              <TouchableOpacity onPress={() => {if(waterGoal<15){haptic('light');const ng=waterGoal+1;setWaterGoal(ng);if(dbFns)dbFns.setSetting('water_goal',String(ng));}}} style={{width:40,height:40,borderRadius:12,backgroundColor:colors.primaryBg,justifyContent:'center',alignItems:'center'}}>
                <Text style={{fontSize:20,color:colors.primary}}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => {haptic('success');setShowWaterGoal(false);}} activeOpacity={0.8} style={{width:'100%',paddingVertical:13,borderRadius:12,backgroundColor:colors.primary,alignItems:'center'}}>
              <Text style={{fontSize:14,fontWeight:'700',color:'#fff'}}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
