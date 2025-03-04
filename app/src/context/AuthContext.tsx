import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthenticatedUser } from '@/types/auth';
import { me } from '@/services/api';

interface AuthContextType {
    user: AuthenticatedUser | null;
    isLoading: boolean
    login: (user: AuthenticatedUser) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthenticatedUser | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        setIsLoading(true)
        const checkAuth = async () => {
            const userData = await me();
            if (userData) {
                setUser(userData);
            }
            setIsLoading(false)
        };
        checkAuth();
    }, []);

    const login = (userData: AuthenticatedUser) => {
        setUser(userData);
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
