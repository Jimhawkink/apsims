// APSIMS Ultra Premium — Academic Passport Screen v3.0
// Matches web student-passport page exactly:
// 4 tabs: Overview | Subjects | History | Conduct
// 8-4-4 and CBC support, per-term marks, rank, attendance, discipline

import React, { useState, useEffect, useCallback } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar, Dimensions, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../../navigation/types";
import { supabase } from "../../lib/supabase";

type RouteProps = RouteProp<RootStackParamList, "AcademicPassport">;
const { width: W } = Dimensions.get("window");

const GRADE_SCALE = [
    { min: 75, grade: "A",  pts: 12, color: "#059669", bg: "#ecfdf5" },
    { min: 70, grade: "A-", pts: 11, color: "#10b981", bg: "#d1fae5" },
    { min: 65, grade: "B+", pts: 10, color: "#0891b2", bg: "#e0f2fe" },
    { min: 60, grade: "B",  pts:  9, color: "#2563eb", bg: "#dbeafe" },
    { min: 55, grade: "B-", pts:  8, color: "#4f46e5", bg: "#ede9fe" },
    { min: 50, grade: "C+", pts:  7, color: "#7c3aed", bg: "#f3e8ff" },
    { min: 45, grade: "C",  pts:  6, color: "#d97706", bg: "#fef3c7" },
    { min: 40, grade: "C-", pts:  5, color: "#f59e0b", bg: "#fffbeb" },
    { min: 35, grade: "D+", pts:  4, color: "#ea580c", bg: "#fff7ed" },
    { min: 30, grade: "D",  pts:  3, color: "#dc2626", bg: "#fef2f2" },
    { min: 25, grade: "D-", pts:  2, color: "#b91c1c", bg: "#fee2e2" },
    { min:  0, grade: "E",  pts:  1, color: "#7f1d1d", bg: "#fecaca" },
];
const getGObj = (s: number) => GRADE_SCALE.find(g => s >= g.min) || GRADE_SCALE[GRADE_SCALE.length-1];
const getGStr = (s: number) => getGObj(s).grade;
const cbcLC = (lv: string | null) => {
    if (lv === "EE") return { bg: "#d1fae5", color: "#059669", label: "Exceeds Expectation" };
    if (lv === "ME") return { bg: "#dbeafe", color: "#2563eb", label: "Meets Expectation" };
    if (lv === "AE") return { bg: "#fef3c7", color: "#d97706", label: "Approaches Expectation" };
    if (lv === "BE") return { bg: "#fee2e2", color: "#dc2626", label: "Below Expectation" };
    return { bg: "#f1f5f9", color: "#94a3b8", label: "Not Assessed" };
};
const fmt = (d: string) => d ? new Date(d).toLocaleDateString("en-KE",{day:"2-digit",month:"short",year:"numeric"}) : "—";

