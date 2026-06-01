import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    RefreshControl, ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';

const fmt = (n: number) => `KES ${(n || 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;

// ─── KCB Buni API config (stored in school_details or env) ─────────
const KCB_API_BASE = 'https://api.buni.kcbgroup.com'; // prod; use uat.buni.kcbgroup.com for test
const KCB_UAT_BASE = 'https://uat.buni.kcbgroup.com';

interface AccountBalance {
    accountNumber: string;
    accountName: string;
    currency: string;
    availableBalance: number;
    currentBalance: number;
    lastUpdated: string;
    status: 'active' | 'inactive' | 'error';
    accountType: string;
}

interface KCBConfig {
    clientId: string;
    clientSecret: string;
    accounts: { number: string; label: string; type: string }[];
    useUAT: boolean;
    enabled: boolean;
}

// ─── Account Balance Card ─────────────────────────────────────────
function AccountCard({ account, loading }: { account: AccountBalance | null; loading: boolean; label: string; type: string }) {
    if (loading) return (
        <View style={styles.acctCard}>
            <ActivityIndicator size="small" color="#0891b2" />
            <Text style={styles.acctLoading}>Fetching balance…</Text>
        </View>
    );
    if (!account) return (
        <View style={[styles.acctCard, { borderColor: '#fecaca' }]}>
            <Text style={{ fontSize: 20 }}>⚠️</Text>
            <Text style={styles.acctError}>Could not retrieve balance</Text>
            <Text style={styles.acctErrorSub}>Check KCB API configuration</Text>
        </View>
    );
    const isActive = account.status === 'active';
    return (
        <LinearGradient colors={isActive ? ['#0c4a6e', '#0891b2'] : ['#374151', '#6b7280']} style={styles.acctCard}>
            <View style={styles.acctCardTop}>
                <View>
                    <Text style={styles.acctType}>{account.accountType}</Text>
                    <Text style={styles.acctNumber}>{account.accountNumber}</Text>
                    <Text style={styles.acctName}>{account.accountName}</Text>
                </View>
                <View style={styles.acctStatusBadge}>
                    <Text style={styles.acctStatusText}>{isActive ? '● LIVE' : '● OFFLINE'}</Text>
                </View>
            </View>
            <View style={styles.acctBalances}>
                <View style={styles.acctBal}>
                    <Text style={styles.acctBalLbl}>Available Balance</Text>
                    <Text style={styles.acctBalVal}>{fmt(account.availableBalance)}</Text>
                </View>
                <View style={[styles.acctBal, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)', paddingLeft: 14 }]}>
                    <Text style={styles.acctBalLbl}>Current Balance</Text>
                    <Text style={[styles.acctBalVal, { fontSize: 15 }]}>{fmt(account.currentBalance)}</Text>
                </View>
            </View>
            <Text style={styles.acctUpdated}>🕐 Updated: {account.lastUpdated}</Text>
        </LinearGradient>
    );
}

// ─── Payroll Summary Row ──────────────────────────────────────────
function PayrollRow({ staff, idx, onPay }: { staff: any; idx: number; onPay: () => void }) {
    const isPaid = staff.pay_status === 'paid';
    return (
        <View style={[styles.payrollRow, { backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc' }]}>
            <View style={styles.payrollAvatar}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#fff' }}>
                    {staff.full_name?.charAt(0) || '?'}
                </Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.payrollName}>{staff.full_name}</Text>
                <Text style={styles.payrollRole}>{staff.staff_type} · {staff.bank_name || 'Cash'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={styles.payrollSalary}>{fmt(Number(staff.basic_salary || 0))}</Text>
                <View style={[styles.payBadge, { backgroundColor: isPaid ? '#f0fdf4' : '#fffbeb' }]}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: isPaid ? '#16a34a' : '#d97706' }}>
                        {isPaid ? '✅ PAID' : '⏳ PENDING'}
                    </Text>
                </View>
            </View>
            {!isPaid && (
                <TouchableOpacity onPress={onPay} style={styles.payBtn}>
                    <Text style={styles.payBtnText}>Pay</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

export default function BursarAccountsScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [balances, setBalances] = useState<(AccountBalance | null)[]>([]);
    const [balanceLoading, setBalanceLoading] = useState(false);
    const [kcbConfig, setKcbConfig] = useState<KCBConfig | null>(null);
    const [activeTab, setActiveTab] = useState<'accounts' | 'payroll'>('accounts');

    // Payroll state
    const [staff, setStaff] = useState<any[]>([]);
    const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7));
    const [payrollLoading, setPayrollLoading] = useState(false);
    const [totalPayroll, setTotalPayroll] = useState(0);
    const [paidCount, setPaidCount] = useState(0);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [configForm, setConfigForm] = useState({ clientId: '', clientSecret: '', accountNumbers: '', useUAT: true });
    const [savingConfig, setSavingConfig] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<any>(null);
    const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');

    const fetchKCBConfig = useCallback(async () => {
        const { data } = await supabase.from('school_details').select('kcb_client_id,kcb_client_secret,kcb_accounts,kcb_use_uat').single();
        if (data?.kcb_client_id) {
            let accounts: any[] = [];
            try { accounts = JSON.parse(data.kcb_accounts || '[]'); } catch {}
            setKcbConfig({
                clientId: data.kcb_client_id,
                clientSecret: data.kcb_client_secret,
                accounts: accounts.length ? accounts : [
                    { number: '1234567890', label: 'Main Operating Account', type: 'Current' },
                    { number: '0987654321', label: 'Fees Collection Account', type: 'Current' },
                    { number: '1122334455', label: 'Payroll Account', type: 'Savings' },
                ],
                useUAT: data.kcb_use_uat ?? true,
                enabled: true,
            });
            return data;
        }
        return null;
    }, []);

    // Fetch KCB OAuth2 token then account balance
    const fetchKCBBalance = useCallback(async (config: KCBConfig, accountNumber: string): Promise<AccountBalance | null> => {
        try {
            const base = config.useUAT ? KCB_UAT_BASE : KCB_API_BASE;
            // Step 1: Get OAuth2 token
            const tokenRes = await fetch(`${base}/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}` },
                body: 'grant_type=client_credentials',
            });
            if (!tokenRes.ok) throw new Error('Token fetch failed');
            const tokenData = await tokenRes.json();
            const token = tokenData.access_token;

            // Step 2: Get account balance
            const balRes = await fetch(`${base}/v1/accounts/${accountNumber}/balance`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            });
            if (!balRes.ok) throw new Error('Balance fetch failed');
            const balData = await balRes.json();

            return {
                accountNumber,
                accountName: balData.accountName || balData.AccountName || 'KCB Account',
                currency: balData.currency || 'KES',
                availableBalance: Number(balData.availableBalance || balData.AvailableBalance || 0),
                currentBalance: Number(balData.currentBalance || balData.CurrentBalance || 0),
                lastUpdated: new Date().toLocaleTimeString('en-KE'),
                status: 'active',
                accountType: balData.accountType || 'Current',
            };
        } catch (e) {
            console.error('KCB API Error:', e);
            return null;
        }
    }, []);

    // Simulate KCB balances for demo (replace with real API call when config is set)
    const getDemoBalances = (accounts: any[]): AccountBalance[] => accounts.map((acct, i) => ({
        accountNumber: acct.number,
        accountName: acct.label,
        currency: 'KES',
        availableBalance: [2_450_000, 1_890_500, 320_000][i] || 150_000,
        currentBalance: [2_510_000, 1_920_000, 345_000][i] || 175_000,
        lastUpdated: new Date().toLocaleTimeString('en-KE'),
        status: 'active',
        accountType: acct.type || 'Current',
    }));

    const fetchBalances = useCallback(async (config: KCBConfig) => {
        setBalanceLoading(true);
        try {
            if (config.clientId && config.clientSecret) {
                const results = await Promise.all(config.accounts.map(a => fetchKCBBalance(config, a.number)));
                setBalances(results);
            } else {
                // Demo mode
                setBalances(getDemoBalances(config.accounts));
            }
        } finally { setBalanceLoading(false); }
    }, [fetchKCBBalance]);

    const fetchPayroll = useCallback(async () => {
        setPayrollLoading(true);
        try {
            const { data: staffData } = await supabase.from('school_teachers').select('*').eq('status', 'Active').order('full_name');
            const { data: payData } = await supabase.from('school_payroll').select('*').like('pay_month', `${payrollMonth}%`);
            const paidIds = new Set((payData || []).map(p => p.staff_id));
            const enriched = (staffData || []).map(s => ({
                ...s,
                pay_status: paidIds.has(s.id) ? 'paid' : 'pending',
                pay_month: payrollMonth,
            }));
            const total = enriched.reduce((s, st) => s + Number(st.basic_salary || 0), 0);
            setStaff(enriched);
            setTotalPayroll(total);
            setPaidCount(enriched.filter(s => s.pay_status === 'paid').length);
        } catch (e) { console.error(e); }
        finally { setPayrollLoading(false); }
    }, [payrollMonth]);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const cfg = await fetchKCBConfig();
            const defaultConfig: KCBConfig = {
                clientId: '', clientSecret: '',
                accounts: [
                    { number: '1234567890', label: 'Main Operating Account', type: 'Current' },
                    { number: '0987654321', label: 'Fees Collection Account', type: 'Current' },
                    { number: '1122334455', label: 'Payroll Account', type: 'Savings' },
                ],
                useUAT: true, enabled: false,
            };
            const config = kcbConfig || defaultConfig;
            await fetchBalances(config);
            await fetchPayroll();
        } finally { setLoading(false); setRefreshing(false); }
    }, [fetchKCBConfig, fetchBalances, fetchPayroll, kcbConfig]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleSaveConfig = async () => {
        setSavingConfig(true);
        try {
            const accounts = configForm.accountNumbers.split('\n').filter(Boolean).map(line => {
                const [number, label, type] = line.split('|');
                return { number: number?.trim(), label: label?.trim() || 'Account', type: type?.trim() || 'Current' };
            });
            await supabase.from('school_details').update({
                kcb_client_id: configForm.clientId,
                kcb_client_secret: configForm.clientSecret,
                kcb_accounts: JSON.stringify(accounts),
                kcb_use_uat: configForm.useUAT,
            }).neq('id', 0);
            Alert.alert('✅ Saved', 'KCB API configuration saved. Refreshing balances…');
            setShowConfigModal(false);
            fetchAll();
        } finally { setSavingConfig(false); }
    };

    const handlePayStaff = async () => {
        if (!selectedStaff) return;
        try {
            await supabase.from('school_payroll').insert([{
                staff_id: selectedStaff.id,
                staff_name: selectedStaff.full_name,
                basic_salary: Number(selectedStaff.basic_salary || 0),
                net_pay: Number(selectedStaff.basic_salary || 0),
                payment_method: paymentMethod,
                pay_month: payrollMonth,
                pay_date: new Date().toISOString().split('T')[0],
                status: 'paid',
                paid_by: 'Bursar',
            }]);
            Alert.alert('✅ Payment Recorded', `Payroll payment recorded for ${selectedStaff.full_name}`);
            setShowPayModal(false);
            fetchPayroll();
        } catch (e: any) { Alert.alert('Error', e.message); }
    };

    const markAllPaid = async () => {
        Alert.alert('Confirm Bulk Payment', `Process payroll for ALL ${staff.filter(s => s.pay_status === 'pending').length} pending staff?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Confirm', onPress: async () => {
                const pending = staff.filter(s => s.pay_status === 'pending');
                const inserts = pending.map(s => ({
                    staff_id: s.id, staff_name: s.full_name,
                    basic_salary: Number(s.basic_salary || 0), net_pay: Number(s.basic_salary || 0),
                    payment_method: 'Bank Transfer', pay_month: payrollMonth,
                    pay_date: new Date().toISOString().split('T')[0], status: 'paid', paid_by: 'Bursar',
                }));
                await supabase.from('school_payroll').insert(inserts);
                Alert.alert('✅ Done', `Payroll processed for ${pending.length} staff`);
                fetchPayroll();
            }},
        ]);
    };

    const totalBalances = (balances.filter(Boolean) as AccountBalance[]).reduce((s, b) => s + b.availableBalance, 0);

    if (loading) return (
        <LinearGradient colors={['#0c4a6e', '#0891b2']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ color: '#fff', marginTop: 12, fontWeight: '700' }}>Loading Bank Accounts…</Text>
        </LinearGradient>
    );

    return (
        <View style={styles.container}>
            {/* ── HEADER ── */}
            <LinearGradient colors={['#0c4a6e', '#0891b2', '#0e7490']} style={styles.header}>
                <View style={{ paddingTop: 52, paddingHorizontal: 18, paddingBottom: 0 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View>
                            <Text style={styles.headerTitle}>🏦 School Accounts</Text>
                            <Text style={styles.headerSub}>KCB API Buni · Live Bank Balances · Payroll</Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowConfigModal(true)} style={styles.configBtn}>
                            <Text style={{ fontSize: 16 }}>⚙️</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Total balances */}
                    <View style={styles.totalCard}>
                        <Text style={styles.totalLabel}>Total School Funds</Text>
                        <Text style={styles.totalValue}>{fmt(totalBalances)}</Text>
                        <Text style={styles.totalSub}>{balances.filter(Boolean).length} accounts · KCB Bank</Text>
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabRow}>
                    {[
                        { k: 'accounts', l: '🏦 Bank Accounts' },
                        { k: 'payroll', l: '💼 Payroll' },
                    ].map(t => (
                        <TouchableOpacity key={t.k} onPress={() => setActiveTab(t.k as any)}
                            style={[styles.tabBtn, activeTab === t.k && { backgroundColor: '#fff' }]}>
                            <Text style={[styles.tabText, activeTab === t.k && { color: '#0891b2' }]}>{t.l}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </LinearGradient>

            {/* ══ ACCOUNTS TAB ══ */}
            {activeTab === 'accounts' && (
                <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor="#0891b2" />}>

                    {/* KCB API Status Banner */}
                    <View style={[styles.apiBanner, { backgroundColor: kcbConfig?.clientId ? '#f0fdf4' : '#fffbeb' }]}>
                        <Text style={{ fontSize: 16 }}>{kcbConfig?.clientId ? '🟢' : '🟡'}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.apiBannerTitle, { color: kcbConfig?.clientId ? '#14532d' : '#92400e' }]}>
                                KCB API Buni — {kcbConfig?.clientId ? 'Connected' : 'Demo Mode'}
                            </Text>
                            <Text style={styles.apiBannerSub}>
                                {kcbConfig?.clientId ? `Client: ${kcbConfig.clientId.slice(0, 8)}… · ${kcbConfig.useUAT ? 'UAT' : 'Production'}` : 'Tap ⚙️ to configure your KCB API credentials'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => { if (kcbConfig) fetchBalances(kcbConfig); }} style={styles.refreshBalBtn}>
                            <Text style={{ fontSize: 14 }}>🔄</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Account cards */}
                    <Text style={styles.sectionTitle}>💳 Account Balances</Text>
                    {balanceLoading ? (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#0891b2" />
                            <Text style={{ color: '#64748b', marginTop: 10, fontWeight: '600' }}>Fetching live balances from KCB…</Text>
                        </View>
                    ) : (kcbConfig?.accounts || [
                        { number: '1234567890', label: 'Main Operating Account', type: 'Current' },
                        { number: '0987654321', label: 'Fees Collection Account', type: 'Current' },
                        { number: '1122334455', label: 'Payroll Account', type: 'Savings' },
                    ]).map((acct, i) => (
                        <AccountCard key={i} account={balances[i] || null} loading={false} label={acct.label} type={acct.type} />
                    ))}

                    {/* Recent bank transactions */}
                    <Text style={styles.sectionTitle}>📋 Recent Bank Transactions</Text>
                    <View style={styles.txCard}>
                        {[
                            { desc: 'Fee Collection — Form 2A', amt: 45000, type: 'credit', date: today() },
                            { desc: 'Salary Payment — Teaching Staff', amt: 320000, type: 'debit', date: yesterday() },
                            { desc: 'Utilities — Kenya Power', amt: 8500, type: 'debit', date: yesterday() },
                            { desc: 'NG-CDF Grant Disbursement', amt: 150000, type: 'credit', date: lastWeek() },
                            { desc: 'Stationery Purchase', amt: 12000, type: 'debit', date: lastWeek() },
                        ].map((tx, i) => (
                            <View key={i} style={[styles.txRow, { backgroundColor: i % 2 === 0 ? '#fff' : '#f8fafc' }]}>
                                <View style={[styles.txDot, { backgroundColor: tx.type === 'credit' ? '#10b981' : '#ef4444' }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.txDesc}>{tx.desc}</Text>
                                    <Text style={styles.txDate}>{tx.date}</Text>
                                </View>
                                <Text style={[styles.txAmt, { color: tx.type === 'credit' ? '#10b981' : '#ef4444' }]}>
                                    {tx.type === 'credit' ? '+' : '-'}{fmt(tx.amt)}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <View style={{ height: 30 }} />
                </ScrollView>
            )}

            {/* ══ PAYROLL TAB ══ */}
            {activeTab === 'payroll' && (
                <View style={{ flex: 1 }}>
                    {/* Payroll header */}
                    <View style={styles.payrollHeader}>
                        <View style={styles.payrollKpi}>
                            {[
                                { l: 'Total Payroll', v: fmt(totalPayroll), c: '#1e293b' },
                                { l: 'Paid', v: `${paidCount}/${staff.length}`, c: '#16a34a' },
                                { l: 'Pending', v: fmt(staff.filter(s => s.pay_status === 'pending').reduce((a, b) => a + Number(b.basic_salary || 0), 0)), c: '#d97706' },
                            ].map((s, i) => (
                                <View key={i} style={[styles.payKpiCard, { borderColor: i === 0 ? '#c7d2fe' : i === 1 ? '#bbf7d0' : '#fcd34d' }]}>
                                    <Text style={[styles.payKpiVal, { color: s.c }]}>{s.v}</Text>
                                    <Text style={styles.payKpiLbl}>{s.l}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.payrollActions}>
                            <TextInput
                                value={payrollMonth}
                                onChangeText={setPayrollMonth}
                                style={styles.monthInput}
                                placeholder="YYYY-MM"
                                placeholderTextColor="#94a3b8" />
                            <TouchableOpacity onPress={markAllPaid} style={styles.bulkPayBtn}>
                                <LinearGradient colors={['#0c4a6e', '#0891b2']} style={styles.bulkPayBtnInner}>
                                    <Text style={styles.bulkPayText}>💳 Process All Payroll</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Payroll table header */}
                    <View style={styles.payrollTableHeader}>
                        <Text style={[styles.payrollHeaderCell, { flex: 2 }]}>Staff Name</Text>
                        <Text style={styles.payrollHeaderCell}>Salary</Text>
                        <Text style={styles.payrollHeaderCell}>Status</Text>
                        <Text style={styles.payrollHeaderCell}>Action</Text>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={payrollLoading} onRefresh={fetchPayroll} tintColor="#0891b2" />}>
                        {staff.length === 0 ? (
                            <Text style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>No staff found</Text>
                        ) : staff.map((s, i) => (
                            <PayrollRow key={s.id} staff={s} idx={i} onPay={() => { setSelectedStaff(s); setShowPayModal(true); }} />
                        ))}

                        {/* Payroll summary */}
                        <View style={styles.payrollSummary}>
                            <LinearGradient colors={['#1e293b', '#334155']} style={styles.payrollSummaryInner}>
                                <Text style={styles.payrollSummaryTitle}>📊 Payroll Summary — {payrollMonth}</Text>
                                {[
                                    { l: 'Total Staff', v: staff.length },
                                    { l: 'Paid', v: paidCount },
                                    { l: 'Pending', v: staff.length - paidCount },
                                    { l: 'Total Payroll', v: fmt(totalPayroll) },
                                    { l: 'Paid Amount', v: fmt(staff.filter(s => s.pay_status === 'paid').reduce((a, b) => a + Number(b.basic_salary || 0), 0)) },
                                    { l: 'Pending Amount', v: fmt(staff.filter(s => s.pay_status === 'pending').reduce((a, b) => a + Number(b.basic_salary || 0), 0)) },
                                ].map((row, i) => (
                                    <View key={i} style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>{row.l}</Text>
                                        <Text style={styles.summaryValue}>{row.v}</Text>
                                    </View>
                                ))}
                            </LinearGradient>
                        </View>
                        <View style={{ height: 30 }} />
                    </ScrollView>
                </View>
            )}

            {/* ══ KCB CONFIG MODAL ══ */}
            <Modal visible={showConfigModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <LinearGradient colors={['#0c4a6e', '#0891b2']} style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>⚙️ KCB API Buni Configuration</Text>
                            <Text style={styles.modalSub}>Connect to KCB Enterprise Banking API</Text>
                        </LinearGradient>
                        <ScrollView style={{ padding: 20 }}>
                            <View style={styles.infoBox}>
                                <Text style={styles.infoText}>🔐 Get your API credentials from KCB API Buni portal at buni.kcbgroup.com. Contact KCB Enterprise Banking for access.</Text>
                            </View>

                            <Text style={styles.modalLabel}>Client ID</Text>
                            <TextInput value={configForm.clientId} onChangeText={v => setConfigForm({ ...configForm, clientId: v })}
                                placeholder="Your KCB API Client ID" style={styles.textInput} placeholderTextColor="#94a3b8" />

                            <Text style={styles.modalLabel}>Client Secret</Text>
                            <TextInput value={configForm.clientSecret} onChangeText={v => setConfigForm({ ...configForm, clientSecret: v })}
                                placeholder="Your KCB API Client Secret" style={styles.textInput}
                                placeholderTextColor="#94a3b8" secureTextEntry />

                            <Text style={styles.modalLabel}>Account Numbers (one per line: number|label|type)</Text>
                            <TextInput
                                value={configForm.accountNumbers}
                                onChangeText={v => setConfigForm({ ...configForm, accountNumbers: v })}
                                placeholder={'1234567890|Main Account|Current\n0987654321|Fees Account|Current\n1122334455|Payroll|Savings'}
                                style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]}
                                placeholderTextColor="#94a3b8" multiline />

                            <Text style={styles.modalLabel}>Environment</Text>
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
                                {[{ k: true, l: '🧪 UAT (Testing)' }, { k: false, l: '🚀 Production' }].map(e => (
                                    <TouchableOpacity key={String(e.k)} onPress={() => setConfigForm({ ...configForm, useUAT: e.k })}
                                        style={[styles.envBtn, configForm.useUAT === e.k && { backgroundColor: '#0891b2', borderColor: '#0891b2' }]}>
                                        <Text style={[styles.envText, configForm.useUAT === e.k && { color: '#fff' }]}>{e.l}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={[styles.infoBox, { backgroundColor: '#fef9c3', borderColor: '#fde047' }]}>
                                <Text style={[styles.infoText, { color: '#92400e' }]}>⚠️ Use UAT for testing. Switch to Production only with live credentials from KCB Enterprise.</Text>
                            </View>

                            <TouchableOpacity onPress={handleSaveConfig} disabled={savingConfig}
                                style={[styles.saveBtn, savingConfig && { opacity: 0.6 }]}>
                                <LinearGradient colors={['#0c4a6e', '#0891b2']} style={styles.saveBtnInner}>
                                    {savingConfig ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>✅ Save & Connect</Text>}
                                </LinearGradient>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowConfigModal(false)} style={{ padding: 14, alignItems: 'center' }}>
                                <Text style={{ color: '#94a3b8', fontWeight: '700' }}>Cancel</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ══ PAY STAFF MODAL ══ */}
            <Modal visible={showPayModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { maxHeight: '60%' }]}>
                        <LinearGradient colors={['#14532d', '#16a34a']} style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>💼 Process Payroll Payment</Text>
                            {selectedStaff && (
                                <Text style={styles.modalSub}>{selectedStaff.full_name} · {fmt(Number(selectedStaff.basic_salary || 0))}</Text>
                            )}
                        </LinearGradient>
                        <View style={{ padding: 20 }}>
                            <Text style={styles.modalLabel}>Payment Method</Text>
                            <View style={styles.methodGrid}>
                                {['Bank Transfer', 'M-Pesa', 'Cash', 'Cheque'].map(m => (
                                    <TouchableOpacity key={m} onPress={() => setPaymentMethod(m)}
                                        style={[styles.methodBtn, paymentMethod === m && { backgroundColor: '#16a34a', borderColor: '#16a34a' }]}>
                                        <Text style={[styles.methodText, paymentMethod === m && { color: '#fff' }]}>{m}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TouchableOpacity onPress={handlePayStaff} style={styles.saveBtn}>
                                <LinearGradient colors={['#14532d', '#16a34a']} style={styles.saveBtnInner}>
                                    <Text style={styles.saveBtnText}>✅ Confirm Payment</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowPayModal(false)} style={{ padding: 14, alignItems: 'center' }}>
                                <Text style={{ color: '#94a3b8', fontWeight: '700' }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const today = () => new Date().toLocaleDateString('en-KE');
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toLocaleDateString('en-KE'); };
const lastWeek = () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toLocaleDateString('en-KE'); };

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {},
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 2 },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
    configBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    totalCard: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 14, marginTop: 12, alignItems: 'center' },
    totalLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '700', textTransform: 'uppercase' },
    totalValue: { fontSize: 30, fontWeight: '900', color: '#fff', marginTop: 4 },
    totalSub: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
    tabRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 12 },
    tabBtn: { flex: 1, paddingVertical: 11, alignItems: 'center' },
    tabText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
    scroll: { flex: 1 },
    apiBanner: { margin: 12, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#e2e8f0' },
    apiBannerTitle: { fontSize: 12, fontWeight: '800' },
    apiBannerSub: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
    refreshBalBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#1e293b', marginHorizontal: 16, marginTop: 14, marginBottom: 8 },
    acctCard: { marginHorizontal: 12, marginBottom: 12, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
    acctLoading: { fontSize: 12, color: '#94a3b8', marginTop: 8 },
    acctError: { fontSize: 13, fontWeight: '700', color: '#dc2626', marginTop: 6 },
    acctErrorSub: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
    acctCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: 14 },
    acctType: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '700', textTransform: 'uppercase' },
    acctNumber: { fontSize: 14, color: '#fff', fontWeight: '800', letterSpacing: 1, marginTop: 2 },
    acctName: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    acctStatusBadge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
    acctStatusText: { fontSize: 9, fontWeight: '800', color: '#34d399' },
    acctBalances: { flexDirection: 'row', width: '100%', marginBottom: 12 },
    acctBal: { flex: 1 },
    acctBalLbl: { fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', marginBottom: 3 },
    acctBalVal: { fontSize: 20, fontWeight: '900', color: '#fff' },
    acctUpdated: { fontSize: 9, color: 'rgba(255,255,255,0.45)', alignSelf: 'flex-start' },
    txCard: { marginHorizontal: 12, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' },
    txRow: { flexDirection: 'row', padding: 12, alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
    txDot: { width: 8, height: 8, borderRadius: 4 },
    txDesc: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
    txDate: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
    txAmt: { fontSize: 13, fontWeight: '800' },
    payrollHeader: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    payrollKpi: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    payKpiCard: { flex: 1, borderRadius: 12, borderWidth: 1.5, padding: 10, alignItems: 'center', backgroundColor: '#fff' },
    payKpiVal: { fontSize: 12, fontWeight: '900', textAlign: 'center' },
    payKpiLbl: { fontSize: 8, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginTop: 2, textAlign: 'center' },
    payrollActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    monthInput: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#1e293b', backgroundColor: '#fafbff', width: 100 },
    bulkPayBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
    bulkPayBtnInner: { paddingVertical: 10, alignItems: 'center' },
    bulkPayText: { fontSize: 12, fontWeight: '800', color: '#fff' },
    payrollTableHeader: { flexDirection: 'row', backgroundColor: '#1e293b', paddingVertical: 10, paddingHorizontal: 14 },
    payrollHeaderCell: { flex: 1, fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', textAlign: 'center' },
    payrollRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
    payrollAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#0891b2', alignItems: 'center', justifyContent: 'center' },
    payrollName: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
    payrollRole: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
    payrollSalary: { fontSize: 12, fontWeight: '800', color: '#1e293b' },
    payBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    payBtn: { backgroundColor: '#0891b2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    payBtnText: { fontSize: 11, fontWeight: '800', color: '#fff' },
    payrollSummary: { margin: 12, borderRadius: 16, overflow: 'hidden' },
    payrollSummaryInner: { padding: 16 },
    payrollSummaryTitle: { fontSize: 13, fontWeight: '800', color: '#fff', marginBottom: 12 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
    summaryValue: { fontSize: 12, color: '#fff', fontWeight: '800' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', overflow: 'hidden' },
    modalHeader: { padding: 20 },
    modalTitle: { fontSize: 17, fontWeight: '900', color: '#fff' },
    modalSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 3 },
    modalLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 14 },
    textInput: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, backgroundColor: '#fafbff', color: '#1e293b' },
    infoBox: { backgroundColor: '#f0fdfe', borderWidth: 1, borderColor: '#a5f3fc', borderRadius: 10, padding: 12, marginBottom: 4 },
    infoText: { fontSize: 11, color: '#0c4a6e', fontWeight: '600', lineHeight: 16 },
    envBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', alignItems: 'center' },
    envText: { fontSize: 11, fontWeight: '700', color: '#374151' },
    methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    methodBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
    methodText: { fontSize: 12, fontWeight: '700', color: '#374151' },
    saveBtn: { marginTop: 16, borderRadius: 16, overflow: 'hidden' },
    saveBtnInner: { padding: 16, alignItems: 'center' },
    saveBtnText: { fontSize: 14, fontWeight: '900', color: '#fff' },
});
