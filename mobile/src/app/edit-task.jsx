// mobile/src/screens/EditTaskScreen.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, Alert, Platform, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Trash2, Tag, Plus, Calendar, Clock, Check, Save, CalendarCheck2, X, } from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Button from '../components/Button';
import { updateTaskWithOfflineSupport, processSyncQueue } from '../utils/offlineSync';
import { useTasks } from '../context/TaskContext';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function EditTaskScreen() {
    const router = useRouter();
    const { taskId } = useLocalSearchParams(); // Reads ?taskId=... from Dashboard
    const { getTaskById, updateTask, deleteTask } = useTasks();
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [dateValue, setDateValue] = useState(new Date());
    const [timeValue, setTimeValue] = useState(new Date());

    // Fetch the target task from context by ID
    const currentTask = getTaskById(taskId);

    // Local form state initialized from currentTask
    const [title, setTitle] = useState(currentTask?.title ?? '');
    const [selectedCourse, setSelectedCourse] = useState(currentTask?.course ?? '');
    const [dueDate, setDueDate] = useState(currentTask?.dueDate ?? '');
    const [dueTime, setDueTime] = useState(currentTask?.dueTime ?? '');
    const [description, setDescription] = useState(currentTask?.description ?? '');
    const [syncToCalendar, setSyncToCalendar] = useState(currentTask?.syncToCalendar ?? true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAddingCourse, setIsAddingCourse] = useState(false);
    const [newCourseInput, setNewCourseInput] = useState('');

    const [courses, setCourses] = useState([
        { id: 'CS 401', label: 'Selected', code: 'CS 401', color: '#3F51B5' },
        { id: 'CHM 201', label: 'Elective', code: 'CHM 201', color: '#5C1800' },
        { id: 'POL 301', label: 'Other', code: 'POL 301', color: '#77767D' },
    ]);

    // Date selection handler
    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios'); // Keep open on iOS modal, close on Android select
        if (selectedDate) {
            setDateValue(selectedDate);
            const formattedDate = selectedDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            }); // e.g., "Oct 28, 2026"
            setDueDate(formattedDate);
        }
    };

    // Time selection handler
    const onTimeChange = (event, selectedTime) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (selectedTime) {
            setTimeValue(selectedTime);
            const formattedTime = selectedTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            }); // e.g., "11:59 PM"
            setDueTime(formattedTime);
        }
    };

    // Keep inputs in sync if taskId changes or task data updates
    useEffect(() => {
        if (currentTask) {
            setTitle(currentTask.title ?? '');
            setSelectedCourse(currentTask.course ?? '');
            setDueDate(currentTask.dueDate ?? '');
            setDueTime(currentTask.dueTime ?? '');
            setDescription(currentTask.description ?? '');
            setSyncToCalendar(currentTask.syncToCalendar ?? true);
        }
    }, [taskId, currentTask]);

    //current task pill
    useEffect(() => {
        if (currentTask?.course && !courses.some((c) => c.id === currentTask.course)) {
            setCourses((prev) => [
                ...prev,
                { id: currentTask.course, code: currentTask.course, color: '#1A237E' },
            ]);
        }
    }, [currentTask]);

    //check for network
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            if (state.isConnected) {
                processSyncQueue(process.env.EXPO_PUBLIC_API_URL);
            }
        });
        return () => unsubscribe();
    }, []);


    //Add course
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
                color: '#1A237E', // Brand accent color for custom courses
            };
            setCourses((prev) => [...prev, newPill]);
        }

        // Select the new course & close input
        setSelectedCourse(formattedCode);
        setNewCourseInput('');
        setIsAddingCourse(false);
    };

    //Save changes
    const handleSaveChanges = async () => {
        const activeId = taskId || currentTask?.id || currentTask?._id;
        if (!activeId) {
            Alert.alert('Error', 'No task ID found.');
            return;
        }

        setIsSaving(true);
        const updatedData = {
            title,
            course: selectedCourse,
            dueDate,
            dueTime,
            description,
            syncToCalendar,
            updatedAt: new Date().toISOString(),
        };

        // Update React Context immediately so Dashboard re-renders
        if (updateTask) {
            updateTask(activeId, updatedData);
        }

        // Sync via offline queue / API
        const result = await updateTaskWithOfflineSupport(activeId, updatedData, process.env.EXPO_PUBLIC_API_URI);
        setIsSaving(false);

        if (result.status === 'queued_offline') {
            Alert.alert('Saved Offline', 'Changes saved locally. Syncing occurs when online.', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } else {
            Alert.alert('Success', 'Task updated successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        }
    };

    //Delete task
    const handleDeleteTask = () => {
        const activeId = taskId || currentTask?.id || currentTask?._id;
        if (!activeId) return;

        Alert.alert(
            'Delete Task',
            'Are you sure you want to delete this task? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        // Delete locally from context & AsyncStorage
                        if (deleteTask) {
                            deleteTask(activeId);
                        }

                        // Optional: trigger offline queue sync for API
                        // await deleteTaskWithOfflineSupport(activeId, API_BASE_URL);

                        router.back();
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView className={`flex-1 bg-white ${Platform.OS === 'android' ? 'pt-7' : ''}`}>
            {/* Navigation Header */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
                <TouchableOpacity className="p-2" onPress={() => router.back()}>
                    <ArrowLeft size={24} color="#1A237E" />
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-primary">Edit Task</Text>
                <TouchableOpacity className="p-2" onPress={handleDeleteTask}>
                    <Trash2 size={22} color="#5C1800" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {/* Task Title */}
                <View className="mt-4">
                    <Text className="text-sm font-semibold text-slate-900 mb-2">Task Title</Text>
                    <TextInput
                        className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-slate-900"
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Enter task title"
                        placeholderTextColor="#77767D"
                    />
                </View>

                {/* Course Pills */}
                <View className="mt-4">
                    <Text className="text-sm font-semibold text-slate-900 mb-2">Course</Text>

                    {isAddingCourse ? (
                        /* Single-line text input for adding a custom course */
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

                {/* Due Date & Time Pickers */}
                <View className="flex-row justify-between mt-4">
                    {/* Due Date Trigger */}
                    <View className="flex-1 mr-2">
                        <Text className="text-sm font-semibold text-slate-900 mb-2">Due Date</Text>
                        <TouchableOpacity
                            className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3.5 py-3"
                            onPress={() => setShowDatePicker(true)}
                            activeOpacity={0.7}
                        >
                            <Calendar size={18} color="#1A237E" />
                            <Text className="text-sm font-medium text-slate-900 ml-2">
                                {dueDate || 'Select Date'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Time Trigger */}
                    <View className="flex-1 ml-2">
                        <Text className="text-sm font-semibold text-slate-900 mb-2">Time</Text>
                        <TouchableOpacity
                            className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3.5 py-3"
                            onPress={() => setShowTimePicker(true)}
                            activeOpacity={0.7}
                        >
                            <Clock size={18} color="#1A237E" />
                            <Text className="text-sm font-medium text-slate-900 ml-2">
                                {dueTime || 'Select Time'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Native Android/iOS Date Picker Modal */}
                {showDatePicker && (
                    <DateTimePicker
                        value={dateValue}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onValueChange={onDateChange}
                        minimumDate={new Date()}
                    />
                )}

                {/* Native Android/iOS Time Picker Modal */}
                {showTimePicker && (
                    <DateTimePicker
                        value={timeValue}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onValueChange={onTimeChange}
                        is24Hour={false}
                    />
                )}

                {/* Description Notes */}
                <View className="mt-4">
                    <Text className="text-sm font-semibold text-slate-900 mb-2">Description Notes</Text>
                    <TextInput
                        className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-slate-900 min-h-[110px]"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        placeholder="Add assignment details..."
                        placeholderTextColor="#77767D"
                    />
                </View>

                {/* Google Calendar Sync Switch */}
                <View className="flex-row items-center justify-between bg-surface-light rounded-2xl p-4 mt-5">
                    <View className="flex-row items-center flex-1 pr-2">
                        <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3">
                            <CalendarCheck2 size={22} color="#1A237E" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-sm font-semibold text-slate-900">Sync to Google Calendar</Text>
                            <Text className="text-xs text-neutral mt-0.5">Update calendar entry automatically</Text>
                        </View>
                    </View>
                    <Switch
                        value={syncToCalendar}
                        onValueChange={setSyncToCalendar}
                        trackColor={{ false: '#77767D', true: '#1A237E' }}
                        thumbColor="#FFFFFF"
                    />
                </View>

                {/* Save Changes Button */}
                <Button
                    title={isSaving ? 'Saving...' : 'Save Changes'}
                    onPress={handleSaveChanges}
                    variant="primary"
                    isLoading={isSaving}
                    className="mt-7"
                    icon={<Save size={22} color="#FFFFFF" />}
                />
            </ScrollView>
        </SafeAreaView>
    );
}