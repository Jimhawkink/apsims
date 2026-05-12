'use client';

import { FiSearch, FiX, FiDollarSign, FiMessageSquare, FiCreditCard, FiTrendingUp, FiArrowRight } from 'react-icons/fi';

interface FilterBarProps {
    search: string;
    setSearch: (v: string) => void;
    filterForm: string;
    setFilterForm: (v: string) => void;
    filterStream: string;
    setFilterStream: (v: string) => void;
    filterGender: string;
    setFilterGender: (v: string) => void;
    filterStatus: string;
    setFilterStatus: (v: string) => void;
    filterCurriculum: string;
    setFilterCurriculum: (v: string) => void;
    forms: any[];
    streams: any[];
    filteredCount: number;
    setPage: (v: number) => void;
}

export function StudentFilterBar({
    search, setSearch, filterForm, setFilterForm, filterStream, setFilterStream,
    filterGender, setFilterGender, filterStatus, setFilterStatus,
    filterCurriculum, setFilterCurriculum, forms, streams, filteredCount, setPage,
}: FilterBarProps) {
    const hasFilters = search || filterForm || filterStream || filterGender || filterStatus || filterCurriculum;

    const clearAll = () => {
        setSearch(''); setFilterForm(''); setFilterStream('');
        setFilterGender(''); setFilterStatus(''); setFilterCurriculum('');
        setPage(1);
    };

    const selectClass = "px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none transition-all cursor-pointer hover:border-gray-300 appearance-none min-w-[130px]";

    return (
        <div className="space-y-3">
            {/* Search */}
            <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                    type="text"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search name, adm no, NEMIS, guardian..."
                    className="w-full pl-11 pr-10 py-3 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none transition-all placeholder:text-gray-400"
                    style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                />
                {search && (
                    <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <FiX size={16} />
                    </button>
                )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap gap-2.5">
                <select value={filterForm} onChange={e => { setFilterForm(e.target.value); setPage(1); }} className={selectClass}>
                    <option value="">All forms</option>
                    {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                </select>

                <select value={filterStream} onChange={e => { setFilterStream(e.target.value); setPage(1); }} className={selectClass}>
                    <option value="">All streams</option>
                    {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                </select>

                <select value={filterGender} onChange={e => { setFilterGender(e.target.value); setPage(1); }} className={selectClass}>
                    <option value="">All genders</option>
                    <option value="Male">♂ Male</option>
                    <option value="Female">♀ Female</option>
                </select>

                <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className={selectClass}>
                    <option value="">All statuses</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Transferred">Transferred</option>
                    <option value="Graduated">Graduated</option>
                    <option value="Suspended">Suspended</option>
                </select>

                <select value={filterCurriculum} onChange={e => { setFilterCurriculum(e.target.value); setPage(1); }} className={selectClass}>
                    <option value="">All curricula</option>
                    <option value="CBC">CBC</option>
                    <option value="844">8-4-4</option>
                </select>

                {hasFilters && (
                    <button
                        onClick={clearAll}
                        className="px-3 py-2.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-all flex items-center gap-1"
                    >
                        <FiX size={12} /> Clear all
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Bulk Action Bar ─────────────────────────────────────────────
interface BulkActionBarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onCollectFee: () => void;
    onSmsParents: () => void;
    onGenerateId: () => void;
    onPromote: () => void;
    onTransfer: () => void;
}

export function BulkActionBar({
    selectedCount, onClearSelection, onCollectFee, onSmsParents, onGenerateId, onPromote, onTransfer
}: BulkActionBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl border border-blue-200 animate-slide-up"
            style={{
                background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                boxShadow: '0 8px 32px rgba(59,130,246,0.25), 0 0 0 1px rgba(59,130,246,0.1)',
                backdropFilter: 'blur(8px)',
            }}
        >
            <div className="flex items-center gap-2 pr-3 border-r border-blue-200">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    {selectedCount}
                </div>
                <span className="text-sm font-semibold text-blue-800">selected</span>
                <button onClick={onClearSelection} className="ml-1 text-blue-400 hover:text-blue-600">
                    <FiX size={16} />
                </button>
            </div>

            <button onClick={onCollectFee} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-all">
                <FiDollarSign size={13} /> Collect fee
            </button>
            <button onClick={onSmsParents} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all">
                <FiMessageSquare size={13} /> SMS parents
            </button>
            <button onClick={onGenerateId} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-all">
                <FiCreditCard size={13} /> Generate ID
            </button>
            <button onClick={onPromote} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-all">
                <FiTrendingUp size={13} /> Promote
            </button>
            <button onClick={onTransfer} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all">
                <FiArrowRight size={13} /> Transfer
            </button>
        </div>
    );
}
