import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
    Bell,
    ChevronLeft,
    ChevronRight,
    Plus,
    RefreshCw,
    HardDrive,
    LayoutGrid,
    Calendar as CalendarIcon,
    User,
} from 'lucide-react-native';

// Sample Day Selector Data
const DAYS_IN_WEEK = [
    { day: 'Mon', date: '09', dots: 2 },
    { day: 'Tue', date: '10', dots: 3, isSelected: true },
    { day: 'Wed', date: '11', dots: 1 },
    { day: 'Thu', date: '12', dots: 2 },
    { day: 'Fri', date: '13', dots: 1 },
    { day: 'Sat', date: '14', dots: 0 },
];

// Sample Timeline Events (Prepared for Google Sync Integration)
const INITIAL_TIMELINE = [
    {
        id: 'evt-101',
        time: '08:00',
        title: 'Data Structures Lecture',
        location: 'Hall 4B • Professor Aris',
        tags: ['Academic', 'Important'],
        sourceType: 'google', // 'google' | 'local'
        googleEventId: 'g_event_abc123', // Hook for future Google API updates
        borderAccent: 'border-l-secondary',
    },
    {
        id: 'break-slot-1',
        type: 'empty_slot',
        time: '10:00',
        label: 'Add break or task',
    },
    {
        id: 'evt-102',
        time: '11:30',
        title: 'Library Study Session',
        location: 'East Wing • Focus Mode',
        tags: ['Self-study'],
        sourceType: 'local',
        googleEventId: null,
        borderAccent: 'border-l-tertiary',
    },
    {
        id: 'evt-103',
        time: '13:00',
        title: 'Project Sync: Delta',
        location: 'Video Call • 4 Participants',
        tags: [],
        sourceType: 'google',
        googleEventId: 'g_event_xyz789',
        borderAccent: 'border-l-secondary',
        participants: [
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80',
        ],
        extraParticipantsCount: 2,
    },
];

