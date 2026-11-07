import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { processSyncQueue } from '../utils/offlineSync';

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

    // Session Login Handler (Supports Google OAuth Backend Payload)
    const login = async (sessionPayload) => {
        const token = sessionPayload?.token || sessionPayload?.accessToken || sessionPayload?.user?.token;
        if (!token) {
            console.error("Login failed: No authentication token provided in sessionPayload", sessionPayload);
            throw new Error("Authentication token is missing from session.");
        }

        const userData = sessionPayload?.user || sessionPayload;

        // persist first, so state never says "logged in" when nothing was saved
        await AsyncStorage.setItem('@user_session', JSON.stringify({ user: userData, token }));
        await AsyncStorage.setItem('@has_seen_onboarding', 'true');

        setUser(userData);
        setToken(token);
        setHasSeenOnboarding(true);
    };

    // Logout Handler (Clears memory state & removes session storage)
    const logout = async () => {
        // 1. Check current network connectivity
        const netState = await NetInfo.fetch();

        if (!netState.isConnected) {
            Alert.alert(
                'Internet Required',
                'You must be connected to the internet to log out so your offline tasks can be synced safely.'
            );
            return false; // Aborts logout completely
        }

        try {
            const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.3.11:5000';

            // 2. Pull token from storage for the final sync push
            const sessionString = await AsyncStorage.getItem('@user_session');
            const sessionData = sessionString ? JSON.parse(sessionString) : null;
            const currentToken = sessionData?.token;

            if (currentToken) {
                console.log('Syncing pending tasks before clearing cache...');
                await processSyncQueue(apiBaseUrl, currentToken);
            }

            // 3. Once sync completes successfully, wipe session AND local task cache
            setUser(null);
            setToken(null);

            await AsyncStorage.multiRemove([
                '@user_session',
                '@focusflow_tasks'
            ]);

            console.log('Logout complete. Session and cache cleared.');
            return true;

        } catch (error) {
            console.error('Logout aborted due to sync error:', error);
            Alert.alert(
                'Sync Failed',
                'Could not push your pending tasks to the server. Logout was canceled to prevent data loss.'
            );
            return false; // Aborts logout if the server rejects the sync
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
            login: async () => { },
            logout: async () => { },
        };
    }
    return context;
};