import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TaskContext';
import { Text, View, ScrollView, TouchableOpacity, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, Mail, Clock, Plus, User, FileText, Check } from 'lucide-react-native';
import BottomNav from './../components/BottomNav';
import { useEmailSync } from '../hooks/useEmailSync';
import ScanEmailsButton from '../components/ScanEmailsButton';
import SyncSummaryBanner from '../components/SyncSummaryBanner';

// Anything that is not 'manual' counts as an email/AI task
const getSourceType = (task) => {
    const src = task.source || task.sourceType || 'manual';
    return src === 'manual' ? 'manual' : 'email';
};

const formatDue = (task) => {
    if (!task.dueDate) return 'Not Specified';
    const d = new Date(task.dueDate);
    if (isNaN(d.getTime())) return String(task.dueDate);
    // Date-only email tasks are stored at noon UTC, so do not show a clock time for them
    const dateOnly = task.source === 'ai' && !task.hasDueTime;
    return d.toLocaleString('en-US', dateOnly
        ? { month: 'short', day: 'numeric' }
        : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const isOverdue = (task, now = new Date()) => {
    if (!task?.dueDate || task.isCompleted) return false;
    const due = new Date(task.dueDate);
    if (isNaN(due.getTime())) return false;
    if (task.hasDueTime) return due < now;              // timed: overdue once the time has passed
    const pad = (n) => String(n).padStart(2, '0');
    const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return ymd(due) < ymd(now);                         // date only: overdue once the day has passed
};

export default function DashboardScreen() {
    const router = useRouter();
    const { user, token } = useAuth();
    const { activeTasks, toggleTask, refreshTasks } = useTasks();
    const [activeFilter, setActiveFilter] = useState('all');

    const { status, summary, error, startSync } = useEmailSync(token, refreshTasks);

    const safeTasks = Array.isArray(activeTasks) ? activeTasks : [];

    const filteredTasks = safeTasks.filter((task) => {
        if (!task) return false;
        if (activeFilter === 'all') return true;
        return getSourceType(task) === activeFilter;
    });

    return (
        <SafeAreaView className="flex-1 bg-[#d5d1df]">
            <View className="flex-1 relative">
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingHorizontal: 20,
                        paddingTop: 12,
                        paddingBottom: 120,
                    }}
                >
                    {/* Header */}
                    <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center gap-3">
                            {user?.avatar ? (
                                <Image source={{ uri: user.avatar }} className="w-16 h-16 rounded-2xl mr-4" />
                            ) : (
                                <View className="w-16 h-16 rounded-2xl bg-surface-light items-center justify-center mr-4">
                                    <User size={32} color="#1A237E" />
                                </View>
                            )}
                            <Text className="text-xl font-bold text-primary">
                                Hello, {user?.name ? user.name.split(' ')[0] : 'Jason'}
                            </Text>
                        </View>
                        <TouchableOpacity className="p-2">
                            <Bell size={24} color="#1A237E" />
                        </TouchableOpacity>
                    </View>

                    {/* Scan button + result banner */}
                    <View className="mb-6">
                        <ScanEmailsButton onPress={startSync} status={status} />
                        <View className="mt-3">
                            <SyncSummaryBanner summary={summary} error={error} status={status} />
                        </View>
                    </View>

                    {/* Filter Tabs */}
                    <View className="flex-row gap-3 mb-7">
                        {['all', 'email', 'manual'].map((filter) => {
                            const isActive = activeFilter === filter;
                            return (
                                <TouchableOpacity
                                    key={filter}
                                    onPress={() => setActiveFilter(filter)}
                                    className={`px-5 py-2.5 rounded-full ${isActive ? 'bg-secondary' : 'bg-[#EFEFF4]'}`}
                                >
                                    <Text
                                        className={`font-semibold text-sm capitalize ${isActive ? 'text-white' : 'text-neutral'}`}
                                    >
                                        {filter === 'all' ? 'All Tasks' : filter}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Section Title */}
                    <Text className="text-2xl font-bold text-primary mb-4">
                        Today's Focus
                    </Text>

                    {/* Task Cards */}
                    <View className="gap-4">
                        {filteredTasks.length === 0 && (
                            <Text className="text-sm text-neutral">No tasks here yet.</Text>
                        )}

                        {filteredTasks.map((task, index) => {
                            const taskId = task._id || task.localTaskId || task.id;
                            const isFinished = !!task.isCompleted;
                            const courseDisplay = task.courseCode || 'GENERAL';
                            const sourceType = getSourceType(task);
                            const sourceLabel = sourceType === 'email' ? 'Auto Ingested' : 'User Created';
                            const displayDeadline = formatDue(task);
                            const overdue = isOverdue(task);

                            return (
                                <TouchableOpacity
                                    key={taskId || index.toString()}
                                    activeOpacity={0.85}
                                    onPress={() => taskId && router.push(`/edit-task?taskId=${taskId}`)}
                                    className="bg-white rounded-2xl p-4 border border-gray-100 border-l-[5px] border-l-secondary flex-row items-center gap-3 shadow-sm"
                                >
                                    {/* Checkbox */}
                                    <TouchableOpacity
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            if (taskId) toggleTask(taskId);
                                        }}
                                        className={`w-6 h-6 rounded-lg border border-gray-300 items-center justify-center ${isFinished ? 'bg-secondary border-secondary' : 'bg-white'
                                            }`}
                                    >
                                        {isFinished && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                                    </TouchableOpacity>

                                    {/* Content */}
                                    <View className="flex-1">
                                        <View className="flex-row items-center gap-2 mb-1.5">
                                            <View className="bg-secondary/15 px-2.5 py-0.5 rounded-md">
                                                <Text className="text-xs font-bold text-secondary">
                                                    {courseDisplay}
                                                </Text>
                                            </View>
                                            <View className="flex-row items-center gap-1">
                                                {sourceType === 'email' ? (
                                                    <Mail size={13} color="#77767D" />
                                                ) : (
                                                    <FileText size={13} color="#77767D" />
                                                )}
                                                <Text className="text-xs text-neutral font-medium">
                                                    {sourceLabel}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text
                                            className={`text-lg font-bold mb-1 ${isFinished ? 'line-through text-neutral' : 'text-primary'
                                                }`}
                                        >
                                            {task.title}
                                        </Text>
                                        <View className="flex-row items-center gap-1">
                                            <Clock size={14} color="#77767D" />
                                            <Text className="text-xs text-neutral font-medium">
                                                {displayDeadline === 'Not Specified' ? 'Not Specified' : `Due ${displayDeadline}`}
                                            </Text>
                                            {overdue && <Text className="text-xs font-bold text-red-600">  Overdue</Text>}
                                        </View>
                                        {task.status === 'sync_failed' && (
                                            <Text className="text-xs font-bold text-amber-600 mt-1">Not added to Google Calendar yet</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>

                {/* Floating Action Button (FAB) */}
                <TouchableOpacity
                    onPress={() => router.push('/create-task')}
                    className="absolute bottom-24 right-5 w-14 h-14 bg-primary rounded-2xl items-center justify-center shadow-lg z-20"
                >
                    <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>

                {/* Bottom Navigation */}
                <BottomNav />
            </View>
        </SafeAreaView>
    );
}