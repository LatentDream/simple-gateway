import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { RouteForwardingResponse, RouteForwardingConfig } from '@/types/auth';
import { getRoutes, updateRoutes } from '@/services/api';
import { toast } from 'sonner';

interface ConfigContextType {
    routes: RouteForwardingResponse | null;
    isLoading: boolean;
    error: string | null;
    editConfig: (route: string, config: RouteForwardingConfig) => Promise<void>;
    refreshRoutes: () => Promise<void>;
    baseUrl: string;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
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

    // TODO: This will be fetched dynamically later
    const config = {
        baseUrl: 'http://localhost:8000'
    };

    const editConfig = async (route: string, config: RouteForwardingConfig) => {
        if (!routes) return;

        try {
            setIsLoading(true);
            setError(null);

            // Check if this is a new route and if it already exists
            if (route !== Object.keys(routes.routes).find(r => r === route) && routes.routes[route]) {
                throw new Error('A route with this path already exists');
            }

            // Create new routes object with the updated config
            const updatedRoutes: RouteForwardingResponse = {
                routes: {
                    ...routes.routes,
                    [route]: config
                }
            };

            // Send update to the server
            const result = await updateRoutes(updatedRoutes);
            
            if (result) {
                setRoutes(result);
                toast.success('Route configuration updated successfully');
            } else {
                throw new Error('Failed to update route configuration');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred while updating route configuration';
            setError(errorMessage);
            toast.error(errorMessage);
            console.error('Config update error:', err);
        } finally {
            setIsLoading(false);
        }
    }

    const value = {
        routes,
        isLoading,
        error,
        editConfig,
        refreshRoutes: fetchRoutes,
        ...config
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
