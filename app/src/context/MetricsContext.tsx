import React, { createContext, useContext, useEffect, useState } from 'react';
import { RequestTrackingResponse } from '@/types/request_tracking';
import { getMetrics } from '@/services/api';

interface MetricsContextType {
    metrics: RequestTrackingResponse | null;
    isLoading: boolean;
    error: string | null;
    refreshMetrics: () => Promise<void>;
}

const MetricsContext = createContext<MetricsContextType | undefined>(undefined);

export function MetricsProvider({ children }: { children: React.ReactNode }) {
    const [metrics, setMetrics] = useState<RequestTrackingResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMetrics = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await getMetrics();
            if (data) {
                setMetrics(data);
            } else {
                setError('Failed to fetch metrics data');
            }
        } catch (err) {
            setError('An error occurred while fetching metrics');
            console.error('Metrics fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchMetrics();
    }, []);

    const value = {
        metrics,
        isLoading,
        error,
        refreshMetrics: fetchMetrics
    };

    return (
        <MetricsContext.Provider value={value}>
            {children}
        </MetricsContext.Provider>
    );
}

export function useMetrics() {
    const context = useContext(MetricsContext);
    if (context === undefined) {
        throw new Error('useMetrics must be used within a MetricsProvider');
    }
    return context;
} 