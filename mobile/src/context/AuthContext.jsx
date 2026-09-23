import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Check stored session on launch
    useEffect(() => {
        async function loadStorageData() {
            try {
                const storedOnboarding = await AsyncStorage.getItem('@has_seen_onboarding');
                const storedUser = await AsyncStorage.getItem('@user_session');

                if (storedOnboarding === 'true') {
                    setHasSeenOnboarding(true);
                }
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (error) {
                console.error('Error reading auth state:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadStorageData();
    }, []);

    // Mock Login Function
    const login = async (userData = { name: 'Alex Thompson', email: 'a.thompson@university.edu' }) => {
        setUser(userData);
        setHasSeenOnboarding(true);
        await AsyncStorage.setItem('@has_seen_onboarding', 'true');
        await AsyncStorage.setItem('@user_session', JSON.stringify(userData));
    };

    // Logout Function
    const logout = async () => {
        setUser(null);
        await AsyncStorage.removeItem('@user_session');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                hasSeenOnboarding,
                isLoading,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// 👈 Custom hook exported here
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        return { user: null, isLoading: true, login: () => { }, logout: () => { } };
    }
    return context;
};