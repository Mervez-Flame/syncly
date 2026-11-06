import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LogOut, User, Mail, Bell, Shield, ChevronRight, Sparkles, } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext'; // Adjust path if needed
import BottomNav from '../components/BottomNav';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        try {
            console.log("Syncing pending tasks before clearing cache...");

            // 1. Attempt to sync
            // Ensure your syncPendingTasks function throws an error or returns false if it cannot reach the backend
            const syncSuccessful = await syncPendingTasks();

            if (!syncSuccessful) {
                // 2. Abort logout and alert the user
                Alert.alert(
                    "Offline",
                    "You have unsynced tasks and cannot reach the server. Logging out now would delete them. Please connect to the backend first.",
                    [{ text: "OK" }]
                );
                console.warn("Logout aborted to prevent data loss.");
                return; // Stops execution here. Cache is NOT cleared.
            }

            // 3. Safe to clear cache and log out
            await clearLocalCache();
            console.log("Logout complete. Session and cache cleared.");

            // Proceed with navigation to the login screen...

        } catch (error) {
            console.error("Logout error:", error);
            Alert.alert(
                "Logout Failed",
                "Could not verify sync status. Connect to the server and try again."
            );
        }
    };

    return (
        <SafeAreaView className={`flex-1 bg-[#F4F5FF] ${Platform.OS === 'android' ? 'pt-6' : ''}`}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }} showsVerticalScrollIndicator={false}>

                {/* Screen Header */}
                <Text className="text-2xl font-bold text-primary mb-6">Profile Settings</Text>

                {/* User Info Card */}
                <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex-row items-center mb-6">
                    {user?.avatar ? (
                        <Image source={{ uri: user.avatar }} className="w-16 h-16 rounded-2xl mr-4" />
                    ) : (
                        <View className="w-16 h-16 rounded-2xl bg-surface-light items-center justify-center mr-4">
                            <User size={32} color="#1A237E" />
                        </View>
                    )}
                    <View className="flex-1">
                        <Text className="text-lg font-bold text-primary">{user?.name || 'Student User'}</Text>
                        <Text className="text-xs text-neutral mt-0.5">{user?.email || 'student@university.edu'}</Text>
                        <View className="flex-row items-center mt-2 bg-surface-light self-start px-2.5 py-1 rounded-full">
                            <Sparkles size={12} color="#1A237E" />
                            <Text className="text-[11px] font-semibold text-primary ml-1">FocusFlow Active</Text>
                        </View>
                    </View>
                </View>

                {/* Options List */}
                <View className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 mb-6">
                    <Text className="text-xs font-bold text-neutral uppercase tracking-wider mb-3 px-2">
                        Account Preferences
                    </Text>

                    <TouchableOpacity className="flex-row items-center justify-between py-3 px-2 border-b border-gray-100">
                        <View className="flex-row items-center">
                            <Mail size={20} color="#1A237E" />
                            <Text className="text-sm font-medium text-slate-900 ml-3">Email Connection</Text>
                        </View>
                        <ChevronRight size={18} color="#77767D" />
                    </TouchableOpacity>

                    <TouchableOpacity className="flex-row items-center justify-between py-3 px-2 border-b border-gray-100">
                        <View className="flex-row items-center">
                            <Bell size={20} color="#1A237E" />
                            <Text className="text-sm font-medium text-slate-900 ml-3">Notifications</Text>
                        </View>
                        <ChevronRight size={18} color="#77767D" />
                    </TouchableOpacity>

                    <TouchableOpacity className="flex-row items-center justify-between py-3 px-2">
                        <View className="flex-row items-center">
                            <Shield size={20} color="#1A237E" />
                            <Text className="text-sm font-medium text-slate-900 ml-3">Privacy & Security</Text>
                        </View>
                        <ChevronRight size={18} color="#77767D" />
                    </TouchableOpacity>
                </View>

                {/* Logout Button */}
                <TouchableOpacity
                    onPress={handleLogout}
                    activeOpacity={0.85}
                    className="w-full bg-white border border-red-200 py-4 rounded-2xl flex-row items-center justify-center gap-2 shadow-sm mb-6"
                >
                    <LogOut size={20} color="#DC2626" />
                    <Text className="text-red-600 font-bold text-base">
                        Log Out
                    </Text>
                </TouchableOpacity>

                <Text className="text-center text-xs text-neutral">FocusFlow v1.0.0</Text>
            </ScrollView>
            {/* Bottom Navigation */}
            <BottomNav />
        </SafeAreaView>
    );
}