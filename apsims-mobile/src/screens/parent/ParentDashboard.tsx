// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra Premium — Parent Dashboard v3.0
// Auto-detects ALL children linked to parent portal account
// Ultra-light bright theme · Live fee status · Kenya #1
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, StatusBar, Dimensions, Image, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useSession } from '../../context/SessionContext';
import { clearSession } from '../../lib/security';
import { supabase } from '../../lib/supabase';
import { getUnreadNotificationCount, formatKES } from '../../lib/supabase';
import { cacheData, getCachedData } from '../../lib/offline';
import { T, fmtKES, fmtKESShort } from '../../theme/PremiumTheme';
import {
    MetricCard, SectionLabel, ProgressBar, EmptyState,
    SkeletonCard, SkeletonRow, QuickActionItem, Chip,
} from '../../components/PremiumUI';
import OfflineBanner from '../../components/OfflineBanner';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
const { width: W } = Dimensions.get('window');

interface ChildData {
    id: number;
    full_name: string;
    first_name: string;
    last_name: string;
    admission_number: string;
    form_id: number;
    form_name: string;
    stream_name: string;
    gender: string;
    photo_url?: string;
    totalDue: number;       // arrears + current term balance
    totalPaid: number;
    balance: number;          // same as totalDue (kept for compat)
    termTotal: number;        // current term fees only
    termBalance: number;      // current term unpaid
    prevArrears: number;      // unpaid from previous terms
    annualTotal: number;
    annualBalance: number;
    collectionRate: number;
    attendanceRate: number;
    hasFeeStructure: boolean; // true only when fee structure exists
    isCleared: boolean;       // true only when fees exist AND fully paid
    recentPayments: any[];
    feeStructure: any[];
}

