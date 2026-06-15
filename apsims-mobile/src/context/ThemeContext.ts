// APSIMS Theme Context — Dark Mode Support
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark';

const LIGHT = {
    bg: '#f1f5f9', card: '#ffffff', border: '#e2e8f0',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
    primary: '#2563eb', accent: '#059669', danger: '#dc2626',
    tabBar: '#ffffff', tabBorder: '#e2e8f0',
    inputBg: '#f8fafc', inputBorder: '#e2e8f0',
    headerStart: '#1e1b4b', headerEnd: '#3b82f6',
    sectionBg: '#f8fafc', rowAlt: '#fafbfc',
};
const DARK = {
    bg: '#0f172a', card: '#1e293b', border: '#334155',
    text: '#f1f5f9', textSub: '#94a3b8', textDim: '#64748b',
    primary: '#3b82f6', accent: '#10b981', danger: '#f87171',
    tabBar: '#1e293b', tabBorder: '#334155',
    inputBg: '#0f172a', inputBorder: '#334155',
    headerStart: '#020617', headerEnd: '#1e3a5f',
    sectionBg: '#1e293b', rowAlt: '#0f172a',
};

interface ThemeCtx {
    isDark: boolean;
    colors: typeof LIGHT;
    toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeCtx>({
    isDark: false, colors: LIGHT, toggleTheme: () => {},
});
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem('apsims_theme').then(v => {
            if (v === 'dark') setIsDark(true);
        }).catch(() => {});
    }, []);

    const toggleTheme = () => {
        const next = !isDark;
        setIsDark(next);
        AsyncStorage.setItem('apsims_theme', next ? 'dark' : 'light').catch(() => {});
    };

    return (
        <ThemeContext.Provider value={{ isDark, colors: isDark ? DARK : LIGHT, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
