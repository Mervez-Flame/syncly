import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { processSyncQueue } from '../utils/offlineSync';

const AuthContext = createContext({});
const userKeyOf = (u) => String(u?._id || u?.id || u?.email || '');

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

        // If the cached tasks belong to a different account (for example after a skipped logout), drop them
        const owner = await AsyncStorage.getItem('@focusflow_tasks_owner');
        if (owner && owner !== userKeyOf(userData)) {
            await AsyncStorage.removeItem('@focusflow_tasks');
        }
        await AsyncStorage.setItem('@focusflow_tasks_owner', userKeyOf(userData));

        setUser(userData);
        setToken(token);
        setHasSeenOnboarding(true);
    };

    // Logout Handler (Clears memory state & removes session storage)
    const logout = async () => {
        try {
            const hasPending = async () => {
                const stored = await AsyncStorage.getItem('@focusflow_tasks');
                return (stored ? JSON.parse(stored) : []).some(t => t && t.syncState && t.syncState !== 'synced');
            };

            if (await hasPending()) {
                const netState = await NetInfo.fetch();
                if (!netState.isConnected) {
                    Alert.alert(
                        'Internet Required',
                        'You have unsynced tasks and cannot reach the server. Logging out now would delete them. Please connect to the internet first.'
                    );
                    return false;
                }

                const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.3.11:5000';
                const sessionString = await AsyncStorage.getItem('@user_session');
                const currentToken = sessionString ? JSON.parse(sessionString)?.token : null;
                if (currentToken) await processSyncQueue(apiBaseUrl, currentToken);

                // processSyncQueue never throws, so check that nothing is still waiting
                if (await hasPending()) {
                    Alert.alert('Sync incomplete', 'Some tasks could not be sent to the server, so logout was cancelled to protect them. Please try again in a moment.');
                    return false;
                }
            }

            setUser(null);
            setToken(null);
            await AsyncStorage.multiRemove(['@user_session', '@focusflow_tasks', '@focusflow_tasks_owner']);
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Logout Failed', 'Could not complete logout. Please try again.');
            return false;
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