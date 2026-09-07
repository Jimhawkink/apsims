import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useSession } from "../../context/SessionContext";
import { TimetableEntry, getTeacherTimetable, supabase } from "../../lib/supabase";
import ScreenHeader from "../../components/ScreenHeader";

const C = {
    bg: "#F8FAFF", card: "#ffffff", border: "#e2e8f0",
    primary: "#2563eb", accent: "#059669", teal: "#0d9488",
    text: "#0f172a", textSub: "#64748b", textDim: "#94a3b8",
};
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
const DAY_SHORT = { Monday:"Mon", Tuesday:"Tue", Wednesday:"Wed", Thursday:"Thu", Friday:"Fri" };
const DAY_COLORS = {
    Monday:    ["#2563eb","#1d4ed8"], Tuesday:   ["#7c3aed","#6d28d9"],
    Wednesday: ["#0d9488","#0f766e"], Thursday:  ["#ea580c","#c2410c"], Friday: ["#059669","#047857"],
};
function getCurrentDay() {
    const day = new Date().getDay();
    return DAYS[Math.max(0,Math.min(4,day-1))] || "Monday";
}
function formatTime(time) {
    if (!time) return "--";
    try {
        const [h,m] = time.split(":").map(Number);
        const ampm = h>=12?"PM":"AM"; const hour=h%12||12;
        return `${hour}:${String(m).padStart(2,"0")} ${ampm}`;
    } catch { return time; }
}

