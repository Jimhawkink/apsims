'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiTruck, FiRefreshCw, FiPlus, FiSearch, FiEdit2, FiX, FiSave,
    FiDownload, FiCheck, FiStar, FiFileText, FiDollarSign,
    FiShoppingCart, FiAlertTriangle, FiPrinter, FiEye,
    FiClock, FiCheckCircle, FiXCircle, FiArrowRight, FiCopy,
    FiBarChart2, FiFilter, FiPackage, FiAlertCircle, FiActivity,
} from 'react-icons/fi';

const fmt = (n: any) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtN = (n: any) => Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d: string) => d ? new Date(d).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const daysSince = (d: string) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 0;
const daysUntil = (d: string) => d ? Math.floor((new Date(d).getTime() - Date.now()) / 86400000) : 0;

const CATEGORIES = ['General','Stationery','Food & Kitchen','Cleaning','Laboratory','Uniforms','Construction','IT & Electronics','Fuel & Energy','Medical','Furniture','Transport','Textbooks','Sports'];
const UNITS = ['Pieces','Reams','Boxes','Kg','Litres','Metres','Pairs','Sets','Cartons','Bags','Rolls','Packets'];
const PAY_METHODS = ['Bank Transfer','Cheque','Cash','M-Pesa','RTGS','EFT'];
const PAY_TERMS = ['Net 7','Net 14','Net 30','Net 60','COD','Prepaid'];
type Tab = 'orders'|'invoices'|'payments'|'statements'|'suppliers'|'analytics';

const genPONumber  = (count: number) => `LPO-${new Date().getFullYear()}-${String(count+1).padStart(5,'0')}`;
const genINVNumber = (count: number) => `SINV-${new Date().getFullYear()}-${String(count+1).padStart(5,'0')}`;
const genPAYNumber = (count: number) => `PV-${new Date().getFullYear()}-${String(count+1).padStart(5,'0')}`;

/* ── status colour map ───────────────────────────────── */
const SC: Record<string,{bg:string;color:string}> = {
    Draft:     {bg:'#f3f4f6',color:'#6b7280'},
    Approved:  {bg:'#dbeafe',color:'#1e40af'},
    Sent:      {bg:'#ede9fe',color:'#5b21b6'},
    Partial:   {bg:'#fef3c7',color:'#92400e'},
    Delivered: {bg:'#d1fae5',color:'#065f46'},
    Cancelled: {bg:'#fee2e2',color:'#991b1b'},
    Pending:   {bg:'#fef3c7',color:'#92400e'},
    Paid:      {bg:'#d1fae5',color:'#065f46'},
    Overdue:   {bg:'#fee2e2',color:'#dc2626'},
    Voided:    {bg:'#f3f4f6',color:'#9ca3af'},
    Active:    {bg:'#d1fae5',color:'#065f46'},
    Inactive:  {bg:'#f3f4f6',color:'#9ca3af'},
};
const statusBadge = (s: string) => {
    const c = SC[s]||{bg:'#f3f4f6',color:'#6b7280'};
    return <span style={{fontSize:10,fontWeight:800,padding:'3px 9px',borderRadius:20,background:c.bg,color:c.color,whiteSpace:'nowrap' as const}}>{s}</span>;
};

