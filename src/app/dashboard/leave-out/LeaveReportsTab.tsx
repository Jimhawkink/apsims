'use client';
import { useState, useMemo } from 'react';
import { FiSearch, FiDownload, FiCalendar, FiBarChart2, FiFilter, FiPrinter, FiTrendingUp, FiUsers } from 'react-icons/fi';

interface Props {
    leaveOuts: any[]; forms: any[]; streams: any[]; LEAVE_REASONS: string[];
}

const RC: Record<string,string> = { Medication:'#3b82f6', Discipline:'#ef4444', Personal:'#8b5cf6', Emergency:'#f97316', Appointment:'#06b6d4', Illness:'#22c55e', Family:'#f59e0b', Other:'#6b7280' };

export default function LeaveReportsTab({ leaveOuts, forms, streams, LEAVE_REASONS }: Props) {
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filterReason, setFilterReason] = useState('');
    const [filterForm, setFilterForm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const fn = (id: number) => forms.find((f:any) => f.id === id)?.form_name || '';
    const sn = (id: number) => streams.find((s:any) => s.id === id)?.stream_name || '';

    const filtered = useMemo(() => {
        return leaveOuts.filter(l => {
            const st = l.school_students;
            const name = st ? `${st.first_name} ${st.last_name} ${st.admission_number}`.toLowerCase() : '';
            if (search && !name.includes(search.toLowerCase())) return false;
            if (filterReason && l.reason !== filterReason) return false;
            if (filterStatus && l.status !== filterStatus) return false;
            if (filterForm && st?.form_id !== parseInt(filterForm)) return false;
            if (dateFrom && new Date(l.created_at) < new Date(dateFrom)) return false;
            if (dateTo && new Date(l.created_at) > new Date(dateTo + 'T23:59:59')) return false;
            return true;
        });
    }, [leaveOuts, search, filterReason, filterStatus, filterForm, dateFrom, dateTo]);

    // Analytics
    const totalDays = filtered.reduce((s:number, l:any) => s + (l.leave_days||0), 0);
    const avgDuration = filtered.length > 0 ? Math.round(filtered.filter(l => l.time_returned).reduce((s:number, l:any) => {
        const mins = Math.round((new Date(l.time_returned).getTime() - new Date(l.time_left).getTime()) / 60000);
        return s + mins;
    }, 0) / Math.max(filtered.filter(l => l.time_returned).length, 1)) : 0;

    const reasonBreakdown = LEAVE_REASONS.map(r => ({ reason: r, count: filtered.filter(l => l.reason === r).length, color: RC[r] })).filter(r => r.count > 0).sort((a,b) => b.count - a.count);
    const maxCount = Math.max(...reasonBreakdown.map(r => r.count), 1);

    // Top students by leave count
    const studentLeaves: Record<string, { name: string; adm: string; count: number; days: number }> = {};
    filtered.forEach(l => {
        const st = l.school_students;
        if (!st) return;
        const key = `${st.id}`;
        if (!studentLeaves[key]) studentLeaves[key] = { name: `${st.first_name} ${st.last_name}`, adm: st.admission_number, count: 0, days: 0 };
        studentLeaves[key].count++;
        studentLeaves[key].days += (l.leave_days || 0);
    });
    const topStudents = Object.values(studentLeaves).sort((a,b) => b.count - a.count).slice(0, 10);

    // Form breakdown
    const formBreakdown = forms.map((f:any) => ({
        form: f.form_name, count: filtered.filter(l => l.school_students?.form_id === f.id).length
    })).filter(f => f.count > 0).sort((a,b) => b.count - a.count);
    const maxForm = Math.max(...formBreakdown.map(f => f.count), 1);

    // CSV Export
    const exportCSV = () => {
        const headers = ['Date','Time Left','Student','Adm No','Form','Stream','Reason','Details','Leave Days','Status','Returned At','Authorized By','SMS Sent'];
        const rows = filtered.map(l => {
            const st = l.school_students;
            return [
                new Date(l.created_at).toLocaleDateString('en-GB'),
                new Date(l.time_left).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'}),
                st ? `${st.first_name} ${st.last_name}` : '',
                st?.admission_number||'', fn(st?.form_id), sn(st?.stream_id),
                l.reason, l.reason_details||'', l.leave_days||0, l.status,
                l.time_returned ? new Date(l.time_returned).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'}) : '',
                l.authorized_by||'', l.sms_sent ? 'Yes' : 'No'
            ].join(',');
        });
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `leave_out_report_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    };

    return (
        <div className="space-y-5">
            {/* Filters Bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[180px]">
                        <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={14}/>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..."
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 transition"/>
                    </div>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 transition"/>
                    <span className="text-xs text-gray-400">to</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 transition"/>
                    <select value={filterReason} onChange={e => setFilterReason(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none transition">
                        <option value="">All Reasons</option>
                        {LEAVE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select value={filterForm} onChange={e => setFilterForm(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none transition">
                        <option value="">All Forms</option>
                        {forms.map((f:any) => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none transition">
                        <option value="">All Status</option>
                        <option value="Out">Still Out</option>
                        <option value="Returned">Returned</option>
                    </select>
                    <button onClick={exportCSV} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition">
                        <FiDownload size={12}/> Export CSV
                    </button>
                </div>
            </div>

            {/* Analytics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total Records', value: filtered.length, icon: FiBarChart2, color: '#f97316' },
                    { label: 'Total Leave Days', value: totalDays, icon: FiCalendar, color: '#3b82f6' },
                    { label: 'Avg Duration', value: `${Math.floor(avgDuration/60)}h ${avgDuration%60}m`, icon: FiTrendingUp, color: '#8b5cf6' },
                    { label: 'Unique Students', value: Object.keys(studentLeaves).length, icon: FiUsers, color: '#22c55e' },
                ].map((k,i) => {
                    const Icon = k.icon;
                    return (
                        <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${k.color}15` }}>
                                    <Icon size={14} style={{ color: k.color }}/>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{k.label}</span>
                            </div>
                            <p className="text-2xl font-black text-gray-900">{k.value}</p>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Reason Breakdown Chart */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><FiBarChart2 size={14} className="text-orange-500"/> Reason Breakdown</h3>
                    <div className="space-y-3">
                        {reasonBreakdown.map(r => (
                            <div key={r.reason}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-gray-600">{r.reason}</span>
                                    <span className="text-xs font-bold text-gray-900">{r.count} ({Math.round(r.count/filtered.length*100)}%)</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all" style={{ width: `${(r.count/maxCount)*100}%`, background: r.color }}/>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Form Breakdown */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><FiUsers size={14} className="text-blue-500"/> By Form/Class</h3>
                    <div className="space-y-3">
                        {formBreakdown.map(f => (
                            <div key={f.form}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-gray-600">{f.form}</span>
                                    <span className="text-xs font-bold text-gray-900">{f.count}</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all" style={{ width: `${(f.count/maxForm)*100}%`, background: '#3b82f6' }}/>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Students */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-50">
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><FiTrendingUp size={14} className="text-red-500"/> Frequent Leavers</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {topStudents.map((s, i) => (
                            <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-[10px] font-black text-gray-300 w-4">{i+1}</span>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-900">{s.name}</p>
                                        <p className="text-[10px] text-gray-400">{s.adm}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-gray-900">{s.count}x</p>
                                    <p className="text-[9px] text-gray-400">{s.days} days</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Records Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-800">Leave Records ({filtered.length})</h3>
                    <button onClick={() => window.print()} className="text-[10px] font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1"><FiPrinter size={11}/> Print</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                <th className="px-4 py-3 text-left">Date</th>
                                <th className="px-4 py-3 text-left">Student</th>
                                <th className="px-4 py-3 text-left">Form</th>
                                <th className="px-4 py-3 text-left">Reason</th>
                                <th className="px-4 py-3 text-center">Days</th>
                                <th className="px-4 py-3 text-left">Left At</th>
                                <th className="px-4 py-3 text-left">Returned</th>
                                <th className="px-4 py-3 text-left">Auth By</th>
                                <th className="px-4 py-3 text-center">SMS</th>
                                <th className="px-4 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.slice(0, 100).map(l => {
                                const st = l.school_students;
                                return (
                                    <tr key={l.id} className="hover:bg-orange-50/30 transition">
                                        <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{new Date(l.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</td>
                                        <td className="px-4 py-2.5">
                                            <p className="text-xs font-semibold text-gray-900">{st?.first_name} {st?.last_name}</p>
                                            <p className="text-[10px] text-gray-400">{st?.admission_number}</p>
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-gray-600">{fn(st?.form_id)} {sn(st?.stream_id)}</td>
                                        <td className="px-4 py-2.5">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${RC[l.reason]}12`, color: RC[l.reason] }}>{l.reason}</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-center text-xs font-bold text-gray-700">{l.leave_days||0}</td>
                                        <td className="px-4 py-2.5 text-xs text-gray-600">{new Date(l.time_left).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'})}</td>
                                        <td className="px-4 py-2.5 text-xs text-gray-600">{l.time_returned ? new Date(l.time_returned).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                                        <td className="px-4 py-2.5 text-xs text-gray-600">{l.authorized_by}</td>
                                        <td className="px-4 py-2.5 text-center">{l.sms_sent ? <span className="text-green-500 text-xs">✓</span> : <span className="text-gray-300 text-xs">—</span>}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${l.status==='Out' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{l.status}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 100 && <p className="px-5 py-3 text-xs text-gray-400 text-center border-t border-gray-50">Showing 100 of {filtered.length} records. Export CSV for full data.</p>}
            </div>
        </div>
    );
}
