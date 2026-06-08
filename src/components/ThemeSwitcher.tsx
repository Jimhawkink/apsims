'use client';

import { useState } from 'react';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';

const THEMES: { id: AppTheme; label: string; icon: string; desc: string; bg: string }[] = [
    {
        id: 'default',
        label: 'Default',
        icon: '🌑',
        desc: 'Dark sidebar (original)',
        bg: 'linear-gradient(135deg,#0f172a,#1e293b)',
    },
    {
        id: 'light-soft',
        label: 'Light Soft',
        icon: '🌸',
        desc: 'Warm pastel gradients',
        bg: 'linear-gradient(135deg,#fdf6ff,#e0f2fe)',
    },
    {
        id: 'full-system',
        label: 'Full System',
        icon: '🌐',
        desc: 'App Hub + Dock + Cmd+K',
        bg: 'linear-gradient(135deg,#0a0f1e,#1e1b4b)',
    },
];

export default function ThemeSwitcher() {
    const { theme, setTheme } = useTheme();
    const [open, setOpen] = useState(false);
    const current = THEMES.find(t => t.id === theme) || THEMES[0];

    return (
        <div style={{ position: 'relative' }}>
            {/* Trigger button */}
            <button
                onClick={() => setOpen(o => !o)}
                title="Switch Theme"
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.08)', cursor: 'pointer',
                    color: '#fff', fontSize: 12, fontWeight: 700, backdropFilter: 'blur(8px)',
                    transition: 'all 0.2s',
                }}
            >
                <span style={{ fontSize: 16 }}>{current.icon}</span>
                <span style={{ display: 'none', '@media (min-width: 640px)': { display: 'inline' } } as any}>
                    {current.label}
                </span>
                <span style={{ fontSize: 10, opacity: 0.6 }}>▼</span>
            </button>

            {/* Dropdown */}
            {open && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={() => setOpen(false)}
                        style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                    />
                    <div style={{
                        position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                        width: 260, borderRadius: 16, overflow: 'hidden',
                        background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)',
                        boxShadow: '0 24px 60px rgba(0,0,0,0.5)', zIndex: 999,
                        animation: 'dropIn 0.15s ease-out',
                    }}>
                        <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>
                                🎨 Choose Theme
                            </p>
                        </div>
                        {THEMES.map(t => (
                            <button
                                key={t.id}
                                onClick={() => { setTheme(t.id); setOpen(false); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    width: '100%', padding: '12px 16px', border: 'none',
                                    background: theme === t.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                                onMouseLeave={e => (e.currentTarget.style.background = theme === t.id ? 'rgba(255,255,255,0.1)' : 'transparent')}
                            >
                                {/* Color swatch */}
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                    background: t.bg, border: theme === t.id ? '2px solid #818cf8' : '2px solid transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 18,
                                }}>
                                    {t.icon}
                                </div>
                                <div>
                                    <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 700 }}>{t.label}</p>
                                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{t.desc}</p>
                                </div>
                                {theme === t.id && (
                                    <span style={{ marginLeft: 'auto', color: '#818cf8', fontSize: 16 }}>✓</span>
                                )}
                            </button>
                        ))}
                        <div style={{ padding: '8px 16px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: 10, textAlign: 'center' }}>
                                Preference saved automatically
                            </p>
                        </div>
                    </div>
                </>
            )}
            <style>{`@keyframes dropIn { from{transform:translateY(-8px);opacity:0} to{transform:translateY(0);opacity:1} }`}</style>
        </div>
    );
}