/* ── premium CSV export ─────────────────────────────── */
const exportCSV = (headers: string[], rows: any[][], filename: string) => {
    const csv = '\uFEFF'+[headers,...rows].map(r=>r.map(c=>`"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`${filename}_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`✅ ${filename} exported!`);
};

export default function ProcurementPage() {
    const [tab, setTab] = useState<Tab>('orders');
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [poItems, setPoItems] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [schoolInfo, setSchoolInfo] = useState<any>({});
    const [storeItems, setStoreItems] = useState<any[]>([]);
    const [itemSearches, setItemSearches] = useState<string[]>(['']);
    const [itemDropdownOpen, setItemDropdownOpen] = useState<number|null>(null);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [statusFilter, setStatusFilter] = useState('All');
    const [catFilter, setCatFilter] = useState('All');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Modals
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [showPOModal, setShowPOModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showViewPO, setShowViewPO] = useState<any>(null);
    const [editing, setEditing] = useState<any>(null);

    const emptySupplier = {supplier_name:'',contact_person:'',phone:'',email:'',kra_pin:'',bank_name:'',bank_account:'',bank_branch:'',address:'',category:'General',payment_terms:'Net 30',notes:'',status:'Active'};
    const emptyPO = {supplier_id:'',order_date:new Date().toISOString().split('T')[0],delivery_date:'',payment_terms:'Net 30',category:'General',notes:'',items:[{item_description:'',quantity:1,unit:'Pieces',unit_price:0}]};
    const freshInvoice = () => ({invoice_number:genINVNumber(invoices.length),supplier_id:'',po_id:'',invoice_date:new Date().toISOString().split('T')[0],due_date:'',subtotal:'',vat_amount:'0',total_amount:'',category:'General',description:'',notes:'',supplier_invoice_ref:''});
    const freshPayment = () => ({payment_number:genPAYNumber(payments.length),supplier_id:'',invoice_id:'',payment_date:new Date().toISOString().split('T')[0],amount:'',payment_method:'Bank Transfer',reference_number:'',bank_name:'',notes:''});

    const [supForm, setSupForm] = useState(emptySupplier);
    const [poForm, setPoForm] = useState<any>(emptyPO);
    const [invForm, setInvForm] = useState<any>(freshInvoice());
    const [payForm, setPayForm] = useState<any>(freshPayment());

    /* ── fetch ─────────────────────────────────────── */
    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [sRes,oRes,piRes,iRes,pRes,scRes,siRes] = await Promise.all([
            supabase.from('school_suppliers').select('*').order('supplier_name'),
            supabase.from('school_purchase_orders').select('*').order('created_at',{ascending:false}),
            supabase.from('school_po_items').select('*'),
            supabase.from('school_supplier_invoices').select('*').order('created_at',{ascending:false}),
            supabase.from('school_supplier_payments').select('*').order('created_at',{ascending:false}),
            supabase.from('school_details').select('*').maybeSingle(),
            supabase.from('school_store_items').select('id,item_name,item_code,category,unit,unit_price').eq('is_active',true).order('item_name'),
        ]);
        setSuppliers(sRes.data||[]);
        setOrders(oRes.data||[]);
        setPoItems(piRes.data||[]);
        setInvoices(iRes.data||[]);
        setPayments(pRes.data||[]);
        setSchoolInfo(scRes.data||{});
        setStoreItems(siRes.data||[]);
        setLoading(false);
    },[]);

    useEffect(()=>{fetchAll();},[fetchAll]);

    /* ── derived stats ─────────────────────────────── */
    const getSupplier = (id:any) => suppliers.find(s=>s.id===Number(id));
    const poHasInvoice = (poId:number) => invoices.find(i=>i.po_id===poId);
    const activeSuppliers = suppliers.filter(s=>s.status==='Active').length;
    const openOrders = orders.filter(o=>!['Delivered','Cancelled'].includes(o.status)).length;
    const totalOrderValue = orders.filter(o=>o.status!=='Cancelled').reduce((s,o)=>s+Number(o.grand_total||0),0);
    const unpaidInvoices = invoices.filter(i=>!['Paid','Voided'].includes(i.status));
    const totalOwed = unpaidInvoices.reduce((s,i)=>s+Number(i.balance||i.total_amount||0),0);
    const totalPaid = payments.reduce((s,p)=>s+Number(p.amount||0),0);
    const overdueInvoices = invoices.filter(i=>i.status!=='Paid'&&i.due_date&&new Date(i.due_date)<new Date());
    const avgOrderValue = orders.length ? totalOrderValue/orders.length : 0;
    const thisMonthPay = payments.filter(p=>{const d=new Date(p.payment_date);const n=new Date();return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();}).reduce((s,p)=>s+Number(p.amount||0),0);

    /* ── filtered sets ─────────────────────────────── */
    const filteredOrders = useMemo(()=>orders.filter(o=>{
        if(statusFilter!=='All'&&o.status!==statusFilter) return false;
        if(catFilter!=='All'&&o.category!==catFilter) return false;
        if(dateFrom&&(o.order_date||o.created_at?.split('T')[0])<dateFrom) return false;
        if(dateTo&&(o.order_date||o.created_at?.split('T')[0])>dateTo) return false;
        if(search){const q=search.toLowerCase();return(o.po_number||'').toLowerCase().includes(q)||(getSupplier(o.supplier_id)?.supplier_name||'').toLowerCase().includes(q)||(o.category||'').toLowerCase().includes(q);}
        return true;
    }),[orders,statusFilter,catFilter,dateFrom,dateTo,search]);

    const filteredInvoices = useMemo(()=>invoices.filter(i=>{
        const isOverdue = i.status!=='Paid'&&i.due_date&&new Date(i.due_date)<new Date();
        const effStatus = isOverdue?'Overdue':i.status;
        if(statusFilter!=='All'&&effStatus!==statusFilter) return false;
        if(dateFrom&&i.invoice_date<dateFrom) return false;
        if(dateTo&&i.invoice_date>dateTo) return false;
        if(search){const q=search.toLowerCase();return(i.invoice_number||'').toLowerCase().includes(q)||(getSupplier(i.supplier_id)?.supplier_name||'').toLowerCase().includes(q);}
        return true;
    }),[invoices,statusFilter,dateFrom,dateTo,search]);

    const filteredPayments = useMemo(()=>payments.filter(p=>{
        if(dateFrom&&p.payment_date<dateFrom) return false;
        if(dateTo&&p.payment_date>dateTo) return false;
        if(search){const q=search.toLowerCase();return(getSupplier(p.supplier_id)?.supplier_name||'').toLowerCase().includes(q)||(p.payment_number||'').toLowerCase().includes(q);}
        return true;
    }),[payments,dateFrom,dateTo,search]);

    const filteredSuppliers = useMemo(()=>suppliers.filter(s=>{
        if(statusFilter!=='All'&&s.status!==statusFilter) return false;
        if(catFilter!=='All'&&s.category!==catFilter) return false;
        if(search){const q=search.toLowerCase();return(s.supplier_name||'').toLowerCase().includes(q)||(s.contact_person||'').toLowerCase().includes(q)||(s.email||'').toLowerCase().includes(q);}
        return true;
    }),[suppliers,statusFilter,catFilter,search]);

    /* ── CRUD — supplier ───────────────────────────── */
    const saveSupplier = async()=>{
        if(!supForm.supplier_name.trim()){toast.error('Supplier name required');return;}
        setSaving(true);
        const{error}=editing
            ?await supabase.from('school_suppliers').update(supForm).eq('id',editing.id)
            :await supabase.from('school_suppliers').insert([supForm]);
        if(error){toast.error(error.message);setSaving(false);return;}
        toast.success(editing?'Supplier updated ✅':'Supplier added ✅');
        setShowSupplierModal(false);setEditing(null);setSaving(false);fetchAll();
    };

    /* ── CRUD — LPO ────────────────────────────────── */
    const savePO = async()=>{
        if(!poForm.supplier_id||poForm.items.filter((i:any)=>i.item_description).length===0){
            toast.error('Select supplier and add at least one item');return;
        }
        setSaving(true);
        const subtotal=poForm.items.reduce((s:number,i:any)=>s+Number(i.quantity||0)*Number(i.unit_price||0),0);
        const vat=Math.round(subtotal*0.16*100)/100;
        const grandTotal=Math.round((subtotal+vat)*100)/100;
        const poNumber=genPONumber(orders.length);
        const{data:po,error}=await supabase.from('school_purchase_orders').insert([{
            po_number:poNumber,supplier_id:Number(poForm.supplier_id),
            order_date:poForm.order_date,delivery_date:poForm.delivery_date||null,
            subtotal_amount:subtotal,vat_amount:vat,total_amount:subtotal,
            grand_total:grandTotal,payment_terms:poForm.payment_terms,
            category:poForm.category,notes:poForm.notes,status:'Draft',created_by:'Admin',
        }]).select().single();
        if(error||!po){toast.error('Failed to create PO: '+(error?.message||''));setSaving(false);return;}
        const rows=poForm.items.filter((i:any)=>i.item_description.trim()).map((i:any)=>({
            po_id:po.id,item_description:i.item_description,
            quantity:Number(i.quantity||1),unit:i.unit||'Pieces',
            unit_price:Number(i.unit_price||0),
            total_price:Number(i.quantity||1)*Number(i.unit_price||0),
        }));
        if(rows.length>0) await supabase.from('school_po_items').insert(rows);
        toast.success(`✅ ${poNumber} created!`);
        setShowPOModal(false);setPoForm(emptyPO);setSaving(false);fetchAll();
    };

    const approvePO = async(po:any)=>{
        await supabase.from('school_purchase_orders').update({status:'Approved',approved_by:'Admin',approved_at:new Date().toISOString()}).eq('id',po.id);
        toast.success(`${po.po_number} approved ✅`);fetchAll();
    };

    const sendPO = async(po:any)=>{
        await supabase.from('school_purchase_orders').update({status:'Sent'}).eq('id',po.id);
        toast.success(`${po.po_number} marked as Sent`);fetchAll();
    };

    const deliverPO = async(po:any)=>{
        if(!confirm(`Mark ${po.po_number} as DELIVERED? This records that goods have been received.`)) return;
        await supabase.from('school_purchase_orders').update({status:'Delivered',delivered_at:new Date().toISOString()}).eq('id',po.id);
        try{ await supabase.from('school_store_audit_log').insert([{action_type:'LPO_DELIVERED',record_ref:po.po_number,description:`LPO ${po.po_number} marked as DELIVERED. Supplier: ${getSupplier(po.supplier_id)?.supplier_name||''}. Value: KES ${fmtN(po.grand_total)}`,actor:'Admin',actor_role:'Stores'}]); }catch(_){}
        toast.success(`✅ ${po.po_number} marked as DELIVERED`);fetchAll();
    };

    const cancelPO = async(po:any)=>{
        if(!confirm(`Cancel ${po.po_number}? This cannot be undone.`)) return;
        await supabase.from('school_purchase_orders').update({status:'Cancelled'}).eq('id',po.id);
        toast.success(`${po.po_number} cancelled`);fetchAll();
    };

    /* ── LPO → auto-fill invoice ────────────────────── */
    const onSelectPO=(poId:string)=>{
        const po=orders.find(o=>String(o.id)===poId);
        if(po) setInvForm((f:any)=>({...f,po_id:poId,supplier_id:String(po.supplier_id),total_amount:String(po.grand_total||po.total_amount||''),vat_amount:String(po.vat_amount||'0'),subtotal:String(po.subtotal_amount||po.total_amount||''),description:`Invoice for ${po.po_number}`}));
        else setInvForm((f:any)=>({...f,po_id:poId}));
    };

    /* ── CRUD — invoice ─────────────────────────────── */
    const saveInvoice=async()=>{
        if(!invForm.invoice_number||!invForm.supplier_id||!invForm.total_amount){toast.error('Invoice #, supplier and total are required');return;}
        setSaving(true);
        const{data:existing}=await supabase.from('school_supplier_invoices').select('id,invoice_number').eq('invoice_number',invForm.invoice_number).maybeSingle();
        if(existing){toast.error(`⚠️ Invoice ${invForm.invoice_number} already exists!`);setSaving(false);return;}
        if(invForm.po_id){
            const{data:poInv}=await supabase.from('school_supplier_invoices').select('id,invoice_number').eq('po_id',Number(invForm.po_id)).maybeSingle();
            if(poInv){toast.error(`⚠️ LPO already has invoice ${poInv.invoice_number}.`);setSaving(false);return;}
        }
        const total=Number(invForm.total_amount);
        const{error}=await supabase.from('school_supplier_invoices').insert([{
            invoice_number:invForm.invoice_number,supplier_id:Number(invForm.supplier_id),
            po_id:invForm.po_id?Number(invForm.po_id):null,invoice_date:invForm.invoice_date,
            due_date:invForm.due_date||null,subtotal:Number(invForm.subtotal||total),
            vat_amount:Number(invForm.vat_amount||0),total_amount:total,balance:total,
            amount_paid:0,status:'Pending',supplier_invoice_ref:invForm.supplier_invoice_ref||null,
            category:invForm.category,description:invForm.description,notes:invForm.notes,created_by:'Admin',
        }]);
        if(error){toast.error(error.message);setSaving(false);return;}
        toast.success('✅ Invoice recorded!');
        setShowInvoiceModal(false);setInvForm(freshInvoice());setSaving(false);fetchAll();
    };

    const voidInvoice=async(inv:any)=>{
        if(!confirm(`Void invoice ${inv.invoice_number}? Balance will be cleared.`)) return;
        await supabase.from('school_supplier_invoices').update({status:'Voided',balance:0}).eq('id',inv.id);
        toast.success('Invoice voided');fetchAll();
    };

    /* ── CRUD — payment ─────────────────────────────── */
    const savePayment=async()=>{
        if(!payForm.supplier_id||!payForm.amount){toast.error('Supplier and amount required');return;}
        setSaving(true);
        const{error}=await supabase.from('school_supplier_payments').insert([{
            payment_number:payForm.payment_number,supplier_id:Number(payForm.supplier_id),
            invoice_id:payForm.invoice_id?Number(payForm.invoice_id):null,
            payment_date:payForm.payment_date,amount:Number(payForm.amount),
            payment_method:payForm.payment_method,reference_number:payForm.reference_number,
            bank_name:payForm.bank_name||null,notes:payForm.notes,created_by:'Admin',
        }]);
        if(error){toast.error(error.message);setSaving(false);return;}
        if(payForm.invoice_id){
            const inv=invoices.find(i=>i.id===Number(payForm.invoice_id));
            if(inv){
                const newPaid=Number(inv.amount_paid||0)+Number(payForm.amount);
                const newBalance=Math.max(0,Number(inv.total_amount)-newPaid);
                await supabase.from('school_supplier_invoices').update({amount_paid:newPaid,balance:newBalance,status:newBalance<=0?'Paid':'Partial'}).eq('id',inv.id);
            }
        }
        try{ await supabase.from('school_store_audit_log').insert([{action_type:'SUPPLIER_PAYMENT',record_ref:payForm.payment_number,description:`Payment KES ${payForm.amount} to ${getSupplier(payForm.supplier_id)?.supplier_name||'supplier'} via ${payForm.payment_method}`,actor:'Admin',actor_role:'Bursar'}]); }catch(_){}
        toast.success('✅ Payment recorded!');
        setShowPaymentModal(false);setPayForm(freshPayment());setSaving(false);fetchAll();
    };

    /* ── PO line items ──────────────────────────────── */
    const addItem=()=>{setPoForm((f:any)=>({...f,items:[...f.items,{item_description:'',quantity:1,unit:'Pieces',unit_price:0}]}));setItemSearches(s=>[...s,'']);};
    const removeItem=(idx:number)=>{setPoForm((f:any)=>({...f,items:f.items.filter((_:any,i:number)=>i!==idx)}));setItemSearches(s=>s.filter((_,i)=>i!==idx));};
    const updateItem=(idx:number,field:string,val:any)=>setPoForm((f:any)=>{const items=[...f.items];items[idx]={...items[idx],[field]:val};return{...f,items};});
    const poSubtotal=poForm.items.reduce((s:number,i:any)=>s+Number(i.quantity||0)*Number(i.unit_price||0),0);
    const poVAT=Math.round(poSubtotal*0.16*100)/100;

    /* ── supplier statement helper ──────────────────── */
    const getSupplierStatement=(supplierId:number)=>{
        const supOrders=orders.filter(o=>o.supplier_id===supplierId&&o.status!=='Cancelled');
        const supInvoices=invoices.filter(i=>i.supplier_id===supplierId);
        const supPayments=payments.filter(p=>p.supplier_id===supplierId);
        const totalInvoiced=supInvoices.reduce((s,i)=>s+Number(i.total_amount||0),0);
        const totalPaidS=supPayments.reduce((s,p)=>s+Number(p.amount||0),0);
        const balance=totalInvoiced-totalPaidS;
        // Aging buckets
        const now=new Date();
        const aging={current:0,d30:0,d60:0,d90plus:0};
        supInvoices.filter(i=>i.status!=='Paid'&&i.status!=='Voided').forEach(i=>{
            const days=i.due_date?Math.floor((now.getTime()-new Date(i.due_date).getTime())/86400000):0;
            const bal=Number(i.balance||0);
            if(days<=0) aging.current+=bal;
            else if(days<=30) aging.d30+=bal;
            else if(days<=60) aging.d60+=bal;
            else aging.d90plus+=bal;
        });
        return{supOrders,supInvoices,supPayments,totalInvoiced,totalPaid:totalPaidS,balance,aging};
    };

    /* ── analytics ──────────────────────────────────── */
    const categorySpend = useMemo(()=>{
        const map:Record<string,number>={};
        orders.filter(o=>o.status!=='Cancelled').forEach(o=>{const k=o.category||'General';map[k]=(map[k]||0)+Number(o.grand_total||0);});
        return Object.entries(map).sort((a,b)=>b[1]-a[1]);
    },[orders]);

    const monthlySpend = useMemo(()=>{
        const map:Record<string,number>={};
        payments.forEach(p=>{
            const d=new Date(p.payment_date);
            const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            map[k]=(map[k]||0)+Number(p.amount||0);
        });
        return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0])).slice(-12);
    },[payments]);

    /* ── PRINT LPO ──────────────────────────────────── */
    const printLPO=(po:any)=>{
        const items=poItems.filter(i=>i.po_id===po.id);
        const supplier=getSupplier(po.supplier_id);
        const w=window.open('','_blank');
        w?.document.write(`<!DOCTYPE html><html><head><title>${po.po_number}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',Arial,sans-serif;padding:28px;color:#1e293b;font-size:13px;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #1e40af;}
  .school-name{font-size:22px;font-weight:900;color:#1e40af;margin:0;}
  .school-sub{font-size:11px;color:#64748b;margin:2px 0;}
  .po-badge{background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;padding:14px 22px;border-radius:14px;text-align:right;}
  .po-badge .num{font-size:20px;font-weight:900;letter-spacing:1px;}
  .po-badge .lbl{font-size:10px;opacity:0.8;text-transform:uppercase;letter-spacing:1px;}
  .section{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:22px;}
  .info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;}
  .info-box h4{font-size:10px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;letter-spacing:0.5px;}
  .info-box p{font-size:12px;font-weight:600;color:#1e293b;margin:2px 0;}
  table{width:100%;border-collapse:collapse;margin:16px 0;}
  thead tr{background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;}
  th{padding:10px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;}
  td{padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;}
  tr:nth-child(even)td{background:#f8fafc;}
  .subtotal-row td{background:#eff6ff;font-weight:700;color:#1e40af;}
  .vat-row td{background:#dbeafe;font-weight:700;color:#1e40af;}
  .total-row td{background:#1e40af;color:#fff;font-size:14px;font-weight:900;border-top:2px solid #1e40af;}
  .footer{margin-top:28px;padding-top:16px;border-top:2px dashed #e2e8f0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;}
  .sig{border-top:1px solid #334155;padding-top:6px;margin-top:24px;font-size:10px;color:#94a3b8;text-align:center;}
  .watermark{display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:80px;font-weight:900;color:rgba(30,64,175,0.05);pointer-events:none;}
  .status-chip{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;background:${po.status==='Approved'?'#dbeafe':po.status==='Delivered'?'#d1fae5':'#f3f4f6'};color:${po.status==='Approved'?'#1e40af':po.status==='Delivered'?'#065f46':'#6b7280'};}
  .terms{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;margin-top:12px;font-size:11px;color:#92400e;}
  @media print{body{padding:12px 20px;}.watermark{display:block;}@page{size:A4;margin:8mm;}}
</style></head><body>
<div class="watermark">APSIMS</div>
<div class="header">
  <div>
    <p class="school-name">${schoolInfo?.school_name||'Alpha School'}</p>
    <p class="school-sub">${schoolInfo?.address||''}</p>
    <p class="school-sub">Tel: ${schoolInfo?.phone||''} | Email: ${schoolInfo?.email||''}</p>
  </div>
  <div class="po-badge">
    <p class="lbl">Local Purchase Order</p>
    <p class="num">${po.po_number}</p>
    <p style="font-size:11px;margin-top:4px;opacity:0.9">Status: <span class="status-chip">${po.status}</span></p>
  </div>
</div>
<div class="section">
  <div class="info-box">
    <h4>Supplier Details</h4>
    <p style="font-size:14px;font-weight:900">${supplier?.supplier_name||'Unknown'}</p>
    <p>${supplier?.contact_person||''}</p>
    <p>${supplier?.phone||''}</p>
    <p>${supplier?.address||''}</p>
    <p>KRA PIN: ${supplier?.kra_pin||'—'}</p>
  </div>
  <div class="info-box">
    <h4>Order Information</h4>
    <p>Order Date: <strong>${fmtDate(po.order_date)}</strong></p>
    <p>Expected Delivery: <strong>${po.delivery_date?fmtDate(po.delivery_date):'Not specified'}</strong></p>
    <p>Payment Terms: <strong>${po.payment_terms||'Net 30'}</strong></p>
    <p>Category: <strong>${po.category||'General'}</strong></p>
    ${po.approved_by?`<p>Approved by: <strong>${po.approved_by}</strong></p>`:''}
  </div>
</div>
<table>
  <thead><tr><th style="width:40px">#</th><th>Description of Items / Services</th><th style="width:70px;text-align:center">Qty</th><th style="width:80px;text-align:center">Unit</th><th style="width:110px;text-align:right">Unit Price</th><th style="width:120px;text-align:right">Total (KES)</th></tr></thead>
  <tbody>
    ${items.map((it,i)=>`<tr><td>${i+1}</td><td style="font-weight:600">${it.item_description}</td><td style="text-align:center">${it.quantity}</td><td style="text-align:center">${it.unit||'Pcs'}</td><td style="text-align:right">${fmtN(it.unit_price)}</td><td style="text-align:right;font-weight:700">${fmtN(it.total_price||it.quantity*it.unit_price)}</td></tr>`).join('')}
    <tr class="subtotal-row"><td colspan="5" style="text-align:right">SUBTOTAL (Excl. VAT)</td><td style="text-align:right">KES ${fmtN(po.subtotal_amount||po.total_amount)}</td></tr>
    <tr class="vat-row"><td colspan="5" style="text-align:right">VAT @ 16%</td><td style="text-align:right">KES ${fmtN(po.vat_amount)}</td></tr>
    <tr class="total-row"><td colspan="5" style="text-align:right">GRAND TOTAL</td><td style="text-align:right">KES ${fmtN(po.grand_total)}</td></tr>
  </tbody>
</table>
${po.notes?`<div class="terms">📝 Notes: ${po.notes}</div>`:''}
<div class="footer">
  <div><div class="sig">Prepared By</div></div>
  <div><div class="sig">Authorized By (Principal)</div></div>
  <div><div class="sig">Supplier Acknowledgement</div></div>
</div>
<p style="text-align:center;margin-top:20px;font-size:10px;color:#94a3b8">Generated by APSIMS Procurement System · ${fmtDateTime(new Date().toISOString())}</p>
<script>window.onload=()=>{window.print();}</script>
</body></html>`);
        w?.document.close();
    };

    /* ── PRINT INVOICE ──────────────────────────────── */
    const printInvoice=(inv:any)=>{
        const supplier=getSupplier(inv.supplier_id);
        const po=inv.po_id?orders.find((o:any)=>o.id===inv.po_id):null;
        const w=window.open('','_blank');
        w?.document.write(`<!DOCTYPE html><html><head><title>Invoice - ${inv.invoice_number}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',Arial,sans-serif;padding:28px;color:#1e293b;font-size:12px;}
  .header{display:flex;justify-content:space-between;padding-bottom:14px;border-bottom:3px solid #f59e0b;margin-bottom:20px;}
  .school-name{font-size:20px;font-weight:900;color:#1e293b;}
  .inv-badge{background:#f59e0b;color:#fff;padding:12px 20px;border-radius:12px;text-align:right;}
  .inv-badge .num{font-size:18px;font-weight:900;}
  .section{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;}
  .box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;}
  .box h4{font-size:10px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;}
  table{width:100%;border-collapse:collapse;margin:14px 0;}
  thead tr{background:#1e293b;color:#fff;}
  th{padding:8px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;}
  td{padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;}
  .total-row td{background:#1e293b;color:#fff;font-weight:900;font-size:13px;}
  .paid-row td{background:#d1fae5;color:#065f46;font-weight:800;}
  .bal-row td{background:${Number(inv.balance)>0?'#fee2e2':'#d1fae5'};color:${Number(inv.balance)>0?'#dc2626':'#065f46'};font-size:15px;font-weight:900;}
  @media print{@page{size:A4;margin:8mm;}}
</style></head><body>
<div class="header">
  <div>
    <p class="school-name">${schoolInfo?.school_name||'Alpha School'}</p>
    <p style="font-size:11px;color:#64748b">${schoolInfo?.address||''}</p>
  </div>
  <div class="inv-badge">
    <p style="font-size:10px;font-weight:700;text-transform:uppercase;opacity:0.85">Supplier Invoice</p>
    <p class="num">${inv.invoice_number}</p>
    <p style="font-size:10px;margin-top:2px">${inv.status}</p>
  </div>
</div>
<div class="section">
  <div class="box"><h4>From Supplier</h4><p style="font-size:14px;font-weight:900">${supplier?.supplier_name||'—'}</p><p>${supplier?.phone||''}</p><p>KRA: ${supplier?.kra_pin||'—'}</p></div>
  <div class="box"><h4>Invoice Details</h4><p>Invoice Date: <strong>${fmtDate(inv.invoice_date)}</strong></p><p>Due Date: <strong>${fmtDate(inv.due_date)}</strong></p>${po?`<p>LPO Ref: <strong>${po.po_number}</strong></p>`:''}${inv.supplier_invoice_ref?`<p>Supplier Ref: <strong>${inv.supplier_invoice_ref}</strong></p>`:''}</div>
</div>
<table>
  <thead><tr><th>Description</th><th style="text-align:right">Subtotal</th><th style="text-align:right">VAT 16%</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>
    <tr><td>${inv.description||'Goods/Services supplied'}</td><td style="text-align:right">KES ${fmtN(inv.subtotal)}</td><td style="text-align:right">KES ${fmtN(inv.vat_amount)}</td><td style="text-align:right;font-weight:700">KES ${fmtN(inv.total_amount)}</td></tr>
    <tr class="total-row"><td colspan="3" style="text-align:right">INVOICE TOTAL</td><td style="text-align:right">KES ${fmtN(inv.total_amount)}</td></tr>
    <tr class="paid-row"><td colspan="3" style="text-align:right">AMOUNT PAID</td><td style="text-align:right">KES ${fmtN(inv.amount_paid)}</td></tr>
    <tr class="bal-row"><td colspan="3" style="text-align:right">BALANCE DUE</td><td style="text-align:right">KES ${fmtN(inv.balance)}</td></tr>
  </tbody>
</table>
${inv.notes?`<p style="margin-top:8px;font-size:11px;color:#64748b">Notes: ${inv.notes}</p>`:''}
<div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:24px;">
  <div><div style="border-top:1px solid #334155;margin-top:28px;padding-top:6px;font-size:10px;color:#94a3b8;text-align:center">Prepared by / Bursar</div></div>
  <div><div style="border-top:1px solid #334155;margin-top:28px;padding-top:6px;font-size:10px;color:#94a3b8;text-align:center">Authorized by / Principal</div></div>
</div>
<p style="text-align:center;margin-top:16px;font-size:10px;color:#94a3b8">Generated by APSIMS · ${fmtDateTime(new Date().toISOString())}</p>
<script>window.onload=()=>{window.print();}</script>
</body></html>`);
        w?.document.close();
    };

    /* ── PRINT SUPPLIER STATEMENT ───────────────────── */
    const printStatement=(sup:any)=>{
        const st=getSupplierStatement(sup.id);
        const{balance,aging}=st;
        const w=window.open('','_blank');
        w?.document.write(`<!DOCTYPE html><html><head><title>Statement - ${sup.supplier_name}</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;padding:24px;color:#1e293b;font-size:12px;}
  .h{display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #1e40af;}
  .hn{font-size:20px;font-weight:900;color:#1e40af;}
  table{width:100%;border-collapse:collapse;margin:12px 0;}
  thead tr{background:#1e40af;color:#fff;}
  th{padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;font-weight:700;}
  td{padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:11px;}
  tr:nth-child(even)td{background:#f8fafc;}
  .total-row td{font-weight:900;background:#eff6ff;border-top:2px solid #1e40af;font-size:12px;}
  .aging{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0;}
  .aging-box{border-radius:8px;padding:10px;text-align:center;border:1px solid #e2e8f0;}
  .bal-box{background:${balance>0?'#fef2f2':'#f0fdf4'};border:2px solid ${balance>0?'#fca5a5':'#86efac'};border-radius:12px;padding:16px;display:flex;justify-content:space-between;align-items:center;margin:16px 0;}
  @media print{@page{size:A4;margin:8mm;}}
</style></head><body>
<div class="h">
  <div><p class="hn">${schoolInfo?.school_name||'Alpha School'}</p><p style="font-size:11px;color:#64748b">${schoolInfo?.address||''}</p></div>
  <div style="text-align:right"><p style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700">Supplier Account Statement</p><p style="font-size:15px;font-weight:900">${sup.supplier_name}</p><p style="font-size:11px;color:#64748b">${sup.phone||''} · KRA: ${sup.kra_pin||'—'}</p><p style="font-size:10px;color:#94a3b8">As of: ${fmtDate(new Date().toISOString())}</p></div>
</div>
<div class="aging">
  <div class="aging-box" style="background:#f0f9ff;border-color:#bae6fd"><div style="font-size:9px;font-weight:700;color:#0369a1;text-transform:uppercase">Current</div><div style="font-size:18px;font-weight:900;color:#0369a1">KES ${fmtN(aging.current)}</div></div>
  <div class="aging-box" style="background:#fffbeb;border-color:#fde68a"><div style="font-size:9px;font-weight:700;color:#92400e;text-transform:uppercase">1–30 Days</div><div style="font-size:18px;font-weight:900;color:#d97706">KES ${fmtN(aging.d30)}</div></div>
  <div class="aging-box" style="background:#fff7ed;border-color:#fed7aa"><div style="font-size:9px;font-weight:700;color:#92400e;text-transform:uppercase">31–60 Days</div><div style="font-size:18px;font-weight:900;color:#ea580c">KES ${fmtN(aging.d60)}</div></div>
  <div class="aging-box" style="background:#fef2f2;border-color:#fecaca"><div style="font-size:9px;font-weight:700;color:#991b1b;text-transform:uppercase">60+ Days</div><div style="font-size:18px;font-weight:900;color:#dc2626">KES ${fmtN(aging.d90plus)}</div></div>
</div>
<h3 style="font-size:11px;text-transform:uppercase;color:#64748b;margin:16px 0 4px">Invoices</h3>
<table><thead><tr><th>#</th><th>Invoice No</th><th>Date</th><th>Due Date</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
<tbody>
${st.supInvoices.map((i,idx)=>`<tr><td>${idx+1}</td><td style="font-family:monospace;font-weight:700">${i.invoice_number}</td><td>${fmtDate(i.invoice_date)}</td><td style="color:${i.status!=='Paid'&&i.due_date&&new Date(i.due_date)<new Date()?'#dc2626':'inherit'}">${fmtDate(i.due_date)}</td><td style="text-align:right">KES ${fmtN(i.total_amount)}</td><td style="text-align:right;color:#059669">KES ${fmtN(i.amount_paid)}</td><td style="text-align:right;font-weight:700;color:${Number(i.balance)>0?'#dc2626':'#059669'}">KES ${fmtN(i.balance)}</td><td>${i.status}</td></tr>`).join('')}
<tr class="total-row"><td colspan="4" style="text-align:right">TOTALS</td><td style="text-align:right">KES ${fmtN(st.totalInvoiced)}</td><td style="text-align:right;color:#059669">KES ${fmtN(st.totalPaid)}</td><td style="text-align:right;color:${balance>0?'#dc2626':'#059669'}">KES ${fmtN(balance)}</td><td></td></tr>
</tbody></table>
<h3 style="font-size:11px;text-transform:uppercase;color:#64748b;margin:16px 0 4px">Payments Made</h3>
<table><thead><tr><th>#</th><th>Payment No</th><th>Date</th><th>Method</th><th>Reference</th><th style="text-align:right">Amount</th></tr></thead>
<tbody>
${st.supPayments.map((p,i)=>`<tr><td>${i+1}</td><td style="font-family:monospace">${p.payment_number||'—'}</td><td>${fmtDate(p.payment_date)}</td><td>${p.payment_method||'—'}</td><td>${p.reference_number||'—'}</td><td style="text-align:right;font-weight:700;color:#059669">KES ${fmtN(p.amount)}</td></tr>`).join('')}
</tbody></table>
<div class="bal-box"><div><p style="font-size:10px;font-weight:700;text-transform:uppercase;color:${balance>0?'#dc2626':'#059669'}">Net Balance Due to Supplier</p></div><p style="font-size:28px;font-weight:900;color:${balance>0?'#dc2626':'#059669'}">KES ${fmtN(balance)}</p></div>
<div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:24px;"><div><div style="border-top:1px solid #ccc;margin-top:28px;padding-top:6px;font-size:10px;color:#94a3b8;text-align:center">Bursar / Accounts Clerk</div></div><div><div style="border-top:1px solid #ccc;margin-top:28px;padding-top:6px;font-size:10px;color:#94a3b8;text-align:center">Principal's Signature</div></div></div>
<script>window.onload=()=>{window.print();}</script>
</body></html>`);
        w?.document.close();
    };

    /* ── EXCEL EXPORTS ──────────────────────────────── */
    const exportLPOs=()=>{
        const headers=['#','LPO Number','Order Date','Delivery Date','Supplier','Category','Payment Terms','Subtotal (KES)','VAT 16% (KES)','Grand Total (KES)','Status','Days Open','Notes'];
        const rows=filteredOrders.map((po,i)=>{
            const sup=getSupplier(po.supplier_id);
            return[i+1,po.po_number,po.order_date||'',po.delivery_date||'',sup?.supplier_name||'',po.category||'',po.payment_terms||'',fmtN(po.subtotal_amount||po.total_amount),fmtN(po.vat_amount),fmtN(po.grand_total),po.status,daysSince(po.order_date),po.notes||''];
        });
        const totalRow=['','','','','GRAND TOTAL','','','',filteredOrders.reduce((s,po)=>s+Number(po.grand_total||0),0).toFixed(2),'','','',''];
        exportCSV(headers,[...rows,[],totalRow],'LPO_Purchase_Orders');
    };

    const exportInvoices=()=>{
        const headers=['#','Invoice No','Supplier Ref','Date','Due Date','Supplier','LPO Ref','Subtotal (KES)','VAT (KES)','Total (KES)','Paid (KES)','Balance (KES)','Status','Days Overdue'];
        const rows=filteredInvoices.map((inv,i)=>{
            const sup=getSupplier(inv.supplier_id);
            const po=inv.po_id?orders.find((o:any)=>o.id===inv.po_id):null;
            const isOverdue=inv.status!=='Paid'&&inv.due_date&&new Date(inv.due_date)<new Date();
            return[i+1,inv.invoice_number||'',inv.supplier_invoice_ref||'',inv.invoice_date||'',inv.due_date||'',sup?.supplier_name||'',po?.po_number||'',fmtN(inv.subtotal),fmtN(inv.vat_amount),fmtN(inv.total_amount),fmtN(inv.amount_paid),fmtN(inv.balance),isOverdue?'Overdue':inv.status,isOverdue?Math.abs(daysUntil(inv.due_date)):0];
        });
        const totalRow=['','','','','','TOTALS','','',filteredInvoices.reduce((s,i)=>s+Number(i.total_amount||0),0).toFixed(2),filteredInvoices.reduce((s,i)=>s+Number(i.amount_paid||0),0).toFixed(2),filteredInvoices.reduce((s,i)=>s+Number(i.balance||0),0).toFixed(2),'',''];
        exportCSV(headers,[...rows,[],totalRow],'Supplier_Invoices');
    };

    const exportPayments=()=>{
        const headers=['#','Payment No','Date','Supplier','Invoice No','Amount (KES)','Payment Method','Reference No','Bank','Notes'];
        const rows=filteredPayments.map((p,i)=>{
            const sup=getSupplier(p.supplier_id);
            const inv=p.invoice_id?invoices.find((iv:any)=>iv.id===p.invoice_id):null;
            return[i+1,p.payment_number||'',p.payment_date||'',sup?.supplier_name||'',inv?.invoice_number||'',Number(p.amount||0).toFixed(2),p.payment_method||'',p.reference_number||'',p.bank_name||'',p.notes||''];
        });
        const totalRow=['','','','TOTAL PAID','',filteredPayments.reduce((s,p)=>s+Number(p.amount||0),0).toFixed(2),'','','',''];
        exportCSV(headers,[...rows,[],totalRow],'Supplier_Payments');
    };

    const exportSuppliers=()=>{
        const headers=['#','Supplier Name','Contact Person','Phone','Email','KRA PIN','Category','Payment Terms','Bank Name','Account No','Branch','Address','Status','Total LPOs','Total Invoiced (KES)','Total Paid (KES)','Balance (KES)'];
        const rows=filteredSuppliers.map((s,i)=>{
            const st=getSupplierStatement(s.id);
            return[i+1,s.supplier_name,s.contact_person||'',s.phone||'',s.email||'',s.kra_pin||'',s.category||'',s.payment_terms||'',s.bank_name||'',s.bank_account||'',s.bank_branch||'',s.address||'',s.status,st.supOrders.length,st.totalInvoiced.toFixed(2),st.totalPaid.toFixed(2),st.balance.toFixed(2)];
        });
        exportCSV(headers,rows,'Suppliers_Register');
    };

    /* ── input styles ───────────────────────────────── */
    const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-blue-200 outline-none transition";
    const lbl = "text-[10px] font-bold text-gray-500 uppercase block mb-1 tracking-wider";

    const tabs=[
        {k:'orders',l:'📋 Purchase Orders',count:orders.length},
        {k:'invoices',l:'🧾 Invoices',count:invoices.length},
        {k:'payments',l:'💳 Payments',count:payments.length},
        {k:'statements',l:'📊 Statements',count:suppliers.length},
        {k:'suppliers',l:'🏢 Suppliers',count:suppliers.length},
        {k:'analytics',l:'📈 Analytics',count:0},
    ];

    if(loading) return(
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg" style={{background:'linear-gradient(135deg,#1e40af,#3b82f6)'}}>🏢</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-blue-200 animate-ping opacity-30"/>
            </div>
            <p className="text-sm font-bold text-gray-500">Loading Procurement…</p>
        </div>
    );

    return(
        <div className="space-y-5">

        {/* ════ ULTRA HERO ════ */}
        <div className="relative overflow-hidden rounded-2xl" style={{background:'linear-gradient(135deg,#0c4a6e 0%,#075985 40%,#0369a1 100%)'}}>
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{backgroundImage:'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)',backgroundSize:'24px 24px'}}/>
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{background:'radial-gradient(circle,#38bdf8,transparent)',transform:'translate(30%,-30%)'}}/>
            <div className="relative px-6 py-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <div className="w-13 h-13 rounded-2xl flex items-center justify-center shadow-xl p-3" style={{background:'linear-gradient(135deg,#3b82f6,#2563eb)'}}>
                            <FiTruck className="text-white" size={24}/>
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
                                🏢 Procurement & Suppliers
                                <span className="px-2 py-0.5 text-[10px] font-black rounded-full" style={{background:'linear-gradient(135deg,#3b82f6,#06b6d4)'}}>ULTRA</span>
                                {overdueInvoices.length>0&&<span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-red-500">🔔 {overdueInvoices.length} OVERDUE</span>}
                            </h1>
                            <p className="text-blue-300 text-xs mt-0.5">Suppliers · LPOs · Invoices · Payments · Statements · Analytics · PDF Print · Excel Export</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={()=>{setSupForm(emptySupplier);setEditing(null);setShowSupplierModal(true);}} className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-blue-500/80 hover:bg-blue-500 flex items-center gap-1.5 transition border border-blue-400/30"><FiPlus size={12}/> Supplier</button>
                        <button onClick={()=>{setPoForm(emptyPO);setItemSearches(['']);setItemDropdownOpen(null);setShowPOModal(true);}} className="px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition shadow-md" style={{background:'linear-gradient(135deg,#06b6d4,#0891b2)'}}><FiShoppingCart size={12}/> New LPO</button>
                        <button onClick={()=>{setInvForm(freshInvoice());setShowInvoiceModal(true);}} className="px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition shadow-md" style={{background:'linear-gradient(135deg,#f59e0b,#d97706)'}}><FiFileText size={12}/> Record Invoice</button>
                        <button onClick={()=>{setPayForm(freshPayment());setShowPaymentModal(true);}} className="px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition shadow-md" style={{background:'linear-gradient(135deg,#22c55e,#16a34a)'}}><FiDollarSign size={12}/> Pay Supplier</button>
                        <button onClick={fetchAll} className="p-2 rounded-xl text-white hover:bg-white/10 transition"><FiRefreshCw size={14}/></button>
                    </div>
                </div>
                {/* KPI strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-4 pt-4 border-t border-white/10">
                    {[
                        {label:'Active Suppliers',value:activeSuppliers,icon:'🏢',color:'#3b82f6'},
                        {label:'Open LPOs',value:openOrders,icon:'📋',color:'#06b6d4'},
                        {label:'LPO Value',value:fmt(totalOrderValue),icon:'🛒',color:'#8b5cf6'},
                        {label:'Avg. LPO',value:fmt(avgOrderValue),icon:'📊',color:'#a78bfa'},
                        {label:'Unpaid Invs',value:unpaidInvoices.length,icon:'🧾',color:'#f59e0b',pulse:unpaidInvoices.length>0},
                        {label:'Total Owed',value:fmt(totalOwed),icon:'⚠️',color:'#ef4444',pulse:totalOwed>0},
                        {label:'Total Paid',value:fmt(totalPaid),icon:'✅',color:'#22c55e'},
                        {label:'This Month',value:fmt(thisMonthPay),icon:'📅',color:'#10b981'},
                    ].map((card:any,i)=>(
                        <div key={i} className={`rounded-xl p-2.5 transition-all hover:scale-[1.02] cursor-default ${card.pulse?'animate-pulse':''}`} style={{background:'rgba(255,255,255,0.08)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.12)'}}>
                            <div className="flex items-center gap-1 mb-1"><span className="text-sm">{card.icon}</span><span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{card.label}</span></div>
                            <p className="text-sm font-black text-white leading-tight">{card.value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* overdue alert */}
        {overdueInvoices.length>0&&(
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50">
                <FiAlertTriangle className="text-red-500 flex-shrink-0" size={16}/>
                <div className="flex-1">
                    <p className="text-sm font-bold text-red-700">⚠️ {overdueInvoices.length} overdue invoice(s) — {fmt(overdueInvoices.reduce((s,i)=>s+Number(i.balance||0),0))} outstanding</p>
                    <p className="text-xs text-red-500 mt-0.5">{overdueInvoices.map(i=>i.invoice_number).join(', ')}</p>
                </div>
                <button onClick={()=>{setTab('invoices');setStatusFilter('Overdue');}} className="px-3 py-1.5 text-xs font-bold text-white rounded-lg bg-red-500 hover:bg-red-600 transition whitespace-nowrap">View All</button>
            </div>
        )}

        {/* ════ TABS + FILTERS ════ */}
        <div className="flex flex-col gap-3">
            {/* Tab row */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 flex-wrap">
                {tabs.map(t=>(
                    <button key={t.k} onClick={()=>{setTab(t.k as Tab);setStatusFilter('All');setCatFilter('All');}}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
                        style={tab===t.k
                            ?{background:'linear-gradient(135deg,#1e40af,#3b82f6)',color:'#fff',boxShadow:'0 8px 25px -5px rgba(59,130,246,0.4)'}
                            :{background:'#fff',color:'#6b7280',border:'1px solid #e5e7eb'}}>
                        {t.l}{t.count>0&&<span className="text-[10px] font-bold opacity-60">({t.count})</span>}
                    </button>
                ))}
            </div>
            {/* Filter row */}
            <div className="flex flex-wrap gap-2 items-center bg-white rounded-xl border border-gray-200 p-3">
                <div className="relative flex-1 min-w-[180px]">
                    <FiSearch size={12} className="absolute left-3 top-3 text-gray-400"/>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none bg-white"/>
                </div>
                {(tab==='orders'||tab==='invoices'||tab==='suppliers')&&(
                    <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-200">
                        <option value="All">All Statuses</option>
                        {tab==='orders'&&['Draft','Approved','Sent','Delivered','Cancelled'].map(s=><option key={s}>{s}</option>)}
                        {tab==='invoices'&&['Pending','Partial','Paid','Overdue','Voided'].map(s=><option key={s}>{s}</option>)}
                        {tab==='suppliers'&&['Active','Inactive'].map(s=><option key={s}>{s}</option>)}
                    </select>
                )}
                {(tab==='orders'||tab==='suppliers')&&(
                    <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-200">
                        <option value="All">All Categories</option>
                        {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                    </select>
                )}
                {tab!=='suppliers'&&tab!=='analytics'&&(
                    <>
                        <div className="flex items-center gap-1"><span className="text-xs text-gray-500">From:</span><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="px-2 py-2 border border-gray-200 rounded-lg text-xs bg-white outline-none"/></div>
                        <div className="flex items-center gap-1"><span className="text-xs text-gray-500">To:</span><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="px-2 py-2 border border-gray-200 rounded-lg text-xs bg-white outline-none"/></div>
                    </>
                )}
                {(dateFrom||dateTo||search||statusFilter!=='All'||catFilter!=='All')&&<button onClick={()=>{setSearch('');setStatusFilter('All');setCatFilter('All');setDateFrom('');setDateTo('');}} className="px-3 py-2 rounded-lg text-xs font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition flex items-center gap-1"><FiX size={11}/>Clear</button>}
                <div className="ml-auto flex gap-2">
                    {tab==='orders'&&<button onClick={exportLPOs} className="px-3 py-2 rounded-lg text-xs font-bold text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 transition flex items-center gap-1"><FiDownload size={11}/>Excel</button>}
                    {tab==='invoices'&&<button onClick={exportInvoices} className="px-3 py-2 rounded-lg text-xs font-bold text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 transition flex items-center gap-1"><FiDownload size={11}/>Excel</button>}
                    {tab==='payments'&&<button onClick={exportPayments} className="px-3 py-2 rounded-lg text-xs font-bold text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 transition flex items-center gap-1"><FiDownload size={11}/>Excel</button>}
                    {tab==='suppliers'&&<button onClick={exportSuppliers} className="px-3 py-2 rounded-lg text-xs font-bold text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 transition flex items-center gap-1"><FiDownload size={11}/>Excel</button>}
                </div>
            </div>
        </div>

        {/* ════ PURCHASE ORDERS TAB ════ */}
        {tab==='orders'&&(
            <div className="space-y-3">
                {filteredOrders.length===0?(
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
                        <span className="text-5xl block mb-3">📋</span>
                        <p className="text-sm font-bold text-gray-600">No Purchase Orders found</p>
                        <button onClick={()=>{setPoForm(emptyPO);setItemSearches(['']);setItemDropdownOpen(null);setShowPOModal(true);}} className="mt-4 px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md" style={{background:'linear-gradient(135deg,#3b82f6,#2563eb)'}}><FiPlus size={12} className="inline mr-1"/>Create First LPO</button>
                    </div>
                ):filteredOrders.map(po=>{
                    const supplier=getSupplier(po.supplier_id);
                    const items=poItems.filter(i=>i.po_id===po.id);
                    const days=daysSince(po.order_date);
                    const hasInv=poHasInvoice(po.id);
                    return(
                        <div key={po.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-md flex-shrink-0" style={{background:'linear-gradient(135deg,#1e40af,#3b82f6)'}}>LPO</div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-extrabold text-gray-800">{po.po_number}</p>
                                            {statusBadge(po.status)}
                                            {days>14&&po.status==='Draft'&&<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">⏰ {days}d old</span>}
                                        </div>
                                        <p className="text-[11px] text-gray-400">{supplier?.supplier_name||'Unknown'} · {fmtDate(po.order_date)} · {po.category}</p>
                                        {po.delivery_date&&<p className="text-[10px] text-blue-500">Delivery: {fmtDate(po.delivery_date)}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="text-right mr-2">
                                        <p className="text-xl font-black text-blue-600">{fmt(po.grand_total||po.total_amount)}</p>
                                        <p className="text-[10px] text-gray-400">VAT: {fmt(po.vat_amount)}</p>
                                    </div>
                                    {po.status==='Draft'&&<button onClick={()=>approvePO(po)} className="px-3 py-1.5 text-[10px] font-bold text-white bg-green-500 hover:bg-green-600 rounded-lg flex items-center gap-1 transition"><FiCheck size={10}/>Approve</button>}
                                    {po.status==='Approved'&&<button onClick={()=>sendPO(po)} className="px-3 py-1.5 text-[10px] font-bold text-white rounded-lg flex items-center gap-1 transition" style={{background:'linear-gradient(135deg,#5b21b6,#7c3aed)'}}>✈️ Mark Sent</button>}
                                    {(po.status==='Approved'||po.status==='Sent')&&<button onClick={()=>deliverPO(po)} className="px-3 py-1.5 text-[10px] font-bold text-white rounded-lg flex items-center gap-1 transition" style={{background:'linear-gradient(135deg,#059669,#047857)'}}>📦 Mark Delivered</button>}
                                    {po.status!=='Cancelled'&&po.status!=='Delivered'&&<button onClick={()=>cancelPO(po)} className="px-3 py-1.5 text-[10px] font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1 transition"><FiX size={10}/>Cancel</button>}
                                    <button onClick={()=>printLPO(po)} className="px-3 py-1.5 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition"><FiPrinter size={10}/>Print LPO</button>
                                    {hasInv
                                        ?<span className="px-3 py-1.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg flex items-center gap-1"><FiCheckCircle size={10}/>{hasInv.invoice_number}</span>
                                        :<button onClick={()=>{setInvForm({...freshInvoice(),po_id:String(po.id),supplier_id:String(po.supplier_id),total_amount:String(po.grand_total||po.total_amount||''),vat_amount:String(po.vat_amount||'0'),subtotal:String(po.subtotal_amount||po.total_amount||''),description:`Invoice for ${po.po_number}`});setShowInvoiceModal(true);}} className="px-3 py-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg flex items-center gap-1 transition"><FiArrowRight size={10}/>Record Invoice</button>}
                                </div>
                            </div>
                            {items.length>0&&(
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead><tr className="bg-gray-50">
                                            <th className="px-5 py-2 text-[10px] font-bold text-gray-400 uppercase text-left w-8">#</th>
                                            <th className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase text-left">Item Description</th>
                                            <th className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase text-right w-20">Qty</th>
                                            <th className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase text-center w-20">Unit</th>
                                            <th className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase text-right w-28">Unit Price</th>
                                            <th className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase text-right w-28">Line Total</th>
                                        </tr></thead>
                                        <tbody>
                                            {items.map((it,idx)=>(
                                                <tr key={it.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                                                    <td className="px-5 py-2 text-xs text-gray-400">{idx+1}</td>
                                                    <td className="px-3 py-2 text-xs font-medium text-gray-700">{it.item_description}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-500 text-right font-bold">{it.quantity}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-500 text-center">{it.unit}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-500 text-right">{fmt(it.unit_price)}</td>
                                                    <td className="px-3 py-2 text-xs font-bold text-gray-800 text-right">{fmt(it.total_price||it.quantity*it.unit_price)}</td>
                                                </tr>
                                            ))}
                                            <tr className="bg-blue-50 border-t-2 border-blue-200">
                                                <td colSpan={4}/><td className="px-3 py-2 text-xs font-bold text-blue-700 text-right">VAT 16%:</td>
                                                <td className="px-3 py-2 text-xs font-bold text-blue-700 text-right">{fmt(po.vat_amount)}</td>
                                            </tr>
                                            <tr className="bg-blue-100">
                                                <td colSpan={4}/><td className="px-3 py-2 text-sm font-black text-blue-800 text-right">Grand Total:</td>
                                                <td className="px-3 py-2 text-sm font-black text-blue-800 text-right">{fmt(po.grand_total)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
                {filteredOrders.length>0&&(
                    <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 flex justify-between items-center">
                        <span className="text-sm text-gray-500">{filteredOrders.length} LPOs shown</span>
                        <div className="flex gap-6 text-sm font-bold">
                            <span className="text-blue-600">Total: {fmt(filteredOrders.reduce((s,po)=>s+Number(po.grand_total||0),0))}</span>
                            <span className="text-green-600">Delivered: {filteredOrders.filter(o=>o.status==='Delivered').length}</span>
                            <span className="text-amber-600">Open: {filteredOrders.filter(o=>!['Delivered','Cancelled'].includes(o.status)).length}</span>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* ════ INVOICES TAB ════ */}
        {tab==='invoices'&&(
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                            {['Invoice #','Supplier Ref','Supplier','LPO Ref','Date','Due Date','Total','Paid','Balance','Status','Actions'].map(h=>(
                                <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {filteredInvoices.length===0?(<tr><td colSpan={11} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-2">🧾</span><p className="text-sm">No invoices found</p></td></tr>)
                            :filteredInvoices.map(inv=>{
                                const isOverdue=inv.status!=='Paid'&&inv.due_date&&new Date(inv.due_date)<new Date();
                                const po=inv.po_id?orders.find((o:any)=>o.id===inv.po_id):null;
                                const daysOD=isOverdue?Math.abs(daysUntil(inv.due_date)):0;
                                return(
                                    <tr key={inv.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isOverdue?'bg-red-50/40':''}`}>
                                        <td className="px-3 py-2.5 text-sm font-bold text-indigo-600 font-mono">{inv.invoice_number}</td>
                                        <td className="px-3 py-2.5 text-xs font-mono text-gray-500">{inv.supplier_invoice_ref||'—'}</td>
                                        <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{getSupplier(inv.supplier_id)?.supplier_name||'—'}</td>
                                        <td className="px-3 py-2.5 text-xs font-mono text-blue-600">{po?.po_number||'—'}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmtDate(inv.invoice_date)}</td>
                                        <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{color:isOverdue?'#ef4444':'#6b7280'}}>{fmtDate(inv.due_date)}{isOverdue&&<span className="ml-1 text-[9px] font-bold text-red-500">({daysOD}d)</span>}</td>
                                        <td className="px-3 py-2.5 text-sm font-bold text-gray-800">{fmt(inv.total_amount)}</td>
                                        <td className="px-3 py-2.5 text-sm font-bold text-green-600">{fmt(inv.amount_paid)}</td>
                                        <td className="px-3 py-2.5 text-sm font-black" style={{color:Number(inv.balance)>0?'#ef4444':'#22c55e'}}>{fmt(inv.balance)}</td>
                                        <td className="px-3 py-2.5">{statusBadge(isOverdue?'Overdue':inv.status)}</td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-1">
                                                <button onClick={()=>printInvoice(inv)} className="p-1.5 rounded-lg hover:bg-amber-50 transition" title="Print"><FiPrinter size={13} className="text-amber-600"/></button>
                                                {inv.status!=='Paid'&&inv.status!=='Voided'&&(
                                                    <>
                                                        <button onClick={()=>{setPayForm({...freshPayment(),supplier_id:String(inv.supplier_id),invoice_id:String(inv.id),amount:String(inv.balance||inv.total_amount)});setShowPaymentModal(true);}} className="px-2.5 py-1 text-[10px] font-bold text-white rounded-lg shadow-sm whitespace-nowrap" style={{background:'linear-gradient(135deg,#22c55e,#16a34a)'}}>💳 Pay</button>
                                                        <button onClick={()=>voidInvoice(inv)} className="px-2 py-1 text-[10px] font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Void</button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {filteredInvoices.length>0&&(
                    <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap justify-between gap-4 text-sm font-bold">
                        <span className="text-gray-500">{filteredInvoices.length} invoices</span>
                        <div className="flex gap-6">
                            <span className="text-gray-800">Total: {fmt(filteredInvoices.reduce((s,i)=>s+Number(i.total_amount||0),0))}</span>
                            <span className="text-green-600">Paid: {fmt(filteredInvoices.reduce((s,i)=>s+Number(i.amount_paid||0),0))}</span>
                            <span className="text-red-600">Balance: {fmt(filteredInvoices.reduce((s,i)=>s+Number(i.balance||0),0))}</span>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* ════ PAYMENTS TAB ════ */}
        {tab==='payments'&&(
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                            {['#','Payment #','Date','Supplier','Invoice','Amount','Method','Reference','Bank','Notes'].map(h=>(
                                <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {filteredPayments.length===0?(<tr><td colSpan={10} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-2">💳</span><p className="text-sm">No payments found</p></td></tr>)
                            :filteredPayments.map((p,i)=>{
                                const inv=p.invoice_id?invoices.find((iv:any)=>iv.id===p.invoice_id):null;
                                return(
                                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-2.5 text-xs text-gray-400">{i+1}</td>
                                        <td className="px-3 py-2.5 text-xs font-mono font-bold text-indigo-600">{p.payment_number||'—'}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{fmtDate(p.payment_date)}</td>
                                        <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{getSupplier(p.supplier_id)?.supplier_name||'—'}</td>
                                        <td className="px-3 py-2.5 text-xs font-mono text-indigo-600">{inv?.invoice_number||'—'}</td>
                                        <td className="px-3 py-2.5 text-sm font-bold text-green-600">{fmt(p.amount)}</td>
                                        <td className="px-3 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{p.payment_method}</span></td>
                                        <td className="px-3 py-2.5 text-xs font-mono text-gray-500">{p.reference_number||'—'}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-500">{p.bank_name||'—'}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-400">{p.notes||'—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {filteredPayments.length>0&&(
                    <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-sm font-bold">
                        <span className="text-gray-500">{filteredPayments.length} payments</span>
                        <span className="text-green-600 text-base">Total Paid: {fmt(filteredPayments.reduce((s,p)=>s+Number(p.amount||0),0))}</span>
                    </div>
                )}
            </div>
        )}

        {/* ════ SUPPLIER STATEMENTS TAB ════ */}
        {tab==='statements'&&(
            <div className="space-y-3">
                {suppliers.filter(s=>!search||s.supplier_name?.toLowerCase().includes(search.toLowerCase())).length===0?(
                    <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center"><span className="text-4xl block mb-2">📊</span><p className="text-sm font-bold text-gray-600">No suppliers found</p></div>
                ):suppliers.filter(s=>!search||s.supplier_name?.toLowerCase().includes(search.toLowerCase())).map(sup=>{
                    const{supOrders,supInvoices,supPayments,totalInvoiced,totalPaid:tPaid,balance,aging}=getSupplierStatement(sup.id);
                    const isCreditor=balance>0;
                    return(
                        <div key={sup.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            {/* Header */}
                            <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{background:'linear-gradient(135deg,#f8fafc,#f1f5f9)'}}>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-md" style={{background:'linear-gradient(135deg,#1e40af,#3b82f6)'}}>{sup.supplier_name?.charAt(0)?.toUpperCase()||'S'}</div>
                                    <div>
                                        <p className="text-sm font-extrabold text-gray-800">{sup.supplier_name}</p>
                                        <p className="text-[10px] text-gray-400">{sup.phone||'—'} · {sup.category||'General'} · {sup.payment_terms||'Net 30'} · KRA: {sup.kra_pin||'—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 flex-wrap">
                                    {[{l:'LPOs',v:supOrders.length,c:'#3b82f6'},{l:'Invoiced',v:fmt(totalInvoiced),c:'#374151'},{l:'Paid',v:fmt(tPaid),c:'#22c55e'}].map(k=>(
                                        <div key={k.l} className="text-center"><p className="text-[9px] font-bold text-gray-400 uppercase">{k.l}</p><p className="text-sm font-black" style={{color:k.c}}>{k.v}</p></div>
                                    ))}
                                    <div className="text-center px-3 py-2 rounded-xl" style={{background:isCreditor?'#fef2f2':'#f0fdf4',border:`1px solid ${isCreditor?'#fecaca':'#bbf7d0'}`}}>
                                        <p className="text-[9px] font-bold uppercase" style={{color:isCreditor?'#dc2626':'#16a34a'}}>Balance Due</p>
                                        <p className="text-base font-black" style={{color:isCreditor?'#dc2626':'#16a34a'}}>{fmt(balance)}</p>
                                    </div>
                                    {isCreditor&&<button onClick={()=>{setPayForm({...freshPayment(),supplier_id:String(sup.id)});setShowPaymentModal(true);}} className="px-3 py-1.5 text-[10px] font-bold text-white rounded-lg shadow-sm" style={{background:'linear-gradient(135deg,#22c55e,#16a34a)'}}>💳 Pay Now</button>}
                                    <button onClick={()=>printStatement(sup)} className="p-2 rounded-lg hover:bg-blue-50 transition" title="Print Statement"><FiPrinter size={14} className="text-blue-600"/></button>
                                </div>
                            </div>
                            {/* Aging */}
                            <div className="grid grid-cols-4 gap-0 border-t border-gray-100">
                                {[{l:'Current',v:aging.current,c:'#0369a1',bg:'#f0f9ff'},{l:'1–30 days',v:aging.d30,c:'#d97706',bg:'#fffbeb'},{l:'31–60 days',v:aging.d60,c:'#ea580c',bg:'#fff7ed'},{l:'60+ days',v:aging.d90plus,c:'#dc2626',bg:'#fef2f2'}].map(a=>(
                                    <div key={a.l} className="px-4 py-3 text-center border-r border-gray-100 last:border-0" style={{background:a.bg}}>
                                        <p className="text-[9px] font-bold uppercase" style={{color:a.c}}>{a.l}</p>
                                        <p className="text-sm font-black" style={{color:a.c}}>{fmt(a.v)}</p>
                                    </div>
                                ))}
                            </div>
                            {/* Invoice rows */}
                            {supInvoices.length>0&&(
                                <div className="overflow-x-auto border-t border-gray-100">
                                    <table className="w-full">
                                        <thead><tr className="bg-gray-50">
                                            {['Invoice #','Date','Due','LPO','Total','Paid','Balance','Status','Action'].map(h=>(
                                                <th key={h} className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase text-left whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr></thead>
                                        <tbody>
                                            {supInvoices.map(inv=>{
                                                const po=inv.po_id?orders.find((o:any)=>o.id===inv.po_id):null;
                                                const isOverdue=inv.status!=='Paid'&&inv.due_date&&new Date(inv.due_date)<new Date();
                                                return(
                                                    <tr key={inv.id} className={`border-t border-gray-100 hover:bg-gray-50 ${isOverdue?'bg-red-50/30':''}`}>
                                                        <td className="px-3 py-2 text-xs font-mono font-bold text-indigo-600">{inv.invoice_number}</td>
                                                        <td className="px-3 py-2 text-xs text-gray-500">{fmtDate(inv.invoice_date)}</td>
                                                        <td className="px-3 py-2 text-xs" style={{color:isOverdue?'#ef4444':'#6b7280'}}>{fmtDate(inv.due_date)}</td>
                                                        <td className="px-3 py-2 text-xs font-mono text-blue-600">{po?.po_number||'—'}</td>
                                                        <td className="px-3 py-2 text-xs font-bold text-gray-700">{fmt(inv.total_amount)}</td>
                                                        <td className="px-3 py-2 text-xs font-bold text-green-600">{fmt(inv.amount_paid)}</td>
                                                        <td className="px-3 py-2 text-xs font-black" style={{color:Number(inv.balance)>0?'#dc2626':'#16a34a'}}>{fmt(inv.balance)}</td>
                                                        <td className="px-3 py-2">{statusBadge(isOverdue?'Overdue':inv.status)}</td>
                                                        <td className="px-3 py-2">
                                                            {inv.status!=='Paid'&&(<button onClick={()=>{setPayForm({...freshPayment(),supplier_id:String(sup.id),invoice_id:String(inv.id),amount:String(inv.balance||inv.total_amount)});setShowPaymentModal(true);}} className="px-2 py-1 text-[10px] font-bold text-white rounded-lg" style={{background:'linear-gradient(135deg,#22c55e,#16a34a)'}}>💳 Pay</button>)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            <tr className="border-t-2 border-blue-200 bg-blue-50">
                                                <td colSpan={4} className="px-3 py-2 text-xs font-bold text-blue-700 text-right">SUPPLIER TOTAL</td>
                                                <td className="px-3 py-2 text-sm font-black text-gray-800">{fmt(totalInvoiced)}</td>
                                                <td className="px-3 py-2 text-sm font-black text-green-600">{fmt(tPaid)}</td>
                                                <td className="px-3 py-2 text-sm font-black" style={{color:balance>0?'#dc2626':'#16a34a'}}>{fmt(balance)}</td>
                                                <td colSpan={2}/>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {supInvoices.length===0&&<div className="px-5 py-4 text-xs text-gray-400 border-t border-gray-100">No invoices for this supplier yet.</div>}
                        </div>
                    );
                })}
            </div>
        )}

        {/* ════ SUPPLIERS TAB ════ */}
        {tab==='suppliers'&&(
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                            {['#','Supplier','Contact','Phone','Email','KRA PIN','Category','Terms','Rating','LPOs','Total Spend','Balance','Status','Actions'].map(h=>(
                                <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {filteredSuppliers.length===0?(<tr><td colSpan={14} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-2">🏢</span><p className="text-sm">No suppliers found</p></td></tr>)
                            :filteredSuppliers.map((s,i)=>{
                                const st=getSupplierStatement(s.id);
                                return(
                                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-2.5 text-xs text-gray-400">{i+1}</td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{background:'linear-gradient(135deg,#1e40af,#3b82f6)'}}>{s.supplier_name?.charAt(0)?.toUpperCase()}</div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800">{s.supplier_name}</p>
                                                    <p className="text-[10px] text-gray-400">{s.address||''}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-gray-600">{s.contact_person||'—'}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-600">{s.phone||'—'}</td>
                                        <td className="px-3 py-2.5 text-xs text-blue-600">{s.email||'—'}</td>
                                        <td className="px-3 py-2.5 text-xs font-mono text-gray-500">{s.kra_pin||'—'}</td>
                                        <td className="px-3 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{s.category}</span></td>
                                        <td className="px-3 py-2.5 text-xs text-gray-500">{s.payment_terms||'—'}</td>
                                        <td className="px-3 py-2.5"><div className="flex gap-0.5">{[1,2,3,4,5].map(n=><FiStar key={n} size={10} className={n<=(s.rating||3)?'text-amber-400 fill-amber-400':'text-gray-200'}/>)}</div></td>
                                        <td className="px-3 py-2.5 text-sm font-black text-blue-600 text-center">{st.supOrders.length}</td>
                                        <td className="px-3 py-2.5 text-sm font-black text-gray-800">{fmt(st.totalInvoiced)}</td>
                                        <td className="px-3 py-2.5 text-sm font-black" style={{color:st.balance>0?'#dc2626':'#16a34a'}}>{fmt(st.balance)}</td>
                                        <td className="px-3 py-2.5">{statusBadge(s.status)}</td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex gap-1">
                                                <button onClick={()=>{setEditing(s);setSupForm({...emptySupplier,...s});setShowSupplierModal(true);}} className="p-1.5 rounded-lg hover:bg-blue-50"><FiEdit2 size={12} className="text-blue-500"/></button>
                                                <button onClick={()=>printStatement(s)} className="p-1.5 rounded-lg hover:bg-indigo-50" title="Print Statement"><FiPrinter size={12} className="text-indigo-500"/></button>
                                                {st.balance>0&&<button onClick={()=>{setPayForm({...freshPayment(),supplier_id:String(s.id)});setShowPaymentModal(true);}} className="px-2 py-1 text-[10px] font-bold text-white rounded-lg" style={{background:'linear-gradient(135deg,#22c55e,#16a34a)'}}>Pay</button>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* ════ ANALYTICS TAB ════ */}
        {tab==='analytics'&&(
            <div className="space-y-5">
                {/* KPI summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        {l:'Total Procurement Value',v:fmt(totalOrderValue),c:'#1e40af',icon:'🛒'},
                        {l:'Total Suppliers',v:suppliers.length,c:'#065f46',icon:'🏢'},
                        {l:'Total Payments Made',v:fmt(totalPaid),c:'#059669',icon:'💳'},
                        {l:'Outstanding Balance',v:fmt(totalOwed),c:'#dc2626',icon:'⚠️'},
                    ].map((k,i)=>(
                        <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5">
                            <div className="text-2xl mb-2">{k.icon}</div>
                            <div style={{fontSize:10,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.5px'}}>{k.l}</div>
                            <div style={{fontSize:22,fontWeight:900,color:k.c,marginTop:4}}>{k.v}</div>
                        </div>
                    ))}
                </div>
                {/* Spend by Category */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50"><p className="text-sm font-bold text-gray-700">📊 Procurement Spend by Category</p></div>
                    <div className="p-5 space-y-3">
                        {categorySpend.length===0?<p className="text-sm text-gray-400 text-center py-8">No data yet</p>:categorySpend.map(([cat,val],i)=>{
                            const pct=totalOrderValue>0?(val/totalOrderValue)*100:0;
                            const colors=['#1e40af','#0369a1','#065f46','#6d28d9','#dc2626','#92400e','#374151','#0284c7'];
                            const color=colors[i%colors.length];
                            return(
                                <div key={cat} className="flex items-center gap-3">
                                    <div className="w-28 text-xs font-semibold text-gray-600 flex-shrink-0 truncate">{cat}</div>
                                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                                        <div style={{width:`${pct}%`,height:'100%',background:color,borderRadius:20,transition:'width 0.6s ease',display:'flex',alignItems:'center',paddingLeft:8}}>
                                            {pct>15&&<span style={{fontSize:10,fontWeight:700,color:'#fff'}}>{pct.toFixed(1)}%</span>}
                                        </div>
                                    </div>
                                    <div className="w-32 text-right text-sm font-black" style={{color}}>{fmt(val)}</div>
                                    {pct<=15&&<div className="w-10 text-xs font-bold text-gray-500">{pct.toFixed(1)}%</div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
                {/* Monthly Payments */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50"><p className="text-sm font-bold text-gray-700">📅 Monthly Payment History</p></div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50"><th className="px-5 py-2 text-[10px] font-bold text-gray-400 uppercase text-left">Month</th><th className="px-5 py-2 text-[10px] font-bold text-gray-400 uppercase text-right">Amount Paid</th><th className="px-5 py-2 text-[10px] font-bold text-gray-400 uppercase text-left">Bar</th></tr></thead>
                            <tbody>
                                {monthlySpend.length===0?<tr><td colSpan={3} className="text-center py-8 text-gray-400">No payment history</td></tr>:monthlySpend.map(([mo,val])=>{
                                    const maxVal=Math.max(...monthlySpend.map(([,v])=>v),1);
                                    return(
                                        <tr key={mo} className="border-t border-gray-100 hover:bg-gray-50">
                                            <td className="px-5 py-3 text-sm font-bold text-gray-700">{mo}</td>
                                            <td className="px-5 py-3 text-sm font-black text-green-600 text-right">{fmt(val)}</td>
                                            <td className="px-5 py-3">
                                                <div className="bg-gray-100 rounded-full h-5 overflow-hidden w-48">
                                                    <div style={{width:`${(val/maxVal)*100}%`,height:'100%',background:'linear-gradient(135deg,#22c55e,#16a34a)',borderRadius:20}}/>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* Top Suppliers */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50"><p className="text-sm font-bold text-gray-700">🏆 Top Suppliers by Spend</p></div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50"><th className="px-5 py-2 text-[10px] font-bold text-gray-400 uppercase text-left">#</th><th className="px-5 py-2 text-[10px] font-bold text-gray-400 uppercase text-left">Supplier</th><th className="px-5 py-2 text-[10px] font-bold text-gray-400 uppercase text-center">LPOs</th><th className="px-5 py-2 text-[10px] font-bold text-gray-400 uppercase text-right">Total Invoiced</th><th className="px-5 py-2 text-[10px] font-bold text-gray-400 uppercase text-right">Total Paid</th><th className="px-5 py-2 text-[10px] font-bold text-gray-400 uppercase text-right">Balance</th></tr></thead>
                            <tbody>
                                {suppliers.slice().sort((a,b)=>{const sa=getSupplierStatement(a.id);const sb=getSupplierStatement(b.id);return sb.totalInvoiced-sa.totalInvoiced;}).map((s,i)=>{
                                    const st=getSupplierStatement(s.id);
                                    if(st.totalInvoiced===0) return null;
                                    return(
                                        <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                                            <td className="px-5 py-3"><span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white" style={{background:i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#b45309':'#6b7280'}}>{i+1}</span></td>
                                            <td className="px-5 py-3 text-sm font-bold text-gray-800">{s.supplier_name}</td>
                                            <td className="px-5 py-3 text-sm font-bold text-blue-600 text-center">{st.supOrders.length}</td>
                                            <td className="px-5 py-3 text-sm font-black text-gray-800 text-right">{fmt(st.totalInvoiced)}</td>
                                            <td className="px-5 py-3 text-sm font-bold text-green-600 text-right">{fmt(st.totalPaid)}</td>
                                            <td className="px-5 py-3 text-sm font-black text-right" style={{color:st.balance>0?'#dc2626':'#16a34a'}}>{fmt(st.balance)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* ════ SUPPLIER MODAL ════ */}
        {showSupplierModal&&(
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={()=>setShowSupplierModal(false)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                    <div className="px-6 py-4 border-b flex items-center justify-between" style={{background:'linear-gradient(135deg,#1e40af,#3b82f6)'}}>
                        <h3 className="text-base font-extrabold text-white flex items-center gap-2"><FiTruck/> {editing?'Edit Supplier':'Add New Supplier'}</h3>
                        <button onClick={()=>setShowSupplierModal(false)} className="text-white/70 hover:text-white"><FiX/></button>
                    </div>
                    <div className="p-6 grid grid-cols-2 gap-3">
                        <div className="col-span-2"><label className={lbl}>Supplier Name *</label><input value={supForm.supplier_name} onChange={e=>setSupForm({...supForm,supplier_name:e.target.value})} className={inputCls}/></div>
                        <div><label className={lbl}>Contact Person</label><input value={supForm.contact_person} onChange={e=>setSupForm({...supForm,contact_person:e.target.value})} className={inputCls}/></div>
                        <div><label className={lbl}>Phone</label><input value={supForm.phone} onChange={e=>setSupForm({...supForm,phone:e.target.value})} className={inputCls} placeholder="0712345678"/></div>
                        <div><label className={lbl}>Email</label><input value={supForm.email} onChange={e=>setSupForm({...supForm,email:e.target.value})} className={inputCls}/></div>
                        <div><label className={lbl}>KRA PIN</label><input value={supForm.kra_pin} onChange={e=>setSupForm({...supForm,kra_pin:e.target.value})} className={inputCls} placeholder="P0123456789X"/></div>
                        <div><label className={lbl}>Bank Name</label><input value={supForm.bank_name} onChange={e=>setSupForm({...supForm,bank_name:e.target.value})} className={inputCls}/></div>
                        <div><label className={lbl}>Account No.</label><input value={supForm.bank_account} onChange={e=>setSupForm({...supForm,bank_account:e.target.value})} className={inputCls}/></div>
                        <div><label className={lbl}>Bank Branch</label><input value={supForm.bank_branch} onChange={e=>setSupForm({...supForm,bank_branch:e.target.value})} className={inputCls}/></div>
                        <div><label className={lbl}>Category</label><select value={supForm.category} onChange={e=>setSupForm({...supForm,category:e.target.value})} className={inputCls}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
                        <div><label className={lbl}>Payment Terms</label><select value={supForm.payment_terms} onChange={e=>setSupForm({...supForm,payment_terms:e.target.value})} className={inputCls}>{PAY_TERMS.map(t=><option key={t}>{t}</option>)}</select></div>
                        <div><label className={lbl}>Status</label><select value={supForm.status} onChange={e=>setSupForm({...supForm,status:e.target.value})} className={inputCls}><option>Active</option><option>Inactive</option></select></div>
                        <div className="col-span-2"><label className={lbl}>Address</label><textarea value={supForm.address} onChange={e=>setSupForm({...supForm,address:e.target.value})} className={inputCls} rows={2}/></div>
                        <div className="col-span-2"><label className={lbl}>Notes</label><textarea value={supForm.notes} onChange={e=>setSupForm({...supForm,notes:e.target.value})} className={inputCls} rows={2}/></div>
                    </div>
                    <div className="px-6 py-4 border-t flex justify-end gap-2">
                        <button onClick={()=>setShowSupplierModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition">Cancel</button>
                        <button onClick={saveSupplier} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl shadow-md disabled:opacity-50 transition" style={{background:'linear-gradient(135deg,#1e40af,#3b82f6)'}}>{saving?'Saving…':editing?'Update Supplier':'Add Supplier'}</button>
                    </div>
                </div>
            </div>
        )}

        {/* ════ LPO MODAL ════ */}
        {showPOModal&&(
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={()=>setShowPOModal(false)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                    <div className="px-6 py-4 border-b flex items-center justify-between" style={{background:'linear-gradient(135deg,#06b6d4,#0891b2)'}}>
                        <h3 className="text-base font-extrabold text-white flex items-center gap-2"><FiShoppingCart/> Create Local Purchase Order (LPO)</h3>
                        <button onClick={()=>setShowPOModal(false)} className="text-white/70 hover:text-white"><FiX/></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2"><label className={lbl}>Supplier *</label>
                                <select value={poForm.supplier_id} onChange={e=>setPoForm({...poForm,supplier_id:e.target.value})} className={inputCls}>
                                    <option value="">Select Supplier…</option>
                                    {suppliers.filter(s=>s.status==='Active').map(s=><option key={s.id} value={s.id}>{s.supplier_name}</option>)}
                                </select>
                            </div>
                            <div><label className={lbl}>Order Date</label><input type="date" value={poForm.order_date} onChange={e=>setPoForm({...poForm,order_date:e.target.value})} className={inputCls}/></div>
                            <div><label className={lbl}>Expected Delivery</label><input type="date" value={poForm.delivery_date} onChange={e=>setPoForm({...poForm,delivery_date:e.target.value})} className={inputCls}/></div>
                            <div><label className={lbl}>Payment Terms</label><select value={poForm.payment_terms} onChange={e=>setPoForm({...poForm,payment_terms:e.target.value})} className={inputCls}>{PAY_TERMS.map(t=><option key={t}>{t}</option>)}</select></div>
                            <div><label className={lbl}>Category</label><select value={poForm.category} onChange={e=>setPoForm({...poForm,category:e.target.value})} className={inputCls}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
                        </div>
                        {/* Line Items */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className={lbl}>Order Items *</label>
                                <button onClick={addItem} className="text-xs font-bold text-cyan-600 hover:text-cyan-800 flex items-center gap-1 transition"><FiPlus size={11}/> Add Item</button>
                            </div>
                            <div className="space-y-2">
                                {poForm.items.map((it:any,idx:number)=>(
                                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-xl p-2.5">
                                        {/* ── Searchable Item Dropdown ── */}
                                        <div className="col-span-5 relative">
                                            <input
                                                value={itemSearches[idx]??it.item_description}
                                                onChange={e=>{
                                                    const v=e.target.value;
                                                    setItemSearches(s=>{const a=[...s];a[idx]=v;return a;});
                                                    updateItem(idx,'item_description',v);
                                                    setItemDropdownOpen(idx);
                                                }}
                                                onFocus={()=>setItemDropdownOpen(idx)}
                                                onBlur={()=>setTimeout(()=>setItemDropdownOpen(null),200)}
                                                className={inputCls}
                                                placeholder="Search store items…"
                                                autoComplete="off"
                                            />
                                            {itemDropdownOpen===idx && (
                                                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                                                    {storeItems.filter(s=>
                                                        !itemSearches[idx] ||
                                                        s.item_name.toLowerCase().includes((itemSearches[idx]||'').toLowerCase()) ||
                                                        (s.item_code||'').toLowerCase().includes((itemSearches[idx]||'').toLowerCase())
                                                    ).length===0
                                                        ? <div className="px-3 py-2 text-xs text-gray-400 italic">No items found in store</div>
                                                        : storeItems.filter(s=>
                                                            !itemSearches[idx] ||
                                                            s.item_name.toLowerCase().includes((itemSearches[idx]||'').toLowerCase()) ||
                                                            (s.item_code||'').toLowerCase().includes((itemSearches[idx]||'').toLowerCase())
                                                          ).map(s=>(
                                                            <button
                                                                key={s.id}
                                                                type="button"
                                                                onMouseDown={()=>{
                                                                    updateItem(idx,'item_description',s.item_name);
                                                                    updateItem(idx,'unit',s.unit||'Pieces');
                                                                    updateItem(idx,'unit_price',s.unit_price||0);
                                                                    setItemSearches(a=>{const n=[...a];n[idx]=s.item_name;return n;});
                                                                    setItemDropdownOpen(null);
                                                                }}
                                                                className="w-full text-left px-3 py-2 text-xs hover:bg-cyan-50 border-b last:border-0 border-gray-100 flex items-center justify-between gap-2"
                                                            >
                                                                <span className="font-semibold text-gray-800">{s.item_name}</span>
                                                                <span className="text-gray-400 shrink-0">{s.item_code} · {s.unit} · KES {Number(s.unit_price||0).toLocaleString()}</span>
                                                            </button>
                                                          ))
                                                    }
                                                </div>
                                            )}
                                        </div>
                                        <div className="col-span-2"><input type="number" value={it.quantity} onChange={e=>updateItem(idx,'quantity',e.target.value)} className={inputCls} min="1" placeholder="Qty"/></div>
                                        <div className="col-span-2"><select value={it.unit} onChange={e=>updateItem(idx,'unit',e.target.value)} className={inputCls}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></div>
                                        <div className="col-span-2"><input type="number" value={it.unit_price} onChange={e=>updateItem(idx,'unit_price',e.target.value)} className={inputCls} min="0" step="0.01" placeholder="Unit Price"/></div>
                                        <div className="col-span-1 flex items-center justify-center">
                                            {poForm.items.length>1&&<button onClick={()=>removeItem(idx)} className="p-1.5 rounded-lg hover:bg-red-100 transition"><FiX size={12} className="text-red-500"/></button>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 flex justify-end gap-6 text-sm font-bold text-gray-700">
                                <span>Subtotal: {fmt(poSubtotal)}</span>
                                <span className="text-blue-600">VAT 16%: {fmt(poVAT)}</span>
                                <span className="text-lg text-blue-800">Grand Total: {fmt(poSubtotal+poVAT)}</span>
                            </div>
                        </div>
                        <div><label className={lbl}>Notes</label><textarea value={poForm.notes} onChange={e=>setPoForm({...poForm,notes:e.target.value})} className={inputCls} rows={2}/></div>
                    </div>
                    <div className="px-6 py-4 border-t flex justify-end gap-2">
                        <button onClick={()=>setShowPOModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition">Cancel</button>
                        <button onClick={savePO} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl shadow-md disabled:opacity-50" style={{background:'linear-gradient(135deg,#06b6d4,#0891b2)'}}>{saving?'Creating LPO…':'✅ Create LPO'}</button>
                    </div>
                </div>
            </div>
        )}

        {/* ════ INVOICE MODAL ════ */}
        {showInvoiceModal&&(
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={()=>setShowInvoiceModal(false)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                    <div className="px-6 py-4 border-b flex items-center justify-between" style={{background:'linear-gradient(135deg,#f59e0b,#d97706)'}}>
                        <h3 className="text-base font-extrabold text-white flex items-center gap-2"><FiFileText/> Record Supplier Invoice</h3>
                        <button onClick={()=>setShowInvoiceModal(false)} className="text-white/70 hover:text-white"><FiX/></button>
                    </div>
                    <div className="p-6 grid grid-cols-2 gap-3">
                        <div><label className={lbl}>Invoice Number *</label><input value={invForm.invoice_number} onChange={e=>setInvForm({...invForm,invoice_number:e.target.value})} className={`${inputCls} font-mono`}/></div>
                        <div><label className={lbl}>Supplier Invoice Ref</label><input value={invForm.supplier_invoice_ref} onChange={e=>setInvForm({...invForm,supplier_invoice_ref:e.target.value})} className={`${inputCls} font-mono`} placeholder="Supplier's own ref no."/></div>
                        <div><label className={lbl}>Supplier *</label>
                            <select value={invForm.supplier_id} onChange={e=>setInvForm({...invForm,supplier_id:e.target.value})} className={inputCls}>
                                <option value="">Select…</option>
                                {suppliers.map(s=><option key={s.id} value={s.id}>{s.supplier_name}</option>)}
                            </select>
                        </div>
                        <div><label className={lbl}>Link to LPO</label>
                            <select value={invForm.po_id} onChange={e=>onSelectPO(e.target.value)} className={inputCls}>
                                <option value="">No linked LPO</option>
                                {orders.filter(o=>o.status!=='Cancelled').map(o=><option key={o.id} value={o.id}>{o.po_number} — {getSupplier(o.supplier_id)?.supplier_name}</option>)}
                            </select>
                        </div>
                        <div><label className={lbl}>Invoice Date</label><input type="date" value={invForm.invoice_date} onChange={e=>setInvForm({...invForm,invoice_date:e.target.value})} className={inputCls}/></div>
                        <div><label className={lbl}>Due Date</label><input type="date" value={invForm.due_date} onChange={e=>setInvForm({...invForm,due_date:e.target.value})} className={inputCls}/></div>
                        <div><label className={lbl}>Subtotal (KES)</label><input type="number" value={invForm.subtotal} onChange={e=>setInvForm({...invForm,subtotal:e.target.value})} className={inputCls} min="0" step="0.01"/></div>
                        <div><label className={lbl}>VAT Amount (KES)</label><input type="number" value={invForm.vat_amount} onChange={e=>setInvForm({...invForm,vat_amount:e.target.value})} className={inputCls} min="0" step="0.01"/></div>
                        <div className="col-span-2"><label className={lbl}>Total Amount (KES) *</label><input type="number" value={invForm.total_amount} onChange={e=>setInvForm({...invForm,total_amount:e.target.value})} className={`${inputCls} text-lg font-black text-amber-700`} min="0" step="0.01" placeholder="0.00"/></div>
                        <div><label className={lbl}>Category</label><select value={invForm.category} onChange={e=>setInvForm({...invForm,category:e.target.value})} className={inputCls}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
                        <div><label className={lbl}>Description</label><input value={invForm.description} onChange={e=>setInvForm({...invForm,description:e.target.value})} className={inputCls} placeholder="Brief description of goods/services"/></div>
                        <div className="col-span-2"><label className={lbl}>Notes</label><textarea value={invForm.notes} onChange={e=>setInvForm({...invForm,notes:e.target.value})} className={inputCls} rows={2}/></div>
                    </div>
                    <div className="px-6 py-4 border-t flex justify-end gap-2">
                        <button onClick={()=>setShowInvoiceModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition">Cancel</button>
                        <button onClick={saveInvoice} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl shadow-md disabled:opacity-50" style={{background:'linear-gradient(135deg,#f59e0b,#d97706)'}}>{saving?'Recording…':'🧾 Record Invoice'}</button>
                    </div>
                </div>
            </div>
        )}

        {/* ════ PAYMENT MODAL ════ */}
        {showPaymentModal&&(
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={()=>setShowPaymentModal(false)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                    <div className="px-6 py-4 border-b flex items-center justify-between" style={{background:'linear-gradient(135deg,#22c55e,#16a34a)'}}>
                        <h3 className="text-base font-extrabold text-white flex items-center gap-2"><FiDollarSign/> Record Supplier Payment</h3>
                        <button onClick={()=>setShowPaymentModal(false)} className="text-white/70 hover:text-white"><FiX/></button>
                    </div>
                    <div className="p-6 grid grid-cols-2 gap-3">
                        <div><label className={lbl}>Payment Number</label><input value={payForm.payment_number} onChange={e=>setPayForm({...payForm,payment_number:e.target.value})} className={`${inputCls} font-mono`}/></div>
                        <div><label className={lbl}>Payment Date</label><input type="date" value={payForm.payment_date} onChange={e=>setPayForm({...payForm,payment_date:e.target.value})} className={inputCls}/></div>
                        <div className="col-span-2"><label className={lbl}>Supplier *</label>
                            <select value={payForm.supplier_id} onChange={e=>setPayForm({...payForm,supplier_id:e.target.value,invoice_id:''})} className={inputCls}>
                                <option value="">Select Supplier…</option>
                                {suppliers.map(s=><option key={s.id} value={s.id}>{s.supplier_name}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2"><label className={lbl}>Link to Invoice (optional)</label>
                            <select value={payForm.invoice_id} onChange={e=>setPayForm({...payForm,invoice_id:e.target.value,amount:e.target.value?String(invoices.find((i:any)=>String(i.id)===e.target.value)?.balance||''):payForm.amount})} className={inputCls}>
                                <option value="">No linked invoice</option>
                                {invoices.filter(i=>String(i.supplier_id)===payForm.supplier_id&&i.status!=='Paid'&&i.status!=='Voided').map(i=><option key={i.id} value={i.id}>{i.invoice_number} — Balance: {fmt(i.balance)}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2"><label className={lbl}>Amount (KES) *</label><input type="number" value={payForm.amount} onChange={e=>setPayForm({...payForm,amount:e.target.value})} className={`${inputCls} text-lg font-black text-green-700`} min="0" step="0.01" placeholder="0.00"/></div>
                        <div><label className={lbl}>Payment Method</label><select value={payForm.payment_method} onChange={e=>setPayForm({...payForm,payment_method:e.target.value})} className={inputCls}>{PAY_METHODS.map(m=><option key={m}>{m}</option>)}</select></div>
                        <div><label className={lbl}>Reference No. (Cheque/Bank)</label><input value={payForm.reference_number} onChange={e=>setPayForm({...payForm,reference_number:e.target.value})} className={`${inputCls} font-mono`} placeholder="CHQ001 / Bank ref…"/></div>
                        <div><label className={lbl}>Bank Name</label><input value={payForm.bank_name} onChange={e=>setPayForm({...payForm,bank_name:e.target.value})} className={inputCls} placeholder="e.g. KCB, Equity…"/></div>
                        <div><label className={lbl}>Notes</label><input value={payForm.notes} onChange={e=>setPayForm({...payForm,notes:e.target.value})} className={inputCls}/></div>
                    </div>
                    <div className="px-6 py-4 border-t flex justify-end gap-2">
                        <button onClick={()=>setShowPaymentModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition">Cancel</button>
                        <button onClick={savePayment} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl shadow-md disabled:opacity-50" style={{background:'linear-gradient(135deg,#22c55e,#16a34a)'}}>{saving?'Recording…':'✅ Record Payment'}</button>
                    </div>
                </div>
            </div>
        )}

        </div>
    );
}
