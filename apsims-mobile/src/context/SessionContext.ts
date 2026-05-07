import React, { createContext, useContext } from 'react';
import { UserSession } from '../lib/supabase';

// ============================================================
// APSIMS Mobile — Session Context
// Provides UserSession to all screens without prop drilling
// ============================================================

interface SessionContextValue {
    session: UserSession | null;
    setSession: (session: UserSession | null) => void;
}

export const SessionContext = createContext<SessionContextValue>({
    session: null,
    setSession: () => {},
});

export function useSession(): SessionContextValue {
    const ctx = useContext(SessionContext);
    if (!ctx) {
        throw new Error('useSession must be used within a SessionContext.Provider');
    }
    return ctx;
}
