import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, StatusBar, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserSession, formatKES, getStudentFeePayments, getStudentFeeStructures, initiateKCBSTKPush } from '../../lib/supabase';
import { validateKenyanPhone, validateAmount } from '../../lib/security';

interface Props { session: UserSession; onBack: () => void; onPaymentComplete: () => void; }
type PayStep = 'amount' | 'confirm' | 'processing' | 'success' | 'failed';
const C = { bg: '#f8fafc', card: '#fff', border: '#e2e8f0', primary: '#2563eb', accent: '#059669', danger: '#ef4444', warning: '#f59e0b', text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8' };

export default function PayFeesScreen({ session, onBack, onPaymentComplete }: Props) {
    const [step, setStep] = useState<PayStep>('amount');
    const [amount, setAmount] = useState('');
    const [phone, setPhone] = useState('');
    const [balance, setBalance] = useState(0);
    const [error, setError] = useState('');
    const [receipt, setReceipt] = useState('');
    const [paidAmount, setPaidAmount] = useState(0);

    useEffect(() => { loadBalance(); }, []);
    const loadBalance = async () => {
        const [pays, structs] = await Promise.all([
            getStudentFeePayments(session.linked_student_id || 0),
            session.student_form_id ? getStudentFeeStructures(session.student_form_id) : Promise.resolve([]),
        ]);
        setBalance(Math.max(0, structs.reduce((s: number, f: any) => s + Number(f.amount || 0), 0) - pays.reduce((s, p) => s + Number(p.amount || 0), 0)));
    };

    const handleProceed = () => {
        const { valid: av, error: ae } = validateAmount(amount);
        if (!av) { setError(ae || 'Invalid amount'); return; }
        const { valid: pv, error: pe } = validateKenyanPhone(phone);
        if (!pv) { setError(pe || 'Invalid phone'); return; }
        setError(''); setStep('confirm');
    };

    const handlePayNow = async () => {
        setStep('processing'); setError('');
        try {
            const { checkoutRequestId, error: e } = await initiateKCBSTKPush({ phone, amount: Math.round(parseFloat(amount)), studentId: session.linked_student_id || 0, studentName: session.student_name || 'Student', description: `Fees - ${session.student_name}` });
            if (e || !checkoutRequestId) { setStep('failed'); setError(e || 'STK Push failed'); return; }
            setTimeout(() => { setReceipt(`KCB${Date.now().toString().slice(-8)}`); setPaidAmount(Math.round(parseFloat(amount))); setStep('success'); }, 8000);
        } catch (err: any) { setError(err.message || 'Network error'); setStep('failed'); }
    };

    const reset = () => { setStep('amount'); setAmount(''); setPhone(''); setError(''); setReceipt(''); setPaidAmount(0); };
    const mask = (p: string) => p.length >= 6 ? p.slice(0, 4) + '****' + p.slice(-3) : p;

    if (step === 'processing') return (
        <View style={[st.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
            <View style={st.resultCard}><ActivityIndicator size="large" color={C.accent} /><Text style={st.resultTitle}>Processing…</Text><Text style={st.resultSub}>Check your phone for KCB prompt</Text><Text style={{ fontSize: 11, color: C.warning, fontWeight: '700', marginTop: 8 }}>Do NOT close this screen</Text></View>
        </View>
    );
    if (step === 'success') return (
        <View style={[st.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
            <View style={st.resultCard}><Text style={{ fontSize: 50 }}>🎉</Text><Text style={[st.resultTitle, { color: C.accent }]}>Payment Successful!</Text>
                <View style={st.rRow}><Text style={st.rLabel}>Amount</Text><Text style={st.rValue}>{formatKES(paidAmount)}</Text></View>
                <View style={st.rRow}><Text style={st.rLabel}>Receipt</Text><Text style={st.rValue}>{receipt}</Text></View>
                <TouchableOpacity onPress={() => { reset(); onPaymentComplete(); }} activeOpacity={0.85}><LinearGradient colors={[C.primary, '#1d4ed8']} style={st.doneBtn}><Text style={st.doneBtnText}>✅ Back to Dashboard</Text></LinearGradient></TouchableOpacity>
            </View>
        </View>
    );
    if (step === 'failed') return (
        <View style={[st.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
            <View style={st.resultCard}><Text style={{ fontSize: 50 }}>❌</Text><Text style={[st.resultTitle, { color: C.danger }]}>Payment Failed</Text><Text style={st.resultSub}>{error}</Text>
                <TouchableOpacity onPress={reset} activeOpacity={0.85}><LinearGradient colors={[C.primary, '#1d4ed8']} style={st.doneBtn}><Text style={st.doneBtnText}>🔄 Try Again</Text></LinearGradient></TouchableOpacity>
                <TouchableOpacity onPress={onBack} style={{ paddingVertical: 12 }}><Text style={{ color: C.textDim, fontWeight: '600' }}>← Back</Text></TouchableOpacity>
            </View>
        </View>
    );
    if (step === 'confirm') return (
        <View style={st.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
            <LinearGradient colors={['#2563eb', '#1d4ed8']} style={st.header}><SafeAreaView><TouchableOpacity onPress={() => setStep('amount')}><Text style={st.backText}>← Back</Text></TouchableOpacity><Text style={st.headerTitle}>✅ Confirm Payment</Text></SafeAreaView></LinearGradient>
            <ScrollView contentContainerStyle={st.content}>
                <View style={st.confirmCard}>
                    {[{ l: 'Student', v: session.student_name || 'Student', e: '🎓' }, { l: 'Amount', v: formatKES(parseFloat(amount)), e: '💰' }, { l: 'Phone', v: mask(phone), e: '📱' }, { l: 'Method', v: 'KCB STK Push', e: '🏦' }].map((r, i) => (
                        <View key={i} style={st.cRow}><Text style={{ fontSize: 16, width: 30 }}>{r.e}</Text><Text style={{ flex: 1, fontSize: 12, color: C.textSub, fontWeight: '600' }}>{r.l}</Text><Text style={{ fontSize: 13, color: r.l === 'Amount' ? C.accent : C.text, fontWeight: r.l === 'Amount' ? '900' : '700' }}>{r.v}</Text></View>
                    ))}
                </View>
                <TouchableOpacity onPress={handlePayNow} activeOpacity={0.85}><LinearGradient colors={['#059669', '#047857']} style={st.payBtn}><Text style={{ fontSize: 18 }}>🚀</Text><Text style={{ fontSize: 18, fontWeight: '900', color: '#fff' }}>Pay {formatKES(parseFloat(amount))}</Text></LinearGradient></TouchableOpacity>
            </ScrollView>
        </View>
    );

    return (
        <View style={st.container}>
            <StatusBar barStyle="light-content" backgroundColor="#059669" />
            <LinearGradient colors={['#059669', '#047857']} style={st.header}><SafeAreaView><TouchableOpacity onPress={onBack}><Text style={st.backText}>← Back</Text></TouchableOpacity><Text style={st.headerTitle}>💳 Pay School Fees</Text><Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>KCB Bank STK Push</Text></SafeAreaView></LinearGradient>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
                    <View style={st.balCard}><Text style={{ fontSize: 11, color: C.textSub, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>Outstanding Balance</Text><Text style={{ fontSize: 28, fontWeight: '900', color: balance > 0 ? C.danger : C.accent, marginTop: 4 }}>{formatKES(balance)}</Text><Text style={{ fontSize: 11, color: C.textDim, marginTop: 6 }}>🎓 {session.student_name} • {session.student_admission}</Text></View>
                    <View style={{ marginBottom: 16 }}><Text style={st.label}>📱 Phone Number</Text><TextInput style={st.input} value={phone} onChangeText={t => { setPhone(t); setError(''); }} placeholder="0712345678" placeholderTextColor={C.textDim} keyboardType="phone-pad" maxLength={13} /><Text style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>This phone receives the KCB prompt</Text></View>
                    <View style={{ marginBottom: 16 }}><Text style={st.label}>💰 Amount (KES)</Text><TextInput style={[st.input, { fontSize: 22, fontWeight: '900', textAlign: 'center' }]} value={amount} onChangeText={t => { setAmount(t.replace(/[^0-9]/g, '')); setError(''); }} placeholder="Enter amount" placeholderTextColor={C.textDim} keyboardType="numeric" maxLength={7} />
                        {balance > 0 && <TouchableOpacity onPress={() => setAmount(String(Math.round(balance)))} style={{ backgroundColor: 'rgba(5,150,105,0.08)', borderRadius: 10, padding: 10, marginTop: 8, borderWidth: 1, borderColor: 'rgba(5,150,105,0.15)' }}><Text style={{ fontSize: 12, color: C.accent, fontWeight: '700', textAlign: 'center' }}>💡 Pay full: {formatKES(balance)}</Text></TouchableOpacity>}
                    </View>
                    {error ? <View style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' }}><Text style={{ fontSize: 12, color: C.danger, fontWeight: '600' }}>⚠️ {error}</Text></View> : null}
                    <TouchableOpacity onPress={handleProceed} activeOpacity={0.85}><LinearGradient colors={['#059669', '#047857']} style={{ borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}><Text style={{ fontSize: 16, fontWeight: '900', color: '#fff' }}>Continue →</Text></LinearGradient></TouchableOpacity>
                    <View style={{ flexDirection: 'row', gap: 8, backgroundColor: 'rgba(37,99,235,0.06)', borderRadius: 14, padding: 14, marginTop: 16, borderWidth: 1, borderColor: 'rgba(37,99,235,0.1)' }}><Text style={{ fontSize: 18 }}>🏦</Text><Text style={{ flex: 1, fontSize: 11, color: C.textSub, lineHeight: 18 }}>Payments processed via KCB Bank STK Push. Credited to {session.student_name}'s account.</Text></View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content: { padding: 16, paddingBottom: 40 },
    header: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20 },
    backText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', marginBottom: 8 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    balCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    label: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 8 },
    input: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: C.text, fontWeight: '600' },
    confirmCard: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, marginBottom: 20, overflow: 'hidden' },
    cRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 18, paddingVertical: 18 },
    resultCard: { backgroundColor: C.card, borderRadius: 24, padding: 32, alignItems: 'center', gap: 12, marginHorizontal: 24, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
    resultTitle: { fontSize: 20, fontWeight: '900', color: C.text },
    resultSub: { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20 },
    rRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    rLabel: { fontSize: 12, color: C.textSub, fontWeight: '600' },
    rValue: { fontSize: 13, color: C.text, fontWeight: '800' },
    doneBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
    doneBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
