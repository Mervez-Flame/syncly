import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, Platform, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowLeft, Calendar, RefreshCw, CheckCircle2, Plus, Clock, Check, X, } from 'lucide-react-native';
import { useTasks } from '../context/TaskContext';

const CATEGORIES = ['History 201', 'Organic Chem', 'CSC 401', 'Misc'];

export default function CreateTaskScreen() {
    const router = useRouter();
    const { addTask } = useTasks();

    const [taskName, setTaskName] = useState('');
    const [description, setDescription] = useState('');

    // Date Picker States
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState(new Date());
    const [syncCalendar, setSyncCalendar] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [isAddingCourse, setIsAddingCourse] = useState(false);
    const [newCourseInput, setNewCourseInput] = useState('');

    const [courses, setCourses] = useState([
        { id: 'CS 401', label: 'Selected', code: 'CS 401', color: '#3F51B5' },
        { id: 'CHM 201', label: 'Elective', code: 'CHM 201', color: '#5C1800' },
        { id: 'POL 301', label: 'Other', code: 'POL 301', color: '#77767D' },
    ]);

    //Add custom  course pill
    const handleAddCustomCourse = () => {
        const formattedCode = newCourseInput.trim().toUpperCase();
        if (!formattedCode) {
            setIsAddingCourse(false);
            return;
        }

        // Add to list if it doesn't already exist
        if (!courses.some((c) => c.id === formattedCode)) {
            const newPill = {
                id: formattedCode,
                code: formattedCode,
                color: '#1A237E',
            };
            setCourses((prev) => [...prev, newPill]);
        }

        // Automatically select the newly created course & close input
        setSelectedCourse(formattedCode);
        setNewCourseInput('');
        setIsAddingCourse(false);
    };


    // Handle Date Change
    const handleDateChange = (event, date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (date) {
            setSelectedDate(date);
            const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
            setDueDate(formattedDate);
        }
    };

    // Time selection handler
    const handleTimeChange = (event, time) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (time) {
            setSelectedTime(time);
            const formattedTime = time.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
            setDueTime(formattedTime);
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
                    {/* Card 2: Date, Time & Calendar Sync */}
                    <View className="bg-white rounded-2xl p-4 mb-5 border border-gray-100 shadow-sm">
                        <Text className="text-sm font-bold text-primary mb-2">Due Date & Time</Text>

                        {/* Side-by-side Date & Time Selectors */}
                        <View className="flex-row justify-between mb-4">
                            {/* Due Date Button */}
                            <View className="flex-1 mr-2">
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => setShowDatePicker(true)}
                                    className="border border-gray-200 rounded-xl p-3.5 flex-row items-center justify-between"
                                >
                                    <Text className={`text-sm ${dueDate ? 'text-primary font-medium' : 'text-neutral'}`}>
                                        {dueDate || 'Select Date'}
                                    </Text>
                                    <Calendar size={18} color="#3F51B5" />
                                </TouchableOpacity>
                            </View>

                            {/* Time Button */}
                            <View className="flex-1 ml-2">
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => setShowTimePicker(true)}
                                    className="border border-gray-200 rounded-xl p-3.5 flex-row items-center justify-between"
                                >
                                    <Text className={`text-sm ${dueTime ? 'text-primary font-medium' : 'text-neutral'}`}>
                                        {dueTime || 'Select Time'}
                                    </Text>
                                    <Clock size={18} color="#3F51B5" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Native Date Picker Modal */}
                        {showDatePicker && (
                            <DateTimePicker
                                value={selectedDate || new Date()}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                minimumDate={new Date()}
                                onValueChange={handleDateChange} // ✅ Standard prop is `onChange`, not `onValueChange`
                            />
                        )}

                        {/* Native Time Picker Modal */}
                        {showTimePicker && (
                            <DateTimePicker
                                value={selectedTime || new Date()}
                                mode="time"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                is24Hour={false}
                                onValueChange={handleTimeChange} // ✅ Independent time handler
                            />
                        )}
                    </View>

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

                {/* Course Pills */}
                <View className="mt-4">
                    <Text className="text-sm font-semibold text-slate-900 mb-2">Course</Text>

                    {isAddingCourse ? (
                        /* Single-line text input for dynamic course creation */
                        <View className="flex-row items-center bg-white border border-primary rounded-2xl px-3 py-1.5 mt-1">
                            <TextInput
                                className="flex-1 text-sm font-bold text-slate-900 py-1.5"
                                placeholder="e.g. CSC 411 or ENG 101"
                                placeholderTextColor="#77767D"
                                value={newCourseInput}
                                onChangeText={setNewCourseInput}
                                autoCapitalize="characters"
                                autoFocus
                                onSubmitEditing={handleAddCustomCourse}
                            />
                            <TouchableOpacity
                                className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-1"
                                onPress={handleAddCustomCourse}
                            >
                                <Check size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                                onPress={() => {
                                    setIsAddingCourse(false);
                                    setNewCourseInput('');
                                }}
                            >
                                <X size={16} color="#77767D" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* Horizontal Course Pills + Plus Button */
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
                            {courses.map((c) => {
                                const isSelected = selectedCourse === c.id;
                                return (
                                    <TouchableOpacity
                                        key={c.id}
                                        onPress={() => setSelectedCourse(c.id)}
                                        activeOpacity={0.7}
                                        className={`flex-row items-center bg-white border rounded-2xl py-2 px-3.5 mr-2.5 min-w-[90px] ${isSelected ? 'border-primary bg-surface-light' : 'border-gray-200'
                                            }`}
                                    >
                                        <View className="w-1.5 h-6 rounded-sm mr-2" style={{ backgroundColor: c.color }} />
                                        <Text className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-slate-900'}`}>
                                            {c.code}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}

                            {/* Plus Button to Trigger Input */}
                            <TouchableOpacity
                                onPress={() => setIsAddingCourse(true)}
                                className="w-11 h-11 rounded-full bg-surface-light items-center justify-center border border-gray-200"
                            >
                                <Plus size={20} color="#1A237E" />
                            </TouchableOpacity>
                        </ScrollView>
                    )}
                </View>

                {/* CTA Button */}
                <TouchableOpacity
                    onPress={handleCreateTask}
                    activeOpacity={0.9}
                    className={`py-4 rounded-2xl flex-row items-center justify-center gap-2 shadow-md ${taskName.trim() ? 'bg-primary' : 'bg-gray-300'
                        }`}
                    disabled={!taskName.trim()}
                >
                    <CheckCircle2 size={22} color="#FFFFFF" />
                    <Text className="text-white text-lg font-bold">Create Task</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView >
    );
}