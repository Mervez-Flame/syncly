// mobile/src/components/BottomNav.jsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { LayoutGrid, Calendar as CalendarIcon, User } from 'lucide-react-native';

export default function BottomNav() {
    const router = useRouter();
    const pathname = usePathname(); // ✅ Reactively tracks current path

    // Determine active tab based on path
    let activeTab = 'dashboard';
    if (pathname.includes('calendar')) {
        activeTab = 'calendar';
    } else if (pathname.includes('profile')) {
        activeTab = 'profile';
    } else if (pathname === '/' || pathname.includes('dashboard')) {
        activeTab = 'dashboard';
    }

    return (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 py-3 px-6 flex-row justify-between items-center z-10">
            {/* Dashboard Tab */}
            <TouchableOpacity
                onPress={() => router.replace('/')}
                activeOpacity={0.8}
                className={`flex-row items-center gap-2 px-4 py-2.5 rounded-2xl ${activeTab === 'dashboard' ? 'bg-secondary/20' : ''
                    }`}
            >
                <LayoutGrid
                    size={20}
                    color={activeTab === 'dashboard' ? '#3F51B5' : '#77767D'}
                />
                {activeTab === 'dashboard' && (
                    <Text className="text-secondary font-bold text-sm">Dashboard</Text>
                )}
            </TouchableOpacity>

            {/* Calendar Tab */}
            <TouchableOpacity
                onPress={() => router.replace('/calendar')}
                activeOpacity={0.8}
                className={`flex-row items-center gap-2 px-4 py-2.5 rounded-2xl ${activeTab === 'calendar' ? 'bg-secondary/20' : ''
                    }`}
            >
                <CalendarIcon
                    size={20}
                    color={activeTab === 'calendar' ? '#3F51B5' : '#77767D'}
                />
                {activeTab === 'calendar' && (
                    <Text className="text-secondary font-bold text-sm">Calendar</Text>
                )}
            </TouchableOpacity>

            {/* Profile Tab */}
            <TouchableOpacity
                onPress={() => router.push('/profile')}
                activeOpacity={0.8}
                className={`flex-row items-center gap-2 px-4 py-2.5 rounded-2xl ${activeTab === 'profile' ? 'bg-secondary/20' : ''
                    }`}
            >
                <User
                    size={20}
                    color={activeTab === 'profile' ? '#3F51B5' : '#77767D'}
                />
                {activeTab === 'profile' && (
                    <Text className="text-secondary font-bold text-sm">Profile</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}