export default function TimetableScreen() {
    const { session } = useSession();
    const navigation = useNavigation();
    const [entries, setEntries] = useState([]);
    const [allPeriods, setAllPeriods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState(getCurrentDay());

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [timetableData, periodsRes] = await Promise.all([
                session?.linked_teacher_id ? getTeacherTimetable(session.linked_teacher_id) : Promise.resolve([]),
                supabase.from("school_timetable_periods").select("*").order("period_number"),
            ]);
            setEntries(timetableData);
            setAllPeriods(periodsRes.data || []);
        } catch(err) { console.error("TimetableScreen:",err.message); }
        finally { setLoading(false); }
    }, [session?.linked_teacher_id]);

    useEffect(() => { loadData(); }, [loadData]);

    const getDoubleEndTime = useCallback((periodId) => {
        const lessonPeriods = allPeriods.filter(p=>p.period_type==="lesson").sort((a,b)=>a.period_number-b.period_number);
        const idx = lessonPeriods.findIndex(p=>p.id===periodId);
        const next = lessonPeriods[idx+1];
        const current = allPeriods.find(p=>p.id===periodId);
        return next?.end_time || current?.end_time || "";
    }, [allPeriods]);

    const lessonEntries  = useMemo(()=>entries.filter(e=>e.period_type==="lesson"),[entries]);
    const totalLessons   = lessonEntries.length;
    const doubleCount    = lessonEntries.filter(e=>e.is_double).length;
    const uniqueClasses  = useMemo(()=>new Set(lessonEntries.map(e=>`${e.form_name}-${e.stream_name}`)).size,[lessonEntries]);
    const uniqueSubjects = useMemo(()=>new Set(lessonEntries.filter(e=>e.subject_name).map(e=>e.subject_name)).size,[lessonEntries]);

    const allDayPeriods = useMemo(() => {
        if (allPeriods.length === 0) {
            const periodIds=[...new Set(entries.map(e=>e.period_id))].sort((a,b)=>a-b);
            return periodIds.map(pid=>{
                const entry=entries.find(e=>e.day_of_week===selectedDay&&e.period_id===pid);
                const any=entries.find(e=>e.period_id===pid);
                return {period_id:pid,period_name:any?.period_name||`Period ${pid}`,start_time:any?.start_time||"",end_time:any?.end_time||"",period_type:any?.period_type||"lesson",entry:entry||null};
            });
        }
        return allPeriods.map(p=>{
            const entry=entries.find(e=>e.day_of_week===selectedDay&&e.period_id===p.id);
            return {period_id:p.id,period_name:p.period_name,start_time:p.start_time,end_time:p.end_time,period_type:p.period_type,entry:entry||null};
        });
    },[entries,selectedDay,allPeriods]);

    const todayLessons = allDayPeriods.filter(p=>p.period_type==="lesson"&&p.entry?.subject_name).length;
    const todayFree    = allDayPeriods.filter(p=>p.period_type==="lesson"&&!p.entry?.subject_name).length;

    if (loading) return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={C.teal}/>
            <Text style={styles.loadingText}>Loading timetable...</Text>
        </View>
    );

    return (
        <View style={{flex:1,backgroundColor:C.bg}}>
            <StatusBar barStyle="light-content" backgroundColor="#0d9488"/>
            <ScreenHeader title="My Timetable" onBack={()=>navigation.goBack()} gradient={["#0D9488","#059669"]}/>

            <View style={styles.statsBar}>
                <View style={styles.statItem}><Text style={styles.statVal}>{totalLessons}</Text><Text style={styles.statLbl}>Lessons/wk</Text></View>
                <View style={styles.statDivider}/>
                <View style={styles.statItem}><Text style={styles.statVal}>{uniqueClasses}</Text><Text style={styles.statLbl}>Classes</Text></View>
                <View style={styles.statDivider}/>
                <View style={styles.statItem}><Text style={styles.statVal}>{uniqueSubjects}</Text><Text style={styles.statLbl}>Subjects</Text></View>
                <View style={styles.statDivider}/>
                <View style={styles.statItem}><Text style={[styles.statVal,{color:doubleCount>0?"#7c3aed":C.textDim}]}>{doubleCount}</Text><Text style={styles.statLbl}>Doubles</Text></View>
            </View>

            <View style={styles.daySelector}>
                {DAYS.map(day=>{
                    const isActive=selectedDay===day; const isToday=day===getCurrentDay();
                    const count=entries.filter(e=>e.day_of_week===day&&e.period_type==="lesson"&&e.subject_name).length;
                    return (
                        <TouchableOpacity key={day} onPress={()=>setSelectedDay(day)} style={[styles.dayBtn,isActive&&styles.dayBtnActive]} activeOpacity={0.7}>
                            <Text style={[styles.dayBtnText,isActive&&styles.dayBtnTextActive]}>{DAY_SHORT[day]}</Text>
                            <Text style={[styles.dayCount,isActive&&styles.dayCountActive]}>{count}</Text>
                            {isToday&&<View style={styles.todayDot}/>}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.dayHeader}>
                    <Text style={styles.dayTitle}>{selectedDay}</Text>
                    <View style={{flexDirection:"row",gap:8}}>
                        <View style={styles.dayBadge}><Text style={styles.dayBadgeText}>{todayLessons} lessons</Text></View>
                        {todayFree>0&&<View style={[styles.dayBadge,{backgroundColor:"#f0fdf4",borderColor:"#86efac"}]}><Text style={[styles.dayBadgeText,{color:"#15803d"}]}>{todayFree} free</Text></View>}
                    </View>
                </View>

                {allDayPeriods.length===0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyEmoji}>🏖️</Text>
                        <Text style={styles.emptyTitle}>No Schedule</Text>
                        <Text style={styles.emptySub}>No timetable entries yet</Text>
                    </View>
                ) : allDayPeriods.map((slot)=>{
                    const isBreak=slot.period_type==="break"||slot.period_type==="assembly";
                    const isFree=slot.period_type==="lesson"&&!slot.entry?.subject_name;
                    const e=slot.entry;
                    const colors=DAY_COLORS[selectedDay]||["#2563eb","#1d4ed8"];
                    const isDouble=e?.is_double;
                    const displayEnd=isDouble?getDoubleEndTime(slot.period_id):slot.end_time;

                    if (isBreak) return (
                        <View key={slot.period_id} style={styles.breakCard}>
                            <Text style={styles.breakEmoji}>{slot.period_type==="assembly"?"🏫":"☕"}</Text>
                            <View style={{flex:1}}>
                                <Text style={styles.breakName}>{slot.period_name}</Text>
                                <Text style={styles.breakTime}>{formatTime(slot.start_time)}  →  {formatTime(slot.end_time)}</Text>
                            </View>
                        </View>
                    );

                    if (isFree) return (
                        <View key={slot.period_id} style={styles.freeCard}>
                            <View style={styles.freeTimeBox}>
                                <Text style={styles.freeTimeText}>{formatTime(slot.start_time)}</Text>
                                <Text style={styles.freeArrow}>↓</Text>
                                <Text style={styles.freeTimeText}>{formatTime(slot.end_time)}</Text>
                            </View>
                            <View style={{flex:1,paddingLeft:4}}>
                                <Text style={styles.freePeriodText}>Free Period</Text>
                                <Text style={styles.freePeriodSub}>{slot.period_name}</Text>
                            </View>
                            <View style={styles.freeBadge}><Text style={styles.freeBadgeText}>FREE</Text></View>
                        </View>
                    );

                    return (
                        <View key={slot.period_id} style={[styles.lessonCard,isDouble&&styles.lessonCardDouble]}>
                            <LinearGradient colors={colors} style={styles.lessonAccent}/>
                            <View style={styles.lessonTimeCol}>
                                <Text style={styles.timeStart}>{formatTime(slot.start_time)}</Text>
                                <View style={styles.timeBar}/>
                                <Text style={styles.timeEnd}>{formatTime(displayEnd)}</Text>
                                {isDouble&&<Text style={styles.timeDuration}>2 periods</Text>}
                            </View>
                            <View style={styles.lessonInfo}>
                                <Text style={styles.lessonSubject}>{e?.subject_name||"Free"}</Text>
                                <Text style={styles.lessonMeta}>{e?.form_name}{e?.stream_name?` • ${e.stream_name}`:""}{e?.room?`  📍 ${e.room}`:""}</Text>
                                <Text style={styles.lessonPeriod}>{slot.period_name}{isDouble?" + Next Period":""}</Text>
                            </View>
                            {isDouble&&(
                                <View style={styles.doubleBadge}>
                                    <Text style={styles.doubleBadgeText}>2x</Text>
                                    <Text style={styles.doubleLabel}>DOUBLE</Text>
                                </View>
                            )}
                        </View>
                    );
                })}
                <View style={{height:20}}/>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer:{flex:1,backgroundColor:C.bg,justifyContent:"center",alignItems:"center",gap:12},
    loadingText:{color:C.textSub,fontSize:14,fontWeight:"500"},
    scroll:{flex:1}, content:{padding:16,paddingBottom:40},
    statsBar:{flexDirection:"row",backgroundColor:"#fff",borderBottomWidth:1,borderBottomColor:C.border,paddingVertical:12,paddingHorizontal:8},
    statItem:{flex:1,alignItems:"center"}, statVal:{fontSize:20,fontWeight:"900",color:C.teal},
    statLbl:{fontSize:9,color:C.textDim,fontWeight:"600",textTransform:"uppercase",marginTop:2},
    statDivider:{width:1,backgroundColor:C.border,marginVertical:4},
    daySelector:{flexDirection:"row",paddingHorizontal:12,paddingVertical:10,gap:6,backgroundColor:"#fff",borderBottomWidth:1,borderBottomColor:C.border},
    dayBtn:{flex:1,alignItems:"center",paddingVertical:10,borderRadius:16,backgroundColor:"#F8FAFF",borderWidth:1,borderColor:C.border},
    dayBtnActive:{backgroundColor:C.teal,borderColor:C.teal}, dayBtnText:{fontSize:11,fontWeight:"800",color:C.textSub},
    dayBtnTextActive:{color:"#fff"}, dayCount:{fontSize:14,fontWeight:"900",color:C.text,marginTop:2},
    dayCountActive:{color:"#fff"}, todayDot:{width:5,height:5,borderRadius:3,backgroundColor:"#f59e0b",marginTop:3},
    dayHeader:{marginBottom:12,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
    dayTitle:{fontSize:18,fontWeight:"800",color:C.text},
    dayBadge:{paddingHorizontal:10,paddingVertical:4,backgroundColor:"#eff6ff",borderRadius:20,borderWidth:1,borderColor:"#bfdbfe"},
    dayBadgeText:{fontSize:11,fontWeight:"700",color:"#1d4ed8"},
    emptyBox:{alignItems:"center",paddingVertical:40,gap:8,backgroundColor:"#fff",borderRadius:20,borderWidth:1,borderColor:C.border},
    emptyEmoji:{fontSize:48}, emptyTitle:{fontSize:16,fontWeight:"800",color:C.text}, emptySub:{fontSize:12,color:C.textSub},
    breakCard:{flexDirection:"row",alignItems:"center",gap:10,backgroundColor:"#fef3c7",borderRadius:16,padding:12,marginBottom:8,borderWidth:1,borderColor:"#fde68a",borderStyle:"dashed"},
    breakEmoji:{fontSize:20}, breakName:{fontSize:12,fontWeight:"700",color:"#92400e"}, breakTime:{fontSize:10,color:"#b45309",marginTop:2},
    freeCard:{flexDirection:"row",alignItems:"center",backgroundColor:"#f0fdf4",borderRadius:16,marginBottom:10,borderWidth:1,borderColor:"#bbf7d0",overflow:"hidden",padding:10},
    freeTimeBox:{alignItems:"center",minWidth:76,marginRight:8},
    freeTimeText:{fontSize:11,fontWeight:"700",color:"#15803d"}, freeArrow:{fontSize:10,color:"#86efac",marginVertical:1},
    freePeriodText:{fontSize:13,fontWeight:"700",color:"#15803d"}, freePeriodSub:{fontSize:10,color:"#86efac",marginTop:2},
    freeBadge:{backgroundColor:"#dcfce7",paddingHorizontal:8,paddingVertical:4,borderRadius:8,marginRight:4},
    freeBadgeText:{fontSize:10,fontWeight:"900",color:"#15803d"},
    lessonCard:{flexDirection:"row",alignItems:"center",backgroundColor:"#fff",borderRadius:16,marginBottom:10,borderWidth:1,borderColor:C.border,overflow:"hidden",shadowColor:"#000",shadowOffset:{width:0,height:1},shadowOpacity:0.07,shadowRadius:4,elevation:1},
    lessonCardDouble:{borderColor:"#ddd6fe",borderWidth:1.5},
    lessonAccent:{width:5,alignSelf:"stretch"},
    lessonTimeCol:{paddingVertical:14,paddingHorizontal:10,alignItems:"center",minWidth:82},
    timeStart:{fontSize:11,fontWeight:"800",color:C.text},
    timeBar:{width:1,height:14,backgroundColor:C.border,marginVertical:2},
    timeEnd:{fontSize:11,fontWeight:"700",color:C.textSub},
    timeDuration:{fontSize:9,color:"#7c3aed",fontWeight:"700",marginTop:3},
    lessonInfo:{flex:1,paddingVertical:12,paddingRight:8},
    lessonSubject:{fontSize:14,fontWeight:"800",color:C.text},
    lessonMeta:{fontSize:11,color:C.textSub,fontWeight:"500",marginTop:3},
    lessonPeriod:{fontSize:9,color:C.textDim,marginTop:4,fontWeight:"600"},
    doubleBadge:{alignItems:"center",backgroundColor:"#f3e8ff",paddingHorizontal:8,paddingVertical:6,borderRadius:10,marginRight:10},
    doubleBadgeText:{fontSize:14,fontWeight:"900",color:"#7c3aed"},
    doubleLabel:{fontSize:7,fontWeight:"800",color:"#7c3aed",letterSpacing:0.5},
});
