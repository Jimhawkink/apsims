'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const DOCK_ITEMS = [
    { href: '/dashboard',                    icon: '🏠', label: 'Home',      color: '#3b82f6' },
    { href: '/dashboard/students',           icon: '👨‍🎓', label: 'Students',  color: '#10b981' },
    { href: '/dashboard/fees/collect',       icon: '💰', label: 'Fees',      color: '#22c55e' },
    { href: '/dashboard/exams/marks',        icon: '📝', label: 'Marks',     color: '#8b5cf6' },
    { href: '/dashboard/learning',           icon: '🎬', label: 'Learning',  color: '#f59e0b' },
    { href: '/dashboard/settings',           icon: '⚙️', label: 'Settings',  color: '#64748b' },
];

export default function FloatingDock() {
    const pathname = usePathname();
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    return (
        <div style={{
            position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            zIndex: 997, display: 'flex', alignItems: 'flex-end', gap: 8,
            padding: '10px 16px',
            background: 'rgba(15,23,42,0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: 24,
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
        }}>
            {DOCK_ITEMS.map((item, i) => {
                const isActive = pathname === item.href;
                const isHovered = hoveredIdx === i;
                const isNear = hoveredIdx !== null && Math.abs(hoveredIdx - i) === 1;

                // Magnify effect: hovered=60px, adjacent=50px, rest=40px
                const size = isHovered ? 60 : isNear ? 50 : 40;

                return (
                    <div key={item.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        {/* Tooltip */}
                        {isHovered && (
                            <div style={{
                                position: 'absolute', bottom: '100%', marginBottom: 8,
                                background: 'rgba(0,0,0,0.85)', color: '#fff',
                                fontSize: 11, fontWeight: 700, padding: '4px 10px',
                                borderRadius: 8, whiteSpace: 'nowrap',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                pointerEvents: 'none',
                                animation: 'fadeUp 0.15s ease-out',
                            }}>
                                {item.label}
                            </div>
                        )}
                        <Link
                            href={item.href}
                            onMouseEnter={() => setHoveredIdx(i)}
                            onMouseLeave={() => setHoveredIdx(null)}
                            style={{
                                width: size, height: size,
                                borderRadius: size * 0.25,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: size * 0.5,
                                background: isActive
                                    ? `${item.color}33`
                                    : isHovered
                                    ? 'rgba(255,255,255,0.15)'
                                    : 'rgba(255,255,255,0.07)',
                                border: isActive
                                    ? `2px solid ${item.color}88`
                                    : '2px solid transparent',
                                boxShadow: isActive ? `0 0 12px ${item.color}44` : 'none',
                                transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                                cursor: 'pointer', textDecoration: 'none',
                                position: 'relative',
                            }}
                        >
                            {item.icon}
                            {/* Active dot */}
                            {isActive && (
                                <div style={{
                                    position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
                                    width: 4, height: 4, borderRadius: '50%',
                                    background: item.color,
                                    boxShadow: `0 0 6px ${item.color}`,
                                }} />
                            )}
                        </Link>
                    </div>
                );
            })}
            <style>{`
                @keyframes fadeUp { from{transform:translateY(4px);opacity:0} to{transform:translateY(0);opacity:1} }
            `}</style>
        </div>
    );
}
