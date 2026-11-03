import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Check stored session on app launch
    useEffect(() => {
        async function loadStorageData() {
            try {
                const storedOnboarding = await AsyncStorage.getItem('@has_seen_onboarding');
                const storedSession = await AsyncStorage.getItem('@user_session');

                if (storedOnboarding === 'true') {
                    setHasSeenOnboarding(true);
                }

                if (storedSession) {
                    const parsedSession = JSON.parse(storedSession);
                    // Support both legacy user objects and new { token, user } payload structure
                    if (parsedSession.user) {
                        setUser(parsedSession.user);
                        setToken(parsedSession.token || null);
                    } else {
                        setUser(parsedSession);
                    }
                }
            } catch (error) {
                console.error('Error reading auth state:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadStorageData();
    }, []);

    // Session Login Handler (Supports Google OAuth Backend Payload or Direct User Data)
    const login = async (sessionPayload) => {
        let sessionData;

        if (sessionPayload?.user && sessionPayload?.token) {
            setUser(sessionPayload.user);
            setToken(sessionPayload.token);
            sessionData = sessionPayload;
        } else {
            setUser(sessionPayload);
            sessionData = sessionPayload;
        }

        setHasSeenOnboarding(true);
        await AsyncStorage.setItem('@has_seen_onboarding', 'true');
        await AsyncStorage.setItem('@user_session', JSON.stringify(sessionData));
    };

    // Logout Handler (Clears memory state & removes session storage)
    const logout = async () => {
        try {
            setUser(null);
            setToken(null);
            await AsyncStorage.removeItem('@user_session');
        } catch (error) {
            console.error('Error during logout:', error);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
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

// Custom Hook
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        return {
            user: null,
            token: null,
            hasSeenOnboarding: false,
            isLoading: true,
            login: async () => {},
            logout: async () => {},
        };
    }
    return context;
};