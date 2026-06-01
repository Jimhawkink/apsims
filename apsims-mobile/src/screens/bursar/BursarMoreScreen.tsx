import React, { useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

// Bursar "More" hub — routes to Reports, Accounts, Payroll, Stores
// Uses a Stack-push pattern inside the More tab

const MODULES = [
    {
        id: 'reports',
        icon: '📊',
        title: 'Financial Reports',
        subtitle: 'P&L · Cash Flow · Fee Analysis · Trend Charts',
        gradient: ['#1e1b4b', '#4338ca'] as [string, string],
        badge: null,
    },
    {
        id: 'accounts',
        icon: '🏦',
        title: 'Bank Accounts & Payroll',
        subtitle: 'KCB API Buni · Live Balances · Staff Payroll',
        gradient: ['#0c4a6e', '#0891b2'] as [string, string],
        badge: 'LIVE',
    },
    {
        id: 'stores',
        icon: '📦',
        title: 'Stores Management',
        subtitle: 'Inventory · Issuances · Low Stock Alerts',
        gradient: ['#92400e', '#d97706'] as [string, string],
        badge: null,
    },
];

const QUICK_LINKS = [
    { icon: '💸', label: 'Fee Defaulters', desc: 'View students with balances', color: '#dc2626' },
    { icon: '📱', label: 'SMS Campaigns', desc: 'Bulk reminders to parents', color: '#7c3aed' },
    { icon: '🧾', label: 'Receipts', desc: 'Print & share fee receipts', color: '#0891b2' },
    { icon: '📋', label: 'Budgets', desc: 'Annual budget tracking', color: '#059669' },
    { icon: '🏛️', label: 'Capitation', desc: 'Govt grants tracking', color: '#d97706' },
    { icon: '📑', label: 'Bank Recon', desc: 'Reconcile bank statements', color: '#374151' },
];

export default function BursarMoreScreen({ navigation }: any) {
    const { width } = useWindowDimensions();

    const navigate = (id: string) => {
        switch (id) {
            case 'reports': navigation.navigate('BursarReports'); break;
            case 'accounts': navigation.navigate('BursarAccounts'); break;
            case 'stores': navigation.navigate('BursarStores'); break;
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
                <View style={{ paddingTop: 52, paddingHorizontal: 18, paddingBottom: 20 }}>
                    <Text style={styles.headerTitle}>⚡ More Features</Text>
                    <Text style={styles.headerSub}>Reports · Accounts · Payroll · Stores</Text>
                </View>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Main module cards */}
                <Text style={styles.sectionTitle}>FINANCE MODULES</Text>
                <View style={{ padding: 12, gap: 12 }}>
                    {MODULES.map(mod => (
                        <TouchableOpacity key={mod.id} onPress={() => navigate(mod.id)} activeOpacity={0.85}>
                            <LinearGradient colors={mod.gradient} style={styles.moduleCard}>
                                <View style={styles.moduleLeft}>
                                    <Text style={styles.moduleIcon}>{mod.icon}</Text>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={styles.moduleTitle}>{mod.title}</Text>
                                            {mod.badge && (
                                                <View style={styles.liveBadge}>
                                                    <Text style={styles.liveBadgeText}>{mod.badge}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.moduleSubtitle}>{mod.subtitle}</Text>
                                    </View>
                                </View>
                                <Text style={{ fontSize: 20, color: 'rgba(255,255,255,0.4)' }}>›</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Quick links grid */}
                <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
                <View style={styles.quickGrid}>
                    {QUICK_LINKS.map((ql, i) => (
                        <TouchableOpacity key={i} style={styles.quickCard} activeOpacity={0.7}>
                            <View style={[styles.quickIcon, { backgroundColor: ql.color + '18' }]}>
                                <Text style={{ fontSize: 22 }}>{ql.icon}</Text>
                            </View>
                            <Text style={styles.quickLabel}>{ql.label}</Text>
                            <Text style={styles.quickDesc} numberOfLines={2}>{ql.desc}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* System info */}
                <View style={styles.infoCard}>
                    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.infoInner}>
                        <Text style={styles.infoTitle}>🇰🇪 APSIMS Bursar Module</Text>
                        <Text style={styles.infoSub}>Kenya's #1 School Finance System</Text>
                        <View style={{ marginTop: 12, gap: 6 }}>
                            {[
                                'KCB API Buni — Live Bank Balance Integration',
                                'CBC & 844 Dual Curriculum Fee Management',
                                'Payroll Processing with M-Pesa Integration',
                                'Stores Inventory with Low Stock Alerts',
                                'P&L Reports & Cash Flow Analysis',
                            ].map((f, i) => (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={styles.checkDot} />
                                    <Text style={styles.featureText}>{f}</Text>
                                </View>
                            ))}
                        </View>
                    </LinearGradient>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {},
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 4 },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
    sectionTitle: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 16, marginTop: 20, marginBottom: 6 },
    moduleCard: { borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    moduleLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
    moduleIcon: { fontSize: 32 },
    moduleTitle: { fontSize: 15, fontWeight: '900', color: '#fff', marginBottom: 3 },
    moduleSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600', lineHeight: 16 },
    liveBadge: { backgroundColor: '#22c55e', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },
    liveBadgeText: { fontSize: 8, fontWeight: '900', color: '#fff', textTransform: 'uppercase' },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 0 },
    quickCard: { width: '33.33%', padding: 8 },
    quickIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    quickLabel: { fontSize: 11, fontWeight: '800', color: '#1e293b', marginBottom: 2 },
    quickDesc: { fontSize: 9, color: '#94a3b8', lineHeight: 13 },
    infoCard: { margin: 12, borderRadius: 20, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    infoInner: { padding: 20 },
    infoTitle: { fontSize: 16, fontWeight: '900', color: '#fff', marginBottom: 2 },
    infoSub: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
    checkDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
    featureText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', flex: 1 },
});
