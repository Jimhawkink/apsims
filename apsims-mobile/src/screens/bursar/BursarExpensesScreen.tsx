import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    TextInput, RefreshControl, ActivityIndicator, Dimensions,
    Modal, Alert, FlatList, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import ScreenHeader from '../../components/ScreenHeader';

const { width: W } = Dimensions.get('window');
const fmt = (n: number) => `KES ${(n || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;

const CATEGORIES = ['Salaries & Wages','Utilities (Water/Electricity)','Stationery & Supplies','Maintenance & Repairs','Transport & Travel','Furniture & Equipment','Food & Catering','Security','Cleaning & Sanitation','Communication','Professional Services','Insurance','Rent & Rates','Miscellaneous'];
const METHODS = ['Cash','M-Pesa','Bank Transfer','Cheque','RTGS','EFT'];
const STATUS_COLORS: Record<string,{bg:string;text:string;dot:string}> = {
    approved: { bg:'#f0fdf4', text:'#16a34a', dot:'#10b981' },
    pending:  { bg:'#fffbeb', text:'#d97706', dot:'#f59e0b' },
    rejected: { bg:'#fef2f2', text:'#dc2626', dot:'#ef4444' },
};

function ExpenseCard({ exp, onEdit, onDelete, onApprove }: { exp:any; onEdit:()=>void; onDelete:()=>void; onApprove:(status:string)=>void }) {
    const sc = STATUS_COLORS[exp.status] || STATUS_COLORS.approved;
    return (
        <View style={styles.expCard}>
            <View style={styles.expCardTop}>
                <View style={[styles.expDot, {backgroundColor: sc.dot}]} />
                <View style={{flex:1}}>
                    <Text style={styles.expCategory}>{exp.school_expense_categories?.category_name || `Category #${exp.category_id}`}</Text>
                    <Text style={styles.expDesc} numberOfLines={1}>{exp.description || 'No description'}</Text>
                    <Text style={styles.expMeta}>{exp.expense_date} · {exp.payment_method || 'Cash'} · {exp.reference_number || '—'}</Text>
                </View>
                <View style={{alignItems:'flex-end', gap:4}}>
                    <Text style={styles.expAmount}>{fmt(Number(exp.amount))}</Text>
                    <View style={[styles.statusBadge, {backgroundColor: sc.bg}]}>
                        <Text style={{fontSize:9, fontWeight:'800', color:sc.text}}>{exp.status?.toUpperCase()}</Text>
                    </View>
                </View>
            </View>
            <View style={styles.expCardActions}>
                <TouchableOpacity onPress={onEdit} style={styles.expActionBtn}>
                    <Text style={styles.expActionText}>✏️ Edit</Text>
                </TouchableOpacity>
                {exp.status === 'pending' && <>
                    <TouchableOpacity onPress={() => onApprove('approved')} style={[styles.expActionBtn, {backgroundColor:'#f0fdf4', borderColor:'#bbf7d0'}]}>
                        <Text style={[styles.expActionText, {color:'#16a34a'}]}>✅ Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onApprove('rejected')} style={[styles.expActionBtn, {backgroundColor:'#fef2f2', borderColor:'#fecaca'}]}>
                        <Text style={[styles.expActionText, {color:'#dc2626'}]}>❌ Reject</Text>
                    </TouchableOpacity>
                </>}
                <TouchableOpacity onPress={onDelete} style={[styles.expActionBtn, {backgroundColor:'#fef2f2', borderColor:'#fecaca'}]}>
                    <Text style={[styles.expActionText, {color:'#dc2626'}]}>🗑️</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default function BursarExpensesScreen() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [categories, setCategories] = useState<{id:number;category_name:string}[]>([]);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number|null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        expense_date: new Date().toISOString().split('T')[0],
        category_id: 0, description: '', amount: '',
        payment_method: 'Cash', reference_number: '',
        approved_by: '', notes: '', status: 'pending',
        year: new Date().getFullYear(),
    });
    const currentYear = new Date().getFullYear();

    const fetchData = useCallback(async () => {
        try {
            const [{ data: expData }, { data: catData }] = await Promise.all([
                supabase.from('school_expenses').select('*').eq('year', currentYear).order('expense_date', { ascending: false }),
                supabase.from('school_expense_categories').select('id,category_name').order('category_name'),
            ]);
            setExpenses(expData || []);
            // Use DB categories if available, otherwise seed fallback names with id=0
            if (catData && catData.length > 0) {
                setCategories(catData as {id:number;category_name:string}[]);
            } else {
                setCategories(CATEGORIES.map((name, i) => ({ id: i + 1, category_name: name })));
            }
        } catch(e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, [currentYear]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filtered = useMemo(() => {
        let d = expenses;
        if (filterStatus !== 'all') d = d.filter(e => e.status === filterStatus);
        if (filterCat !== 'all') d = d.filter(e => String(e.category_id) === filterCat);
        if (search) { const q = search.toLowerCase(); d = d.filter(e => (e.description || '').toLowerCase().includes(q) || (e.reference_number || '').toLowerCase().includes(q)); }
        return d;
    }, [expenses, filterStatus, filterCat, search]);

    const kpi = useMemo(() => ({
        total: expenses.filter(e => e.status !== 'rejected').reduce((s,e) => s + Number(e.amount||0), 0),
        pending: expenses.filter(e => e.status === 'pending').reduce((s,e) => s + Number(e.amount||0), 0),
        approved: expenses.filter(e => e.status === 'approved').reduce((s,e) => s + Number(e.amount||0), 0),
        count: expenses.length,
        pendingCount: expenses.filter(e => e.status === 'pending').length,
    }), [expenses]);

    const openAdd = () => {
        setEditId(null);
        setForm({ expense_date: new Date().toISOString().split('T')[0], category_id: 0, description:'', amount:'', payment_method:'Cash', reference_number:'', approved_by:'', notes:'', status:'pending', year: currentYear });
        setShowModal(true);
    };
    const openEdit = (exp: any) => {
        setEditId(exp.id);
        setForm({ expense_date: exp.expense_date||'', category_id: exp.category_id||0, description: exp.description||'', amount: String(exp.amount||''), payment_method: exp.payment_method||'Cash', reference_number: exp.reference_number||'', approved_by: exp.approved_by||'', notes: exp.notes||'', status: exp.status||'pending', year: exp.year||currentYear });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.category_id) { Alert.alert('Error','Select a category'); return; }
        if (!form.amount || Number(form.amount) <= 0) { Alert.alert('Error','Enter a valid amount'); return; }
        setSaving(true);
        try {
            const payload = {
                expense_date: form.expense_date,
                category_id: form.category_id,
                description: form.description || null,
                amount: Number(form.amount),
                payment_method: form.payment_method,
                reference_number: form.reference_number || null,
                approved_by: form.approved_by || null,
                notes: form.notes || null,
                status: form.status,
                year: currentYear,
            };
            let error;
            if (editId) { ({ error } = await supabase.from('school_expenses').update(payload).eq('id', editId)); }
            else { ({ error } = await supabase.from('school_expenses').insert([payload])); }
            if (error) { Alert.alert('Error', error.message); return; }
            Alert.alert('✅ Success', editId ? 'Expense updated' : 'Expense recorded');
            setShowModal(false); fetchData();
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: number) => {
        Alert.alert('Delete Expense','Are you sure?',[
            { text:'Cancel', style:'cancel' },
            { text:'Delete', style:'destructive', onPress: async () => {
                await supabase.from('school_expenses').delete().eq('id', id);
                fetchData();
            }},
        ]);
    };

    const handleApprove = async (id: number, status: string) => {
        await supabase.from('school_expenses').update({ status, approved_by: 'Bursar' }).eq('id', id);
        fetchData();
    };

    if (loading) return (
        <LinearGradient colors={['#7c2d12','#dc2626']} style={{flex:1,alignItems:'center',justifyContent:'center'}}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{color:'#fff',marginTop:12,fontWeight:'700'}}>Loading Expenses…</Text>
        </LinearGradient>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#7c2d12" translucent={false} />
            <ScreenHeader
                title="📝 Expenses"
                onBack={() => navigation.goBack()}
                gradient={['#EF4444','#DC2626']}
            />

            {/* Search */}
            <View style={styles.searchRow}>
                <TextInput value={search} onChangeText={setSearch} placeholder="🔍 Search expenses…"
                    style={styles.searchInput} placeholderTextColor="#94a3b8" />
            </View>

            {/* Status filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                {[{k:'all',l:'All'},{k:'pending',l:'⏳ Pending'},{k:'approved',l:'✅ Approved'},{k:'rejected',l:'❌ Rejected'}].map(f => (
                    <TouchableOpacity key={f.k} onPress={() => setFilterStatus(f.k)}
                        style={[styles.filterChip, filterStatus===f.k && {backgroundColor:'#dc2626', borderColor:'#dc2626'}]}>
                        <Text style={[styles.filterChipText, filterStatus===f.k && {color:'#fff'}]}>{f.l}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <Text style={{fontSize:11,color:'#94a3b8',fontWeight:'600',paddingHorizontal:16,marginTop:6,marginBottom:4}}>
                {filtered.length} expenses · {fmt(filtered.reduce((s,e)=>s+Number(e.amount||0),0))}
            </Text>

            <FlatList
                data={filtered}
                keyExtractor={e => String(e.id)}
                renderItem={({item}) => (
                    <ExpenseCard exp={item}
                        onEdit={() => openEdit(item)}
                        onDelete={() => handleDelete(item.id)}
                        onApprove={(status) => handleApprove(item.id, status)} />
                )}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);fetchData();}} tintColor="#dc2626" />}
                ListEmptyComponent={<Text style={{textAlign:'center',color:'#94a3b8',padding:40}}>No expenses found</Text>}
                contentContainerStyle={{padding:12, gap:8}}
            />

            {/* Add/Edit Modal */}
            <Modal visible={showModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <LinearGradient colors={['#7c2d12','#dc2626']} style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editId ? '✏️ Edit Expense' : '➕ Add Expense'}</Text>
                        </LinearGradient>
                        <ScrollView style={{padding:20}}>
                            <Text style={styles.modalLabel}>Category *</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}}>
                                {categories.map(c => (
                                    <TouchableOpacity key={c.id} onPress={() => setForm({...form, category_id:c.id})}
                                        style={[styles.catChip, form.category_id===c.id && {backgroundColor:'#dc2626', borderColor:'#dc2626'}]}>
                                        <Text style={[styles.catChipText, form.category_id===c.id && {color:'#fff'}]}>{c.category_name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <Text style={styles.modalLabel}>Amount (KES) *</Text>
                            <TextInput value={form.amount} onChangeText={v=>setForm({...form,amount:v})} keyboardType="numeric" placeholder="0"
                                style={styles.amtInput} placeholderTextColor="#94a3b8" />
                            <Text style={styles.modalLabel}>Description</Text>
                            <TextInput value={form.description} onChangeText={v=>setForm({...form,description:v})} placeholder="Describe the expense"
                                style={styles.textInput} placeholderTextColor="#94a3b8" multiline numberOfLines={2} />
                            <Text style={styles.modalLabel}>Date</Text>
                            <TextInput value={form.expense_date} onChangeText={v=>setForm({...form,expense_date:v})}
                                style={styles.textInput} placeholderTextColor="#94a3b8" />
                            <Text style={styles.modalLabel}>Payment Method</Text>
                            <View style={styles.methodGrid}>
                                {METHODS.map(m => (
                                    <TouchableOpacity key={m} onPress={() => setForm({...form,payment_method:m})}
                                        style={[styles.methodBtn, form.payment_method===m && {backgroundColor:'#dc2626',borderColor:'#dc2626'}]}>
                                        <Text style={[styles.methodText, form.payment_method===m && {color:'#fff'}]}>{m}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.modalLabel}>Reference No</Text>
                            <TextInput value={form.reference_number} onChangeText={v=>setForm({...form,reference_number:v})} placeholder="Ref/Slip number"
                                style={styles.textInput} placeholderTextColor="#94a3b8" />
                            <Text style={styles.modalLabel}>Approved By</Text>
                            <TextInput value={form.approved_by} onChangeText={v=>setForm({...form,approved_by:v})} placeholder="Approver name"
                                style={styles.textInput} placeholderTextColor="#94a3b8" />
                            <Text style={styles.modalLabel}>Status</Text>
                            <View style={{flexDirection:'row', gap:8, marginBottom:4}}>
                                {['pending','approved','rejected'].map(s => (
                                    <TouchableOpacity key={s} onPress={()=>setForm({...form,status:s})}
                                        style={[styles.methodBtn, form.status===s && {backgroundColor: s==='approved'?'#16a34a':s==='rejected'?'#dc2626':'#d97706', borderColor:'transparent'}]}>
                                        <Text style={[styles.methodText, form.status===s && {color:'#fff'}]}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TouchableOpacity onPress={handleSave} disabled={saving}
                                style={[styles.saveBtn, saving && {opacity:0.6}]}>
                                <LinearGradient colors={['#7c2d12','#dc2626']} style={styles.saveBtnInner}>
                                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editId ? '✅ Update Expense' : '✅ Save Expense'}</Text>}
                                </LinearGradient>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={()=>setShowModal(false)} style={{padding:14,alignItems:'center',marginTop:6}}>
                                <Text style={{color:'#94a3b8',fontWeight:'700'}}>Cancel</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container:{flex:1,backgroundColor: '#F8FAFF'},
    header:{paddingBottom:0},
    headerTitle:{fontSize:22,fontWeight:'900',color:'#fff',marginBottom:2},
    headerSub:{fontSize:11,color:'rgba(255,255,255,0.65)',fontWeight:'600',marginBottom:10},
    kpiStrip:{flexDirection:'row',backgroundColor:'rgba(255,255,255,0.12)',borderRadius: 16,overflow:'hidden'},
    kpiItem:{flex:1,paddingVertical:10,alignItems:'center'},
    kpiVal:{fontSize:13,fontWeight:'900'},
    kpiLbl:{fontSize:9,color:'rgba(255,255,255,0.6)',fontWeight:'600',marginTop:1},
    addBtn:{backgroundColor:'rgba(255,255,255,0.15)',margin:16,marginTop:8,borderRadius: 16,padding:13,alignItems:'center',borderWidth:1,borderColor:'rgba(255,255,255,0.2)'},
    addBtnText:{color:'#fff',fontWeight:'800',fontSize:14},
    searchRow:{padding:12,backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:'#f1f5f9'},
    searchInput:{backgroundColor: '#F8FAFF',borderRadius: 16,paddingHorizontal:14,paddingVertical:10,fontSize:13,borderWidth:1,borderColor:'#e2e8f0',color:'#1e293b'},
    filterRow:{maxHeight:50,paddingLeft:12,paddingVertical:8,backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:'#f1f5f9'},
    filterChip:{marginRight:8,paddingHorizontal:14,paddingVertical:6,borderRadius:99,backgroundColor: '#F8FAFF',borderWidth:1,borderColor:'#e2e8f0'},
    filterChipText:{fontSize:11,fontWeight:'700',color:'#374151'},
    expCard:{backgroundColor:'#fff',borderRadius: 18,borderWidth:1,borderColor:'#f1f5f9',overflow:'hidden',elevation:2,shadowColor:'#000',shadowOpacity: 0.08,shadowRadius:6,shadowOffset:{width:0,height:2}},
    expCardTop:{flexDirection:'row',padding:14,gap:10,alignItems:'flex-start'},
    expDot:{width:8,height:8,borderRadius:4,marginTop:4},
    expCategory:{fontSize:13,fontWeight:'800',color:'#1e293b'},
    expDesc:{fontSize:11,color:'#64748b',marginTop:1},
    expMeta:{fontSize:9,color:'#94a3b8',marginTop:2},
    expAmount:{fontSize:15,fontWeight:'900',color:'#dc2626'},
    statusBadge:{paddingHorizontal:7,paddingVertical:2,borderRadius:6},
    expCardActions:{flexDirection:'row',borderTopWidth:1,borderTopColor:'#f8fafc',paddingHorizontal:10,paddingVertical:8,gap:8},
    expActionBtn:{paddingHorizontal:10,paddingVertical:6,borderRadius:8,backgroundColor: '#F8FAFF',borderWidth:1,borderColor:'#e2e8f0'},
    expActionText:{fontSize:11,fontWeight:'700',color:'#374151'},
    modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.55)',justifyContent:'flex-end'},
    modalSheet:{backgroundColor:'#fff',borderTopLeftRadius:24,borderTopRightRadius:24,maxHeight:'90%',overflow:'hidden'},
    modalHeader:{padding:20},
    modalTitle:{fontSize:17,fontWeight:'900',color:'#fff'},
    modalLabel:{fontSize:10,fontWeight:'700',color:'#64748b',textTransform:'uppercase',letterSpacing:0.5,marginBottom:6,marginTop:14},
    catChip:{marginRight:8,paddingHorizontal:12,paddingVertical:6,borderRadius:99,borderWidth:1.5,borderColor:'#e2e8f0',backgroundColor: '#F8FAFF'},
    catChipText:{fontSize:11,fontWeight:'700',color:'#374151'},
    amtInput:{fontSize:28,fontWeight:'900',color:'#dc2626',textAlign:'center',borderWidth:2,borderColor:'#e2e8f0',borderRadius: 18,padding:12,backgroundColor:'#fff5f5'},
    textInput:{borderWidth:1.5,borderColor:'#e2e8f0',borderRadius: 16,paddingHorizontal:14,paddingVertical:10,fontSize:13,backgroundColor:'#fafbff',color:'#1e293b'},
    methodGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:4},
    methodBtn:{paddingHorizontal:12,paddingVertical:7,borderRadius:10,borderWidth:1.5,borderColor:'#e2e8f0',backgroundColor: '#F8FAFF'},
    methodText:{fontSize:11,fontWeight:'700',color:'#374151'},
    saveBtn:{marginTop:20,borderRadius:16,overflow:'hidden'},
    saveBtnInner:{padding:16,alignItems:'center'},
    saveBtnText:{fontSize:14,fontWeight:'900',color:'#fff'},
});