export default function ParentDashboard() {
    const { session, setSession } = useSession();
    const navigation = useNavigation<NavProp>();
    const insets = useSafeAreaInsets();
    const [children, setChildren] = useState<ChildData[]>([]);
    const [selectedChild, setSelectedChild] = useState<ChildData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [announcements, setAnnouncements] = useState<any[]>([]);

    // ── Standalone fee statement — mirrors web getStudentFees exactly ────────
    const [feeStmt, setFeeStmt] = useState<{
        rows: { label: string; amount: number }[];
        annualTotal: number; totalPaid: number; balance: number;
        hasFees: boolean; loaded: boolean;
    }>({ rows: [], annualTotal: 0, totalPaid: 0, balance: 0, hasFees: false, loaded: false });

    const portalUserId = session?.portal_user_id || 0;
    const sesStudentId = session?.linked_student_id || 0;
    const sesFormId    = session?.student_form_id    || 0;

    const loadFeeStatement = useCallback(async () => {
        if (!sesStudentId) return;  // only need student ID — form_id optional (Grade 10 etc.)
        try {
            const currentYear = new Date().getFullYear();
            const [structRes, payRes, termRes] = await Promise.all([
                supabase.from('school_fee_structures').select('id, category, amount, term_id, year, form_id'),
                supabase.from('school_fee_payments')
                    .select('id, amount, payment_date, payment_method, receipt_no')
                    .eq('student_id', sesStudentId)
                    .order('payment_date', { ascending: false }),
                supabase.from('school_terms').select('id, term_name, is_current').order('id'),
            ]);
            const allStr: any[] = structRes.data || [];
            const allPay: any[] = payRes.data   || [];
            const allTrm: any[] = termRes.data   || [];

            // Filter: general + this form, then by year
            let applicable = allStr.filter((f: any) => !f.form_id || Number(f.form_id) === Number(sesFormId));
            let yearFees = applicable.filter((f: any) => !f.year || Number(f.year) === currentYear);
            if (yearFees.length === 0 && applicable.length > 0) {
                const maxYear = Math.max(...applicable.map((f: any) => Number(f.year) || 0));
                yearFees = applicable.filter((f: any) => !f.year || Number(f.year) === maxYear);
            }

            const totalPaid   = allPay.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
            const annualTotal = yearFees.reduce((s: number, f: any) => s + Number(f.amount || 0), 0);

            // Build per-term rows in term order
            const rows: { label: string; amount: number }[] = [];
            const currentTerm = allTrm.find((t: any) => t.is_current);

            // School-wide (no term)
            const noTermAmt = yearFees.filter((f: any) => !f.term_id)
                .reduce((s: number, f: any) => s + Number(f.amount || 0), 0);
            if (noTermAmt > 0) rows.push({ label: 'General School Fees', amount: noTermAmt });

            // Per-term
            allTrm.forEach((term: any) => {
                const amt = yearFees.filter((f: any) => Number(f.term_id) === term.id)
                    .reduce((s: number, f: any) => s + Number(f.amount || 0), 0);
                if (amt > 0) {
                    const isCurrent = currentTerm && term.id === currentTerm.id;
                    rows.push({ label: `${term.term_name} Fees${isCurrent ? ' ← Current' : ''}`, amount: amt });
                }
            });

            setFeeStmt({
                rows, annualTotal, totalPaid,
                balance: Math.max(0, annualTotal - totalPaid),
                hasFees: annualTotal > 0, loaded: true,
            });
        } catch (err: any) {
            console.error('loadFeeStatement:', err.message);
            setFeeStmt(prev => ({ ...prev, loaded: true }));
        }
    }, [sesStudentId, sesFormId]);


    // Greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const greetEmoji = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙';

    // ─── Load children with 5-tier fallback ──────────────────
    const loadChildren = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            let students: any[] = [];

            // ── TIER 0: Build from session data INSTANTLY (no DB needed) ──
            // loginUser already fetched student info via the join at login time.
            // Use it to immediately show the child without waiting for DB.
            const sesStudentId = session?.linked_student_id;
            const sesStudentName = session?.student_name;
            const sesFormId = session?.student_form_id;
            const sesFormName = session?.student_form;
            const sesStreamName = session?.student_stream_name;
            const sesAdmNo = session?.student_admission;

            if (sesStudentId && sesStudentName) {
                const nameParts = sesStudentName.trim().split(' ');
                const sessionChild: ChildData = {
                    id: sesStudentId,
                    full_name: sesStudentName,
                    first_name: nameParts[0] || '',
                    last_name: nameParts.slice(1).join(' ') || '',
                    admission_number: sesAdmNo || '',
                    form_id: sesFormId || 0,
                    form_name: sesFormName || '',
                    stream_name: sesStreamName || '',
                    gender: '',
                    totalDue: 0, totalPaid: 0, balance: 0,
                    termTotal: 0, termBalance: 0, prevArrears: 0,
                    annualTotal: 0, annualBalance: 0,
                    collectionRate: 0, attendanceRate: 0,
                    hasFeeStructure: true,  // optimistic: assume fees exist; DB fetch will update this
                    isCleared: false,
                    recentPayments: [], feeStructure: [],
                };
                // Show the child instantly from session
                setChildren([sessionChild]);
                setSelectedChild(sessionChild);
                setLoading(false);
            }

            // ── TIER 1: Fetch full student record by linked_student_id ──
            if (sesStudentId) {
                const { data: single } = await supabase
                    .from('school_students')
                    .select(`
                        id, full_name, first_name, last_name, admission_number,
                        form_id, gender, photo_url,
                        school_forms!inner(id, form_name, form_level),
                        school_streams(stream_name)
                    `)
                    .eq('id', sesStudentId)
                    .single();
                if (single) students = [single];
            }

            // ── TIER 2: All students linked via parent_portal_user_id ──
            if (portalUserId > 0) {
                const { data: byParentId } = await supabase
                    .from('school_students')
                    .select(`
                        id, full_name, first_name, last_name, admission_number,
                        form_id, gender, photo_url,
                        school_forms!inner(id, form_name, form_level),
                        school_streams(stream_name)
                    `)
                    .eq('parent_portal_user_id', portalUserId)
                    .eq('status', 'Active');
                if (byParentId?.length) {
                    const existingIds = new Set(students.map((s: any) => s.id));
                    byParentId.forEach((s: any) => { if (!existingIds.has(s.id)) students.push(s); });
                }
            }

            // ── TIER 3: Guardian name match ──
            if (students.length === 0 && session?.full_name) {
                const { data: byGuardian } = await supabase
                    .from('school_students')
                    .select(`
                        id, full_name, first_name, last_name, admission_number,
                        form_id, gender, photo_url,
                        school_forms!inner(id, form_name, form_level),
                        school_streams(stream_name)
                    `)
                    .ilike('guardian_name', `%${session.full_name.split(' ')[0]}%`)
                    .eq('status', 'Active')
                    .limit(5);
                if (byGuardian?.length) students = byGuardian;
            }

            // ── TIER 4: Username = admission number ──
            if (students.length === 0 && session?.username) {
                const { data: byAdm } = await supabase
                    .from('school_students')
                    .select(`
                        id, full_name, first_name, last_name, admission_number,
                        form_id, gender, photo_url,
                        school_forms!inner(id, form_name, form_level),
                        school_streams(stream_name)
                    `)
                    .ilike('admission_number', `%${session.username}%`)
                    .limit(3);
                if (byAdm?.length) students = byAdm;
            }

            // ── Enrich with fees + attendance ──
            if (students.length > 0) {
                // Fetch current term ONCE for all students
                const { data: currentTermData } = await supabase
                    .from('school_terms')
                    .select('id, term_name')
                    .eq('is_current', true)
                    .single();
                const currentYear = new Date().getFullYear();

                const enriched: ChildData[] = await Promise.all(
                    students.map(async (s: any) => {
                        const [{ data: payments }, { data: allStructures }, { data: attendance }] = await Promise.all([
                            supabase.from('school_fee_payments').select('amount, payment_date, payment_method, receipt_no, term_id').eq('student_id', s.id).order('payment_date', { ascending: false }),
                            supabase.from('school_fee_structures').select('id, category, amount, term_id, year, form_id').or(`form_id.eq.${s.form_id},form_id.is.null`),
                            supabase.from('school_attendance').select('status').eq('student_id', s.id).gte('attendance_date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]),
                        ]);

                        // ── Fee calculation (mirrors web logic) ──────────────
                        // Use Number() for type-safe comparison — Supabase may return year as string or number
                        let yearFees = (allStructures || []).filter((f: any) => !f.year || Number(f.year) === currentYear);
                        if (yearFees.length === 0 && allStructures && allStructures.length > 0) {
                            const maxYear = Math.max(...allStructures.map((f: any) => Number(f.year) || 0));
                            yearFees = allStructures.filter((f: any) => !f.year || Number(f.year) === maxYear);
                        }

                        // Current term fees (type-safe term_id comparison)
                        const termFees = yearFees.filter((f: any) =>
                            currentTermData ? (!f.term_id || Number(f.term_id) === Number(currentTermData.id)) : true
                        );
                        // Previous term fees for arrears calculation
                        const prevTermFees = yearFees.filter((f: any) =>
                            currentTermData && f.term_id && Number(f.term_id) !== Number(currentTermData.id)
                        );

                        const termTotal = termFees.reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0);
                        const prevTotal = prevTermFees.reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0);
                        const annualTotal = yearFees.reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0);
                        const totalPaid = (payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

                        // Apply payments: first to prev term arrears, then current term
                        const prevArrears = Math.max(0, prevTotal - Math.min(totalPaid, prevTotal));
                        const termPaidAmount = Math.max(0, totalPaid - prevTotal);
                        const termBalance = Math.max(0, termTotal - termPaidAmount);
                        const totalDue = prevArrears + termBalance;  // what parent owes NOW
                        const annualBalance = Math.max(0, annualTotal - totalPaid);

                        // hasFeeStructure: true if ANY fee structure exists for this form in the current year
                        // (even if it's only for prev terms — it means the school has set up fees)
                        const hasFeeStructure = annualTotal > 0;
                        const isCleared = hasFeeStructure && totalDue <= 0 && totalPaid > 0;
                        const collectionRate = annualTotal > 0 ? Math.min(100, Math.round((totalPaid / annualTotal) * 100)) : 0;

                        const attRecords = attendance || [];
                        const present = attRecords.filter((a: any) => a.status === 'Present').length;
                        const attendanceRate = attRecords.length > 0 ? Math.round((present / attRecords.length) * 100) : 0;

                        return {
                            id: s.id,
                            full_name: s.full_name,
                            first_name: s.first_name,
                            last_name: s.last_name,
                            admission_number: s.admission_number,
                            form_id: s.form_id,
                            form_name: (s.school_forms as any)?.form_name || sesFormName || '',
                            stream_name: (s.school_streams as any)?.stream_name || sesStreamName || '',
                            gender: s.gender,
                            photo_url: s.photo_url,
                            totalDue, totalPaid, balance: totalDue,
                            termTotal, termBalance, prevArrears,
                            annualTotal, annualBalance,
                            collectionRate, attendanceRate,
                            hasFeeStructure, isCleared,
                            recentPayments: (payments || []).slice(0, 5),
                            feeStructure: allStructures || [],
                        };
                    })
                );
                setChildren(enriched);
                setSelectedChild(prev => enriched.find(e => e.id === prev?.id) || enriched[0]);
                // Patch feeStmt paid from enriched child — enriched[0].totalPaid is correct
                // (.eq('student_id', s.id) works regardless of session state)
                if (enriched.length > 0) {
                    const c = enriched[0];
                    setFeeStmt(prev => ({
                        ...prev,
                        totalPaid: c.totalPaid,
                        balance: Math.max(0, (prev.annualTotal || c.annualTotal || 0) - c.totalPaid),
                    }));
                }
                await cacheData(`parent_${portalUserId}_children`, enriched);
            } else if (!sesStudentId) {
                // Nothing found at all — try cache
                const cached = await getCachedData(`parent_${portalUserId}_children`);
                if (cached?.data) {
                    setChildren(cached.data as ChildData[]);
                    setSelectedChild((cached.data as ChildData[])[0]);
                }
            }

            // Fetch announcements + notification count
            const [{ data: anns }] = await Promise.all([
                supabase.from('school_announcements').select('id, title, content, category, created_at').order('created_at', { ascending: false }).limit(3),
            ]);
            setAnnouncements(anns || []);
            if (portalUserId) {
                const count = await getUnreadNotificationCount(portalUserId);
                setUnreadCount(count);
            }
        } catch (err: any) {
            console.error('Parent dashboard error:', err.message);
            const cached = await getCachedData(`parent_${portalUserId}_children`);
            if (cached?.data) {
                setChildren(cached.data as ChildData[]);
                setSelectedChild((cached.data as ChildData[])[0]);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [portalUserId, session]);


    useEffect(() => { loadChildren(); loadFeeStatement(); }, [loadChildren, loadFeeStatement]);
    const onRefresh = () => { setRefreshing(true); loadChildren(true); loadFeeStatement(); };

    const child = selectedChild;
    const initials = child
        ? `${child.first_name?.[0] || ''}${child.last_name?.[0] || ''}`.toUpperCase()
        : '??';

    const parentInitials = (session?.full_name || 'P')
        .split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

    return (
        <View style={[styles.root, { backgroundColor: T.bg }]}>
            <StatusBar barStyle="dark-content" backgroundColor={T.bg} />

            {/* ─── Top Bar ─────────────────────────────────────── */}
            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
                <View style={styles.topLeft}>
                    <LinearGradient colors={T.gradPurple} style={styles.avatar}>
                        <Text style={styles.avatarText}>{parentInitials}</Text>
                    </LinearGradient>
                    <View>
                        <Text style={styles.greeting}>{greetEmoji} {greeting}</Text>
                        <Text style={styles.name} numberOfLines={1}>
                            {session?.full_name || 'Parent'}
                        </Text>
                    </View>
                </View>
                <View style={styles.topRight}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Notifications', { portalUserId })}
                        style={styles.iconBtn}
                        accessibilityLabel="Notifications"
                    >
                        <Text style={{ fontSize: 20 }}>🔔</Text>
                        {unreadCount > 0 && (
                            <View style={styles.notifBadge}>
                                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => { setSession(null); clearSession(); }}
                        style={[styles.iconBtn, { backgroundColor: T.redLight, borderColor: '#fca5a5' }]}
                        accessibilityLabel="Logout"
                    >
                        <Text style={{ fontSize: 20 }}>🚪</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.purple} colors={[T.purple]} />}
            >
                {loading ? (
                    <>
                        <SkeletonCard rows={3} style={{ marginBottom: 12 }} />
                        <SkeletonCard rows={2} style={{ marginBottom: 12 }} />
                        <SkeletonRow /><SkeletonRow /><SkeletonRow />
                    </>
                ) : children.length === 0 ? (
                    <EmptyState
                        icon="👨‍👩‍👧‍👦"
                        title="No Children Found"
                        sub="Your account has no linked students. Contact the school office to link your child."
                    />
                ) : (
                    <>
                        {/* ─── Child Selector (if >1 child) ──────── */}
                        {children.length > 1 && (
                            <>
                                <SectionLabel title="My Children" subtitle={`${children.length} enrolled`} />
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childScroll}>
                                    {children.map((c, i) => {
                                        const isSelected = selectedChild?.id === c.id;
                                        return (
                                            <TouchableOpacity
                                                key={c.id}
                                                onPress={() => setSelectedChild(c)}
                                                activeOpacity={0.82}
                                                style={[styles.childChip, isSelected && styles.childChipActive]}
                                            >
                                                <LinearGradient
                                                    colors={isSelected ? T.gradPurple : ['#F0F4FF', '#EEF2FF']}
                                                    style={styles.childChipAvatar}
                                                >
                                                    <Text style={[styles.childChipInitials, isSelected && { color: '#fff' }]}>
                                                        {`${c.first_name?.[0] || ''}${c.last_name?.[0] || ''}`}
                                                    </Text>
                                                </LinearGradient>
                                                <Text style={[styles.childChipName, isSelected && { color: T.purple }]} numberOfLines={1}>
                                                    {c.first_name}
                                                </Text>
                                                <Text style={styles.childChipForm}>{c.form_name}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </>
                        )}

                        {/* ─── Selected Child Hero Card ──────────── */}
                        {child && (
                            <LinearGradient colors={T.gradPurple} style={styles.heroCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                <View style={styles.heroDecor1} />
                                <View style={styles.heroDecor2} />

                                <View style={styles.heroTop}>
                                    {/* Child avatar */}
                                    <View style={styles.heroAvatarBox}>
                                        {child.photo_url ? (
                                            <Image source={{ uri: child.photo_url }} style={styles.heroAvatarImg} />
                                        ) : (
                                            <View style={styles.heroAvatarFallback}>
                                                <Text style={styles.heroAvatarInitials}>{initials}</Text>
                                            </View>
                                        )}
                                        <View style={[styles.heroBadge, {
                                            backgroundColor: !child.hasFeeStructure ? '#f59e0b'
                                                : child.isCleared ? T.green : T.red
                                        }]}>
                                            <Text style={styles.heroBadgeText}>
                                                {!child.hasFeeStructure ? '!' : child.isCleared ? '✓' : '⚠'}
                                            </Text>
                                        </View>
                                    </View>
                                    {/* Child details */}
                                    <View style={{ flex: 1, marginLeft: 14 }}>
                                        <Text style={styles.heroName}>{child.full_name}</Text>
                                        <View style={styles.heroMeta}>
                                            <Text style={styles.heroMetaText}>🎓 {child.form_name}</Text>
                                            {child.stream_name ? <Text style={styles.heroMetaText}> · {child.stream_name}</Text> : null}
                                        </View>
                                        <Text style={styles.heroAdm}>ADM: {child.admission_number}</Text>
                                    </View>
                                </View>

                                {/* Fee status bar */}
                                <View style={styles.heroFeeRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.heroFeeLabel}>
                                            {!child.hasFeeStructure
                                                ? 'No Fee Structure Set'
                                                : `Fee Status — ${child.collectionRate}% Paid`}
                                        </Text>
                                        <View style={styles.heroProgressBg}>
                                            <View style={[styles.heroProgressFill, {
                                                width: child.hasFeeStructure ? `${child.collectionRate}%` as any : '0%'
                                            }]} />
                                        </View>
                                        {child.hasFeeStructure && child.prevArrears > 0 && (
                                            <Text style={{ fontSize: 9, color: 'rgba(255,200,100,1)', fontWeight: '700', marginTop: 2 }}>
                                                ⚠ Arrears: {fmtKESShort(child.prevArrears)}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={styles.heroBalanceBox}>
                                        <Text style={styles.heroBalanceLabel}>
                                            {!child.hasFeeStructure ? 'No Fees' : child.isCleared ? 'Cleared' : 'Balance Due'}
                                        </Text>
                                        <Text style={styles.heroBalance}>
                                            {!child.hasFeeStructure
                                                ? '⚠ N/A'
                                                : child.isCleared
                                                ? '✅ KES 0'
                                                : fmtKESShort(child.totalDue)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Quick stats strip */}
                                <View style={styles.heroStrip}>
                                    {[
                                        { l: 'Term Fees', v: child.hasFeeStructure ? fmtKESShort(child.termTotal) : 'N/A' },
                                        { l: 'Paid', v: fmtKESShort(child.totalPaid) },
                                        { l: 'Attendance', v: `${child.attendanceRate}%` },
                                    ].map((s, i) => (
                                        <View key={i} style={[styles.heroStripItem, i < 2 && { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.2)' }]}>
                                            <Text style={styles.heroStripVal}>{s.v}</Text>
                                            <Text style={styles.heroStripLbl}>{s.l}</Text>
                                        </View>
                                    ))}
                                </View>
                            </LinearGradient>
                        )}

                        {/* ─── PAY FEES CTA ──────────────────────── */}
                        {child && child.balance > 0 && (
                            <TouchableOpacity
                                onPress={() => navigation.navigate('PayFees', {
                                    studentId: child.id,
                                    studentName: child.full_name,
                                    formId: child.form_id,
                                    admissionNumber: child.admission_number,
                                    formName: child.form_name,
                                    streamName: child.stream_name,
                                    balance: child.balance,
                                    totalDue: child.totalDue,
                                    totalPaid: child.totalPaid,
                                })}
                                activeOpacity={0.88}
                                style={styles.payFeesCTA}
                            >
                                <LinearGradient colors={T.gradGreen} style={styles.payFeesCTAGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                    <View style={styles.payFeesCTALeft}>
                                        <Text style={styles.payFeesCTAIcon}>💳</Text>
                                        <View>
                                            <Text style={styles.payFeesCTATitle}>Pay School Fees</Text>
                                            <Text style={styles.payFeesCTASub}>Balance: {fmtKES(child.balance)} · M-Pesa STK or KCB</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.payFeesCTAArrow}>→</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}

                        {/* Only show celebration when fees ACTUALLY exist and are cleared */}
                        {child && child.hasFeeStructure && child.isCleared && (
                            <View style={styles.paidBanner}>
                                <Text style={styles.paidBannerIcon}>🎉</Text>
                                <Text style={styles.paidBannerText}>Fees fully cleared! Thank you.</Text>
                            </View>
                        )}
                        {/* Show warning ONLY when fees are genuinely not configured */}
                        {child && child.hasFeeStructure === false && (
                            <View style={[styles.paidBanner, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
                                <Text style={styles.paidBannerIcon}>⚠️</Text>
                                <Text style={[styles.paidBannerText, { color: '#92400e' }]}>Fee structure not yet set for this term. Contact school admin.</Text>
                            </View>
                        )}

                        {/* ─── Quick Actions ──────────────────────── */}
                        <SectionLabel title="Quick Actions" subtitle="Tap to view" />
                        <View style={styles.qaGrid}>
                            {[
                                { icon: '📊', label: 'Results', grad: T.gradBlue, screen: 'StudentResults', params: { studentId: child?.id } },
                                { icon: '📋', label: 'Attendance', grad: T.gradTeal, screen: 'ParentAttendance', params: { studentId: child?.id } },
                                { icon: '🗓️', label: 'Timetable', grad: T.gradPurple, screen: 'ChildTimetable', params: { formId: child?.form_id, formName: child?.form_name } },
                                { icon: '📝', label: 'Homework', grad: T.gradGold, screen: 'ParentHomework', params: { studentId: child?.id } },
                                { icon: '🏥', label: 'Health', grad: T.gradGreen, screen: 'HealthRecord', params: { studentId: child?.id } },
                                { icon: '📰', label: 'Circulars', grad: T.gradOrange, screen: 'Circulars', params: {} },
                                { icon: '🚪', label: 'Leave Out', grad: T.gradRed, screen: 'LeaveOut', params: { studentId: child?.id } },
                                { icon: '💳', label: 'Pay Fees', grad: T.gradGreen, screen: 'PayFees', params: { studentId: child?.id, studentName: child?.full_name, formId: child?.form_id, balance: child?.balance, totalDue: child?.totalDue, totalPaid: child?.totalPaid } },
                            ].map((qa, i) => (
                                <TouchableOpacity
                                    key={i}
                                    onPress={() => child && navigation.navigate(qa.screen as any, qa.params as any)}
                                    activeOpacity={0.8}
                                    style={styles.qaItem}
                                >
                                    <LinearGradient colors={qa.grad} style={styles.qaIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                        <Text style={{ fontSize: 22 }}>{qa.icon}</Text>
                                    </LinearGradient>
                                    <Text style={styles.qaLabel}>{qa.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* ─── FEE STATEMENT (standalone fetch, always correct) ─── */}
                        <>
                            <SectionLabel
                                title="💳 Fee Statement"
                                subtitle={feeStmt.loaded
                                    ? `Annual Total: ${fmtKES(feeStmt.annualTotal)}`
                                    : 'Loading…'}
                                action={feeStmt.balance > 0 ? 'Pay Now' : undefined}
                                onAction={() => child && navigation.navigate('PayFees' as any, {
                                    studentId: child.id, studentName: child.full_name,
                                    formId: child.form_id, balance: feeStmt.balance,
                                    totalDue: feeStmt.annualTotal, totalPaid: feeStmt.totalPaid,
                                })}
                            />

                            {/* Fee breakdown table */}
                            <View style={styles.feeCard}>
                                <View style={styles.feeCardHeader}>
                                    <Text style={styles.feeCardHeaderText}>FEE ITEM</Text>
                                    <Text style={styles.feeCardHeaderText}>AMOUNT (KES)</Text>
                                </View>

                                {!feeStmt.loaded ? (
                                    <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
                                        <ActivityIndicator size="small" color={T.purple} />
                                        <Text style={{ fontSize: 12, color: T.textSub }}>Loading fee data…</Text>
                                    </View>
                                ) : !feeStmt.hasFees ? (
                                    <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
                                        <Text style={{ fontSize: 28 }}>⚠️</Text>
                                        <Text style={{ fontSize: 13, color: T.textSub, textAlign: 'center' }}>
                                            No fee structure set yet. Contact school admin.
                                        </Text>
                                    </View>
                                ) : (
                                    <>
                                        {/* Per-term rows */}
                                        {feeStmt.rows.map((row, idx) => (
                                            <View key={idx} style={styles.feeRow}>
                                                <View style={styles.feeRowLeft}>
                                                    <View style={[styles.feeDot, { backgroundColor: '#6366f1' }]} />
                                                    <Text style={styles.feeRowLabel}>{row.label}</Text>
                                                </View>
                                                <Text style={styles.feeRowValue}>{fmtKES(row.amount)}</Text>
                                            </View>
                                        ))}

                                        {/* Total Annual Due */}
                                        <View style={{ height: 1, backgroundColor: '#e2e8f0', marginHorizontal: 16 }} />
                                        <View style={[styles.feeRow, { backgroundColor: '#f8faff' }]}>
                                            <View style={styles.feeRowLeft}>
                                                <View style={[styles.feeDot, { backgroundColor: '#4f46e5' }]} />
                                                <Text style={[styles.feeRowLabel, { fontWeight: '800' }]}>Total Annual Due</Text>
                                            </View>
                                            <Text style={[styles.feeRowValue, { fontWeight: '900' }]}>{fmtKES(feeStmt.annualTotal)}</Text>
                                        </View>

                                        {/* Total Paid */}
                                        <View style={[styles.feeRow, { backgroundColor: '#f0fdf4' }]}>
                                            <View style={styles.feeRowLeft}>
                                                <View style={[styles.feeDot, { backgroundColor: '#22c55e' }]} />
                                                <Text style={[styles.feeRowLabel, { color: '#166534' }]}>Total Paid</Text>
                                            </View>
                                            <Text style={[styles.feeRowValue, { color: '#16a34a' }]}>- {fmtKES(feeStmt.totalPaid)}</Text>
                                        </View>

                                        {/* Divider */}
                                        <View style={{ height: 2, backgroundColor: '#e2e8f0', marginHorizontal: 16 }} />

                                        {/* Balance */}
                                        <View style={[styles.feeRow, {
                                            backgroundColor: feeStmt.balance > 0 ? '#fef2f2' : '#f0fdf4',
                                            marginHorizontal: 8, borderRadius: 12, marginBottom: 8,
                                        }]}>
                                            <View style={styles.feeRowLeft}>
                                                <View style={[styles.feeDot, { backgroundColor: feeStmt.balance > 0 ? '#ef4444' : '#22c55e' }]} />
                                                <Text style={[styles.feeRowLabel, { fontWeight: '900', fontSize: 14,
                                                    color: feeStmt.balance > 0 ? '#991b1b' : '#166534' }]}>
                                                    {feeStmt.balance > 0 ? '⚠️ BALANCE DUE' : '✅ FULLY CLEARED'}
                                                </Text>
                                            </View>
                                            <Text style={[styles.feeRowValue, { fontWeight: '900', fontSize: 16,
                                                color: feeStmt.balance > 0 ? '#dc2626' : '#16a34a' }]}>
                                                {fmtKES(feeStmt.balance)}
                                            </Text>
                                        </View>
                                    </>
                                )}
                            </View>

                            {/* Payment history */}
                            <View style={styles.paymentsCard}>
                                <View style={[styles.paymentRow, { backgroundColor: '#f8faff' }]}>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: T.textSub, flex: 1 }}>PAYMENT HISTORY</Text>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: T.textSub }}>AMOUNT</Text>
                                </View>
                                {feeStmt.totalPaid === 0 ? (
                                    <View style={styles.emptyPayments}>
                                        <Text style={styles.emptyPaymentsIcon}>💬</Text>
                                        <Text style={styles.emptyPaymentsTitle}>No payments recorded yet</Text>
                                        <Text style={styles.emptyPaymentsSub}>Payments appear here once processed by the bursar</Text>
                                        {feeStmt.balance > 0 && child && (
                                            <TouchableOpacity
                                                onPress={() => navigation.navigate('PayFees' as any, {
                                                    studentId: child.id, studentName: child.full_name,
                                                    formId: child.form_id, balance: feeStmt.balance,
                                                })}
                                                style={styles.emptyPayBtn} activeOpacity={0.85}
                                            >
                                                <LinearGradient colors={T.gradGreen} style={styles.emptyPayBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                                    <Text style={styles.emptyPayBtnText}>💳 Pay {fmtKES(feeStmt.balance)} Now</Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ) : (
                                    (child?.recentPayments || []).map((p: any, idx: number) => (
                                        <View key={idx} style={[styles.paymentRow,
                                            idx < (child?.recentPayments?.length || 0) - 1 && styles.paymentRowBorder]}>
                                            <View style={[styles.paymentMethodIcon, {
                                                backgroundColor: p.payment_method?.toLowerCase() === 'mpesa' ? T.greenLight
                                                    : p.payment_method?.toLowerCase() === 'cash' ? T.amberLight : T.blueLight
                                            }]}>
                                                <Text style={{ fontSize: 16 }}>
                                                    {p.payment_method?.toLowerCase() === 'mpesa' ? '📱'
                                                        : p.payment_method?.toLowerCase() === 'cash' ? '💵' : '🏦'}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.paymentMethod}>{p.payment_method || 'Payment'}</Text>
                                                <Text style={styles.paymentDate}>
                                                    {p.payment_date
                                                        ? new Date(p.payment_date).toLocaleDateString('en-KE',
                                                            { day: 'numeric', month: 'short', year: 'numeric' })
                                                        : '—'}
                                                    {p.receipt_no ? ` · ${p.receipt_no}` : ''}
                                                </Text>
                                            </View>
                                            <Text style={styles.paymentAmount}>+{fmtKES(Number(p.amount || 0))}</Text>
                                        </View>
                                    ))
                                )}
                            </View>
                        </>


                        {/* ─── Announcements ───────────────────────── */}
                        {announcements.length > 0 && (
                            <>
                                <SectionLabel title="📢 School Announcements" subtitle="Latest updates" />
                                {announcements.map((a: any) => (
                                    <View key={a.id} style={styles.announcementCard}>
                                        <View style={styles.announcementDot} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.announcementTitle} numberOfLines={1}>{a.title}</Text>
                                            <Text style={styles.announcementBody} numberOfLines={2}>{a.content}</Text>
                                            <Text style={styles.announcementDate}>
                                                {new Date(a.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </>
                        )}

                        <View style={{ height: 36 }} />
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },

    // Top bar
    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingBottom: 12, backgroundColor: T.bg,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    topLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    avatar: {
        width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
        shadowColor: T.purple, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
    },
    avatarText: { fontSize: 18, fontWeight: '900', color: '#fff' },
    greeting: { fontSize: 11, color: T.textSub, fontWeight: '600' },
    name: { fontSize: 16, fontWeight: '900', color: T.text, maxWidth: W * 0.45 },
    topRight: { flexDirection: 'row', gap: 8 },
    iconBtn: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: T.bgSoft,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border, position: 'relative',
    },
    notifBadge: {
        position: 'absolute', top: 5, right: 5, minWidth: 16, height: 16, borderRadius: 8,
        backgroundColor: T.red, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: T.bg,
    },
    notifBadgeText: { fontSize: 8, color: '#fff', fontWeight: '900' },

    scroll: { padding: 20, paddingTop: 12 },

    // Child selector
    childScroll: { marginBottom: 16, marginHorizontal: -20 },
    childChip: {
        alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
        marginLeft: 8, borderRadius: 16, backgroundColor: '#fff',
        borderWidth: 1, borderColor: T.border, width: 80,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    },
    childChipActive: { borderColor: T.purple, borderWidth: 2 },
    childChipAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    childChipInitials: { fontSize: 16, fontWeight: '900', color: T.purple },
    childChipName: { fontSize: 11, fontWeight: '800', color: T.text, textAlign: 'center' },
    childChipForm: { fontSize: 9, color: T.textDim, textAlign: 'center', marginTop: 2 },

    // Hero card
    heroCard: {
        borderRadius: 24, marginBottom: 16, overflow: 'hidden',
        shadowColor: T.purple, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 10,
    },
    heroDecor1: { position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.08)' },
    heroDecor2: { position: 'absolute', top: 60, right: 80, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)' },
    heroTop: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 16 },
    heroAvatarBox: { position: 'relative' },
    heroAvatarImg: { width: 64, height: 64, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
    heroAvatarFallback: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
    heroAvatarInitials: { fontSize: 24, fontWeight: '900', color: '#fff' },
    heroBadge: { position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    heroBadgeText: { fontSize: 10, color: '#fff', fontWeight: '900' },
    heroName: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 4 },
    heroMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    heroMetaText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
    heroAdm: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
    heroFeeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 16, marginBottom: 12 },
    heroFeeLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
    heroProgressBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
    heroProgressFill: { height: 8, backgroundColor: '#fff', borderRadius: 4 },
    heroBalanceBox: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 10, minWidth: 90 },
    heroBalanceLabel: { fontSize: 9, color: 'rgba(255,255,255,0.75)', fontWeight: '700', textTransform: 'uppercase' },
    heroBalance: { fontSize: 14, fontWeight: '900', color: '#fff', marginTop: 2 },
    heroStrip: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
    heroStripItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    heroStripVal: { fontSize: 13, fontWeight: '900', color: '#fff' },
    heroStripLbl: { fontSize: 9, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginTop: 2 },

    // Pay Fees CTA
    payFeesCTA: { borderRadius: 20, marginBottom: 16, overflow: 'hidden', shadowColor: T.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 6 },
    payFeesCTAGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
    payFeesCTALeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    payFeesCTAIcon: { fontSize: 28 },
    payFeesCTATitle: { fontSize: 16, fontWeight: '900', color: '#fff' },
    payFeesCTASub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    payFeesCTAArrow: { fontSize: 22, color: '#fff', fontWeight: '900' },

    paidBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.greenLight, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#6ee7b7' },
    paidBannerIcon: { fontSize: 24 },
    paidBannerText: { fontSize: 14, fontWeight: '700', color: T.green },

    // Quick actions
    qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    qaItem: { width: (W - 76) / 4, alignItems: 'center', gap: 6 },
    qaIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
    qaLabel: { fontSize: 10, fontWeight: '700', color: T.textMd, textAlign: 'center' },

    // Recent payments
    paymentsCard: { backgroundColor: T.bgCard, borderRadius: 20, borderWidth: 1, borderColor: T.border, overflow: 'hidden', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    paymentRowBorder: { borderBottomWidth: 1, borderBottomColor: T.borderSoft },
    paymentMethodIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    paymentMethod: { fontSize: 13, fontWeight: '700', color: T.text },
    paymentDate: { fontSize: 11, color: T.textSub, marginTop: 2 },
    paymentAmount: { fontSize: 14, fontWeight: '900', color: T.green },

    // Announcements
    announcementCard: { flexDirection: 'row', gap: 12, backgroundColor: T.bgCard, borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: T.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
    announcementDot: { width: 4, borderRadius: 2, backgroundColor: T.purple, alignSelf: 'stretch' },
    announcementTitle: { fontSize: 14, fontWeight: '800', color: T.text, marginBottom: 4 },
    announcementBody: { fontSize: 12, color: T.textSub, lineHeight: 18 },
    announcementDate: { fontSize: 10, color: T.textDim, marginTop: 4, fontWeight: '600' },

    // ── Fee summary card ─────────────────────────────────────────────────────
    feeCard: {
        backgroundColor: T.bgCard, borderRadius: 20, borderWidth: 1, borderColor: T.border,
        overflow: 'hidden', marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    feeCardHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: T.border,
    },
    feeCardHeaderText: { fontSize: 10, fontWeight: '800', color: T.textSub, letterSpacing: 0.5 },
    feeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    feeRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    feeDot: { width: 10, height: 10, borderRadius: 5 },
    feeRowLabel: { fontSize: 13, fontWeight: '600', color: T.text },
    feeRowValue: { fontSize: 13, fontWeight: '700', color: T.text },

    // ── Empty payments state ──────────────────────────────────────────────────
    emptyPayments: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20, gap: 6 },
    emptyPaymentsIcon: { fontSize: 36 },
    emptyPaymentsTitle: { fontSize: 14, fontWeight: '800', color: T.text },
    emptyPaymentsSub: { fontSize: 12, color: T.textSub, textAlign: 'center' },
    emptyPayBtn: { marginTop: 12, borderRadius: 14, overflow: 'hidden', width: '100%' },
    emptyPayBtnGrad: { paddingVertical: 14, alignItems: 'center', borderRadius: 14 },
    emptyPayBtnText: { fontSize: 14, fontWeight: '900', color: '#fff' },
});