// ── UI Atoms ─────────────────────────────────────────────────
function GradePill({ grade }: { grade: string }) {
    const g = GRADE_SCALE.find(x => x.grade === grade) || GRADE_SCALE[GRADE_SCALE.length-1];
    return (
        <View style={{paddingHorizontal:8,paddingVertical:3,borderRadius:8,backgroundColor:g.bg,borderWidth:1,borderColor:g.color+"40"}}>
            <Text style={{fontSize:11,fontWeight:"900",color:g.color}}>{grade}</Text>
        </View>
    );
}
function ScoreBar({ score }: { score: number }) {
    const g = getGObj(score);
    return (
        <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
            <View style={{flex:1,height:6,backgroundColor:"#f1f5f9",borderRadius:3}}>
                <View style={{width:`${Math.min(score,100)}%`,height:6,borderRadius:3,backgroundColor:g.color}} />
            </View>
            <Text style={{fontSize:11,fontWeight:"800",color:g.color,width:34,textAlign:"right"}}>{score.toFixed(0)}%</Text>
        </View>
    );
}
function MetricChip({icon,label,value,color="#6366f1"}:{icon:string;label:string;value:string|number;color?:string}) {
    return (
        <View style={{flex:1,backgroundColor:"#fff",borderRadius:14,padding:11,borderWidth:1,borderColor:"#e2e8f0",alignItems:"center"}}>
            <Text style={{fontSize:20}}>{icon}</Text>
            <Text style={{fontSize:16,fontWeight:"900",color,marginTop:3}}>{value}</Text>
            <Text style={{fontSize:10,color:"#64748b",fontWeight:"600",textAlign:"center",marginTop:1}}>{label}</Text>
        </View>
    );
}
function SHd({icon,title,sub}:{icon:string;title:string;sub?:string}) {
    return (
        <View style={{flexDirection:"row",alignItems:"center",gap:10,marginBottom:14}}>
            <View style={{width:36,height:36,borderRadius:10,backgroundColor:"#ede9fe",alignItems:"center",justifyContent:"center"}}>
                <Text style={{fontSize:18}}>{icon}</Text>
            </View>
            <View style={{flex:1}}>
                <Text style={{fontSize:14,fontWeight:"900",color:"#0f172a"}}>{title}</Text>
                {sub?<Text style={{fontSize:11,color:"#64748b",marginTop:1}}>{sub}</Text>:null}
            </View>
        </View>
    );
}
function SparkBars({ data }: { data: number[] }) {
    if (!data.length) return null;
    const mn=Math.min(...data), mx=Math.max(...data), rng=mx-mn||1;
    return (
        <View style={{flexDirection:"row",alignItems:"flex-end",height:56,gap:3}}>
            {data.map((v,i)=>{
                const pct=Math.max(0.08,(v-mn)/rng);
                const g=getGObj(v);
                return (
                    <View key={i} style={{flex:1,alignItems:"center"}}>
                        <Text style={{fontSize:8,color:g.color,fontWeight:"900",marginBottom:2}}>{v.toFixed(0)}</Text>
                        <View style={{width:"100%",height:44,justifyContent:"flex-end"}}>
                            <View style={{width:"75%",alignSelf:"center",height:Math.max(4,44*pct),borderRadius:4,backgroundColor:g.color}}/>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════
export default function AcademicPassportScreen() {
    const navigation = useNavigation();
    const route = useRoute<RouteProps>();
    const insets = useSafeAreaInsets();
    const { studentId, studentName, formId, formLevel, isParent } = route.params;
    const isCBC = formLevel >= 10;

    const [loading,setLoading]           = useState(true);
    const [refreshing,setRefreshing]     = useState(false);
    const [student,setStudent]           = useState<any>(null);
    const [termHistory,setTermHistory]   = useState<any[]>([]);
    const [subjectAvgs,setSubjectAvgs]   = useState<any[]>([]);
    const [cbcHistory,setCbcHistory]     = useState<any[]>([]);
    const [attendance,setAttendance]     = useState<{present:number;total:number}|null>(null);
    const [discipline,setDiscipline]     = useState(0);
    const [latestCmt,setLatestCmt]       = useState({teacher:"",principal:""});
    const [activeTab,setActiveTab]       = useState<"overview"|"subjects"|"history"|"conduct">("overview");

    const load = useCallback(async () => {
        try {
            // ── 1A. Student join query — EXACT same columns as getStudentDetail ──
            const { data: s, error: sErr } = await supabase
                .from('school_students')
                .select('id, admission_number, first_name, last_name, gender, photo_url, form_id, guardian_name, guardian_phone, school_forms(form_name, form_level), school_streams(stream_name)')
                .eq('id', studentId)
                .single();
            if (sErr) console.error('student join error:', sErr.message);

            // ── 1B. Extra flat columns — separate query, own try/catch ──────────
            let sExtra: any = {};
            try {
                const { data: ex } = await supabase
                    .from('school_students')
                    .select('date_of_birth, date_admitted, house, kcpe_marks')
                    .eq('id', studentId)
                    .single();
                if (ex) sExtra = ex;
            } catch (_) {}

            if (s) setStudent({ ...s, ...sExtra });

            // Derive CBC from actual form_level in DB (params may have 0)
            const actualFormLevel = (s as any)?.school_forms?.form_level ?? formLevel;
            const isStudentCBC = actualFormLevel >= 10;

            // ── 2. Terms list ──────────────────────────────────────────
            const { data: terms } = await supabase
                .from('school_terms')
                .select('id, term_name')
                .order('id', { ascending: true });

            if (isStudentCBC) {
                // ── CBC marks per term ─────────────────────────────────
                const hist: any[] = [];
                for (const term of (terms || [])) {
                    try {
                        const { data: sc } = await supabase
                            .from('cbc_mark_scores')
                            .select('score, school_strands(school_subjects(subject_name))')
                            .eq('student_id', studentId)
                            .eq('term_id', term.id);
                        if (!sc || !sc.length) continue;
                        const bySub: Record<string, number[]> = {};
                        sc.forEach((x: any) => {
                            const n = x.school_strands?.school_subjects?.subject_name || 'Unknown';
                            if (!bySub[n]) bySub[n] = [];
                            bySub[n].push(Number(x.score || 0));
                        });
                        const subs = Object.entries(bySub).map(([name, scores]) => {
                            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                            return { name, level: avg >= 75 ? 'EE' : avg >= 50 ? 'ME' : avg >= 25 ? 'AE' : 'BE', avg };
                        });
                        const avgScore = subs.reduce((a, b) => a + b.avg, 0) / subs.length;
                        hist.push({
                            term_name: term.term_name,
                            overallLevel: avgScore >= 75 ? 'EE' : avgScore >= 50 ? 'ME' : avgScore >= 25 ? 'AE' : 'BE',
                            avgScore, subs,
                        });
                    } catch (e: any) { console.error('cbc term error:', e.message); }
                }
                setCbcHistory(hist);
            } else {
                // ── 8-4-4 marks per term ───────────────────────────────
                const hist: any[] = [];
                const sm: Record<string, number[]> = {};
                for (const term of (terms || [])) {
                    try {
                        const { data: marks } = await supabase
                            .from('school_exam_marks')
                            .select('score, grade, school_subjects(subject_name)')
                            .eq('student_id', studentId)
                            .eq('term_id', term.id)
                            .eq('exam_type', 'End-Term');
                        if (!marks || !marks.length) continue;
                        const subs = marks.map((m: any) => ({
                            sn: m.school_subjects?.subject_name || '—',
                            sc: Number(m.score || 0),
                            gr: m.grade || getGStr(Number(m.score || 0)),
                        }));
                        subs.forEach(s => { if (!sm[s.sn]) sm[s.sn] = []; sm[s.sn].push(s.sc); });
                        const avg = subs.reduce((a, b) => a + b.sc, 0) / subs.length;
                        // Rank in form
                        let rank = 0, total = 0;
                        if (formId) {
                            try {
                                const { data: fs } = await supabase
                                    .from('school_students').select('id')
                                    .eq('form_id', formId).eq('status', 'Active');
                                const sids = (fs || []).map((x: any) => x.id);
                                total = sids.length;
                                if (sids.length) {
                                    const { data: am } = await supabase
                                        .from('school_exam_marks').select('student_id, score')
                                        .eq('term_id', term.id).eq('exam_type', 'End-Term')
                                        .in('student_id', sids);
                                    const tots: Record<number, number> = {};
                                    (am || []).forEach((m: any) => { tots[m.student_id] = (tots[m.student_id] || 0) + Number(m.score || 0); });
                                    const sorted = Object.values(tots).sort((a, b) => b - a);
                                    rank = sorted.findIndex(t => t === tots[studentId]) + 1;
                                }
                            } catch (e: any) { console.error('rank error:', e.message); }
                        }
                        // Comments — try both possible table names
                        try {
                            const { data: cmt } = await supabase
                                .from('cbc_report_card_comments')
                                .select('teacher_comment, principal_comment')
                                .eq('student_id', studentId).eq('term_id', term.id)
                                .maybeSingle();
                            if (cmt) setLatestCmt({ teacher: cmt.teacher_comment || '', principal: cmt.principal_comment || '' });
                        } catch (_) {}
                        hist.push({
                            term_name: term.term_name,
                            avg: parseFloat(avg.toFixed(1)),
                            grade: getGStr(avg), rank, total, subs,
                        });
                    } catch (e: any) { console.error('term marks error:', e.message); }
                }
                setTermHistory(hist);
                setSubjectAvgs(
                    Object.entries(sm)
                        .map(([name, sc]) => {
                            const avg = sc.reduce((a, b) => a + b, 0) / sc.length;
                            return { name, avg: parseFloat(avg.toFixed(1)), grade: getGStr(avg), count: sc.length };
                        })
                        .sort((a, b) => b.avg - a.avg)
                );
            }

            // ── 3. Comments for CBC ────────────────────────────────────
            if (isStudentCBC) {
                try {
                    const { data: cmt } = await supabase
                        .from('cbc_report_card_comments')
                        .select('teacher_comment, principal_comment')
                        .eq('student_id', studentId)
                        .order('term_id', { ascending: false })
                        .limit(1).maybeSingle();
                    if (cmt) setLatestCmt({ teacher: cmt.teacher_comment || '', principal: cmt.principal_comment || '' });
                } catch (_) {}
            }

            // ── 4. Attendance ──────────────────────────────────────────
            try {
                const { data: att } = await supabase
                    .from('school_attendance')
                    .select('status')
                    .eq('student_id', studentId);
                if (att) {
                    const present = att.filter((a: any) => a.status === 'Present').length;
                    setAttendance({ present, total: att.length });
                }
            } catch (e: any) { console.error('attendance error:', e.message); }

            // ── 5. Discipline — correct table is school_discipline_records
            try {
                const { count } = await supabase
                    .from('school_discipline_records')
                    .select('id', { count: 'exact', head: true })
                    .eq('student_id', studentId);
                setDiscipline(count || 0);
            } catch (e: any) { console.error('discipline error:', e.message); }

        } catch (e: any) { console.error('passport load error:', e.message); }
        finally { setLoading(false); setRefreshing(false); }
    }, [studentId, formId, formLevel, isCBC]);


    useEffect(()=>{load();},[load]);
    const onRefresh=()=>{setRefreshing(true);load();};

    const latestT=termHistory[termHistory.length-1];
    const oAvg=termHistory.length?termHistory.reduce((a,t)=>a+t.avg,0)/termHistory.length:0;
    const trend=termHistory.length>=2?termHistory[termHistory.length-1].avg-termHistory[termHistory.length-2].avg:0;
    const tAvgs=termHistory.map(t=>t.avg);
    const attPct=attendance&&attendance.total>0?Math.round(attendance.present/attendance.total*100):0;
    const age=student?.date_of_birth?Math.floor((Date.now()-new Date(student.date_of_birth).getTime())/31557600000):null;

    if (loading) return (
        <View style={{flex:1,backgroundColor:"#F8FAFF",justifyContent:"center",alignItems:"center"}}>
            <ActivityIndicator size="large" color="#6366f1"/>
            <Text style={{marginTop:12,color:"#64748b",fontWeight:"700",fontSize:14}}>Loading Academic Passport…</Text>
        </View>
    );

    const TABS=[{k:"overview",i:"📋",l:"Overview"},{k:"subjects",i:"📖",l:"Subjects"},{k:"history",i:"📈",l:"History"},{k:"conduct",i:"🧭",l:"Conduct"}] as const;

    return (
        <View style={{flex:1,backgroundColor:"#F8FAFF"}}>
            <StatusBar barStyle="light-content"/>
            {/* ── HERO ── */}
            <LinearGradient colors={["#1e1b4b","#4f46e5","#7c3aed"]} start={{x:0,y:0}} end={{x:1,y:1}}
                style={{paddingTop:insets.top+8,paddingBottom:20,paddingHorizontal:20}}>
                <TouchableOpacity onPress={()=>navigation.goBack()} style={{flexDirection:"row",alignItems:"center",gap:6,marginBottom:18}}>
                    <Text style={{color:"rgba(255,255,255,0.7)",fontSize:22}}>{"←"}</Text>
                    <Text style={{color:"rgba(255,255,255,0.7)",fontSize:13,fontWeight:"700"}}>Academic Passport</Text>
                </TouchableOpacity>
                <View style={{flexDirection:"row",gap:14,alignItems:"flex-start"}}>
                    <View style={{width:72,height:72,borderRadius:20,backgroundColor:"rgba(255,255,255,0.15)",borderWidth:2,borderColor:"rgba(255,255,255,0.3)",overflow:"hidden",alignItems:"center",justifyContent:"center"}}>
                        {student?.photo_url?<Image source={{uri:student.photo_url}} style={{width:72,height:72}}/>:<Text style={{fontSize:32}}>{student?.gender==="Female"?"👩‍🎓":"👨‍🎓"}</Text>}
                    </View>
                    <View style={{flex:1}}>
                        <Text style={{color:"#fff",fontSize:18,fontWeight:"900"}}>{student?`${student.first_name} ${student.last_name}`:studentName}</Text>
                        <View style={{flexDirection:"row",flexWrap:"wrap",gap:5,marginTop:6}}>
                            {[`🎓 ${student?.school_forms?.form_name||"—"}`,`🏫 ${student?.school_streams?.stream_name||"—"}`,`🪪 ${student?.admission_number||"—"}`].map(tag=>(
                                <View key={tag} style={{backgroundColor:"rgba(255,255,255,0.15)",paddingHorizontal:8,paddingVertical:3,borderRadius:8}}>
                                    <Text style={{color:"#c7d2fe",fontSize:11,fontWeight:"700"}}>{tag}</Text>
                                </View>
                            ))}
                        </View>
                        {age!==null&&<Text style={{color:"rgba(255,255,255,0.55)",fontSize:11,marginTop:5}}>{age} yrs · Admitted {fmt(student?.date_admitted)}</Text>}
                    </View>
                </View>
                <View style={{flexDirection:"row",gap:6,marginTop:14}}>
                    {[{l:"Overall",v:isCBC?"—":`${oAvg.toFixed(1)}%`,i:"📊"},{l:"Trend",v:isCBC?"—":`${trend>=0?"+":""}${trend.toFixed(1)}`,i:trend>=0?"📈":"📉"},{l:"Attend",v:attendance?`${attPct}%`:"—",i:"📅"},{l:"Terms",v:isCBC?cbcHistory.length:termHistory.length,i:"📚"}].map(k=>(
                        <View key={k.l} style={{flex:1,backgroundColor:"rgba(255,255,255,0.1)",borderRadius:10,padding:8,alignItems:"center"}}>
                            <Text style={{fontSize:14}}>{k.i}</Text>
                            <Text style={{color:"#fff",fontSize:13,fontWeight:"900",marginTop:2}}>{k.v}</Text>
                            <Text style={{color:"rgba(255,255,255,0.55)",fontSize:9,fontWeight:"600"}}>{k.l}</Text>
                        </View>
                    ))}
                </View>
            </LinearGradient>

            {/* ── TABS ── */}
            <View style={{flexDirection:"row",backgroundColor:"#fff",borderBottomWidth:1,borderBottomColor:"#e2e8f0"}}>
                {TABS.map(tab=>{const active=activeTab===tab.k;return(
                    <TouchableOpacity key={tab.k} onPress={()=>setActiveTab(tab.k)}
                        style={{flex:1,paddingVertical:10,alignItems:"center",borderBottomWidth:2.5,borderBottomColor:active?"#6366f1":"transparent"}}>
                        <Text style={{fontSize:16}}>{tab.i}</Text>
                        <Text style={{fontSize:9,fontWeight:active?"900":"600",color:active?"#6366f1":"#94a3b8",marginTop:2}}>{tab.l}</Text>
                    </TouchableOpacity>
                );})}
            </View>

            {/* ── CONTENT ── */}
            <ScrollView contentContainerStyle={{padding:16,gap:14,paddingBottom:insets.bottom+28}}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6366f1"]}/>}
                showsVerticalScrollIndicator={false}>

                {/* OVERVIEW */}
                {activeTab==="overview"&&(<>
                    <View style={st.card}>
                        <SHd icon="👤" title="Student Information" sub="Personal & enrollment details"/>
                        {[["Full Name",student?`${student.first_name} ${student.last_name}`:studentName],["Admission No.",student?.admission_number||"—"],["Gender",student?.gender||"—"],["Date of Birth",fmt(student?.date_of_birth)],["Age",age!==null?`${age} years`:"—"],["Form/Class",student?.school_forms?.form_name||"—"],["Stream",student?.school_streams?.stream_name||"—"],["Guardian",student?.guardian_name||"—"],["Phone",student?.guardian_phone||"—"],["Admitted",fmt(student?.date_admitted)],["KCPE Marks",student?.kcpe_marks?`${student.kcpe_marks}/500`:"—"],["House",student?.house||"—"]].map(([label,val])=>(
                            <View key={label as string} style={{flexDirection:"row",justifyContent:"space-between",paddingVertical:7,borderBottomWidth:1,borderBottomColor:"#f1f5f9"}}>
                                <Text style={{fontSize:12,color:"#64748b",fontWeight:"600"}}>{label}</Text>
                                <Text style={{fontSize:12,color:"#0f172a",fontWeight:"800",maxWidth:W*0.52,textAlign:"right"}} numberOfLines={2}>{val as string}</Text>
                            </View>
                        ))}
                    </View>

                    {!isCBC&&termHistory.length>0&&(
                        <View style={st.card}>
                            <SHd icon="📊" title="Performance Snapshot" sub={`${termHistory.length} terms of End-Term data`}/>
                            <View style={{backgroundColor:"#f8faff",borderRadius:12,padding:12,marginBottom:14}}>
                                <Text style={{fontSize:11,color:"#64748b",fontWeight:"700",marginBottom:8}}>Mean Score Per Term</Text>
                                <SparkBars data={tAvgs}/>
                                <View style={{flexDirection:"row",justifyContent:"space-around",marginTop:4}}>
                                    {termHistory.map((t,i)=><Text key={i} style={{fontSize:8,color:"#94a3b8",fontWeight:"600",flex:1,textAlign:"center"}} numberOfLines={1}>{t.term_name.replace("Term ","T")}</Text>)}
                                </View>
                            </View>
                            <View style={{flexDirection:"row",gap:8}}>
                                <MetricChip icon="📈" label="Overall Avg" value={`${oAvg.toFixed(1)}%`} color="#6366f1"/>
                                <MetricChip icon={trend>=0?"📈":"📉"} label="Trend" value={`${trend>=0?"+":""}${trend.toFixed(1)}`} color={trend>=0?"#059669":"#dc2626"}/>
                                <MetricChip icon="🏆" label="Best Term" value={tAvgs.length?`${Math.max(...tAvgs).toFixed(0)}%`:"—"} color="#d97706"/>
                            </View>
                            {latestT?.rank>0&&(
                                <View style={{marginTop:12,flexDirection:"row",alignItems:"center",gap:10,backgroundColor:"#ede9fe",borderRadius:12,padding:12}}>
                                    <Text style={{fontSize:26}}>🎖️</Text>
                                    <View>
                                        <Text style={{color:"#4f46e5",fontWeight:"900",fontSize:15}}>Rank #{latestT.rank} of {latestT.total}</Text>
                                        <Text style={{color:"#7c3aed",fontSize:11,fontWeight:"600",marginTop:2}}>In {latestT.term_name} (Latest)</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    {isCBC&&cbcHistory.length>0&&(
                        <View style={st.card}>
                            <SHd icon="🌱" title="CBC Overview" sub={`${cbcHistory.length} terms assessed`}/>
                            {cbcHistory.slice(-4).map((t,i)=>{const lv=cbcLC(t.overallLevel);return(
                                <View key={i} style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingVertical:10,borderBottomWidth:1,borderBottomColor:"#f1f5f9"}}>
                                    <Text style={{fontSize:12,color:"#0f172a",fontWeight:"700"}}>{t.term_name}</Text>
                                    <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
                                        <Text style={{fontSize:11,color:"#64748b"}}>{t.avgScore.toFixed(0)}%</Text>
                                        <View style={{paddingHorizontal:8,paddingVertical:3,borderRadius:8,backgroundColor:lv.bg}}><Text style={{fontSize:11,fontWeight:"900",color:lv.color}}>{t.overallLevel}</Text></View>
                                    </View>
                                </View>
                            );})}
                        </View>
                    )}
                    <View style={{flexDirection:"row",gap:8}}>
                        <MetricChip icon="📅" label="Attendance" value={attendance?`${attPct}%`:"—"} color={attPct>=80?"#059669":"#dc2626"}/>
                        <MetricChip icon="⚠️" label="Discipline" value={discipline} color={discipline===0?"#059669":"#dc2626"}/>
                        <MetricChip icon="📚" label="Terms" value={isCBC?cbcHistory.length:termHistory.length} color="#6366f1"/>
                    </View>
                </>)}

                {/* SUBJECTS */}
                {activeTab==="subjects"&&!isCBC&&(
                    <View style={st.card}>
                        <SHd icon="📖" title="Subject Performance" sub="Average across all End-Term exams"/>
                        {subjectAvgs.length===0?<View style={{alignItems:"center",paddingVertical:40}}><Text style={{fontSize:40}}>📭</Text><Text style={{color:"#64748b",marginTop:10,fontWeight:"700"}}>No subject data yet</Text></View>
                        :subjectAvgs.map((sub,i)=>(
                            <View key={i} style={{paddingVertical:10,borderBottomWidth:1,borderBottomColor:"#f1f5f9"}}>
                                <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                                    <View style={{flex:1}}>
                                        <Text style={{fontSize:13,fontWeight:"800",color:"#0f172a"}}>{i===0?"🏆 ":i===subjectAvgs.length-1&&subjectAvgs.length>1?"⚠️ ":""}{sub.name}</Text>
                                        <Text style={{fontSize:10,color:"#94a3b8",marginTop:1}}>{sub.count} term{sub.count>1?"s":""}</Text>
                                    </View>
                                    <GradePill grade={sub.grade}/>
                                </View>
                                <ScoreBar score={sub.avg}/>
                            </View>
                        ))}
                    </View>
                )}
                {activeTab==="subjects"&&isCBC&&cbcHistory.length>0&&(
                    <View style={st.card}>
                        <SHd icon="🌱" title="CBC Subject Levels" sub="Latest term"/>
                        {(cbcHistory[cbcHistory.length-1]?.subs||[]).map((sub:any,i:number)=>{const lv=cbcLC(sub.level);return(
                            <View key={i} style={{paddingVertical:10,borderBottomWidth:1,borderBottomColor:"#f1f5f9"}}>
                                <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                                    <Text style={{fontSize:13,fontWeight:"800",color:"#0f172a",flex:1}}>{sub.name}</Text>
                                    <View style={{paddingHorizontal:8,paddingVertical:3,borderRadius:8,backgroundColor:lv.bg}}><Text style={{fontSize:11,fontWeight:"900",color:lv.color}}>{sub.level||"NA"}</Text></View>
                                </View>
                                <Text style={{fontSize:11,color:lv.color,fontWeight:"700",marginBottom:4}}>{lv.label}</Text>
                                <ScoreBar score={sub.avg}/>
                            </View>
                        );})}
                    </View>
                )}

                {/* HISTORY */}
                {activeTab==="history"&&!isCBC&&(
                    <View style={st.card}>
                        <SHd icon="📈" title="Full Term History" sub="End-Term results — all years"/>
                        {termHistory.length===0?<View style={{alignItems:"center",paddingVertical:40}}><Text style={{fontSize:40}}>📭</Text><Text style={{color:"#64748b",marginTop:10,fontWeight:"700"}}>No history yet</Text></View>
                        :termHistory.map((term,i)=>{
                            const gc=getGObj(term.avg);const isLast=i===termHistory.length-1;
                            return(
                                <View key={i} style={{borderRadius:12,borderWidth:1,borderColor:isLast?"#6366f180":"#e2e8f0",backgroundColor:isLast?"#f0f0ff":"#fafafa",padding:12,marginBottom:10}}>
                                    <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                                        <View>
                                            <Text style={{fontSize:13,fontWeight:"900",color:"#0f172a"}}>{term.term_name}</Text>
                                            {isLast&&<Text style={{fontSize:9,color:"#6366f1",fontWeight:"900"}}>LATEST TERM</Text>}
                                        </View>
                                        <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
                                            {term.rank>0&&<Text style={{fontSize:11,color:"#64748b",fontWeight:"700"}}>#{term.rank}/{term.total}</Text>}
                                            <GradePill grade={term.grade}/>
                                            <Text style={{fontSize:14,fontWeight:"900",color:gc.color}}>{term.avg}%</Text>
                                        </View>
                                    </View>
                                    {term.subs.map((sub:any,j:number)=>(
                                        <View key={j} style={{flexDirection:"row",justifyContent:"space-between",paddingVertical:4,borderTopWidth:j===0?1:0,borderTopColor:"#e2e8f0"}}>
                                            <Text style={{fontSize:11,color:"#475569",fontWeight:"600",flex:1}}>{sub.sn}</Text>
                                            <View style={{flexDirection:"row",alignItems:"center",gap:6}}>
                                                <Text style={{fontSize:11,color:"#0f172a",fontWeight:"800"}}>{sub.sc}</Text>
                                                <GradePill grade={sub.gr}/>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            );
                        })}
                    </View>
                )}
                {activeTab==="history"&&isCBC&&(
                    <View style={st.card}>
                        <SHd icon="📈" title="CBC Term History" sub="Competency progression"/>
                        {cbcHistory.map((term,i)=>{const lv=cbcLC(term.overallLevel);const isLast=i===cbcHistory.length-1;return(
                            <View key={i} style={{borderRadius:12,borderWidth:1,borderColor:isLast?"#6366f180":"#e2e8f0",backgroundColor:isLast?"#f0f0ff":"#fafafa",padding:12,marginBottom:10}}>
                                <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                                    <View><Text style={{fontSize:13,fontWeight:"900",color:"#0f172a"}}>{term.term_name}</Text>{isLast&&<Text style={{fontSize:9,color:"#6366f1",fontWeight:"900"}}>LATEST TERM</Text>}</View>
                                    <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
                                        <Text style={{fontSize:11,color:"#64748b"}}>{term.avgScore.toFixed(0)}%</Text>
                                        <View style={{paddingHorizontal:10,paddingVertical:4,borderRadius:10,backgroundColor:lv.bg}}><Text style={{fontSize:13,fontWeight:"900",color:lv.color}}>{term.overallLevel}</Text></View>
                                    </View>
                                </View>
                                <Text style={{fontSize:11,color:lv.color,fontWeight:"700",marginBottom:6}}>{lv.label}</Text>
                                {term.subs.map((sub:any,j:number)=>{const slv=cbcLC(sub.level);return(
                                    <View key={j} style={{flexDirection:"row",justifyContent:"space-between",paddingVertical:4,borderTopWidth:j===0?1:0,borderTopColor:"#e2e8f0"}}>
                                        <Text style={{fontSize:11,color:"#475569",fontWeight:"600",flex:1}}>{sub.name}</Text>
                                        <View style={{paddingHorizontal:6,paddingVertical:2,borderRadius:6,backgroundColor:slv.bg}}><Text style={{fontSize:10,fontWeight:"900",color:slv.color}}>{sub.level||"NA"}</Text></View>
                                    </View>
                                );})}
                            </View>
                        );})}
                    </View>
                )}

                {/* CONDUCT */}
                {activeTab==="conduct"&&(<>
                    <View style={st.card}>
                        <SHd icon="📅" title="Attendance Record" sub="Full attendance log"/>
                        {attendance?(<>
                            <View style={{flexDirection:"row",gap:8,marginBottom:14}}>
                                <MetricChip icon="✅" label="Present" value={attendance.present} color="#059669"/>
                                <MetricChip icon="❌" label="Absent" value={attendance.total-attendance.present} color="#dc2626"/>
                                <MetricChip icon="📊" label="Rate" value={`${attPct}%`} color={attPct>=80?"#059669":"#f59e0b"}/>
                            </View>
                            <View style={{backgroundColor:"#f8faff",borderRadius:12,padding:12}}>
                                <View style={{flexDirection:"row",justifyContent:"space-between",marginBottom:6}}>
                                    <Text style={{fontSize:12,fontWeight:"700",color:"#64748b"}}>Attendance Rate</Text>
                                    <Text style={{fontSize:12,fontWeight:"900",color:attPct>=80?"#059669":"#dc2626"}}>{attPct}%</Text>
                                </View>
                                <View style={{height:10,backgroundColor:"#e2e8f0",borderRadius:5}}>
                                    <View style={{height:10,width:`${attPct}%`,borderRadius:5,backgroundColor:attPct>=80?"#059669":attPct>=60?"#f59e0b":"#dc2626"}}/>
                                </View>
                                <Text style={{fontSize:11,color:"#94a3b8",marginTop:6}}>{attPct>=90?"🌟 Excellent attendance!":attPct>=75?"✅ Good attendance":"⚠️ Needs improvement"}</Text>
                            </View>
                        </>):<View style={{alignItems:"center",paddingVertical:30}}><Text style={{fontSize:40}}>📭</Text><Text style={{color:"#64748b",marginTop:8,fontWeight:"700"}}>No records</Text></View>}
                    </View>

                    <View style={st.card}>
                        <SHd icon="⚠️" title="Discipline Record" sub="All incidents on file"/>
                        <View style={{alignItems:"center",paddingVertical:20}}>
                            <View style={{width:80,height:80,borderRadius:40,backgroundColor:discipline===0?"#ecfdf5":"#fef2f2",alignItems:"center",justifyContent:"center",marginBottom:12}}>
                                <Text style={{fontSize:36}}>{discipline===0?"🌟":"⚠️"}</Text>
                            </View>
                            <Text style={{fontSize:32,fontWeight:"900",color:discipline===0?"#059669":"#dc2626"}}>{discipline}</Text>
                            <Text style={{fontSize:13,color:"#64748b",fontWeight:"700",marginTop:4}}>Incident{discipline!==1?"s":""} on Record</Text>
                            <Text style={{fontSize:12,color:discipline===0?"#059669":"#dc2626",marginTop:8,fontWeight:"700",textAlign:"center"}}>
                                {discipline===0?"✅ Excellent conduct — clean record!":`${discipline} incident${discipline!==1?"s":""} recorded`}
                            </Text>
                        </View>
                    </View>

                    {(latestCmt.teacher||latestCmt.principal)&&(
                        <View style={st.card}>
                            <SHd icon="💬" title="Teacher & Principal Remarks" sub="Latest term"/>
                            {latestCmt.teacher?<View style={{backgroundColor:"#f0fdf4",borderRadius:12,padding:14,marginBottom:10,borderLeftWidth:3,borderLeftColor:"#059669"}}>
                                <Text style={{fontSize:11,fontWeight:"900",color:"#059669",marginBottom:5}}>CLASS TEACHER</Text>
                                <Text style={{fontSize:13,color:"#0f172a",lineHeight:21}}>"{latestCmt.teacher}"</Text>
                            </View>:null}
                            {latestCmt.principal?<View style={{backgroundColor:"#ede9fe",borderRadius:12,padding:14,borderLeftWidth:3,borderLeftColor:"#7c3aed"}}>
                                <Text style={{fontSize:11,fontWeight:"900",color:"#7c3aed",marginBottom:5}}>PRINCIPAL</Text>
                                <Text style={{fontSize:13,color:"#0f172a",lineHeight:21}}>"{latestCmt.principal}"</Text>
                            </View>:null}
                        </View>
                    )}
                </>)}
            </ScrollView>
        </View>
    );
}

const st = StyleSheet.create({
    card:{backgroundColor:"#fff",borderRadius:16,padding:16,borderWidth:1,borderColor:"#e2e8f0",shadowColor:"#0f172a",shadowOffset:{width:0,height:2},shadowOpacity:0.04,shadowRadius:8,elevation:2},
});
