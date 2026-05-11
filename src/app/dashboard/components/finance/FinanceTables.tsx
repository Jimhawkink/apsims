'use client';
import { fmt, fmtK } from './financeHelpers';

export default function FinanceTables({ data }: { data: any }) {
  const statusColor = (s: string) => {
    const map: Record<string, string> = { Critical: 'bg-red-50 text-red-600', Overdue: 'bg-amber-50 text-amber-600', 'Notice Sent': 'bg-blue-50 text-blue-600', Posted: 'bg-emerald-50 text-emerald-600', 'Pending eTIMS': 'bg-amber-50 text-amber-600', Reconciled: 'text-emerald-600', Unreconciled: 'text-amber-600', Today: 'text-blue-500', Credited: 'bg-emerald-50 text-emerald-600', Pending: 'bg-amber-50 text-amber-600', Queued: 'bg-blue-50 text-blue-500' };
    return map[s] || 'bg-gray-50 text-gray-500';
  };
  const methodBadge = (m: string) => {
    const map: Record<string, string> = { 'M-Pesa': 'bg-emerald-50 text-emerald-600', Bank: 'bg-blue-50 text-blue-600', Cash: 'bg-amber-50 text-amber-600', HELB: 'bg-purple-50 text-purple-600', Cheque: 'bg-pink-50 text-pink-600' };
    return map[m] || 'bg-gray-50 text-gray-500';
  };

  return (
    <>
      {/* Aged Debtors + Alerts & Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-8 ultra-panel">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-bold text-gray-700">Aged debtors — fee balances outstanding</h3>
            <div className="flex items-center gap-2">
              {['All balances', 'All forms', 'All ages'].map((f, i) => (
                <span key={i} className="text-[8px] text-gray-400 font-medium px-2 py-0.5 rounded border border-gray-100 cursor-pointer hover:bg-gray-50">▼ {f}</span>
              ))}
            </div>
          </div>
          <div className="ultra-table-wrap">
            <table className="ultra-grid">
              <thead><tr><th>Adm no</th><th>Student</th><th>Form</th><th>Invoiced</th><th>Paid</th><th>Balance</th><th>Days</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {data.agedDebtors.map((d: any, i: number) => (
                  <tr key={i}>
                    <td className="font-mono text-[10px] text-gray-400">{d.admNo}</td>
                    <td className="font-semibold text-[11px] text-blue-600">{d.student}</td>
                    <td className="text-[10px]">{d.form}</td>
                    <td className="text-[10px] font-medium">{fmt(d.invoiced)}</td>
                    <td className="text-[10px] font-medium">{fmt(d.paid)}</td>
                    <td className="text-[10px] font-bold text-red-500">{fmt(d.balance)}</td>
                    <td className="text-[10px] font-semibold">{d.days}d</td>
                    <td><span className={`text-[8px] font-bold px-2 py-0.5 rounded-md ${statusColor(d.status)}`}>{d.status}</span></td>
                    <td><button className="text-[8px] font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">SMS</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts & Compliance */}
        <div className="lg:col-span-4 ultra-panel">
          <h3 className="text-[11px] font-bold text-gray-700 mb-3">Alerts & compliance</h3>
          <div className="space-y-2.5">
            {data.alerts.map((a: any, i: number) => (
              <div key={i} className="flex gap-2.5">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: a.color }} />
                <div>
                  <p className="text-[10px] font-bold text-gray-700 leading-tight">{a.text}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">{a.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HELB & Bursary + KRA eTIMS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* HELB & Bursary Tracking */}
        <div className="lg:col-span-6 ultra-panel">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-bold text-gray-700">HELB & bursary tracking</h3>
            <span className="text-[8px] text-gray-400">disbursements this term</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'HELB disbursed', value: data.bursaryKpis.helb, color: '#8b5cf6' },
              { label: 'County bursary', value: data.bursaryKpis.county, color: '#3b82f6' },
              { label: 'CDF bursary', value: data.bursaryKpis.cdf, color: '#10b981' },
            ].map((b, i) => (
              <div key={i} className="text-center p-3 rounded-xl bg-gradient-to-b from-white to-gray-50 border border-gray-100">
                <p className="text-[18px] font-extrabold" style={{ color: b.color }}>{fmt(b.value)}</p>
                <p className="text-[8px] text-gray-400 font-semibold uppercase mt-1">{b.label}</p>
              </div>
            ))}
          </div>
          <div className="ultra-table-wrap">
            <table className="ultra-grid">
              <thead><tr><th>Student</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {data.bursaryStudents.map((b: any, i: number) => (
                  <tr key={i}>
                    <td className="font-semibold text-[11px] text-blue-600">{b.student}</td>
                    <td className="text-[10px] font-medium">{b.type}</td>
                    <td className="text-[10px] font-medium">{fmt(b.amount)}</td>
                    <td><span className={`text-[8px] font-bold px-2 py-0.5 rounded-md ${statusColor(b.status)}`}>{b.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* KRA eTIMS & Compliance */}
        <div className="lg:col-span-6 ultra-panel">
          <h3 className="text-[11px] font-bold text-gray-700 mb-3">KRA eTIMS & compliance</h3>
          <div className="space-y-3">
            {[
              { label: 'eTIMS VSCU active', detail: `Token valid · expires ${data.etimsConfig.vscuExpiry}`, status: data.etimsConfig.vscu === 'Active' ? 'OK' : 'Expired', color: data.etimsConfig.vscu === 'Active' ? '#10b981' : '#ef4444' },
              { label: `${data.etimsConfig.pending} receipts pending upload`, detail: `Last sync: ${data.etimsConfig.lastSync}`, status: 'Action', color: '#f59e0b' },
              { label: `PAYE ${data.etimsConfig.paye}`, detail: `iTax · ${data.etimsConfig.payeAmount}`, status: 'Filed', color: '#3b82f6' },
              { label: `NSSF ${data.etimsConfig.nssf}`, detail: data.etimsConfig.nssfAmount, status: data.etimsConfig.nssf.includes('not') ? 'Overdue' : 'OK', color: data.etimsConfig.nssf.includes('not') ? '#ef4444' : '#10b981' },
              { label: 'TCC valid', detail: `Expires ${data.etimsConfig.tccExpiry}`, status: data.etimsConfig.tcc, color: data.etimsConfig.tcc === 'OK' ? '#10b981' : '#ef4444' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50/50 border border-gray-100">
                <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-gray-700">{item.label}</p>
                  <p className="text-[9px] text-gray-400 truncate">{item.detail}</p>
                </div>
                <span className={`text-[9px] font-bold px-2.5 py-1 rounded-md flex-shrink-0 ${item.status === 'OK' ? 'bg-emerald-50 text-emerald-600' : item.status === 'Overdue' ? 'bg-red-50 text-red-600' : item.status === 'Filed' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latest Payments Feed */}
      <div className="ultra-panel">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-bold text-gray-700">Latest payments — real time feed</h3>
          <span className="text-[9px] font-semibold text-blue-500 cursor-pointer hover:text-blue-700">View all →</span>
        </div>
        <div className="ultra-table-wrap">
          <table className="ultra-grid">
            <thead><tr><th>Date & time</th><th>Adm no.</th><th>Student</th><th>Form / stream</th><th>Amount</th><th>Method</th><th>Reference</th><th>Receipt</th><th>Vote head</th><th>Status</th></tr></thead>
            <tbody>
              {data.latestPayments.map((p: any, i: number) => (
                <tr key={i}>
                  <td className="text-[10px] text-gray-500 whitespace-nowrap">{p.date}</td>
                  <td className="font-mono text-[10px] text-gray-400">{p.admNo}</td>
                  <td className="font-semibold text-[11px] text-blue-600">{p.student}</td>
                  <td className="text-[10px]">{p.formStream}</td>
                  <td className="text-[10px] font-bold text-gray-800">{fmt(p.amount)}</td>
                  <td><span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${methodBadge(p.method)}`}>{p.method}</span></td>
                  <td className="text-[9px] font-mono text-gray-400">{p.reference}</td>
                  <td className="text-[9px] font-mono text-gray-500">{p.receipt}</td>
                  <td className="text-[10px] text-gray-600">{p.voteHead}</td>
                  <td><span className={`text-[8px] font-bold px-2 py-0.5 rounded-md ${statusColor(p.status)}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bank Reconciliation */}
      <div className="ultra-panel">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-bold text-gray-700">Bank reconciliation status</h3>
          <span className="text-[9px] font-semibold text-blue-500 cursor-pointer hover:text-blue-700">all accounts</span>
        </div>
        <div className="ultra-table-wrap">
          <table className="ultra-grid">
            <thead><tr><th>Bank</th><th>Account</th><th>Book balance</th><th>Bank balance</th><th>Difference</th><th>Status</th></tr></thead>
            <tbody>
              {data.bankAccounts.map((b: any, i: number) => (
                <tr key={i}>
                  <td className="font-semibold text-[11px] text-gray-700">{b.bank}</td>
                  <td className="font-mono text-[10px] text-gray-400">{b.account}</td>
                  <td className="text-[10px] font-medium">{fmt(b.bookBal)}</td>
                  <td className="text-[10px] font-medium">{fmt(b.bankBal)}</td>
                  <td className={`text-[10px] font-bold ${b.diff === 0 ? 'text-emerald-600' : b.diff < 0 ? 'text-red-500' : 'text-amber-500'}`}>{b.diff === 0 ? fmt(0) : fmt(b.diff)}</td>
                  <td><span className={`text-[9px] font-bold ${statusColor(b.status)}`}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
