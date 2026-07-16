// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra Premium — Pay Fees Screen v3.0
// M-Pesa STK Push · KCB Buni Push · Manual Code Entry
// Auto-loads child details · Real-time payment polling
// Kenya's #1 School Management System
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, KeyboardAvoidingView,
    Platform, Alert, Animated, Dimensions, Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { useSession } from '../../context/SessionContext';
import {
    formatKES, getStudentFeePayments, getStudentFeeStructures,
    initiateSTKPush, initiateKCBSTKPush, pollSTKStatus, supabase,
} from '../../lib/supabase';
import { validateKenyanPhone, validateAmount } from '../../lib/security';
import ScreenHeader from '../../components/ScreenHeader';
import { T, fmtKES, fmtKESShort } from '../../theme/PremiumTheme';
import { ProgressBar } from '../../components/PremiumUI';

const SCHOOL_API_BASE = 'https://apsims.vercel.app';


type RouteProps = RouteProp<RootStackParamList, 'PayFees'>;
type PayStep = 'overview' | 'amount' | 'method' | 'confirm' | 'processing' | 'success' | 'failed';
type PayMethod = 'MPesa' | 'KCB' | 'Manual';

const { width: W } = Dimensions.get('window');

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000, 50000];

export default function PayFeesScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProps>();
    const { session } = useSession();
    const insets = useSafeAreaInsets();

    const {
        studentId, studentName, formId,
        admissionNumber = '', formName = '', streamName = '',
        balance: initialBalance = 0,
        totalDue: initialTotalDue = 0,
        totalPaid: initialTotalPaid = 0,
    } = route.params as any;

    // ─── State ─────────────────────────────────────────────────
    const [step, setStep] = useState<PayStep>('overview');
    const [method, setMethod] = useState<PayMethod>('MPesa');
    const [amount, setAmount] = useState('');
    const [phone, setPhone] = useState('');
    const [manualCode, setManualCode] = useState('');
    const [balance, setBalance] = useState(initialBalance);
    const [totalDue, setTotalDue] = useState(initialTotalDue);
    const [totalPaid, setTotalPaid] = useState(initialTotalPaid);
    const [feeBreakdown, setFeeBreakdown] = useState<any[]>([]);
    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [receipt, setReceipt] = useState('');
    const [paidAmount, setPaidAmount] = useState(0);
    const [pollSeconds, setPollSeconds] = useState(0);
    const [checkoutId, setCheckoutId] = useState('');

    // Animations
    const successAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

    // ─── Load fee data ─────────────────────────────────────────
    const loadFeeData = useCallback(async () => {
        try {
            const [pays, structs] = await Promise.all([
                getStudentFeePayments(studentId),
                formId ? getStudentFeeStructures(formId) : Promise.resolve([]),
            ]);
            const due = (structs as any[]).reduce((s, f) => s + Number(f.amount || 0), 0);
            const paid = pays.reduce((s, p) => s + Number(p.amount || 0), 0);
            setTotalDue(due || initialTotalDue);
            setTotalPaid(paid || initialTotalPaid);
            setBalance(Math.max(0, (due || initialTotalDue) - paid));
            setFeeBreakdown(structs as any[]);
            setPaymentHistory(pays.slice(0, 6));
        } catch (e) { /* Use initial values */ }
    }, [studentId, formId]);

    useEffect(() => {
        loadFeeData();
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            if (pulseRef.current) pulseRef.current.stop();
        };
    }, [loadFeeData]);

    // ─── Success animation ─────────────────────────────────────
    const playSuccess = () => {
        Vibration.vibrate([0, 100, 50, 100]);
        Animated.spring(successAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }).start();
    };

    // ─── Pulse animation for processing ───────────────────────
    const startPulse = () => {
        pulseRef.current = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            ])
        );
        pulseRef.current.start();
    };

    // ─── Poll STK status (M-Pesa / Safaricom) ────────────────
    const startPolling = (reqId: string) => {
        let elapsed = 0;
        pollRef.current = setInterval(async () => {
            elapsed += 5;
            setPollSeconds(elapsed);
            if (elapsed >= 90) {
                clearInterval(pollRef.current!);
                pulseRef.current?.stop();
                setStep('failed');
                setError('Payment timed out. Please try again or check your M-Pesa messages.');
                return;
            }
            try {
                const result = await pollSTKStatus(reqId);
                if (result.status === 'success') {
                    clearInterval(pollRef.current!);
                    pulseRef.current?.stop();
                    setPaidAmount(Number(amount));
                    if (result.receipt) setReceipt(result.receipt);
                    setBalance((prev: number) => Math.max(0, prev - Number(amount)));
                    setStep('success');
                    playSuccess();

                    // ── Save fee payment directly to Supabase
                    try {
                        const receiptNo = `APSIMS-${String(Date.now()).slice(-6)}`;
                        const { error: feeErr } = await supabase
                            .from('school_fee_payments')
                            .insert([{
                                student_id:       studentId,
                                amount:           Number(amount),
                                payment_date:     new Date().toISOString().split('T')[0],
                                payment_method:   'M-Pesa',
                                receipt_number:   receiptNo,
                                reference_number: result.receipt || reqId || null,
                                year:             new Date().getFullYear(),
                                notes:            `M-Pesa STK. Code: ${result.receipt || 'N/A'}. Phone: ${phone}`,
                            }]);
                        if (feeErr) {
                            console.error('Fee save error:', feeErr.message);
                        } else {
                            console.log('✅ Fee saved to DB:', receiptNo);
                        }
                    } catch (saveErr: any) {
                        console.error('Fee save exception:', saveErr.message);
                    }

                    loadFeeData();
                } else if (result.status === 'failed') {
                    clearInterval(pollRef.current!);
                    pulseRef.current?.stop();
                    setStep('failed');
                    setError('Payment was declined or cancelled. Please try again.');
                }
            } catch { /* Keep polling */ }
        }, 5000);
    };

    // ─── Poll KCB Buni status ──────────────────────────────────
    const startKCBPolling = (reqId: string) => {
        let elapsed = 0;
        pollRef.current = setInterval(async () => {
            elapsed += 5;
            setPollSeconds(elapsed);
            if (elapsed >= 120) {
                clearInterval(pollRef.current!);
                pulseRef.current?.stop();
                setStep('failed');
                setError('Payment timed out. Check your M-Pesa messages — if deducted, it will reflect shortly.');
                return;
            }
            try {
                const result = await pollKCBStatus(reqId);
                const s = result.status?.toLowerCase();
                if (s === 'success') {
                    clearInterval(pollRef.current!);
                    pulseRef.current?.stop();
                    setPaidAmount(Number(amount));
                    if (result.receipt) setReceipt(result.receipt);
                    setBalance((prev: number) => Math.max(0, prev - Number(amount)));
                    setStep('success');
                    playSuccess();
                    loadFeeData();
                } else if (s === 'failed') {
                    clearInterval(pollRef.current!);
                    pulseRef.current?.stop();
                    setStep('failed');
                    setError('KCB payment was declined or cancelled. Please try again.');
                }
            } catch { /* Keep polling on network hiccup */ }
        }, 5000);
    };


    // ─── Handle initiate payment ───────────────────────────────
    const handleInitiate = async () => {
        setError('');
        const { valid: av, error: ae } = validateAmount(amount);
        if (!av) { setError(ae || 'Invalid amount'); return; }

        if (method !== 'Manual') {
            const { valid: pv, error: pe } = validateKenyanPhone(phone);
            if (!pv) { setError(pe || 'Enter a valid Kenyan phone e.g. 0712345678'); return; }
        }
        if (method === 'Manual' && !manualCode.trim()) {
            setError('Enter the M-Pesa transaction code (e.g. QFX12345AB)');
            return;
        }

        setStep('processing');
        startPulse();

        try {
            if (method === 'MPesa') {
                const result = await initiateSTKPush({
                    phone, amount: Number(amount), studentId,
                    studentName,
                    description: `${formName || 'School'} fees – ${admissionNumber || studentId}`,
                });
                if (result?.checkoutRequestId) {
                    setCheckoutId(result.checkoutRequestId);
                    startPolling(result.checkoutRequestId);
                } else {
                    throw new Error(result?.error || 'STK Push failed. Check your phone.');
                }
            } else if (method === 'KCB') {
                const result = await initiateKCBSTKPush({
                    phone, amount: Number(amount), studentId,
                    studentName,
                    description: `School fees – ${admissionNumber || studentId}`,
                });
                if (result?.checkoutRequestId) {
                    setCheckoutId(result.checkoutRequestId);
                    startKCBPolling(result.checkoutRequestId);  // Use KCB-specific polling
                } else {
                    throw new Error(result?.error || 'KCB Push failed. Try M-Pesa instead.');
                }
            } else {
                // Manual code — record payment via static import
                const { error: dbErr } = await supabase.from('school_fee_payments').insert([{
                    student_id: studentId, amount: Number(amount),
                    payment_method: 'MPesa', mpesa_code: manualCode.trim().toUpperCase(),
                    payment_date: new Date().toISOString().split('T')[0],
                    recorded_by: session?.full_name || 'Parent Portal',
                    year: new Date().getFullYear(),
                }]);
                if (dbErr) throw new Error(dbErr.message);
                pulseRef.current?.stop();
                setPaidAmount(Number(amount));
                setReceipt(manualCode.trim().toUpperCase());
                setBalance((prev: number) => Math.max(0, prev - Number(amount)));
                setStep('success');
                playSuccess();
                loadFeeData();
            }
        } catch (err: any) {
            pulseRef.current?.stop();
            setStep('failed');
            setError(err.message || 'Payment initiation failed. Please try again.');
        }
    };

    const collectionRate = totalDue > 0 ? Math.min(100, Math.round((totalPaid / totalDue) * 100)) : 0;
    const initials = (studentName || 'S').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

    // ─── RENDER: Success ────────────────────────────────────────
    if (step === 'success') {
        return (
            <View style={[styles.root, { paddingTop: insets.top }]}>
                <ScreenHeader title="Payment Complete" onBack={() => navigation.goBack()} gradient={T.gradGreen} />
                <ScrollView contentContainerStyle={styles.centeredScroll} showsVerticalScrollIndicator={false}>
                    <Animated.View style={[styles.successBox, {
                        transform: [{ scale: successAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
                        opacity: successAnim,
                    }]}>
                        {/* Big success circle */}
                        <LinearGradient colors={T.gradGreen} style={styles.successCircle}>
                            <Text style={{ fontSize: 52 }}>✅</Text>
                        </LinearGradient>
                        <Text style={styles.successTitle}>Payment Successful!</Text>
                        <Text style={styles.successAmount}>{fmtKES(paidAmount)}</Text>
                        <Text style={styles.successSub}>Paid for {studentName}</Text>

                        {receipt ? (
                            <View style={styles.receiptBox}>
                                <Text style={styles.receiptLabel}>Transaction Code</Text>
                                <Text style={styles.receiptCode}>{receipt}</Text>
                            </View>
                        ) : null}

                        {/* Remaining balance */}
                        <View style={styles.successBalanceBox}>
                            <Text style={styles.successBalLabel}>{balance > 0 ? 'Remaining Balance' : '🎉 Fully Cleared!'}</Text>
                            <Text style={[styles.successBal, { color: balance > 0 ? T.amber : T.green }]}>
                                {balance > 0 ? fmtKES(balance) : 'KES 0'}
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => { setStep('overview'); setAmount(''); setManualCode(''); }}
                            style={styles.successBtn}
                            activeOpacity={0.88}
                        >
                            <LinearGradient colors={T.gradGreen} style={styles.successBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                <Text style={styles.successBtnText}>Make Another Payment</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.successBackBtn}>
                            <Text style={styles.successBackText}>← Back to Dashboard</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </View>
        );
    }

    // ─── RENDER: Processing ────────────────────────────────────────
    if (step === 'processing') {
        const maxSecs = method === 'KCB' ? 120 : 90;
        const progress = Math.min(100, Math.round((pollSeconds / maxSecs) * 100));
        const showManualConfirm = method === 'KCB' && pollSeconds >= 20;
        return (
            <View style={[styles.root, { paddingTop: insets.top }]}>
                <ScreenHeader title="Processing Payment" gradient={T.gradTeal} />
                <View style={styles.centeredScroll}>
                    <Animated.View style={[styles.processingBox, { transform: [{ scale: pulseAnim }] }]}>
                        <LinearGradient colors={T.gradTeal} style={styles.processingCircle}>
                            <ActivityIndicator size="large" color="#fff" />
                        </LinearGradient>
                    </Animated.View>

                    <Text style={styles.processingTitle}>
                        {method === 'MPesa' ? '📱 Check your phone' : '🏦 KCB STK Sent'}
                    </Text>
                    <Text style={styles.processingPhone}>{phone}</Text>
                    <Text style={styles.processingDesc}>
                        {method === 'MPesa'
                            ? 'An M-Pesa STK Push has been sent.\nEnter your M-Pesa PIN to complete payment.'
                            : 'KCB Buni push sent to your phone.\nEnter your M-Pesa PIN when prompted.'}
                    </Text>

                    {/* Timer progress */}
                    <View style={styles.processingTimer}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={styles.processingTimerLabel}>Waiting for confirmation…</Text>
                            <Text style={styles.processingTimerSecs}>{Math.max(0, maxSecs - pollSeconds)}s</Text>
                        </View>
                        <ProgressBar pct={progress} color={T.teal} height={8} />
                    </View>

                    <Text style={styles.processingAmount}>Amount: {fmtKES(Number(amount))}</Text>

                    {/* KCB Manual Confirm — appears after 20s if callback delayed */}
                    {showManualConfirm && (
                        <TouchableOpacity
                            onPress={async () => {
                                clearInterval(pollRef.current!);
                                pulseRef.current?.stop();
                                // Save payment directly since callback may be delayed
                                try {
                                    await supabase.from('school_fee_payments').insert([{
                                        student_id:      studentId,
                                        amount:          Number(amount),
                                        payment_date:    new Date().toISOString(),
                                        payment_method:  'KCB',
                                        receipt_number:  checkoutId || `KCB-${Date.now()}`,
                                        reference_number: checkoutId,
                                        year:            new Date().getFullYear(),
                                        notes:           `KCB Buni STK. CheckoutID: ${checkoutId}. Phone: ${phone}`,
                                    }]);
                                } catch (e) { /* DB save best-effort */ }
                                setPaidAmount(Number(amount));
                                setBalance((prev: number) => Math.max(0, prev - Number(amount)));
                                setStep('success');
                                playSuccess();
                                loadFeeData();
                            }}
                            activeOpacity={0.85}
                            style={[styles.successBtn, { marginTop: 16, backgroundColor: '#16a34a' }]}
                        >
                            <LinearGradient colors={T.gradGreen} style={styles.successBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                <Text style={styles.successBtnText}>✅ I've Completed the Payment</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity onPress={() => { clearInterval(pollRef.current!); pulseRef.current?.stop(); setStep('amount'); }} style={styles.cancelBtn}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ─── RENDER: Failed ─────────────────────────────────────────
    if (step === 'failed') {
        return (
            <View style={[styles.root, { paddingTop: insets.top }]}>
                <ScreenHeader title="Payment Failed" onBack={() => setStep('overview')} gradient={T.gradRed} />
                <View style={styles.centeredScroll}>
                    <View style={styles.failedCircle}><Text style={{ fontSize: 52 }}>❌</Text></View>
                    <Text style={styles.failedTitle}>Payment Failed</Text>
                    <Text style={styles.failedDesc}>{error}</Text>
                    <TouchableOpacity onPress={() => { setError(''); setStep('overview'); }} style={styles.successBtn} activeOpacity={0.88}>
                        <LinearGradient colors={T.gradPrimary} style={styles.successBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                            <Text style={styles.successBtnText}>Try Again</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ─── RENDER: Main UI ────────────────────────────────────────
    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: T.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScreenHeader
                title="💳 Pay School Fees"
                subtitle={studentName}
                onBack={() => step === 'confirm' ? setStep('amount') : navigation.goBack()}
                gradient={T.gradGreen}
            />

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ─── Student Card ────────────────────────────── */}
                <View style={styles.studentCard}>
                    <LinearGradient colors={T.gradPurple} style={styles.studentAvatar}>
                        <Text style={styles.studentInitials}>{initials}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.studentName}>{studentName}</Text>
                        <Text style={styles.studentMeta}>
                            {admissionNumber ? `ADM: ${admissionNumber}` : ''}
                            {formName ? ` · ${formName}` : ''}
                            {streamName ? ` · ${streamName}` : ''}
                        </Text>
                    </View>
                    <View style={[styles.studentStatus, { backgroundColor: balance > 0 ? T.redLight : T.greenLight }]}>
                        <Text style={[styles.studentStatusText, { color: balance > 0 ? T.red : T.green }]}>
                            {balance > 0 ? '⚠ Pending' : '✅ Cleared'}
                        </Text>
                    </View>
                </View>

                {/* ─── Fee Summary Card ──────────────────────────── */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>📊 Fee Summary</Text>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryItemLabel}>Total Fees</Text>
                            <Text style={styles.summaryItemValue}>{fmtKESShort(totalDue)}</Text>
                        </View>
                        <View style={[styles.summaryDivider]} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryItemLabel}>Paid</Text>
                            <Text style={[styles.summaryItemValue, { color: T.green }]}>{fmtKESShort(totalPaid)}</Text>
                        </View>
                        <View style={[styles.summaryDivider]} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryItemLabel}>{balance > 0 ? 'Balance Due' : 'Status'}</Text>
                            <Text style={[styles.summaryItemValue, { color: balance > 0 ? T.red : T.green }]}>
                                {balance > 0 ? fmtKESShort(balance) : '✅ Paid'}
                            </Text>
                        </View>
                    </View>

                    {/* Progress bar */}
                    <View style={{ marginTop: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                            <Text style={styles.progressLabel}>Collection Progress</Text>
                            <Text style={styles.progressPct}>{collectionRate}%</Text>
                        </View>
                        <ProgressBar
                            pct={collectionRate}
                            color={collectionRate >= 80 ? T.green : collectionRate >= 50 ? T.amber : T.red}
                            height={10}
                        />
                    </View>
                </View>

                {/* ─── Fee Breakdown ──────────────────────────────── */}
                {feeBreakdown.length > 0 && (
                    <View style={styles.breakdownCard}>
                        <Text style={styles.summaryLabel}>🧾 Fee Breakdown</Text>
                        {feeBreakdown.map((f: any, i: number) => (
                            <View key={i} style={[styles.breakdownRow, i < feeBreakdown.length - 1 && styles.breakdownBorder]}>
                                <View style={styles.breakdownDot} />
                                <Text style={styles.breakdownCat}>{f.category || f.term || 'School Fees'}</Text>
                                <Text style={styles.breakdownAmt}>{fmtKES(Number(f.amount || 0))}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* ─── Payment Method Selector ────────────────────── */}
                <Text style={styles.sectionTitle}>💳 Payment Method</Text>
                <View style={styles.methodGrid}>
                    {[
                        { id: 'MPesa', icon: '📱', label: 'M-Pesa STK Push', sub: 'Instant push to phone', grad: T.gradGreen, badge: 'RECOMMENDED' },
                        { id: 'KCB', icon: '🏦', label: 'KCB Buni Push', sub: 'KCB mobile banking', grad: ['#0c4a6e', '#0891b2'] as [string, string], badge: 'LIVE' },
                        { id: 'Manual', icon: '🔢', label: 'Enter M-Pesa Code', sub: 'Paste transaction code', grad: ['#475569', '#334155'] as [string, string], badge: null },
                    ].map(m => {
                        const active = method === m.id;
                        return (
                            <TouchableOpacity
                                key={m.id}
                                onPress={() => { setMethod(m.id as PayMethod); setError(''); }}
                                activeOpacity={0.82}
                                style={[styles.methodCard, active && styles.methodCardActive]}
                            >
                                {active && (
                                    <LinearGradient colors={m.grad} style={styles.methodCardActiveBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                        <View style={styles.methodDecor} />
                                    </LinearGradient>
                                )}
                                <View style={styles.methodCardContent}>
                                    {m.badge && (
                                        <View style={[styles.methodBadge, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : T.greenLight }]}>
                                            <Text style={[styles.methodBadgeText, { color: active ? '#fff' : T.green }]}>{m.badge}</Text>
                                        </View>
                                    )}
                                    <View style={[styles.methodIconBox, { backgroundColor: active ? 'rgba(255,255,255,0.2)' : T.bgSoft }]}>
                                        <Text style={{ fontSize: 24 }}>{m.icon}</Text>
                                    </View>
                                    <Text style={[styles.methodLabel, active && { color: '#fff' }]}>{m.label}</Text>
                                    <Text style={[styles.methodSub, active && { color: 'rgba(255,255,255,0.75)' }]}>{m.sub}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ─── Phone Number (MPesa / KCB) ─────────────────── */}
                {method !== 'Manual' && (
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>📞 {method === 'MPesa' ? 'M-Pesa' : 'KCB'} Phone Number</Text>
                        <View style={styles.inputBox}>
                            <Text style={styles.inputPrefix}>+254</Text>
                            <TextInput
                                style={styles.input}
                                value={phone}
                                onChangeText={t => { setPhone(t); setError(''); }}
                                placeholder="712 345 678"
                                keyboardType="phone-pad"
                                maxLength={13}
                                placeholderTextColor={T.textDim}
                                accessibilityLabel="Phone number"
                            />
                        </View>
                        <Text style={styles.inputHint}>
                            {method === 'MPesa' ? 'A Safaricom STK Push will be sent to this number'
                                : 'KCB Buni push will be sent — ensure mobile banking is enabled'}
                        </Text>
                    </View>
                )}

                {/* ─── Manual Code Input ──────────────────────────── */}
                {method === 'Manual' && (
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>🔢 M-Pesa Transaction Code</Text>
                        <TextInput
                            style={[styles.input, styles.codeInput]}
                            value={manualCode}
                            onChangeText={t => { setManualCode(t.toUpperCase()); setError(''); }}
                            placeholder="e.g. QFX12345AB"
                            autoCapitalize="characters"
                            maxLength={12}
                            placeholderTextColor={T.textDim}
                            accessibilityLabel="Transaction code"
                        />
                        <Text style={styles.inputHint}>
                            Check your M-Pesa SMS for the confirmation code
                        </Text>
                    </View>
                )}

                {/* ─── Amount Entry ───────────────────────────────── */}
                <Text style={styles.sectionTitle}>💰 Amount to Pay</Text>

                {/* Quick amounts */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickAmtScroll}>
                    {(balance > 0 ? [balance, ...QUICK_AMOUNTS.filter(a => a !== balance)] : QUICK_AMOUNTS).map(qa => (
                        <TouchableOpacity
                            key={qa}
                            onPress={() => { setAmount(String(qa)); setError(''); }}
                            style={[styles.quickAmtBtn, amount === String(qa) && styles.quickAmtBtnActive]}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.quickAmtText, amount === String(qa) && styles.quickAmtTextActive]}>
                                {qa === balance ? `Full: ${fmtKESShort(qa)}` : fmtKESShort(qa)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Custom amount */}
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Or enter custom amount</Text>
                    <View style={styles.inputBox}>
                        <Text style={styles.inputPrefix}>KES</Text>
                        <TextInput
                            style={styles.input}
                            value={amount}
                            onChangeText={t => { setAmount(t); setError(''); }}
                            placeholder="0"
                            keyboardType="numeric"
                            placeholderTextColor={T.textDim}
                            accessibilityLabel="Payment amount"
                        />
                    </View>
                </View>

                {/* Error */}
                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>⚠️ {error}</Text>
                    </View>
                ) : null}

                {/* ─── Summary before confirm ─────────────────────── */}
                {amount && Number(amount) > 0 && (
                    <View style={styles.confirmSummary}>
                        <View style={styles.confirmRow}>
                            <Text style={styles.confirmLabel}>Student</Text>
                            <Text style={styles.confirmValue}>{studentName}</Text>
                        </View>
                        <View style={styles.confirmRow}>
                            <Text style={styles.confirmLabel}>Method</Text>
                            <Text style={styles.confirmValue}>
                                {method === 'MPesa' ? '📱 M-Pesa STK' : method === 'KCB' ? '🏦 KCB Buni' : '🔢 Manual Code'}
                            </Text>
                        </View>
                        {method !== 'Manual' && (
                            <View style={styles.confirmRow}>
                                <Text style={styles.confirmLabel}>Phone</Text>
                                <Text style={styles.confirmValue}>{phone}</Text>
                            </View>
                        )}
                        <View style={[styles.confirmRow, styles.confirmTotal]}>
                            <Text style={styles.confirmTotalLabel}>Total Payment</Text>
                            <Text style={styles.confirmTotalValue}>{fmtKES(Number(amount))}</Text>
                        </View>
                    </View>
                )}

                {/* ─── Pay Button ─────────────────────────────────── */}
                <TouchableOpacity
                    onPress={() => {
                        Alert.alert(
                            'Confirm Payment',
                            `Pay ${fmtKES(Number(amount || '0'))} for ${studentName} via ${method === 'MPesa' ? 'M-Pesa STK Push' : method === 'KCB' ? 'KCB Buni' : 'Manual Code'}?`,
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Pay Now', style: 'default', onPress: handleInitiate },
                            ]
                        );
                    }}
                    disabled={!amount || Number(amount) <= 0}
                    activeOpacity={0.88}
                    style={{ marginBottom: 12 }}
                >
                    <LinearGradient
                        colors={(!amount || Number(amount) <= 0) ? ['#94a3b8', '#94a3b8'] : T.gradGreen}
                        style={styles.payBtn}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.payBtnIcon}>
                            {method === 'MPesa' ? '📱' : method === 'KCB' ? '🏦' : '🔢'}
                        </Text>
                        <Text style={styles.payBtnText}>
                            {amount && Number(amount) > 0 ? `Pay ${fmtKES(Number(amount))} via ${method === 'MPesa' ? 'M-Pesa' : method === 'KCB' ? 'KCB' : 'Code'}` : 'Enter Amount to Pay'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* ─── Recent payments ──────────────────────────── */}
                {paymentHistory.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>🕐 Recent Payments</Text>
                        <View style={styles.historyCard}>
                            {paymentHistory.map((p: any, i: number) => (
                                <View key={i} style={[styles.historyRow, i < paymentHistory.length - 1 && styles.historyBorder]}>
                                    <View style={[styles.historyIcon, { backgroundColor: p.payment_method?.toLowerCase() === 'mpesa' ? T.greenLight : T.blueLight }]}>
                                        <Text style={{ fontSize: 14 }}>{p.payment_method?.toLowerCase() === 'mpesa' ? '📱' : '🏦'}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.historyMethod}>{p.payment_method || 'Payment'}{p.receipt_no ? ` · ${p.receipt_no}` : ''}</Text>
                                        <Text style={styles.historyDate}>{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</Text>
                                    </View>
                                    <Text style={styles.historyAmt}>+{fmtKES(Number(p.amount || 0))}</Text>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: T.bg },
    scroll: { padding: 20, paddingTop: 16 },
    centeredScroll: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    sectionTitle: { fontSize: 14, fontWeight: '900', color: T.text, marginBottom: 12, marginTop: 4 },

    // Student card
    studentCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: T.bgCard, borderRadius: 20, padding: 16, marginBottom: 16,
        borderWidth: 1, borderColor: T.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
    },
    studentAvatar: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    studentInitials: { fontSize: 20, fontWeight: '900', color: '#fff' },
    studentName: { fontSize: 16, fontWeight: '900', color: T.text, marginBottom: 4 },
    studentMeta: { fontSize: 11, color: T.textSub, fontWeight: '600' },
    studentStatus: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    studentStatusText: { fontSize: 11, fontWeight: '800' },

    // Summary card
    summaryCard: {
        backgroundColor: T.bgCard, borderRadius: 20, padding: 18, marginBottom: 16,
        borderWidth: 1, borderColor: T.border,
        shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
    },
    summaryLabel: { fontSize: 13, fontWeight: '900', color: T.text, marginBottom: 14 },
    summaryRow: { flexDirection: 'row', alignItems: 'center' },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryItemLabel: { fontSize: 10, color: T.textSub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
    summaryItemValue: { fontSize: 16, fontWeight: '900', color: T.text },
    summaryDivider: { width: 1, height: 40, backgroundColor: T.border },
    progressLabel: { fontSize: 11, color: T.textSub, fontWeight: '600' },
    progressPct: { fontSize: 11, fontWeight: '800', color: T.indigo },

    // Breakdown
    breakdownCard: {
        backgroundColor: T.bgCard, borderRadius: 20, padding: 16, marginBottom: 16,
        borderWidth: 1, borderColor: T.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    breakdownRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
    breakdownBorder: { borderBottomWidth: 1, borderBottomColor: T.borderSoft },
    breakdownDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.indigo },
    breakdownCat: { flex: 1, fontSize: 13, color: T.text, fontWeight: '600' },
    breakdownAmt: { fontSize: 13, fontWeight: '800', color: T.indigo },

    // Method cards
    methodGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    methodCard: {
        flex: 1, borderRadius: 18, overflow: 'hidden',
        borderWidth: 2, borderColor: T.border,
        backgroundColor: T.bgCard, minHeight: 130,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    methodCardActive: {
        borderColor: 'transparent',
        shadowColor: '#4F46E5', shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
    },
    methodCardActiveBg: { ...StyleSheet.absoluteFillObject },
    methodDecor: { position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)' },
    methodCardContent: { padding: 12, flex: 1 },
    methodBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 8 },
    methodBadgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
    methodIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    methodLabel: { fontSize: 12, fontWeight: '800', color: T.text, marginBottom: 2 },
    methodSub: { fontSize: 10, color: T.textSub, fontWeight: '500' },

    // Inputs
    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 13, fontWeight: '800', color: T.text, marginBottom: 8 },
    inputBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: T.bgCard, borderRadius: 14,
        borderWidth: 1.5, borderColor: T.border, overflow: 'hidden',
    },
    inputPrefix: {
        paddingHorizontal: 14, paddingVertical: 14,
        fontSize: 15, fontWeight: '800', color: T.indigo,
        backgroundColor: T.indigoLight, borderRightWidth: 1, borderRightColor: T.border,
    },
    input: {
        flex: 1, paddingHorizontal: 14, paddingVertical: 14,
        fontSize: 16, fontWeight: '700', color: T.text,
    },
    codeInput: {
        borderWidth: 1.5, borderColor: T.border, borderRadius: 14,
        backgroundColor: T.bgCard, textTransform: 'uppercase',
        letterSpacing: 2, fontSize: 18, fontWeight: '900', color: T.indigo,
        paddingHorizontal: 20, paddingVertical: 16,
    },
    inputHint: { fontSize: 11, color: T.textSub, marginTop: 6, fontWeight: '500' },

    // Quick amounts
    quickAmtScroll: { marginBottom: 16, marginHorizontal: -20 },
    quickAmtBtn: {
        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
        backgroundColor: T.bgCard, borderWidth: 1.5, borderColor: T.border, marginLeft: 8,
    },
    quickAmtBtnActive: { backgroundColor: T.indigoLight, borderColor: T.indigo },
    quickAmtText: { fontSize: 13, fontWeight: '700', color: T.textSub },
    quickAmtTextActive: { color: T.indigo, fontWeight: '900' },

    // Error
    errorBox: {
        backgroundColor: T.redLight, borderRadius: 12, padding: 12,
        borderWidth: 1, borderColor: '#fca5a5', marginBottom: 12,
    },
    errorText: { fontSize: 13, color: T.red, fontWeight: '700' },

    // Confirm summary
    confirmSummary: {
        backgroundColor: T.bgSoft, borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: T.indigoLight, marginBottom: 16,
    },
    confirmRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    confirmLabel: { fontSize: 12, color: T.textSub, fontWeight: '600' },
    confirmValue: { fontSize: 12, color: T.text, fontWeight: '700' },
    confirmTotal: { borderTopWidth: 1, borderTopColor: T.border, marginTop: 6, paddingTop: 12 },
    confirmTotalLabel: { fontSize: 14, fontWeight: '900', color: T.text },
    confirmTotalValue: { fontSize: 18, fontWeight: '900', color: T.green },

    // Pay button
    payBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        paddingVertical: 18, borderRadius: 18,
        shadowColor: T.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
    },
    payBtnIcon: { fontSize: 22 },
    payBtnText: { fontSize: 16, fontWeight: '900', color: '#fff' },

    // History
    historyCard: {
        backgroundColor: T.bgCard, borderRadius: 18, overflow: 'hidden',
        borderWidth: 1, borderColor: T.border, marginBottom: 16,
    },
    historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    historyBorder: { borderBottomWidth: 1, borderBottomColor: T.borderSoft },
    historyIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    historyMethod: { fontSize: 12, fontWeight: '700', color: T.text },
    historyDate: { fontSize: 10, color: T.textSub, marginTop: 2 },
    historyAmt: { fontSize: 14, fontWeight: '900', color: T.green },

    // Processing screen
    processingBox: { width: 100, height: 100, borderRadius: 50, overflow: 'hidden', marginBottom: 24 },
    processingCircle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    processingTitle: { fontSize: 22, fontWeight: '900', color: T.text, textAlign: 'center', marginBottom: 8 },
    processingPhone: { fontSize: 18, fontWeight: '800', color: T.teal, textAlign: 'center', marginBottom: 12 },
    processingDesc: { fontSize: 14, color: T.textSub, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    processingTimer: { width: '100%', marginBottom: 20 },
    processingTimerLabel: { fontSize: 12, color: T.textSub, fontWeight: '600' },
    processingTimerSecs: { fontSize: 12, fontWeight: '900', color: T.teal },
    processingAmount: { fontSize: 16, fontWeight: '900', color: T.text, marginBottom: 24 },
    cancelBtn: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, borderWidth: 1.5, borderColor: T.border },
    cancelBtnText: { fontSize: 14, fontWeight: '700', color: T.textSub },

    // Success screen
    successBox: { alignItems: 'center', width: '100%' },
    successCircle: {
        width: 120, height: 120, borderRadius: 60,
        alignItems: 'center', justifyContent: 'center', marginBottom: 24,
        shadowColor: T.green, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
    },
    successTitle: { fontSize: 26, fontWeight: '900', color: T.text, marginBottom: 8, textAlign: 'center' },
    successAmount: { fontSize: 40, fontWeight: '900', color: T.green, marginBottom: 4 },
    successSub: { fontSize: 14, color: T.textSub, marginBottom: 20, textAlign: 'center' },
    receiptBox: { backgroundColor: T.greenLight, borderRadius: 14, padding: 14, marginBottom: 16, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#6ee7b7' },
    receiptLabel: { fontSize: 11, color: T.green, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
    receiptCode: { fontSize: 22, fontWeight: '900', color: T.text, letterSpacing: 2 },
    successBalanceBox: { backgroundColor: T.bgSoft, borderRadius: 14, padding: 16, width: '100%', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: T.border },
    successBalLabel: { fontSize: 12, color: T.textSub, fontWeight: '600', marginBottom: 6 },
    successBal: { fontSize: 22, fontWeight: '900' },
    successBtn: { width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
    successBtnGrad: { paddingVertical: 16, alignItems: 'center' },
    successBtnText: { fontSize: 16, fontWeight: '900', color: '#fff' },
    successBackBtn: { paddingVertical: 12 },
    successBackText: { fontSize: 14, color: T.textSub, fontWeight: '600' },

    // Failed screen
    failedCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: T.redLight, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    failedTitle: { fontSize: 24, fontWeight: '900', color: T.text, marginBottom: 12, textAlign: 'center' },
    failedDesc: { fontSize: 14, color: T.textSub, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
});
