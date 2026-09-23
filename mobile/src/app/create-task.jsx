import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, Platform, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowLeft, Calendar, RefreshCw, CheckCircle2, Plus, } from 'lucide-react-native';
import { useTasks } from '../context/TaskContext';

const CATEGORIES = ['History 201', 'Organic Chem', 'CSC 401', 'Misc'];

export default function CreateTaskScreen() {
    const router = useRouter();
    const { addTask } = useTasks();

    const [taskName, setTaskName] = useState('');
    const [description, setDescription] = useState('');

    // Date Picker States
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [dueDateTime, setDueDateTime] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [syncCalendar, setSyncCalendar] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('History 201');

    // Handle Date Change
    const handleDateChange = (event, date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }

        if (date) {
            setSelectedDate(date);

            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();

            setDueDateTime(`${day}/${month}/${year}`);
        }
    };

    // 👈 3. Updated Task Creation Handler
    const handleCreateTask = () => {
        if (!taskName.trim()) return;

        addTask({
            title: taskName.trim(),
            course: selectedCategory,
            dueTime: dueDateTime || '11:59 PM',
            dueDate: dueDateTime || 'Today',
            description: description.trim(),
            syncCalendar: syncCalendar,
            sourceType: 'manual',
            sourceLabel: 'User Created',
            borderAccent: 'border-l-secondary',
            courseBg: 'bg-secondary/15',
            courseTextColor: 'text-secondary',
        });

        router.back();
    };

    return (
        <SafeAreaView className="flex-1 bg-[#F8FAFC]">
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-3 border-b border-gray-100">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="p-2 -ml-2"
                    activeOpacity={0.7}
                >
                    <ArrowLeft size={24} color="#1A237E" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-primary">Create New Task</Text>
                <View className="w-8" />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            >
                {/* Card 1: Task Details */}
                <View className="bg-white rounded-2xl p-4 mb-5 border border-gray-100 shadow-sm">
                    <Text className="text-sm font-bold text-primary mb-2">Task Name</Text>
                    <TextInput
                        value={taskName}
                        onChangeText={setTaskName}
                        placeholder="Task Name."
                        placeholderTextColor="#77767D"
                        className="border border-gray-200 rounded-xl p-3.5 text-base text-primary mb-4 bg-white"
                    />

                    <Text className="text-sm font-bold text-primary mb-2">
                        Description <Text className="font-normal text-neutral">(Optional)</Text>
                    </Text>
                    <TextInput
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Add detailed notes or requirements..."
                        placeholderTextColor="#77767D"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        className="border border-gray-200 rounded-xl p-3.5 text-base text-primary min-h-[110px] bg-white"
                    />
                </View>

                {/* Card 2: Date, Time & Calendar Sync */}
                <View className="bg-white rounded-2xl p-4 mb-5 border border-gray-100 shadow-sm">
                    <Text className="text-sm font-bold text-primary mb-2">Due Date & Time</Text>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setShowDatePicker(true)}
                        className="border border-gray-200 rounded-xl p-3.5 flex-row items-center justify-between mb-4"
                    >
                        <Text
                            className={`text-base ${dueDateTime ? 'text-primary font-medium' : 'text-neutral'}`}
                        >
                            {dueDateTime || 'dd/mm/yyyy --:--'}
                        </Text>

                        <View className="flex-row items-center gap-2">
                            <Calendar size={20} color="#3F51B5" />
                        </View>
                    </TouchableOpacity>

                    {/* Native Date Picker Modal */}
                    {showDatePicker && (
                        <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'inline' : 'default'}
                            minimumDate={new Date()}
                            onValueChange={handleDateChange} // 👈 4. Updated to onChange
                        />
                    )}

                    <View className="pt-3 border-t border-gray-100 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-3">
                            <RefreshCw size={20} color="#3F51B5" />
                            <View>
                                <Text className="text-sm font-bold text-primary">
                                    Sync to Google Calendar
                                </Text>
                                <Text className="text-xs text-neutral">
                                    Block time automatically
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={syncCalendar}
                            onValueChange={setSyncCalendar}
                            trackColor={{ false: '#E2E8F0', true: '#3F51B5' }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </View>

                {/* Section 3: Course / Category Chips */}
                <View className="mb-8">
                    <Text className="text-sm font-bold text-primary mb-3">
                        Course / Category
                    </Text>
                    <View className="flex-row flex-wrap items-center gap-2.5">
                        {CATEGORIES.map((cat) => {
                            const isSelected = selectedCategory === cat;
                            return (
                                <TouchableOpacity
                                    key={cat}
                                    onPress={() => setSelectedCategory(cat)}
                                    activeOpacity={0.8}
                                    className={`flex-row items-center gap-2 px-4 py-2.5 rounded-full ${
                                        isSelected ? 'bg-secondary' : 'bg-[#EFEFF4]'
                                    }`}
                                >
                                    <View
                                        className={`w-2 h-2 rounded-full ${
                                            isSelected ? 'bg-amber-400' : 'bg-secondary'
                                        }`}
                                    />
                                    <Text
                                        className={`font-semibold text-sm ${
                                            isSelected ? 'text-white' : 'text-primary'
                                        }`}
                                    >
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}

                        <TouchableOpacity className="w-10 h-10 rounded-full border border-dashed border-gray-300 items-center justify-center bg-white">
                            <Plus size={18} color="#77767D" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* CTA Button */}
                <TouchableOpacity
                    onPress={handleCreateTask}
                    activeOpacity={0.9}
                    className={`py-4 rounded-2xl flex-row items-center justify-center gap-2 shadow-md ${
                        taskName.trim() ? 'bg-primary' : 'bg-gray-300'
                    }`}
                    disabled={!taskName.trim()}
                >
                    <CheckCircle2 size={22} color="#FFFFFF" />
                    <Text className="text-white text-lg font-bold">Create Task</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}