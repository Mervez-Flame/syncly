import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowLeft, Calendar, CheckCircle2, Plus, Clock, Check, X } from 'lucide-react-native';
import { useTasks } from '../context/TaskContext';

export default function CreateTaskScreen() {
    const router = useRouter();
    const { addTask } = useTasks();

    const [taskName, setTaskName] = useState('');
    const [description, setDescription] = useState('');

    // Date & Time Picker States
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState(new Date());

    // Course Selection States
    const [selectedCourse, setSelectedCourse] = useState('');
    const [isAddingCourse, setIsAddingCourse] = useState(false);
    const [newCourseInput, setNewCourseInput] = useState('');

    const [courses, setCourses] = useState([
        { id: 'CS 401', code: 'CS 401', color: '#3F51B5' },
        { id: 'CHM 201', code: 'CHM 201', color: '#5C1800' },
        { id: 'POL 301', code: 'POL 301', color: '#77767D' },
    ]);

    // Add custom course pill
    const handleAddCustomCourse = () => {
        const formattedCode = newCourseInput.trim().toUpperCase();
        if (!formattedCode) {
            setIsAddingCourse(false);
            return;
        }

        if (!courses.some((c) => c.id === formattedCode)) {
            const newPill = {
                id: formattedCode,
                code: formattedCode,
                color: '#1A237E',
            };
            setCourses((prev) => [...prev, newPill]);
        }

        setSelectedCourse(formattedCode);
        setNewCourseInput('');
        setIsAddingCourse(false);
    };

    // Date selection handler
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

    // Create Task Handler
    const handleCreateTask = () => {
        if (!taskName.trim()) return;

        // Combine selectedDate and selectedTime into a single ISO timestamp
        let finalDueDate = null;
        if (dueDate) {
            const combined = new Date(selectedDate);
            if (dueTime) {
                combined.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
            } else {
                combined.setHours(12, 0, 0, 0); // no time chosen: use midday so the date does not shift
            }
            finalDueDate = combined.toISOString();
            finalDueDate = combined.toISOString();
        }

        addTask({
            title: taskName.trim(),
            description: description.trim(),
            courseCode: selectedCourse || null,
            dueDate: finalDueDate,
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
                        placeholder="Task Name"
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

                {/* Card 2: Date & Time Selection */}
                <View className="bg-white rounded-2xl p-4 mb-5 border border-gray-100 shadow-sm">
                    <Text className="text-sm font-bold text-primary mb-2">Due Date & Time</Text>

                    {/* Side-by-side Date & Time Selectors */}
                    <View className="flex-row justify-between">
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
                            onValueChange={handleDateChange}
                        />
                    )}

                    {/* Native Time Picker Modal */}
                    {showTimePicker && (
                        <DateTimePicker
                            value={selectedTime || new Date()}
                            mode="time"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            is24Hour={false}
                            onValueChange={handleTimeChange}
                        />
                    )}
                </View>

                {/* Course Selection */}
                <View className="mt-2 mb-6">
                    <Text className="text-sm font-semibold text-slate-900 mb-2">Course Code</Text>

                    {isAddingCourse ? (
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
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
                            {courses.map((c) => {
                                const isSelected = selectedCourse === c.id;
                                return (
                                    <TouchableOpacity
                                        key={c.id}
                                        onPress={() => setSelectedCourse(isSelected ? '' : c.id)}
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

                            <TouchableOpacity
                                onPress={() => setIsAddingCourse(true)}
                                className="w-11 h-11 rounded-full bg-surface-light items-center justify-center border border-gray-200"
                            >
                                <Plus size={20} color="#1A237E" />
                            </TouchableOpacity>
                        </ScrollView>
                    )}
                </View>

                {/* Create Task Button */}
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
        </SafeAreaView>
    );
}