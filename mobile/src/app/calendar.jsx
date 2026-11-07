import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { Clock, Mail, FileText } from 'lucide-react-native';
import BottomNav from '../components/BottomNav';
import { useTasks } from '../context/TaskContext';

// Local YYYY-MM-DD so Nigerian time doesn't shift a dot to the wrong day
const toKey = (d) => {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

// Opens a whole day in Google Calendar (fallback when a task has no event link)
const dayUrl = (key) => {
    const [y, m, d] = key.split('-').map(Number);
    return `https://calendar.google.com/calendar/r/day/${y}/${m}/${d}`;
};

const formatTime = (task) => {
    if (!task.hasDueTime) return 'All day';
    return new Date(task.dueDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export default function CalendarScreen() {
    const router = useRouter();
    const { activeTasks } = useTasks();
    const [selected, setSelected] = useState(toKey(new Date()));

    const safeTasks = Array.isArray(activeTasks) ? activeTasks : [];

    // Dots on every due date + highlight on the tapped day
    const markedDates = useMemo(() => {
        const marks = {};
        safeTasks.forEach((task) => {
            if (task?.dueDate) {
                marks[toKey(task.dueDate)] = { marked: true, dotColor: '#1A237E' };
            }
        });
        marks[selected] = { ...(marks[selected] || {}), selected: true, selectedColor: '#1A237E' };
        return marks;
    }, [safeTasks, selected]);

    // Tasks due on the tapped day
    const dayTasks = useMemo(
        () => safeTasks.filter((t) => t?.dueDate && toKey(t.dueDate) === selected),
        [safeTasks, selected]
    );

    const openTask = async (task) => {
        const taskId = task._id || task.localTaskId || task.id;

        // AI task that was synced: open its event (exact link, or that day as fallback)
        const url = task.calendarEventLink || (task.calendarEventId ? dayUrl(selected) : null);
        if (url) {
            try {
                await Linking.openURL(url);
            } catch {
                Alert.alert('Could not open Google Calendar');
            }
            return;
        }

        // Manual task (no Google event): go to the edit screen like the dashboard does
        if (taskId) router.push(`/edit-task?taskId=${taskId}`);
    };

    const header = (
        <View className="mb-4">
            <Text className="text-2xl font-bold text-primary mb-4">Calendar</Text>
            <View className="bg-white rounded-2xl shadow-sm p-3 border border-gray-100">
                <Calendar
                    markedDates={markedDates}
                    onDayPress={(day) => setSelected(day.dateString)}
                    theme={{
                        todayTextColor: '#1A237E',
                        arrowColor: '#1A237E',
                        dotColor: '#1A237E',
                        selectedDotColor: '#FFFFFF',
                        monthTextColor: '#1A237E',
                        textDayFontWeight: '500',
                        textMonthFontWeight: 'bold',
                    }}
                />
            </View>
            <Text className="text-base font-bold text-primary mt-5">
                Due on {new Date(`${selected}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-[#F8FAFC]">
            <View className="flex-1 relative">
                <FlatList
                    data={dayTasks}
                    keyExtractor={(t, i) => String(t._id || t.localTaskId || t.id || i)}
                    ListHeaderComponent={header}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <Text className="text-sm text-neutral">No deadlines on this day 🎉</Text>
                    }
                    renderItem={({ item }) => {
                        const isEmail = (item.source || 'manual') !== 'manual';
                        return (
                            <Pressable
                                onPress={() => openTask(item)}
                                className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 border-l-[5px] border-l-secondary shadow-sm"
                            >
                                <View className="flex-row items-center gap-2 mb-1.5">
                                    <View className="bg-secondary/15 px-2.5 py-0.5 rounded-md">
                                        <Text className="text-xs font-bold text-secondary">
                                            {item.courseCode || 'GENERAL'}
                                        </Text>
                                    </View>
                                    {isEmail ? <Mail size={13} color="#77767D" /> : <FileText size={13} color="#77767D" />}
                                </View>
                                <Text className="text-lg font-bold text-primary mb-1">{item.title}</Text>
                                <View className="flex-row items-center gap-1">
                                    <Clock size={14} color="#77767D" />
                                    <Text className="text-xs text-neutral font-medium">{formatTime(item)}</Text>
                                </View>
                            </Pressable>
                        );
                    }}
                />

                {/* Bottom Navigation */}
                <BottomNav />
            </View>
        </SafeAreaView>
    );
}