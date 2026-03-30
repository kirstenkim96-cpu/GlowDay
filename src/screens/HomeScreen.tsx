import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Categories } from '../constants/theme';
import { today, DAY_NAMES, addDays } from '../utils/date';
import GlowModal from '../components/GlowModal';
import CelebrationModal from '../components/CelebrationModal';
const IS_WEB = Platform.OS === 'web';
let dbFns: any = null;
let catFns: any = null;
let Haptics: any = null;
if (!IS_WEB) { dbFns = require('../db/database'); catFns = require('../db/categories'); Haptics = require('expo-haptics'); }
const haptic = (t: string) => { if (!Haptics) return; if (t === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); else if (t === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); else if (t === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };

const SAMPLE = [
  { id:'r1',name:'클렌징 폼',category:'skincare',time_slot:'AM',repeat_days:'[0,1,2,3,4,5,6]',active:1,icon:'💧',created_at:'' },
  { id:'r2',name:'토너 바르기',category:'skincare',time_slot:'AM',repeat_days:'[0,1,2,3,4,5,6]',active:1,icon:'💧',created_at:'' },
  { id:'r3',name:'비타민C 세럼',category:'skincare',time_slot:'AM',repeat_days:'[0,1,2,3,4,5,6]',active:1,icon:'💧',created_at:'' },
  { id:'r5',name:'비타민D 복용',category:'supplement',time_slot:'AM',repeat_days:'[0,1,2,3,4,5,6]',active:1,icon:'💊',created_at:'' },
  { id:'r7',name:'더블 클렌징',category:'skincare',time_slot:'PM',repeat_days:'[0,1,2,3,4,5,6]',active:1,icon:'💧',created_at:'' },
  { id:'r9',name:'아이크림',category:'skincare',time_slot:'PM',repeat_days:'[0,1,2,3,4,5,6]',active:1,icon:'💧',created_at:'' },
  { id:'r10',name:'유산균 복용',category:'supplement',time_slot:'PM',repeat_days:'[0,1,2,3,4,5,6]',active:1,icon:'💊',created_at:'' },
  { id:'r12',name:'바디로션',category:'bodycare',time_slot:'PM',repeat_days:'[0,1,2,3,4,5,6]',active:1,icon:'🧴',created_at:'' },
];

function getCatInfo(category: string) {
  try { if (catFns) { const m = catFns.getAllCategoriesMap(); return m[category] || Categories.other; } } catch {}
  return (Categories as any)[category] || Categories.other;
}

function RoutineCard({ name, category, done, onToggle, onEdit }: any) {
  const cat = getCatInfo(category);
  const sc = React.useRef(new Animated.Value(1)).current;
  const tap = () => { Animated.sequence([Animated.timing(sc,{toValue:0.95,duration:80,useNativeDriver:true}),Animated.timing(sc,{toValue:1,duration:120,useNativeDriver:true})]).start(); onToggle(); };
  return (<Animated.View style={{transform:[{scale:sc}],marginBottom:8}}><TouchableOpacity onPress={tap} activeOpacity={0.7} style={{flexDirection:'row',alignItems:'center',padding:14,backgroundColor:done?cat.color+'08':'#fff',borderRadius:14,borderLeftWidth:4,borderLeftColor:done?cat.color:cat.color+'30',borderWidth:1,borderColor:done?cat.color+'20':'#f0eeeb',gap:11}}>
    <View style={{width:26,height:26,borderRadius:8,borderWidth:done?0:2,borderColor:cat.color+'40',backgroundColor:done?cat.color:'transparent',justifyContent:'center',alignItems:'center'}}>{done&&<Text style={{color:'#fff',fontSize:14,fontWeight:'700'}}>✓</Text>}</View>
    <Text style={{fontSize:18}}>{cat.icon}</Text>
    <View style={{flex:1}}><Text style={{fontSize:14,fontWeight:'500',color:done?'#888780':'#2C2C2A',textDecorationLine:done?'line-through':'none'}}>{name}</Text><Text style={{fontSize:11,color:'#888780',marginTop:1}}>{cat.label}</Text></View>
    {done&&<View style={{backgroundColor:'#1D9E7512',paddingHorizontal:8,paddingVertical:2,borderRadius:6}}><Text style={{fontSize:10,fontWeight:'600',color:'#1D9E75'}}>완료</Text></View>}
    <TouchableOpacity onPress={onEdit} hitSlop={{top:12,bottom:12,left:12,right:12}} style={{width:32,height:32,borderRadius:8,justifyContent:'center',alignItems:'center'}}><Text style={{fontSize:18,color:'#c0bdb8'}}>⋯</Text></TouchableOpacity>
  </TouchableOpacity></Animated.View>);
}

export default function HomeScreen() {
  const [slot,setSlot]=useState<'AM'|'PM'>('AM');
  const [routines,setRoutines]=useState<any[]>([]);
  const [logs,setLogs]=useState<Record<string,boolean>>({});
  const [streak,setStreak]=useState(0);
  const [modal,setModal]=useState<any>({visible:false,title:''});
  const [showCeleb,setShowCeleb]=useState(false);
  const [newBadge,setNewBadge]=useState<any>(null);
  const nav=useNavigation<any>();
  const ts=today(), td=new Date();

  const load=useCallback(async()=>{
    if(IS_WEB){setRoutines(SAMPLE.filter(r=>JSON.parse(r.repeat_days).includes(td.getDay())));return;}
    try{
      const[r,l,s]=await Promise.all([dbFns.getRoutinesForDate(ts),dbFns.getLogsForDate(ts),dbFns.getStreak()]);
      setRoutines(r);setLogs(l);setStreak(s?.current_streak??0);
    }catch(e){console.error(e);}
  },[ts]);

  useFocusEffect(useCallback(()=>{load();},[load]));

  const checkAndUpdateStreak=async(newLogs: Record<string,boolean>)=>{
    if(IS_WEB) return;
    const allR=await dbFns.getRoutinesForDate(ts);
    const doneCount=allR.filter((r:any)=>newLogs[r.id]).length;
    const rate=allR.length>0?doneCount/allR.length:0;

    const st=await dbFns.getStreak();
    if(rate>=0.8&&st.last_completed_date!==ts){
      const yesterday=addDays(ts,-1);
      let newCurrent=1;
      if(st.last_completed_date===yesterday){
        newCurrent=st.current_streak+1;
      } else if(st.last_completed_date&&st.last_completed_date!==''&&!st.protection_used){
        newCurrent=st.current_streak+1;
        await dbFns.updateStreak({protection_used:1,protection_date:ts});
      }
      const newLongest=Math.max(st.longest_streak,newCurrent);
      await dbFns.updateStreak({current_streak:newCurrent,longest_streak:newLongest,last_completed_date:ts});
      setStreak(newCurrent);

      // 뱃지 체크
      const milestones=[{days:7,emoji:'🌟',label:'7일 연속'},{days:30,emoji:'💎',label:'30일 연속'},{days:100,emoji:'👑',label:'100일 연속'}];
      for(const m of milestones){
        if(newCurrent>=m.days){
          const existing=await dbFns.getSetting('badge_'+m.days);
          if(!existing){
            await dbFns.setSetting('badge_'+m.days,ts);
            setNewBadge(m);
          }
        }
      }
    } else if(rate<0.8&&st.last_completed_date===ts){
      // 완료 취소한 경우 — 스트릭 되돌리기
      const yesterday=addDays(ts,-1);
      if(st.last_completed_date===ts){
        const prevStreak=Math.max(st.current_streak-1,0);
        await dbFns.updateStreak({current_streak:prevStreak,last_completed_date:yesterday});
        setStreak(prevStreak);
      }
    }
  };

  const toggle=async(id:string)=>{
    haptic('light');
    if(IS_WEB){setLogs(p=>({...p,[id]:!p[id]}));return;}
    await dbFns.toggleRoutineLog(id,ts);
    const nl=await dbFns.getLogsForDate(ts);
    setLogs(nl);
    await checkAndUpdateStreak(nl);
    if(routines.every(r=>nl[r.id])&&routines.length>0){ setShowCeleb(true); }
  };

  const edit=(r:any)=>{haptic('medium');const cat=getCatInfo(r.category);setModal({visible:true,emoji:cat.icon,title:r.name,buttons:[{text:'수정',onPress:()=>{setModal((m:any)=>({...m,visible:false}));nav.navigate('Add',{editRoutine:r});},style:'primary'},{text:'삭제',onPress:async()=>{haptic('warning');setModal((m:any)=>({...m,visible:false}));if(!IS_WEB)await dbFns.deleteRoutine(r.id);load();},style:'danger'},{text:'취소',onPress:()=>setModal((m:any)=>({...m,visible:false})),style:'default'}]});};

  const am=routines.filter(r=>r.time_slot==='AM'),pm=routines.filter(r=>r.time_slot==='PM');
  const cur=slot==='AM'?am:pm;
  const ds=(s:string)=>(s==='AM'?am:pm).filter(r=>logs[r.id]).length;
  const da=routines.filter(r=>logs[r.id]).length,ta=routines.length,pct=ta>0?Math.round((da/ta)*100):0;

  return(<SafeAreaView style={{flex:1,backgroundColor:'#FDFCFB'}} edges={['top']}>
    <GlowModal visible={modal.visible} emoji={modal.emoji} title={modal.title} message={modal.message} buttons={modal.buttons} onClose={()=>setModal((m:any)=>({...m,visible:false}))}/>
    <CelebrationModal visible={showCeleb} onClose={()=>setShowCeleb(false)} doneCount={da} totalCount={ta} streak={streak}/>
    {/* 뱃지 획득 모달 */}
    <GlowModal visible={!!newBadge} emoji={newBadge?.emoji} title={'🎊 뱃지 획득!'} message={newBadge?.label+' 달성!\n축하해요!'} buttons={[{text:'멋져요!',onPress:()=>setNewBadge(null),style:'primary'}]} onClose={()=>setNewBadge(null)}/>

    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={{flexDirection:'row',justifyContent:'space-between',paddingHorizontal:20,paddingTop:12}}>
        <View><Text style={{fontSize:12,color:'#888780'}}>{td.getFullYear()}년 {td.getMonth()+1}월 {td.getDate()}일 {DAY_NAMES[td.getDay()]}요일</Text><Text style={{fontSize:22,fontWeight:'700',color:'#2C2C2A',marginTop:2}}>오늘의 루틴</Text></View>
        <View style={{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'#FF6B3512',paddingHorizontal:12,paddingVertical:7,borderRadius:18}}><Text style={{fontSize:20}}>🔥</Text><View><Text style={{fontSize:17,fontWeight:'700',color:'#FF6B35'}}>{streak}</Text><Text style={{fontSize:8,color:'#888780',marginTop:-2}}>일 연속</Text></View></View>
      </View>
      <View style={{marginHorizontal:20,marginTop:14,padding:18,borderRadius:20,backgroundColor:'#D4537E',flexDirection:'row',alignItems:'center',gap:14,overflow:'hidden',position:'relative'}}>
        <View style={{position:'absolute',right:-20,top:-20,width:70,height:70,borderRadius:35,backgroundColor:'rgba(255,255,255,0.1)'}}/>
        <View style={{width:52,height:52,borderRadius:26,borderWidth:4,borderColor:'rgba(255,255,255,0.3)',backgroundColor:'rgba(255,255,255,0.1)',justifyContent:'center',alignItems:'center'}}><Text style={{fontSize:14,fontWeight:'700',color:'#fff'}}>{pct}%</Text></View>
        <View style={{flex:1}}><Text style={{fontSize:15,fontWeight:'600',color:'#fff'}}>{pct===100?'완벽한 하루! ✨':pct>=80?'거의 다 했어요! 💪':pct>=50?'절반 넘었어요!':'오늘도 화이팅! 🌸'}</Text><Text style={{fontSize:12,color:'rgba(255,255,255,0.8)',marginTop:3}}>전체 {da}/{ta} 완료</Text><View style={{height:4,borderRadius:2,backgroundColor:'rgba(255,255,255,0.2)',marginTop:8}}><View style={{width:pct+'%',height:'100%',borderRadius:2,backgroundColor:'#fff'}}/></View></View>
      </View>
      <View style={{flexDirection:'row',marginHorizontal:20,marginTop:16,backgroundColor:'#f5f3f0',borderRadius:12,padding:3}}>
        {(['AM','PM'] as const).map(s=>{const a=slot===s;return(<TouchableOpacity key={s} onPress={()=>{haptic('light');setSlot(s);}} activeOpacity={0.7} style={{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',paddingVertical:10,borderRadius:10,gap:5,backgroundColor:a?'#fff':'transparent',...(a?{shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.06,shadowRadius:4,elevation:1}:{})}}><Text style={{fontSize:14}}>{s==='AM'?'☀️':'🌙'}</Text><Text style={{fontSize:13,fontWeight:'600',color:a?'#D4537E':'#888780'}}>{s==='AM'?'아침':'저녁'}</Text><View style={{backgroundColor:a?'#D4537E15':'#e8e6e3',paddingHorizontal:6,paddingVertical:2,borderRadius:6}}><Text style={{fontSize:11,fontWeight:'600',color:a?'#D4537E':'#888780'}}>{ds(s)}/{(s==='AM'?am:pm).length}</Text></View></TouchableOpacity>);})}
      </View>
      <View style={{paddingHorizontal:20,paddingTop:12}}>
        {cur.length===0?(<View style={{alignItems:'center',paddingVertical:40,gap:8}}><Text style={{fontSize:40}}>{slot==='AM'?'☀️':'🌙'}</Text><Text style={{fontSize:14,color:'#888780'}}>{slot==='AM'?'아침':'저녁'} 루틴이 없어요</Text><TouchableOpacity onPress={()=>nav.navigate('Add',{editRoutine:null})} style={{marginTop:8,backgroundColor:'#D4537E12',paddingHorizontal:20,paddingVertical:10,borderRadius:12}}><Text style={{fontSize:13,fontWeight:'600',color:'#D4537E'}}>+ 루틴 추가하기</Text></TouchableOpacity></View>):(cur.map(r=>(<RoutineCard key={r.id} name={r.name} category={r.category} done={!!logs[r.id]} onToggle={()=>toggle(r.id)} onEdit={()=>edit(r)}/>)))}
      </View>
      <View style={{height:40}}/>
    </ScrollView>
  </SafeAreaView>);
}
