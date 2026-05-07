'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiDownload, FiUpload, FiShield, FiClock, FiDatabase, FiRefreshCw, FiCheckCircle, FiAlertTriangle, FiHardDrive } from 'react-icons/fi';

export default function UltraBackupPage() {
    const [backing, setBacking] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(true);

    const fetchLogs = useCallback(async () => {
        setLoadingLogs(true);
        const { data } = await supabase.from('school_backup_logs').select('*').order('created_at', { ascending: false }).limit(20);
        setLogs(data || []);
        setLoadingLogs(false);
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const handleBackup = async () => {
        setBacking(true);
        toast.loading('Creating full database backup...', { id: 'backup' });
        try {
            const res = await fetch('/api/backup');
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Backup failed'); }
            const blob = await res.blob();
            const tables = res.headers.get('X-Backup-Tables') || '?';
            const records = res.headers.get('X-Backup-Records') || '?';
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = res.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'APSIMS_Backup.json';
            a.click();
            toast.success(`Backup complete! ${tables} tables, ${records} records`, { id: 'backup', duration: 5000 });
            fetchLogs();
        } catch (err: any) {
            toast.error(err.message || 'Backup failed', { id: 'backup' });
        }
        setBacking(false);
    };

    const handleRestore = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (!confirm(`⚠️ RESTORE WARNING\n\nThis will INSERT data from "${file.name}" into your database.\n\nExisting data will NOT be deleted, but duplicates may cause errors.\n\nAre you sure?`)) return;
            setRestoring(true);
            toast.loading('Restoring from backup...', { id: 'restore' });
            try {
                const text = await file.text();
                const json = JSON.parse(text);
                if (!json._meta?.format) throw new Error('Invalid backup file');
                const res = await fetch('/api/backup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text });
                const result = await res.json();
                if (result.success) {
                    toast.success(`Restored ${result.restored_tables} tables, ${result.total_records} records`, { id: 'restore', duration: 5000 });
                } else { toast.error(result.error || 'Restore failed', { id: 'restore' }); }
                fetchLogs();
            } catch (err: any) { toast.error(err.message || 'Restore failed', { id: 'restore' }); }
            setRestoring(false);
        };
        input.click();
    };

    const formatSize = (kb: number) => kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
    const formatDate = (d: string) => new Date(d).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FiHardDrive className="text-indigo-500" /> Ultra Database Backup
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Full database backup &amp; restore to keep your school data safe</p>
                </div>
                <button onClick={fetchLogs} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 self-start">
                    <FiRefreshCw size={12} /> Refresh
                </button>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Backup Card */}
                <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6">
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                        <FiDatabase size={128} />
                    </div>
                    <div className="relative z-10">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            <FiDownload className="text-white" size={24} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800 mb-2">Create Backup</h2>
                        <p className="text-sm text-gray-500 mb-4">Download a complete snapshot of all school data as a JSON file. Includes students, teachers, fees, exams, attendance, and more.</p>
                        <ul className="text-xs text-gray-500 space-y-1 mb-6">
                            <li className="flex items-center gap-1"><FiCheckCircle size={10} className="text-green-500" /> 40+ database tables</li>
                            <li className="flex items-center gap-1"><FiCheckCircle size={10} className="text-green-500" /> Full pagination (no data limits)</li>
                            <li className="flex items-center gap-1"><FiCheckCircle size={10} className="text-green-500" /> Automatic backup logging</li>
                            <li className="flex items-center gap-1"><FiShield size={10} className="text-blue-500" /> Encrypted in transit (HTTPS)</li>
                        </ul>
                        <button onClick={handleBackup} disabled={backing}
                            className="w-full py-3 px-6 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
                            style={{ background: backing ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            {backing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating Backup...</>
                                : <><FiDownload size={16} /> Download Full Backup</>}
                        </button>
                    </div>
                </div>

                {/* Restore Card */}
                <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6">
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                        <FiUpload size={128} />
                    </div>
                    <div className="relative z-10">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                            <FiUpload className="text-white" size={24} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800 mb-2">Restore from Backup</h2>
                        <p className="text-sm text-gray-500 mb-4">Upload a previously downloaded backup file to restore school data. Data is inserted without deleting existing records.</p>
                        <ul className="text-xs text-gray-500 space-y-1 mb-6">
                            <li className="flex items-center gap-1"><FiAlertTriangle size={10} className="text-amber-500" /> Admin-only operation</li>
                            <li className="flex items-center gap-1"><FiCheckCircle size={10} className="text-green-500" /> Smart table ordering (FK-safe)</li>
                            <li className="flex items-center gap-1"><FiCheckCircle size={10} className="text-green-500" /> Batch insert (500 rows/batch)</li>
                            <li className="flex items-center gap-1"><FiShield size={10} className="text-blue-500" /> Validates backup format</li>
                        </ul>
                        <button onClick={handleRestore} disabled={restoring}
                            className="w-full py-3 px-6 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
                            style={{ background: restoring ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                            {restoring ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Restoring...</>
                                : <><FiUpload size={16} /> Upload &amp; Restore Backup</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Backup History */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><FiClock size={16} /> Backup History</h3>
                </div>
                {loadingLogs ? (
                    <div className="p-8 text-center">
                        <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-xs text-gray-400">Loading history...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-12 text-center">
                        <FiDatabase className="mx-auto mb-3 text-gray-300" size={32} />
                        <p className="text-sm text-gray-400">No backups yet. Create your first backup above.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50"><tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tables</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Records</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Size</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">By</th>
                            </tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {logs.map((log, i) => (
                                    <tr key={log.id || i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-xs text-gray-600">{formatDate(log.created_at)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${log.backup_type === 'full' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {log.backup_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs">{log.table_count}</td>
                                        <td className="px-4 py-3 font-mono text-xs font-bold">{log.record_count?.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{log.file_size_kb ? formatSize(log.file_size_kb) : '-'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${log.status === 'Success' ? 'bg-green-100 text-green-700' : log.status === 'Partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-600">{log.created_by}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Best Practices */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6">
                <h3 className="font-bold text-indigo-800 mb-3 flex items-center gap-2"><FiShield size={16} /> Backup Best Practices</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { title: 'Weekly Backups', desc: 'Download a full backup every Friday before end of week' },
                        { title: 'Before Updates', desc: 'Always backup before running database migrations or system updates' },
                        { title: 'Secure Storage', desc: 'Store backups on Google Drive, USB drive, or external hard disk' },
                        { title: 'Test Restores', desc: 'Periodically test restore on a staging environment to verify integrity' },
                    ].map((tip, i) => (
                        <div key={i} className="bg-white/70 rounded-xl p-4">
                            <p className="text-xs font-bold text-indigo-700 mb-1">{tip.title}</p>
                            <p className="text-[11px] text-gray-600">{tip.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
