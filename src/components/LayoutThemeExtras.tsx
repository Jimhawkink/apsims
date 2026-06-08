'use client';

import { useTheme } from '@/contexts/ThemeContext';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import FloatingDock from '@/components/FloatingDock';
import { ReactNode } from 'react';

// This component lives INSIDE ThemeProvider, so it can safely call useTheme()
export default function LayoutThemeExtras({ children }: { children: ReactNode }) {
    const { theme } = useTheme();

    return (
        <>
            {children}
            {/* Floating Dock — only for Full System theme */}
            {theme === 'full-system' && <FloatingDock />}
        </>
    );
}

// Export ThemeSwitcher re-export so layout can import from one place
export { ThemeSwitcher };