export default function CalendarScreen() {
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState('10');
    const [activeTab, setActiveTab] = useState('calendar');
    const [timelineEvents, setTimelineEvents] = useState(INITIAL_TIMELINE);

    return (
        <SafeAreaView className="flex-1 bg-[#F8FAFC]">
            <View className="flex-1 relative">
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingHorizontal: 20,
                        paddingTop: 12,
                        paddingBottom: 120,
                    }}
                >
                    {/* Top Header */}
                    <View className="flex-row items-center justify-between mb-6">
                        <View className="flex-row items-center gap-3">
                            <Image
                                source={{
                                    uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop',
                                }}
                                className="w-10 h-10 rounded-full"
                            />
                            <Text className="text-xl font-bold text-primary">FocusFlow</Text>
                        </View>
                        <TouchableOpacity className="p-2">
                            <Bell size={22} color="#1A237E" />
                        </TouchableOpacity>
                    </View>

                    {/* Month Header & Controls */}
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-lg font-bold text-primary">
                            September 2024
                        </Text>
                        <View className="flex-row items-center gap-3">
                            <TouchableOpacity className="p-1">
                                <ChevronLeft size={22} color="#1A237E" />
                            </TouchableOpacity>
                            <TouchableOpacity className="p-1">
                                <ChevronRight size={22} color="#1A237E" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Days Strip */}
                    <View className="flex-row justify-between items-center mb-8 bg-white p-2.5 rounded-2xl border border-gray-100 shadow-sm">
                        {DAYS_IN_WEEK.map((item) => {
                            const isActive = selectedDate === item.date;
                            return (
                                <TouchableOpacity
                                    key={item.date}
                                    onPress={() => setSelectedDate(item.date)}
                                    className={`items-center justify-center py-3 px-3 rounded-2xl w-[14%] ${isActive ? 'bg-secondary' : 'bg-transparent'
                                        }`}
                                >
                                    <Text
                                        className={`text-xs font-semibold mb-1 ${isActive ? 'text-white/80' : 'text-neutral'
                                            }`}
                                    >
                                        {item.day}
                                    </Text>
                                    <Text
                                        className={`text-lg font-bold mb-1 ${isActive ? 'text-white' : 'text-primary'
                                            }`}
                                    >
                                        {item.date}
                                    </Text>

                                    {/* Indicator Dots */}
                                    <View className="flex-row items-center gap-0.5 h-1.5">
                                        {Array.from({ length: item.dots }).map((_, i) => (
                                            <View
                                                key={i}
                                                className={`w-1 h-1 rounded-full ${isActive ? 'bg-white' : 'bg-secondary'
                                                    }`}
                                            />
                                        ))}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Timeline View */}
                    <View className="gap-6">
                        {timelineEvents.map((item) => {
                            if (item.type === 'empty_slot') {
                                return (
                                    <View key={item.id} className="flex-row items-center gap-4">
                                        <Text className="text-xs font-semibold text-neutral w-10">
                                            {item.time}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() =>
                                                router.push(`/create-task?time=${item.time}`)
                                            }
                                            className="flex-1 border border-dashed border-gray-300 rounded-2xl py-3.5 flex-row items-center justify-center gap-2 bg-white/50"
                                        >
                                            <Plus size={18} color="#77767D" />
                                            <Text className="text-xs font-semibold text-neutral">
                                                {item.label}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            }

                            return (
                                <View key={item.id} className="flex-row items-start gap-4">
                                    {/* Time Label */}
                                    <Text className="text-xs font-semibold text-neutral w-10 mt-2">
                                        {item.time}
                                    </Text>

                                    {/* Event Card */}
                                    <TouchableOpacity
                                        activeOpacity={0.85}
                                        onPress={() =>
                                            router.push(`/edit-task?eventId=${item.id}`)
                                        }
                                        className={`flex-1 bg-white rounded-2xl p-4 border border-gray-100 border-l-[5px] ${item.borderAccent} shadow-sm relative`}
                                    >
                                        {/* Top Row: Title + Source Badge */}
                                        <View className="flex-row items-start justify-between gap-2 mb-1">
                                            <Text className="text-base font-bold text-primary flex-1">
                                                {item.title}
                                            </Text>

                                            {/* Dynamic Sync Badge */}
                                            {item.sourceType === 'google' ? (
                                                <View className="bg-secondary/15 px-2.5 py-1 rounded-full flex-row items-center gap-1">
                                                    <RefreshCw size={11} color="#3F51B5" />
                                                    <Text className="text-[10px] font-bold text-secondary">
                                                        G CAL
                                                    </Text>
                                                </View>
                                            ) : (
                                                <View className="bg-gray-100 px-2.5 py-1 rounded-full flex-row items-center gap-1">
                                                    <HardDrive size={11} color="#77767D" />
                                                    <Text className="text-[10px] font-bold text-neutral">
                                                        LOCAL
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* Subtitle / Location */}
                                        <Text className="text-xs font-medium text-neutral mb-3">
                                            {item.location}
                                        </Text>

                                        {/* Tags / Participants Row */}
                                        <View className="flex-row items-center justify-between">
                                            {item.tags && item.tags.length > 0 && (
                                                <View className="flex-row items-center gap-2">
                                                    {item.tags.map((tag, idx) => (
                                                        <View
                                                            key={idx}
                                                            className="bg-[#EFEFF4] px-2.5 py-1 rounded-lg"
                                                        >
                                                            <Text className="text-[11px] font-semibold text-neutral">
                                                                {tag}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}

                                            {/* Participant Avatars (if any) */}
                                            {item.participants && (
                                                <View className="flex-row items-center ml-auto">
                                                    {item.participants.map((url, i) => (
                                                        <Image
                                                            key={i}
                                                            source={{ uri: url }}
                                                            className="w-6 h-6 rounded-full border border-white -ml-1.5"
                                                        />
                                                    ))}
                                                    {item.extraParticipantsCount && (
                                                        <View className="w-6 h-6 rounded-full bg-gray-200 border border-white -ml-1.5 items-center justify-center">
                                                            <Text className="text-[9px] font-bold text-neutral">
                                                                +{item.extraParticipantsCount}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>

                {/* Floating Action Button */}
                <TouchableOpacity
                    onPress={() => router.push('/create-task')}
                    className="absolute bottom-24 right-5 w-14 h-14 bg-secondary rounded-full items-center justify-center shadow-lg z-20"
                >
                    <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>

                {/* Bottom Navigation */}
                <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 py-3 px-6 flex-row justify-between items-center z-10">
                    <TouchableOpacity
                        onPress={() => {
                            setActiveTab('dashboard');
                            router.push('/');
                        }}
                        className={`flex-row items-center gap-2 px-4 py-2.5 rounded-2xl ${activeTab === 'dashboard' ? 'bg-secondary/20' : ''
                            }`}
                    >
                        <LayoutGrid
                            size={20}
                            color={activeTab === 'dashboard' ? '#3F51B5' : '#77767D'}
                        />
                        {activeTab === 'dashboard' && (
                            <Text className="text-secondary font-bold text-sm">
                                Dashboard
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setActiveTab('calendar')}
                        className={`flex-row items-center gap-2 px-4 py-2.5 rounded-2xl ${activeTab === 'calendar' ? 'bg-secondary/20' : ''
                            }`}
                    >
                        <CalendarIcon
                            size={20}
                            color={activeTab === 'calendar' ? '#3F51B5' : '#77767D'}
                        />
                        {activeTab === 'calendar' && (
                            <Text className="text-secondary font-bold text-sm">
                                Calendar
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setActiveTab('profile')}
                        className={`flex-row items-center gap-2 px-4 py-2.5 rounded-2xl ${activeTab === 'profile' ? 'bg-secondary/20' : ''
                            }`}
                    >
                        <User
                            size={20}
                            color={activeTab === 'profile' ? '#3F51B5' : '#77767D'}
                        />
                        {activeTab === 'profile' && (
                            <Text className="text-secondary font-bold text-sm">
                                Profile
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}