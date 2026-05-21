'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiTruck, FiRefreshCw, FiPlus, FiSearch, FiEdit2, FiTrash2, FiX, FiSave,
    FiDownload, FiCheck, FiStar, FiPhone, FiMail, FiFileText, FiDollarSign,
    FiShoppingCart, FiAlertTriangle, FiCheckCircle, FiSend, FiPrinter, FiFilter
} from 'react-icons/fi';

const fmt = (n: number) => `KES ${(n || 0).toLocaleString()}`;
const CATEGORIES = ['General', 'Stationery', 'Food & Kitchen', 'Cleaning', 'Laboratory', 'Uniforms', 'Construction', 'IT & Electronics', 'Fuel & Energy', 'Medical', 'Furniture', 'Transport', 'Textbooks'];
type Tab = 'suppliers' | 'orders' | 'invoices' | 'payments';

export default function ProcurementPage() {
    const [tab, setTab] = useState<Tab>('suppliers');
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [poItems, setPoItems] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);

    // Modals
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [showPOModal, setShowPOModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);

    // Forms
    const emptySupplier = { supplier_name: '', contact_person: '', phone: '', email: '', kra_pin: '', bank_name: '', bank_account: '', bank_branch: '', address: '', category: 'General', notes: '' };
    const emptyPO = { supplier_id: '', order_date: new Date().toISOString().split('T')[0], delivery_date: '', payment_terms: 'Net 30', notes: '', items: [{ item_description: '', quantity: 1, unit: 'Pieces', unit_price: 0 }] };
    const emptyInvoice = { invoice_number: '', supplier_id: '', po_id: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '', subtotal: '', vat_amount: '0', total_amount: '', category: 'General', description: '', notes: '' };
    const emptyPayment = { supplier_id: '', invoice_id: '', payment_date: new Date().toISOString().split('T')[0], amount: '', payment_method: 'Bank Transfer', reference_number: '', notes: '' };

    const [supForm, setSupForm] = useState(emptySupplier);
    const [poForm, setPoForm] = useState<any>(emptyPO);
    const [invForm, setInvForm] = useState(emptyInvoice);
    const [payForm, setPayForm] = useState(emptyPayment);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [sRes, oRes, piRes, iRes, pRes] = await Promise.all([
            supabase.from('school_suppliers').select('*').order('supplier_name'),
            supabase.from('school_purchase_orders').select('*').order('created_at', { ascending: false }),
            supabase.from('school_po_items').select('*'),
            supabase.from('school_supplier_invoices').select('*').order('created_at', { ascending: false }),
            supabase.from('school_supplier_payments').select('*').order('created_at', { ascending: false }),
        ]);
        setSuppliers(sRes.data || []);
        setOrders(oRes.data || []);
        setPoItems(piRes.data || []);
        setInvoices(iRes.data || []);
        setPayments(pRes.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const getSupplier = (id: number) => suppliers.find(s => s.id === id);

    // ─── Stats ───
    const activeSuppliers = suppliers.filter(s => s.status === 'Active').length;
    const pendingOrders = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length;
    const totalOrderValue = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + Number(o.grand_total || o.total_amount || 0), 0);
    const unpaidInvoices = invoices.filter(i => i.status !== 'Paid' && i.status !== 'Voided');
    const totalOwed = unpaidInvoices.reduce((s, i) => s + Number(i.balance || i.total_amount || 0), 0);
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const overdueInvoices = invoices.filter(i => i.status !== 'Paid' && i.due_date && new Date(i.due_date) < new Date());

    // ─── SUPPLIER CRUD ───
    const saveSupplier = async () => {
        if (!supForm.supplier_name.trim()) { toast.error('Supplier name required'); return; }
        setSaving(true);
        if (editing) {
            const { error } = await supabase.from('school_suppliers').update(supForm).eq('id', editing.id);
            if (error) { toast.error(error.message); setSaving(false); return; }
            toast.success('Supplier updated ✅');
        } else {
            const { error } = await supabase.from('school_suppliers').insert([supForm]);
            if (error) { toast.error(error.message); setSaving(false); return; }
            toast.success('Supplier added ✅');
        }
        setShowSupplierModal(false); setEditing(null); setSaving(false); fetchAll();
    };

    // ─── PURCHASE ORDER ───
    const savePO = async () => {
        if (!poForm.supplier_id || poForm.items.length === 0) { toast.error('Select supplier and add items'); return; }
        setSaving(true);
        const totalAmount = poForm.items.reduce((s: number, i: any) => s + Number(i.quantity || 0) * Number(i.unit_price || 0), 0);
        const vatAmount = Math.round(totalAmount * 0.16);
        const poNumber = `LPO-${new Date().getFullYear()}-${String(orders.length + 1).padStart(5, '0')}`;

        const { data: po, error } = await supabase.from('school_purchase_orders').insert([{
            po_number: poNumber, supplier_id: Number(poForm.supplier_id), order_date: poForm.order_date,
            delivery_date: poForm.delivery_date || null, total_amount: totalAmount, vat_amount: vatAmount,
            grand_total: totalAmount + vatAmount, payment_terms: poForm.payment_terms, notes: poForm.notes,
            status: 'Draft', created_by: 'Admin',
        }]).select().single();

        if (error || !po) { toast.error('Failed to create PO'); setSaving(false); return; }

        const itemRows = poForm.items.filter((i: any) => i.item_description).map((i: any) => ({
            po_id: po.id, item_description: i.item_description, quantity: Number(i.quantity || 1),
            unit: i.unit || 'Pieces', unit_price: Number(i.unit_price || 0),
        }));
        if (itemRows.length > 0) await supabase.from('school_po_items').insert(itemRows);

        toast.success(`Purchase Order ${poNumber} created ✅`);
        setShowPOModal(false); setPoForm(emptyPO); setSaving(false); fetchAll();
    };

    // ─── SUPPLIER INVOICE ───
    const saveInvoice = async () => {
        if (!invForm.invoice_number || !invForm.supplier_id) { toast.error('Invoice number and supplier required'); return; }
        setSaving(true);
        const total = Number(invForm.total_amount || 0);
        const { error } = await supabase.from('school_supplier_invoices').insert([{
            invoice_number: invForm.invoice_number, supplier_id: Number(invForm.supplier_id),
            po_id: invForm.po_id ? Number(invForm.po_id) : null, invoice_date: invForm.invoice_date,
            due_date: invForm.due_date || null, subtotal: Number(invForm.subtotal || total),
            vat_amount: Number(invForm.vat_amount || 0), total_amount: total,
            balance: total, status: 'Pending', category: invForm.category,
            description: invForm.description, notes: invForm.notes, created_by: 'Admin',
        }]);
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success('Invoice recorded ✅');
        setShowInvoiceModal(false); setInvForm(emptyInvoice); setSaving(false); fetchAll();
    };

    // ─── SUPPLIER PAYMENT ───
    const savePayment = async () => {
        if (!payForm.supplier_id || !payForm.amount) { toast.error('Supplier and amount required'); return; }
        setSaving(true);
        const { error } = await supabase.from('school_supplier_payments').insert([{
            supplier_id: Number(payForm.supplier_id), invoice_id: payForm.invoice_id ? Number(payForm.invoice_id) : null,
            payment_date: payForm.payment_date, amount: Number(payForm.amount),
            payment_method: payForm.payment_method, reference_number: payForm.reference_number,
            notes: payForm.notes, created_by: 'Admin',
        }]);
        if (error) { toast.error(error.message); setSaving(false); return; }

        // Update invoice balance if linked
        if (payForm.invoice_id) {
            const inv = invoices.find(i => i.id === Number(payForm.invoice_id));
            if (inv) {
                const newPaid = Number(inv.amount_paid || 0) + Number(payForm.amount);
                const newBalance = Math.max(0, Number(inv.total_amount) - newPaid);
                await supabase.from('school_supplier_invoices').update({
                    amount_paid: newPaid, balance: newBalance,
                    status: newBalance <= 0 ? 'Paid' : 'Partial',
                }).eq('id', inv.id);
            }
        }
        toast.success('Payment recorded ✅');
        setShowPaymentModal(false); setPayForm(emptyPayment); setSaving(false); fetchAll();
    };

    // PO line item helpers
    const addPOItem = () => setPoForm({ ...poForm, items: [...poForm.items, { item_description: '', quantity: 1, unit: 'Pieces', unit_price: 0 }] });
    const removePOItem = (idx: number) => setPoForm({ ...poForm, items: poForm.items.filter((_: any, i: number) => i !== idx) });
    const updatePOItem = (idx: number, field: string, value: any) => {
        const items = [...poForm.items]; items[idx] = { ...items[idx], [field]: value }; setPoForm({ ...poForm, items });
    };
    const poTotal = poForm.items.reduce((s: number, i: any) => s + Number(i.quantity || 0) * Number(i.unit_price || 0), 0);

    // Approve PO
    const approvePO = async (po: any) => {
        await supabase.from('school_purchase_orders').update({ status: 'Approved', approved_by: 'Admin', approved_at: new Date().toISOString() }).eq('id', po.id);
        toast.success(`${po.po_number} approved ✅`); fetchAll();
    };

    const tabConfig = [
        { k: 'suppliers', l: '🏢 Suppliers', icon: FiTruck, count: suppliers.length },
        { k: 'orders', l: '📋 Purchase Orders', icon: FiShoppingCart, count: orders.length },
        { k: 'invoices', l: '🧾 Supplier Invoices', icon: FiFileText, count: invoices.length },
        { k: 'payments', l: '💳 Payments', icon: FiDollarSign, count: payments.length },
    ];

    const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-blue-200 outline-none";

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>🏢</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-blue-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading Procurement…</p>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* ═══ ULTRA HEADER ═══ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, #0c4a6e 0%, #075985 40%, #0369a1 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="relative px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                            <FiTruck className="text-white" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                                🏢 Procurement & Suppliers
                                <span className="px-2.5 py-0.5 text-[10px] font-black bg-gradient-to-r from-blue-400 to-cyan-500 text-white rounded-full">ULTRA</span>
                            </h1>
                            <p className="text-blue-300 text-xs mt-0.5 font-medium">Supplier Directory • LPOs • Invoices • Payments • Full Audit</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => { setSupForm(emptySupplier); setEditing(null); setShowSupplierModal(true); }} className="px-3 py-2 rounded-lg text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 flex items-center gap-1.5 shadow-md"><FiPlus size={12} /> Supplier</button>
                        <button onClick={() => { setPoForm(emptyPO); setShowPOModal(true); }} className="px-3 py-2 rounded-lg text-xs font-bold text-white bg-cyan-500 hover:bg-cyan-600 flex items-center gap-1.5 shadow-md"><FiShoppingCart size={12} /> New LPO</button>
                        <button onClick={() => { setInvForm(emptyInvoice); setShowInvoiceModal(true); }} className="px-3 py-2 rounded-lg text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 flex items-center gap-1.5 shadow-md"><FiFileText size={12} /> Record Invoice</button>
                        <button onClick={() => { setPayForm(emptyPayment); setShowPaymentModal(true); }} className="px-3 py-2 rounded-lg text-xs font-bold text-white bg-green-500 hover:bg-green-600 flex items-center gap-1.5 shadow-md"><FiDollarSign size={12} /> Pay Supplier</button>
                    </div>
                </div>

                {/* KPI Strip */}
                <div className="px-6 pb-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        {[
                            { label: 'Active Suppliers', value: String(activeSuppliers), emoji: '🏢', color: '#3b82f6' },
                            { label: 'Open LPOs', value: String(pendingOrders), emoji: '📋', color: '#06b6d4' },
                            { label: 'Order Value', value: fmt(totalOrderValue), emoji: '🛒', color: '#8b5cf6' },
                            { label: 'Unpaid Invoices', value: String(unpaidInvoices.length), emoji: '🧾', color: '#f59e0b', pulse: unpaidInvoices.length > 0 },
                            { label: 'Total Owed', value: fmt(totalOwed), emoji: '⚠️', color: '#ef4444', pulse: totalOwed > 0 },
                            { label: 'Total Paid', value: fmt(totalPaid), emoji: '✅', color: '#22c55e' },
                        ].map((card, i) => (
                            <div key={i} className={`relative rounded-xl p-3 overflow-hidden transition-all hover:scale-[1.03] ${card.pulse ? 'animate-pulse' : ''}`}
                                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div className="flex items-center gap-2 mb-1.5"><span className="text-sm">{card.emoji}</span><span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{card.label}</span></div>
                                <p className="text-xl font-black text-white">{card.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {tabConfig.map(t => {
                    const isActive = tab === t.k;
                    const Icon = t.icon;
                    return (
                        <button key={t.k} onClick={() => setTab(t.k as Tab)}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
                            style={isActive ? { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', boxShadow: '0 8px 25px -5px rgba(59,130,246,0.4)' } : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                            <Icon size={15} /> <span>{t.l}</span> <span className="text-[10px] font-bold opacity-60">({t.count})</span>
                        </button>
                    );
                })}
            </div>

            {/* Search */}
            <div className="relative max-w-md"><FiSearch size={14} className="absolute left-3 top-3 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers, invoices, POs..." className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-200 outline-none bg-white" /></div>

            {/* ═══ SUPPLIERS TAB ═══ */}
            {tab === 'suppliers' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                {['#', 'Supplier', 'Contact', 'Phone', 'Email', 'KRA PIN', 'Category', 'Rating', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {suppliers.filter(s => !search || s.supplier_name.toLowerCase().includes(search.toLowerCase()) || (s.contact_person || '').toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                                    <tr><td colSpan={10} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-3">🏢</span><p className="text-sm font-medium">No suppliers yet</p><p className="text-xs mt-1">Add your first supplier to start procurement</p></td></tr>
                                ) : suppliers.filter(s => !search || s.supplier_name.toLowerCase().includes(search.toLowerCase())).map((s, i) => (
                                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                        <td className="px-3 py-2.5 text-sm font-bold text-gray-800">{s.supplier_name}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-600">{s.contact_person || '-'}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-600">{s.phone || '-'}</td>
                                        <td className="px-3 py-2.5 text-xs text-blue-600">{s.email || '-'}</td>
                                        <td className="px-3 py-2.5 text-xs font-mono text-gray-500">{s.kra_pin || '-'}</td>
                                        <td className="px-3 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{s.category}</span></td>
                                        <td className="px-3 py-2.5"><div className="flex gap-0.5">{[1,2,3,4,5].map(n => <FiStar key={n} size={11} className={n <= (s.rating || 3) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />)}</div></td>
                                        <td className="px-3 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === 'Active' ? 'bg-green-100 text-green-700' : s.status === 'Blacklisted' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{s.status}</span></td>
                                        <td className="px-3 py-2.5 flex items-center gap-1">
                                            <button onClick={() => { setEditing(s); setSupForm({ ...emptySupplier, ...s }); setShowSupplierModal(true); }} className="p-1.5 rounded-lg hover:bg-blue-50"><FiEdit2 size={12} className="text-blue-500" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══ PURCHASE ORDERS TAB ═══ */}
            {tab === 'orders' && (
                <div className="space-y-3">
                    {orders.filter(o => !search || o.po_number.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
                            <span className="text-5xl block mb-3">📋</span>
                            <p className="text-sm font-bold text-gray-600">No Purchase Orders yet</p>
                            <button onClick={() => { setPoForm(emptyPO); setShowPOModal(true); }} className="mt-4 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}><FiPlus size={12} className="inline mr-1" /> Create First LPO</button>
                        </div>
                    ) : orders.filter(o => !search || o.po_number.toLowerCase().includes(search.toLowerCase())).map(po => {
                        const supplier = getSupplier(po.supplier_id);
                        const items = poItems.filter(i => i.po_id === po.id);
                        const statusColors: Record<string, string> = { Draft: 'bg-gray-100 text-gray-600', Approved: 'bg-blue-100 text-blue-700', Sent: 'bg-indigo-100 text-indigo-700', Partial: 'bg-amber-100 text-amber-700', Delivered: 'bg-green-100 text-green-700', Cancelled: 'bg-red-100 text-red-700' };
                        return (
                            <div key={po.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>LPO</div>
                                        <div>
                                            <p className="text-sm font-extrabold text-gray-800">{po.po_number}</p>
                                            <p className="text-[10px] text-gray-400">{supplier?.supplier_name || 'Unknown'} • {new Date(po.order_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusColors[po.status] || 'bg-gray-100 text-gray-600'}`}>{po.status}</span>
                                        <p className="text-lg font-black text-blue-600">{fmt(po.grand_total || po.total_amount)}</p>
                                        {po.status === 'Draft' && <button onClick={() => approvePO(po)} className="px-3 py-1.5 text-[10px] font-bold text-white bg-green-500 hover:bg-green-600 rounded-lg flex items-center gap-1"><FiCheck size={10} /> Approve</button>}
                                    </div>
                                </div>
                                {items.length > 0 && (
                                    <div className="px-5 py-2">
                                        <table className="w-full"><tbody>
                                            {items.map((it, idx) => (
                                                <tr key={it.id} className="text-xs border-b border-gray-50 last:border-0">
                                                    <td className="py-1.5 text-gray-400 w-8">{idx + 1}.</td>
                                                    <td className="py-1.5 text-gray-700 font-medium">{it.item_description}</td>
                                                    <td className="py-1.5 text-gray-500 text-right w-20">{it.quantity} {it.unit}</td>
                                                    <td className="py-1.5 text-gray-500 text-right w-28">@ {fmt(it.unit_price)}</td>
                                                    <td className="py-1.5 text-gray-800 font-bold text-right w-28">{fmt(it.total_price || it.quantity * it.unit_price)}</td>
                                                </tr>
                                            ))}
                                        </tbody></table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ═══ INVOICES TAB ═══ */}
            {tab === 'invoices' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {overdueInvoices.length > 0 && (
                        <div className="px-5 py-2.5 bg-red-50 border-b border-red-200 flex items-center gap-2"><FiAlertTriangle className="text-red-500" size={14} /><p className="text-xs font-bold text-red-700">⚠️ {overdueInvoices.length} overdue invoice(s) — {fmt(overdueInvoices.reduce((s, i) => s + Number(i.balance || i.total_amount || 0), 0))} outstanding</p></div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                {['Invoice #', 'Supplier', 'Date', 'Due Date', 'Total', 'Paid', 'Balance', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {invoices.filter(i => !search || i.invoice_number.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                                    <tr><td colSpan={9} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-3">🧾</span><p className="text-sm">No invoices yet</p></td></tr>
                                ) : invoices.filter(i => !search || i.invoice_number.toLowerCase().includes(search.toLowerCase())).map(inv => {
                                    const supplier = getSupplier(inv.supplier_id);
                                    const isOverdue = inv.status !== 'Paid' && inv.due_date && new Date(inv.due_date) < new Date();
                                    const statusColors: Record<string, string> = { Pending: 'bg-amber-100 text-amber-700', Partial: 'bg-blue-100 text-blue-700', Paid: 'bg-green-100 text-green-700', Overdue: 'bg-red-100 text-red-700', Voided: 'bg-gray-100 text-gray-500' };
                                    return (
                                        <tr key={inv.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isOverdue ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-3 py-2.5 text-sm font-bold text-indigo-600">{inv.invoice_number}</td>
                                            <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{supplier?.supplier_name || '-'}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-500">{new Date(inv.invoice_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td className="px-3 py-2.5 text-xs" style={{ color: isOverdue ? '#ef4444' : '#6b7280' }}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) : '-'}</td>
                                            <td className="px-3 py-2.5 text-sm font-bold text-gray-800">{fmt(inv.total_amount)}</td>
                                            <td className="px-3 py-2.5 text-sm text-green-600 font-bold">{fmt(inv.amount_paid)}</td>
                                            <td className="px-3 py-2.5 text-sm font-bold" style={{ color: Number(inv.balance) > 0 ? '#ef4444' : '#22c55e' }}>{fmt(inv.balance)}</td>
                                            <td className="px-3 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[isOverdue ? 'Overdue' : inv.status] || 'bg-gray-100 text-gray-500'}`}>{isOverdue ? 'Overdue' : inv.status}</span></td>
                                            <td className="px-3 py-2.5">
                                                {inv.status !== 'Paid' && inv.status !== 'Voided' && (
                                                    <button onClick={() => { setPayForm({ ...emptyPayment, supplier_id: String(inv.supplier_id), invoice_id: String(inv.id), amount: String(inv.balance || inv.total_amount) }); setShowPaymentModal(true); }}
                                                        className="px-2.5 py-1 text-[10px] font-bold text-white rounded-lg shadow-sm" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                                                        <FiDollarSign size={10} className="inline mr-0.5" /> Pay
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══ PAYMENTS TAB ═══ */}
            {tab === 'payments' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                {['#', 'Date', 'Supplier', 'Invoice', 'Amount', 'Method', 'Reference', 'Notes'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {payments.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-3">💳</span><p className="text-sm">No supplier payments yet</p></td></tr>
                                ) : payments.map((p, i) => {
                                    const supplier = getSupplier(p.supplier_id);
                                    const inv = p.invoice_id ? invoices.find(iv => iv.id === p.invoice_id) : null;
                                    return (
                                        <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-600">{new Date(p.payment_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{supplier?.supplier_name || '-'}</td>
                                            <td className="px-3 py-2.5 text-xs font-mono text-indigo-600">{inv?.invoice_number || '-'}</td>
                                            <td className="px-3 py-2.5 text-sm font-bold text-green-600">{fmt(p.amount)}</td>
                                            <td className="px-3 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{p.payment_method}</span></td>
                                            <td className="px-3 py-2.5 text-xs font-mono text-gray-500">{p.reference_number || '-'}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-400 max-w-[150px] truncate">{p.notes || '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══ SUPPLIER MODAL ═══ */}
            {showSupplierModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowSupplierModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}><h3 className="text-lg font-extrabold text-white flex items-center gap-2"><FiTruck /> {editing ? 'Edit Supplier' : 'Add New Supplier'}</h3></div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2"><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Supplier Name *</label><input value={supForm.supplier_name} onChange={e => setSupForm({ ...supForm, supplier_name: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Contact Person</label><input value={supForm.contact_person} onChange={e => setSupForm({ ...supForm, contact_person: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Phone</label><input value={supForm.phone} onChange={e => setSupForm({ ...supForm, phone: e.target.value })} className={inputCls} placeholder="0712345678" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Email</label><input value={supForm.email} onChange={e => setSupForm({ ...supForm, email: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">KRA PIN</label><input value={supForm.kra_pin} onChange={e => setSupForm({ ...supForm, kra_pin: e.target.value })} className={inputCls} placeholder="P0123456789X" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Bank Name</label><input value={supForm.bank_name} onChange={e => setSupForm({ ...supForm, bank_name: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Bank Account</label><input value={supForm.bank_account} onChange={e => setSupForm({ ...supForm, bank_account: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Category</label><select value={supForm.category} onChange={e => setSupForm({ ...supForm, category: e.target.value })} className={inputCls}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Branch</label><input value={supForm.bank_branch} onChange={e => setSupForm({ ...supForm, bank_branch: e.target.value })} className={inputCls} /></div>
                                <div className="col-span-2"><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Address</label><textarea value={supForm.address} onChange={e => setSupForm({ ...supForm, address: e.target.value })} className={inputCls} rows={2} /></div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end gap-2">
                            <button onClick={() => setShowSupplierModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button onClick={saveSupplier} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-lg shadow-md disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>{saving ? 'Saving...' : editing ? 'Update' : 'Add Supplier'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ PURCHASE ORDER MODAL ═══ */}
            {showPOModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPOModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}><h3 className="text-lg font-extrabold text-white flex items-center gap-2"><FiShoppingCart /> Create Purchase Order (LPO)</h3></div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2"><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Supplier *</label><select value={poForm.supplier_id} onChange={e => setPoForm({ ...poForm, supplier_id: e.target.value })} className={inputCls}><option value="">Select Supplier</option>{suppliers.filter(s => s.status === 'Active').map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}</select></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Order Date</label><input type="date" value={poForm.order_date} onChange={e => setPoForm({ ...poForm, order_date: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Delivery Date</label><input type="date" value={poForm.delivery_date} onChange={e => setPoForm({ ...poForm, delivery_date: e.target.value })} className={inputCls} /></div>
                            </div>

                            {/* Line Items */}
                            <div>
                                <div className="flex items-center justify-between mb-2"><label className="text-xs font-bold text-gray-500 uppercase">Order Items</label><button onClick={addPOItem} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"><FiPlus size={11} /> Add Item</button></div>
                                <div className="space-y-2">
                                    {poForm.items.map((item: any, idx: number) => (
                                        <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-xl border border-gray-200">
                                            <div className="col-span-5"><input value={item.item_description} onChange={e => updatePOItem(idx, 'item_description', e.target.value)} placeholder="Item description..." className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none" /></div>
                                            <div className="col-span-2"><input type="number" value={item.quantity} onChange={e => updatePOItem(idx, 'quantity', e.target.value)} className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none text-center" min="1" /></div>
                                            <div className="col-span-2"><input type="number" value={item.unit_price} onChange={e => updatePOItem(idx, 'unit_price', e.target.value)} placeholder="Price" className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none text-right" /></div>
                                            <div className="col-span-2 text-right"><p className="text-sm font-bold text-green-600">{fmt(Number(item.quantity || 0) * Number(item.unit_price || 0))}</p></div>
                                            <div className="col-span-1 text-center">{poForm.items.length > 1 && <button onClick={() => removePOItem(idx)} className="p-1 text-red-400 hover:text-red-600"><FiX size={14} /></button>}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-between">
                                    <span className="text-xs font-bold text-blue-700">Subtotal: {fmt(poTotal)} | VAT (16%): {fmt(Math.round(poTotal * 0.16))}</span>
                                    <span className="text-lg font-black text-blue-800">Total: {fmt(poTotal + Math.round(poTotal * 0.16))}</span>
                                </div>
                            </div>

                            <textarea value={poForm.notes} onChange={e => setPoForm({ ...poForm, notes: e.target.value })} placeholder="Notes / delivery instructions..." rows={2} className={inputCls} />
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end gap-2">
                            <button onClick={() => setShowPOModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button onClick={savePO} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-lg shadow-md disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>{saving ? 'Creating...' : 'Create LPO'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ INVOICE MODAL ═══ */}
            {showInvoiceModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowInvoiceModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><h3 className="text-lg font-extrabold text-white flex items-center gap-2"><FiFileText /> Record Supplier Invoice</h3></div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Invoice # *</label><input value={invForm.invoice_number} onChange={e => setInvForm({ ...invForm, invoice_number: e.target.value })} className={inputCls} placeholder="INV-12345" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Supplier *</label><select value={invForm.supplier_id} onChange={e => setInvForm({ ...invForm, supplier_id: e.target.value })} className={inputCls}><option value="">Select</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}</select></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Invoice Date</label><input type="date" value={invForm.invoice_date} onChange={e => setInvForm({ ...invForm, invoice_date: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Due Date</label><input type="date" value={invForm.due_date} onChange={e => setInvForm({ ...invForm, due_date: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Total Amount *</label><input type="number" value={invForm.total_amount} onChange={e => setInvForm({ ...invForm, total_amount: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">VAT Amount</label><input type="number" value={invForm.vat_amount} onChange={e => setInvForm({ ...invForm, vat_amount: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Link to PO</label><select value={invForm.po_id} onChange={e => setInvForm({ ...invForm, po_id: e.target.value })} className={inputCls}><option value="">None</option>{orders.filter(o => String(o.supplier_id) === invForm.supplier_id).map(o => <option key={o.id} value={o.id}>{o.po_number}</option>)}</select></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Category</label><select value={invForm.category} onChange={e => setInvForm({ ...invForm, category: e.target.value })} className={inputCls}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                                <div className="col-span-2"><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Description</label><textarea value={invForm.description} onChange={e => setInvForm({ ...invForm, description: e.target.value })} className={inputCls} rows={2} /></div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end gap-2">
                            <button onClick={() => setShowInvoiceModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button onClick={saveInvoice} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-lg shadow-md disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>{saving ? 'Saving...' : 'Record Invoice'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ PAYMENT MODAL ═══ */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}><h3 className="text-lg font-extrabold text-white flex items-center gap-2"><FiDollarSign /> Pay Supplier</h3></div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2"><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Supplier *</label><select value={payForm.supplier_id} onChange={e => setPayForm({ ...payForm, supplier_id: e.target.value, invoice_id: '' })} className={inputCls}><option value="">Select</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}</select></div>
                                {payForm.supplier_id && (
                                    <div className="col-span-2"><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Link to Invoice</label><select value={payForm.invoice_id} onChange={e => { const inv = invoices.find(i => i.id === Number(e.target.value)); setPayForm({ ...payForm, invoice_id: e.target.value, amount: inv ? String(inv.balance || inv.total_amount) : payForm.amount }); }} className={inputCls}><option value="">No specific invoice</option>{invoices.filter(i => String(i.supplier_id) === payForm.supplier_id && i.status !== 'Paid').map(i => <option key={i.id} value={i.id}>{i.invoice_number} — Balance: {fmt(i.balance || i.total_amount)}</option>)}</select></div>
                                )}
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Amount *</label><input type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Payment Date</label><input type="date" value={payForm.payment_date} onChange={e => setPayForm({ ...payForm, payment_date: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Method</label><select value={payForm.payment_method} onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })} className={inputCls}><option>Bank Transfer</option><option>Cheque</option><option>M-Pesa</option><option>Cash</option><option>EFT</option></select></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Reference #</label><input value={payForm.reference_number} onChange={e => setPayForm({ ...payForm, reference_number: e.target.value })} className={inputCls} placeholder="Cheque no / M-Pesa code" /></div>
                                <div className="col-span-2"><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Notes</label><textarea value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} className={inputCls} rows={2} /></div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end gap-2">
                            <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button onClick={savePayment} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-lg shadow-md disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>{saving ? 'Processing...' : `Pay ${payForm.amount ? fmt(Number(payForm.amount)) : ''}`}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
