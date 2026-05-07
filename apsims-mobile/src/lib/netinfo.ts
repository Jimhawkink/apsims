import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useState, useEffect } from 'react';

// ============================================================
// APSIMS Mobile Phase 1 Ultra — Network Status
// ============================================================

export interface NetworkStatus {
    isConnected: boolean;
    isInternetReachable: boolean;
}

/**
 * React hook for network status — use in screen components.
 * Defaults to connected=true to avoid false offline states on mount.
 */
export function useNetworkStatus(): NetworkStatus {
    const [status, setStatus] = useState<NetworkStatus>({
        isConnected: true,
        isInternetReachable: true,
    });

    useEffect(() => {
        // Get initial state
        NetInfo.fetch().then((state: NetInfoState) => {
            setStatus({
                isConnected: state.isConnected ?? true,
                isInternetReachable: state.isInternetReachable ?? true,
            });
        });

        // Subscribe to changes
        const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
            setStatus({
                isConnected: state.isConnected ?? true,
                isInternetReachable: state.isInternetReachable ?? true,
            });
        });

        return unsubscribe;
    }, []);

    return status;
}

/**
 * Imperative listener — use in App.tsx to trigger sync on reconnect.
 * Returns an unsubscribe function.
 */
export function onConnectivityChange(
    callback: (connected: boolean) => void
): () => void {
    return NetInfo.addEventListener((state: NetInfoState) => {
        const connected = state.isConnected === true && state.isInternetReachable !== false;
        callback(connected);
    });
}

/** One-shot check — returns true if currently connected */
export async function isConnected(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable !== false;
}
