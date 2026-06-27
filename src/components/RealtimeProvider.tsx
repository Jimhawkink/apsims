'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

const fmt = (n: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

/**
 * RealtimeProvider — subscribes to live Supabase events and:
 *  1. Shows toast notifications for new fee payments
 *  2. Automatically invalidates TanStack Query cache so UI refreshes
 *  3. Broadcasts attendance updates
 *
 * Mount once inside the dashboard layout.
 */
export default function RealtimeProvider() {
    const queryClient = useQueryClient();
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    useEffect(() => {
        // Only run client-side and if Supabase is configured
        if (typeof window === 'undefined') return;

        const channel = supabase
            .channel('apsims-realtime-hub')

            // ── Fee Payments: new payment recorded ────────────────────────
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'school_fee_payments' },
                (payload) => {
                    const p = payload.new as any;
                    const amount = fmt(Number(p.amount || 0));
                    const method = (p.payment_method || 'payment').toUpperCase();
                    const student = p.student_name || 'A student';

                    // Premium styled toast notification
                    toast.custom(
                        (t) => (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '14px 18px',
                                    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                                    border: '1px solid #6ee7b7',
                                    borderRadius: '16px',
                                    boxShadow: '0 8px 32px rgba(16,185,129,0.15)',
                                    maxWidth: '380px',
                                    opacity: t.visible ? 1 : 0,
                                    transition: 'opacity 0.3s ease',
                                }}
                            >
                                <div style={{
                                    width: 44, height: 44, borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '20px', flexShrink: 0,
                                }}>
                                    💰
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, color: '#065f46', fontSize: '14px' }}>
                                        {amount} received
                                    </div>
                                    <div style={{ color: '#047857', fontSize: '12px', marginTop: '2px' }}>
                                        {student} · {method} {p.receipt_no ? `· ${p.receipt_no}` : ''}
                                    </div>
                                    <div style={{
                                        display: 'inline-block', marginTop: '6px',
                                        background: '#10b981', color: '#fff',
                                        borderRadius: '6px', padding: '2px 8px',
                                        fontSize: '10px', fontWeight: 700,
                                    }}>
                                        🔴 LIVE
                                    </div>
                                </div>
                            </div>
                        ),
                        { duration: 8000, position: 'bottom-right' }
                    );

                    // Invalidate fee queries so dashboard auto-refreshes
                    queryClient.invalidateQueries({ queryKey: ['fees'] });
                    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                    queryClient.invalidateQueries({ queryKey: ['fee-payments'] });
                }
            )

            // ── Attendance: marked for today ──────────────────────────────
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'school_attendance' },
                () => {
                    // Silently refresh attendance cache
                    queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance'] });
                }
            )

            // ── Students: new student admitted ────────────────────────────
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'school_students' },
                (payload) => {
                    const s = payload.new as any;
                    toast(`🎓 New student admitted: ${s.full_name || 'New student'}`, {
                        icon: '🎓',
                        duration: 5000,
                        style: {
                            background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                            color: '#1e40af',
                            border: '1px solid #93c5fd',
                            borderRadius: '16px',
                        },
                    });
                    queryClient.invalidateQueries({ queryKey: ['students'] });
                    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                }
            )

            // ── Discipline: new incident recorded ─────────────────────────
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'school_discipline_cases' },
                (payload) => {
                    const d = payload.new as any;
                    if (d.severity === 'critical' || d.severity === 'high') {
                        toast(`🚨 ${d.severity?.toUpperCase()} discipline case: ${d.student_name || 'Student'}`, {
                            duration: 6000,
                            style: {
                                background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                                color: '#991b1b',
                                border: '1px solid #fca5a5',
                                borderRadius: '16px',
                            },
                        });
                    }
                }
            )

            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[APSIMS Realtime] ✅ Connected to live updates');
                }
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [queryClient]);

    // This component renders nothing — it's purely a side-effect provider
    return null;
}
