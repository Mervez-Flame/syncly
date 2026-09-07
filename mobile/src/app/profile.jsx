import React, { useState } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
    Bell,
    Pencil,
    Mail,
    Calendar,
    CheckCircle2,
    RefreshCw,
    ChevronRight,
    Moon,
    Timer,
    LayoutGrid,
    User,
} from 'lucide-react-native';

export default function ProfileScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('profile');

    // Preferences Toggles
    const [pushNotifications, setPushNotifications] = useState(true);
    const [darkTheme, setDarkTheme] = useState(false);

    // Tab Handler
    const handleTabPress = (tabName, routePath) => {
        setActiveTab(tabName);
        router.push(routePath);
    };

    return (
        <SafeAreaView className="flex-1 bg-[#F8FAFC]">
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingTop: 12,
                    paddingBottom: 110,
                }}
            >
                {/* Top Header */}
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-xl font-bold text-primary">FocusFlow</Text>
                    <View className="flex-row items-center gap-3">
                        <TouchableOpacity className="p-1">
                            <Bell size={22} color="#1A237E" />
                        </TouchableOpacity>
                        <Image
                            source={{
                                uri: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
                            }}
                            className="w-8 h-8 rounded-full"
                        />
                    </View>
                </View>

                {/* User Info & Avatar */}
                <View className="items-center mb-6">
                    <View className="relative w-24 h-24 rounded-full border-2 border-primary items-center justify-center mb-3">
                        <Image
                            source={{
                                uri: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
                            }}
                            className="w-20 h-20 rounded-full"
                        />
                        <TouchableOpacity className="absolute bottom-0 right-0 bg-primary w-7 h-7 rounded-full items-center justify-center border-2 border-white">
                            <Pencil size={13} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                    <Text className="text-2xl font-bold text-primary mb-0.5">
                        Alex Thompson
                    </Text>
                    <Text className="text-sm font-medium text-neutral">
                        a.thompson@university.edu
                    </Text>
                </View>

                {/* Connected Accounts Card */}
                <View className="mb-5">
                    <Text className="text-sm font-semibold text-neutral mb-2">
                        Connected Accounts
                    </Text>
                    <View className="bg-white rounded-2xl px-4 border border-gray-100 shadow-sm">
                        {/* Gmail Item */}
                        <View className="flex-row justify-between items-center py-3.5 border-b border-gray-100">
                            <View className="flex-row items-center gap-3">
                                <View className="w-10 h-10 rounded-xl bg-red-50 items-center justify-center">
                                    <Mail size={20} color="#EA4335" />
                                </View>
                                <View>
                                    <Text className="text-base font-semibold text-primary">
                                        Gmail
                                    </Text>
                                    <Text className="text-xs text-neutral">
                                        Connected as a.thompson@gmail.com
                                    </Text>
                                </View>
                            </View>
                            <CheckCircle2 size={22} color="#3F51B5" />
                        </View>

                        {/* Google Calendar Item */}
                        <View className="flex-row justify-between items-center py-3.5">
                            <View className="flex-row items-center gap-3">
                                <View className="w-10 h-10 rounded-xl bg-indigo-50 items-center justify-center">
                                    <Calendar size={20} color="#3F51B5" />
                                </View>
                                <View>
                                    <Text className="text-base font-semibold text-primary">
                                        Google Calendar
                                    </Text>
                                    <Text className="text-xs text-neutral">
                                        Syncing: Every 15 minutes
                                    </Text>
                                </View>
                            </View>
                            <CheckCircle2 size={22} color="#3F51B5" />
                        </View>
                    </View>
                </View>

                {/* Preferences Section */}
                <View className="mb-5">
                    <Text className="text-sm font-semibold text-neutral mb-2">
                        Preferences
                    </Text>
                    <View className="bg-white rounded-2xl px-4 border border-gray-100 shadow-sm">
                        {/* Push Notifications */}
                        <View className="flex-row justify-between items-center py-3.5 border-b border-gray-100">
                            <View className="flex-row items-center gap-3">
                                <Bell size={20} color="#1A237E" />
                                <Text className="text-base font-medium text-primary">
                                    Push Notifications
                                </Text>
                            </View>
                            <Switch
                                value={pushNotifications}
                                onValueChange={setPushNotifications}
                                trackColor={{ false: '#E2E8F0', true: '#3F51B5' }}
                                thumbColor="#FFFFFF"
                            />
                        </View>

                        {/* Sync Frequency */}
                        <TouchableOpacity className="flex-row justify-between items-center py-3.5 border-b border-gray-100">
                            <View className="flex-row items-center gap-3">
                                <RefreshCw size={20} color="#1A237E" />
                                <Text className="text-base font-medium text-primary">
                                    Sync Frequency
                                </Text>
                            </View>
                            <View className="flex-row items-center gap-1">
                                <Text className="text-sm font-medium text-secondary">
                                    15 mins
                                </Text>
                                <ChevronRight size={18} color="#77767D" />
                            </View>
                        </TouchableOpacity>

                        {/* Dark Theme */}
                        <View className="flex-row justify-between items-center py-3.5">
                            <View className="flex-row items-center gap-3">
                                <Moon size={20} color="#1A237E" />
                                <Text className="text-base font-medium text-primary">
                                    Dark Theme
                                </Text>
                            </View>
                            <Switch
                                value={darkTheme}
                                onValueChange={setDarkTheme}
                                trackColor={{ false: '#E2E8F0', true: '#3F51B5' }}
                                thumbColor="#FFFFFF"
                            />
                        </View>
                    </View>
                </View>

                {/* Weekly Stats Grid */}
                <View className="flex-row gap-3.5 mt-1">
                    {/* Focus Time Stat */}
                    <View className="flex-1 bg-secondary/15 p-4 rounded-2xl h-28 justify-between">
                        <Timer size={24} color="#1A237E" />
                        <View>
                            <Text className="text-2xl font-extrabold text-primary">12.5h</Text>
                            <Text className="text-xs font-semibold text-secondary">
                                Focus this week
                            </Text>
                        </View>
                    </View>

                    {/* Tasks Completed Stat */}
                    <View className="flex-1 bg-orange-100/80 p-4 rounded-2xl h-28 justify-between">
                        <CheckCircle2 size={24} color="#C2410C" />
                        <View>
                            <Text className="text-2xl font-extrabold text-[#7C2D12]">42</Text>
                            <Text className="text-xs font-semibold text-[#9A3412]">
                                Tasks completed
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Navigation */}
            <View className="absolute bottom-0 left-0 right-0 h-20 bg-white flex-row justify-around items-center border-t border-gray-100 px-4 pb-2 z-10">
                <TouchableOpacity
                    className="flex-row items-center gap-2 px-3 py-2 rounded-full"
                    onPress={() => handleTabPress('dashboard', '/')}
                >
                    <LayoutGrid size={20} color="#77767D" />
                    <Text className="text-xs font-medium text-neutral">Dashboard</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="flex-row items-center gap-2 px-3 py-2 rounded-full"
                    onPress={() => handleTabPress('calendar', '/calendar')}
                >
                    <Calendar size={20} color="#77767D" />
                    <Text className="text-xs font-medium text-neutral">Calendar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className={`flex-row items-center gap-2 px-4 py-2.5 rounded-full ${activeTab === 'profile' ? 'bg-secondary/20' : ''
                        }`}
                    onPress={() => handleTabPress('profile', '/profile')}
                >
                    <User
                        size={18}
                        color={activeTab === 'profile' ? '#3F51B5' : '#77767D'}
                    />
                    <Text className="text-xs font-bold text-secondary">Profile</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}