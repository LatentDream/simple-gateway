import * as api from '@/services/api';
import { AuthenticatedUser } from '@/types/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';

export type ApiToken = string;

interface AuthContextType {
    user: AuthenticatedUser | null
    isLoading: boolean;
    login: (apiToken: ApiToken | null) => void;
    logout: () => void;
}

export const LOCAL_STORAGE_KEY_SESSION_TOKEN = "USER_TOKEN_LOC";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<AuthenticatedUser | null>(null)

    useEffect(() => {
        const checkAuth = async () => {
            await login(null, true)
        };
        checkAuth();
    }, []);

    const login = async (apiToken: ApiToken | null, skipErrorToast: boolean = false) => {
        setIsLoading(true);
        try {
            if (apiToken !== null) {
                localStorage.setItem(LOCAL_STORAGE_KEY_SESSION_TOKEN, apiToken);
            }
            const user = await api.me(skipErrorToast)
            if (user === null) {
                throw Error;
            }
            setUser(user);
        } catch {
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        const token = localStorage.getItem(LOCAL_STORAGE_KEY_SESSION_TOKEN);

        if (!token) {
            toast.error("Please logout from the Cloud platform");
            return;
        }

        localStorage.removeItem(LOCAL_STORAGE_KEY_SESSION_TOKEN);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
