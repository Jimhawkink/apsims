'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type AppTheme = 'default' | 'light-soft' | 'full-system';

interface ThemeContextType {
    theme: AppTheme;
    setTheme: (t: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'default',
    setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<AppTheme>('default');

    useEffect(() => {
        const saved = localStorage.getItem('apsims-theme') as AppTheme;
        if (saved && ['default', 'light-soft', 'full-system'].includes(saved)) {
            setThemeState(saved);
        }
    }, []);

    const setTheme = (t: AppTheme) => {
        setThemeState(t);
        localStorage.setItem('apsims-theme', t);
        // Apply theme class to body for global CSS overrides
        document.body.setAttribute('data-theme', t);
    };

    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
