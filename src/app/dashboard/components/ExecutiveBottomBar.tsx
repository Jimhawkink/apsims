'use client';

import { useState } from 'react';
import {
    FiChevronLeft,
    FiChevronRight,
    FiChevronDown,
    FiPrinter,
    FiDownload,
    FiShare2,
    FiMaximize2,
    FiPower,
    FiMoon,
    FiSun,
} from 'react-icons/fi';

interface ExecutiveBottomBarProps {
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    pageSize?: number;
    onPageSizeChange?: (size: number) => void;
    statusFilter?: string;
    onStatusFilterChange?: (status: string) => void;
}

export default function ExecutiveBottomBar({
    currentPage = 1,
    totalPages = 3,
    onPageChange,
    pageSize = 10,
    onPageSizeChange,
    statusFilter = 'All Statuses',
    onStatusFilterChange,
}: ExecutiveBottomBarProps) {
    const [page, setPage] = useState(currentPage);
    const [themeDark, setThemeDark] = useState(false);
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(statusFilter);

    const handlePageClick = (p: number) => {
        setPage(p);
        if (onPageChange) onPageChange(p);
    };

    const handlePrint = () => {
        if (typeof window !== 'undefined') window.print();
    };

    const handleFullscreen = () => {
        if (typeof window !== 'undefined') {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
        }
    };

    const handleShare = () => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
            alert('Dashboard URL copied to clipboard!');
        }
    };

    return (
        <div className="bg-white/90 backdrop-blur-xl border border-white/95 rounded-[22px] px-4 py-2.5 shadow-[0_4px_24px_rgba(20,50,120,0.06),0_1px_3px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3 transition-all">
            {/* ── LEFT: Status Badges & Dropdown ── */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100/80 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Active
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100/80 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    On Time
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100/80 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Overdue
                </span>

                {/* Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                        className="flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 px-3 py-1 rounded-full border border-slate-200 transition-all cursor-pointer"
                    >
                        <span>{selectedStatus}</span>
                        <FiChevronDown size={11} className="text-slate-400" />
                    </button>
                    {statusDropdownOpen && (
                        <div className="absolute left-0 bottom-full mb-1 w-32 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 text-[11px]">
                            {['All Statuses', 'Active Only', 'On Time Only', 'Overdue Only'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => {
                                        setSelectedStatus(s);
                                        setStatusDropdownOpen(false);
                                        if (onStatusFilterChange) onStatusFilterChange(s);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-blue-50 hover:text-blue-600 font-semibold text-slate-700"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── CENTER: Pagination Controls `< 1 2 3 >` & Rows per page ── */}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => handlePageClick(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="w-7 h-7 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                        title="Previous"
                    >
                        <FiChevronLeft size={13} />
                    </button>

                    {Array.from({ length: Math.min(5, Math.max(1, totalPages)) }, (_, i) => i + 1).map(p => (
                        <button
                            key={p}
                            onClick={() => handlePageClick(p)}
                            className={`w-7 h-7 rounded-lg text-xs font-black transition-all ${
                                page === p
                                    ? 'bg-blue-600 text-white shadow-xs scale-105'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            {p}
                        </button>
                    ))}

                    <button
                        onClick={() => handlePageClick(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="w-7 h-7 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                        title="Next"
                    >
                        <FiChevronRight size={13} />
                    </button>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-full border border-slate-200 text-[10px] font-bold text-slate-600">
                    <span>{pageSize} / page</span>
                    <FiChevronDown size={10} className="text-slate-400" />
                </div>
            </div>

            {/* ── RIGHT: Theme Switcher & Action Icons ── */}
            <div className="flex items-center gap-3">
                {/* Theme Toggle Moon / Sun Switch */}
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                    <span>Theme</span>
                    <div
                        onClick={() => setThemeDark(!themeDark)}
                        className="w-12 h-6 bg-[#f0f5fc] border border-[#e2ecf8] rounded-full p-0.5 flex items-center cursor-pointer shadow-inner relative transition-colors"
                    >
                        <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 shadow-xs ${
                                themeDark
                                    ? 'translate-x-6 bg-slate-800 text-amber-300'
                                    : 'translate-x-0 bg-blue-600 text-white'
                            }`}
                        >
                            {themeDark ? <FiMoon size={11} /> : <FiSun size={11} />}
                        </div>
                    </div>
                </div>

                {/* Vertical Divider */}
                <span className="w-px h-5 bg-slate-200" />

                {/* 5 Action Buttons */}
                <div className="flex items-center gap-1.5 text-slate-600">
                    <button
                        onClick={handlePrint}
                        className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200/80 flex items-center justify-center transition-all shadow-2xs hover:scale-105"
                        title="Print Dashboard"
                    >
                        <FiPrinter size={13} />
                    </button>
                    <button
                        onClick={() => alert('Exporting dashboard PDF / Excel snapshot...')}
                        className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200/80 flex items-center justify-center transition-all shadow-2xs hover:scale-105"
                        title="Download Report"
                    >
                        <FiDownload size={13} />
                    </button>
                    <button
                        onClick={handleShare}
                        className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-purple-50 hover:text-purple-600 border border-slate-200/80 flex items-center justify-center transition-all shadow-2xs hover:scale-105"
                        title="Share Dashboard Link"
                    >
                        <FiShare2 size={13} />
                    </button>
                    <button
                        onClick={handleFullscreen}
                        className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 flex items-center justify-center transition-all shadow-2xs hover:scale-105"
                        title="Toggle Fullscreen"
                    >
                        <FiMaximize2 size={13} />
                    </button>
                    <button
                        onClick={() => {
                            if (confirm('Log out from APSIMS Executive Session?')) {
                                window.location.href = '/';
                            }
                        }}
                        className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 flex items-center justify-center transition-all shadow-2xs hover:scale-105"
                        title="Log Out"
                    >
                        <FiPower size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
}
