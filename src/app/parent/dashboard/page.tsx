'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// /parent/dashboard → redirect to the real parent portal
export default function ParentDashboardRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/portal/parent');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0F2044,#1E3A5F)' }}>
            <div className="text-center">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-2xl animate-pulse" style={{ background: 'linear-gradient(135deg,#7C3AED,#6D28D9)' }}>
                    <span className="text-4xl">👨‍👩‍👧</span>
                </div>
                <h1 className="text-2xl font-black text-white mb-2">APSIMS Parent Portal</h1>
                <p className="text-blue-200 text-sm mb-4">Redirecting to your dashboard…</p>
                <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <p className="text-blue-300 text-xs mt-4">
                    Not redirected?{' '}
                    <a href="/portal/parent" className="text-violet-300 font-bold hover:underline">Click here</a>
                    {' '}or{' '}
                    <a href="/portal/login" className="text-blue-300 font-bold hover:underline">Login</a>
                </p>
            </div>
        </div>
    );
}
