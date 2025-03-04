import React, { createContext, useContext, useEffect, useState } from 'react';
import { RouteForwardingResponse } from '@/types/auth';
import { getRoutes } from '@/services/api';

interface ConfigContextType {
    routes: RouteForwardingResponse | null;
    isLoading: boolean;
    error: string | null;
    refreshRoutes: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
    const [routes, setRoutes] = useState<RouteForwardingResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRoutes = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await getRoutes();
            if (data) {
                setRoutes(data);
            } else {
                setError('Failed to fetch route configuration');
            }
        } catch (err) {
            setError('An error occurred while fetching route configuration');
            console.error('Config fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchRoutes();
    }, []);

    const value = {
        routes,
        isLoading,
        error,
        refreshRoutes: fetchRoutes
    };

    return (
        <ConfigContext.Provider value={value}>
            {children}
        </ConfigContext.Provider>
    );
}

export function useConfig() {
    const context = useContext(ConfigContext);
    if (context === undefined) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return context;
} 