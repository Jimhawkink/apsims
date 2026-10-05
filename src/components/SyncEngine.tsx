'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { replayQueue, getQueue, getQueueSize } from '@/lib/offline-queue';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

// ─── Types ────────────────────────────────────────────────────────────────────
type SyncPhase = 'idle' | 'syncing' | 'success' | 'error';

// ─── Animated sync overlay ────────────────────────────────────────────────────
function SyncOverlay({
    phase, done, total, currentLabel, onClose,
}: {
    phase: SyncPhase;
    done: number;
    total: number;
    currentLabel: string;
    onClose: () => void;
}) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{
                background: 'rgba(10,8,40,0.82)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                fontFamily: 'Outfit, Inter, sans-serif',
            }}
        >
            <style>{`
                @keyframes apsims-spin { to { transform: rotate(360deg); } }
                @keyframes apsims-orb { 0%,100%{transform:scale(1) translate(0,0);opacity:.5} 50%{transform:scale(1.15) translate(8px,-6px);opacity:.8} }
                @keyframes apsims-orb2 { 0%,100%{transform:scale(1) translate(0,0);opacity:.4} 50%{transform:scale(1.1) translate(-6px,8px);opacity:.7} }
                @keyframes apsims-pulse { 0%,100%{opacity:.4;transform:scale(.95)} 50%{opacity:1;transform:scale(1.05)} }
                @keyframes apsims-fadein { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
                @keyframes apsims-ping { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(2.2);opacity:0} }
                @keyframes apsims-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
                @keyframes apsims-progress { from{width:0%} }
            `}</style>

            {/* Glow orbs in backdrop */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: '15%', left: '20%', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,.5),transparent 70%)', animation: 'apsims-orb 5s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,rgba(168,85,247,.45),transparent 70%)', animation: 'apsims-orb2 6s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 200, borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(56,189,248,.15),transparent 70%)' }} />
            </div>

            {/* Card */}
            <div
                style={{
                    position: 'relative', width: '100%', maxWidth: 460, margin: '0 16px',
                    background: 'linear-gradient(145deg,rgba(30,27,80,.95),rgba(20,16,60,.98))',
                    border: '1px solid rgba(99,102,241,.35)',
                    borderRadius: 32,
                    boxShadow: '0 32px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04), inset 0 1px 0 rgba(255,255,255,.08)',
                    overflow: 'hidden',
                    animation: 'apsims-fadein .4s cubic-bezier(.4,0,.2,1) both',
                }}
            >
                {/* Top shimmer line */}
                <div style={{ height: 3, background: phase === 'success' ? 'linear-gradient(90deg,#10b981,#34d399,#10b981)' : phase === 'error' ? 'linear-gradient(90deg,#ef4444,#f97316)' : 'linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa,#8b5cf6,#6366f1)', backgroundSize: '300% 100%', animation: phase === 'syncing' ? 'apsims-progress 0.8s ease-in-out both' : 'none' }} />

                <div style={{ padding: '36px 36px 32px' }}>

                    {/* Icon */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
                        <div style={{ position: 'relative', width: 88, height: 88 }}>
                            {/* Ping rings */}
                            {phase === 'syncing' && (
                                <>
                                    <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '2px solid rgba(99,102,241,.4)', animation: 'apsims-ping 1.6s cubic-bezier(0,0,.2,1) infinite' }} />
                                    <div style={{ position: 'absolute', inset: -16, borderRadius: '50%', border: '2px solid rgba(99,102,241,.2)', animation: 'apsims-ping 1.6s cubic-bezier(0,0,.2,1) .5s infinite' }} />
                                </>
                            )}
                            {/* Icon bg */}
                            <div style={{
                                width: 88, height: 88, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: phase === 'success'
                                    ? 'linear-gradient(135deg,#10b981,#059669)'
                                    : phase === 'error'
                                    ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                                    : 'linear-gradient(135deg,#6366f1,#8b5cf6,#a78bfa)',
                                boxShadow: phase === 'success'
                                    ? '0 8px 32px rgba(16,185,129,.5)'
                                    : phase === 'error'
                                    ? '0 8px 32px rgba(239,68,68,.5)'
                                    : '0 8px 32px rgba(99,102,241,.5)',
                                animation: phase === 'syncing' ? 'apsims-spin 1.2s linear infinite' : phase === 'success' ? 'apsims-bounce .6s ease' : 'none',
                                fontSize: 38,
                            }}>
                                {phase === 'success' ? '✅' : phase === 'error' ? '⚠️' : '🔄'}
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <h2 style={{
                        textAlign: 'center', fontWeight: 900, fontSize: 22, letterSpacing: -.5,
                        background: phase === 'success'
                            ? 'linear-gradient(135deg,#34d399,#10b981)'
                            : phase === 'error'
                            ? 'linear-gradient(135deg,#fca5a5,#ef4444)'
                            : 'linear-gradient(135deg,#fff 0%,#c7d2fe 50%,#e9d5ff 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                        marginBottom: 8,
                    }}>
                        {phase === 'success' ? 'Sync Complete!' : phase === 'error' ? 'Some Items Failed' : 'Syncing to Cloud…'}
                    </h2>

                    <p style={{ textAlign: 'center', color: 'rgba(165,180,252,.75)', fontSize: 13, marginBottom: 28, lineHeight: 1.5 }}>
                        {phase === 'success'
                            ? `${done} item${done !== 1 ? 's' : ''} synced successfully to the database`
                            : phase === 'error'
                            ? 'Some items failed. They will retry on next connection.'
                            : 'Uploading offline data captured while you were disconnected'}
                    </p>

                    {/* Progress bar */}
                    {(phase === 'syncing' || phase === 'success') && total > 0 && (
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(165,180,252,.6)', textTransform: 'uppercase', letterSpacing: 1 }}>Progress</span>
                                <span style={{ fontSize: 11, fontWeight: 900, color: phase === 'success' ? '#34d399' : '#c7d2fe' }}>{pct}%</span>
                            </div>
                            <div style={{ height: 8, background: 'rgba(255,255,255,.06)', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,.06)' }}>
                                <div style={{
                                    height: '100%', borderRadius: 8, transition: 'width .5s cubic-bezier(.4,0,.2,1)',
                                    width: `${pct}%`,
                                    background: phase === 'success'
                                        ? 'linear-gradient(90deg,#10b981,#34d399)'
                                        : 'linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa)',
                                    boxShadow: phase === 'success'
                                        ? '0 0 12px rgba(16,185,129,.6)'
                                        : '0 0 12px rgba(99,102,241,.6)',
                                }} />
                            </div>
                        </div>
                    )}

                    {/* Current item */}
                    {phase === 'syncing' && currentLabel && (
                        <div style={{
                            padding: '12px 16px', borderRadius: 14, marginBottom: 20,
                            background: 'rgba(99,102,241,.1)', border: '1px solid rgba(99,102,241,.2)',
                            display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#818cf8', flexShrink: 0, animation: 'apsims-pulse 1s ease-in-out infinite' }} />
                            <span style={{ fontSize: 12, color: 'rgba(199,210,254,.9)', fontWeight: 600, flex: 1 }}>{currentLabel}</span>
                            <span style={{ fontSize: 11, color: 'rgba(165,180,252,.5)', fontWeight: 700, flexShrink: 0 }}>{done}/{total}</span>
                        </div>
                    )}

                    {/* Stats chips */}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
                        <div style={{ padding: '8px 16px', borderRadius: 12, background: 'rgba(99,102,241,.12)', border: '1px solid rgba(99,102,241,.2)', textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 900, color: '#a78bfa' }}>{total}</div>
                            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(165,180,252,.5)', textTransform: 'uppercase', letterSpacing: 1 }}>Queued</div>
                        </div>
                        <div style={{ padding: '8px 16px', borderRadius: 12, background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)', textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 900, color: '#34d399' }}>{done}</div>
                            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(52,211,153,.5)', textTransform: 'uppercase', letterSpacing: 1 }}>Synced</div>
                        </div>
                        <div style={{ padding: '8px 16px', borderRadius: 12, background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.15)', textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 900, color: '#818cf8' }}>{Math.max(0, total - done)}</div>
                            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(165,180,252,.5)', textTransform: 'uppercase', letterSpacing: 1 }}>Remaining</div>
                        </div>
                    </div>

                    {/* Done / Close button */}
                    {(phase === 'success' || phase === 'error') && (
                        <button
                            onClick={onClose}
                            style={{
                                width: '100%', padding: '14px', borderRadius: 18, border: 'none', cursor: 'pointer',
                                fontWeight: 900, fontSize: 14, fontFamily: 'Outfit, Inter, sans-serif',
                                background: phase === 'success'
                                    ? 'linear-gradient(135deg,#10b981,#059669)'
                                    : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                color: '#fff',
                                boxShadow: phase === 'success'
                                    ? '0 6px 24px rgba(16,185,129,.45)'
                                    : '0 6px 24px rgba(99,102,241,.45)',
                                transition: 'transform .15s, box-shadow .15s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                        >
                            {phase === 'success' ? '🎉 Awesome! Continue Working' : '🔁 Close & Retry Later'}
                        </button>
                    )}

                    {/* APSIMS brand */}
                    <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(165,180,252,.25)', marginTop: 20, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
                        APSIMS · Offline-First Sync Engine
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── Offline banner ───────────────────────────────────────────────────────────
function OfflineBanner({ queueSize }: { queueSize: number }) {
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9998,
            background: 'linear-gradient(90deg,#1e1b4b,#312e81,#1e1b4b)',
            padding: '10px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,.4)',
            fontFamily: 'Outfit, Inter, sans-serif',
            animation: 'apsims-fadein .3s ease both',
        }}>
            <style>{`@keyframes apsims-fadein{from{opacity:0;transform:translateY(-100%)}to{opacity:1;transform:translateY(0)}}`}</style>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', animation: 'apsims-pulse 1s ease-in-out infinite' }} />
            <span style={{ fontWeight: 900, fontSize: 13, color: '#fff' }}>📡 You are offline</span>
            <span style={{ fontSize: 12, color: 'rgba(199,210,254,.7)' }}>
                {queueSize > 0
                    ? `— ${queueSize} change${queueSize !== 1 ? 's' : ''} queued, will sync when back online`
                    : '— Changes will be queued and synced automatically'}
            </span>
        </div>
    );
}

// ─── Main exported hook + component ──────────────────────────────────────────
export function useSyncEngine() {
    const { isOnline, wasOffline, clearWasOffline } = useNetworkStatus();
    const [phase, setPhase] = useState<SyncPhase>('idle');
    const [done, setDone] = useState(0);
    const [total, setTotal] = useState(0);
    const [currentLabel, setCurrentLabel] = useState('');
    const [showOverlay, setShowOverlay] = useState(false);

    const runSync = useCallback(async () => {
        const size = getQueueSize();
        if (size === 0) { clearWasOffline(); return; }

        setTotal(size);
        setDone(0);
        setCurrentLabel('');
        setPhase('syncing');
        setShowOverlay(true);

        const { success, failed } = await replayQueue(
            supabase,
            (d, t, label) => {
                setDone(d);
                setTotal(t);
                setCurrentLabel(label);
            }
        );

        setDone(success);
        setPhase(failed > 0 ? 'error' : 'success');
        clearWasOffline();
    }, [clearWasOffline]);

    // Auto-trigger sync when coming back online
    useEffect(() => {
        if (wasOffline && isOnline) {
            // Small delay to let connection stabilise
            const t = setTimeout(runSync, 1200);
            return () => clearTimeout(t);
        }
    }, [wasOffline, isOnline, runSync]);

    const closeOverlay = useCallback(() => {
        setShowOverlay(false);
        setPhase('idle');
    }, []);

    const queueSize = getQueueSize();

    return {
        isOnline,
        queueSize,
        SyncUI: (
            <>
                {!isOnline && <OfflineBanner queueSize={queueSize} />}
                {showOverlay && phase !== 'idle' && (
                    <SyncOverlay
                        phase={phase}
                        done={done}
                        total={total}
                        currentLabel={currentLabel}
                        onClose={closeOverlay}
                    />
                )}
            </>
        ),
    };
}

export default useSyncEngine;
