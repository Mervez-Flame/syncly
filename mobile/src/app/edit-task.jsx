// mobile/src/screens/EditTaskScreen.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Trash2, Plus, Calendar, Clock, Check, Save, Info, X } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Button from '../components/Button';
import { useTasks } from '../context/TaskContext';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function EditTaskScreen() {
    const router = useRouter();
    const { taskId } = useLocalSearchParams();
    const { getTaskById, updateTask, deleteTask } = useTasks();

    const currentTask = getTaskById(taskId);

    // Determines if the task is an AI-extracted calendar event (Read-Only)
    const isSyncedEvent = !!currentTask?.calendarEventId;

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [dateValue, setDateValue] = useState(new Date());
    const [timeValue, setTimeValue] = useState(new Date());

    // Local form state
    const [title, setTitle] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [description, setDescription] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [isAddingCourse, setIsAddingCourse] = useState(false);
    const [newCourseInput, setNewCourseInput] = useState('');

    const [courses, setCourses] = useState([
        { id: 'CS 401', code: 'CS 401', color: '#3F51B5' },
        { id: 'CHM 201', code: 'CHM 201', color: '#5C1800' },
        { id: 'POL 301', code: 'POL 301', color: '#77767D' },
    ]);

    // Keep inputs in sync if taskId changes or task data loads
    useEffect(() => {
        if (currentTask) {
            setTitle(currentTask.title || '');
            setSelectedCourse(currentTask.courseCode || '');
            setDescription(currentTask.description || '');

            if (currentTask.dueDate) {
                const existingDate = new Date(currentTask.dueDate);
                setDateValue(existingDate);
                setTimeValue(existingDate);

                setDueDate(existingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
                setDueTime(existingDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
            }
        }
    }, [taskId, currentTask]);

    // Add current course to pill list if it doesn't exist
    useEffect(() => {
        if (currentTask?.courseCode && !courses.some((c) => c.id === currentTask.courseCode)) {
            setCourses((prev) => [
                ...prev,
                { id: currentTask.courseCode, code: currentTask.courseCode, color: '#1A237E' },
            ]);
        }
    }, [currentTask]);

    // Add custom course
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

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setDateValue(selectedDate);
            setDueDate(selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
        }
    };

    const onTimeChange = (event, selectedTime) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (selectedTime) {
            setTimeValue(selectedTime);
            setDueTime(selectedTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
        }
    };

    const handleSaveChanges = async () => {
        const activeId = taskId || currentTask?.localTaskId || currentTask?._id;
        if (!activeId) return;

        setIsSaving(true);

        // Combine date and time back into a single ISO timestamp
        let finalDueDate = null;
        if (dueDate) {
            const combined = new Date(dateValue);
            combined.setHours(timeValue.getHours());
            combined.setMinutes(timeValue.getMinutes());
            combined.setSeconds(0);
            combined.setMilliseconds(0);
            finalDueDate = combined.toISOString();
        }

        const updatedData = {
            title: title.trim(),
            description: description.trim(),
            courseCode: selectedCourse || null,
            dueDate: finalDueDate,
        };

        // Update React Context immediately (which flags syncState as pending_update)
        if (updateTask) {
            updateTask(activeId, updatedData);
        }

        setIsSaving(false);
        router.back();
    };

    const handleDeleteTask = () => {
        const activeId = taskId || currentTask?.localTaskId || currentTask?._id;
        if (!activeId) return;

        Alert.alert(
            'Delete Task',
            'Are you sure you want to delete this task? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        // Deleting locally flips isDeleted to true (soft delete)
                        if (deleteTask) {
                            deleteTask(activeId);
                        }
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

                {/* Hide delete button if it's an AI-synced task */}
                {isSyncedEvent ? (
                    <View className="w-10" />
                ) : (
                    <TouchableOpacity className="p-2" onPress={handleDeleteTask}>
                        <Trash2 size={22} color="#5C1800" />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

                {/* AI Task Read-Only Warning */}
                {isSyncedEvent && (
                    <View className="bg-orange-50 border border-orange-200 rounded-xl p-4 mt-4 flex-row items-start">
                        <Info size={20} color="#E65100" className="mt-0.5" />
                        <View className="flex-1 ml-3">
                            <Text className="text-sm font-bold text-orange-900">Synchronized Event</Text>
                            <Text className="text-sm text-orange-800 mt-1 leading-5">
                                This task was automatically scheduled. To edit details or delete it, please tap the task from your Dashboard to open the Google Calendar web view.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Task Title */}
                <View className="mt-4">
                    <Text className="text-sm font-semibold text-slate-900 mb-2">Task Title</Text>
                    <TextInput
                        className={`border rounded-xl px-4 py-3 text-base ${isSyncedEvent ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-white border-gray-200 text-slate-900'}`}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Enter task title"
                        placeholderTextColor="#77767D"
                        editable={!isSyncedEvent}
                    />
                </View>

                {/* Course Pills */}
                <View className="mt-4">
                    <Text className="text-sm font-semibold text-slate-900 mb-2">Course</Text>

                    {isAddingCourse && !isSyncedEvent ? (
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
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1 opacity-100">
                            {courses.map((c) => {
                                const isSelected = selectedCourse === c.id;
                                return (
                                    <TouchableOpacity
                                        key={c.id}
                                        onPress={() => !isSyncedEvent && setSelectedCourse(isSelected ? '' : c.id)}
                                        activeOpacity={isSyncedEvent ? 1 : 0.7}
                                        className={`flex-row items-center border rounded-2xl py-2 px-3.5 mr-2.5 min-w-[90px] ${isSyncedEvent ? 'bg-gray-100 border-gray-200' :
                                                isSelected ? 'border-primary bg-surface-light' : 'bg-white border-gray-200'
                                            }`}
                                    >
                                        <View className={`w-1.5 h-6 rounded-sm mr-2 ${isSyncedEvent ? 'bg-gray-400' : ''}`} style={!isSyncedEvent ? { backgroundColor: c.color } : {}} />
                                        <Text className={`text-sm font-bold ${isSyncedEvent ? 'text-gray-500' : isSelected ? 'text-primary' : 'text-slate-900'}`}>
                                            {c.code}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}

                            {!isSyncedEvent && (
                                <TouchableOpacity
                                    onPress={() => setIsAddingCourse(true)}
                                    className="w-11 h-11 rounded-full bg-surface-light items-center justify-center border border-gray-200"
                                >
                                    <Plus size={20} color="#1A237E" />
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    )}
                </View>

                {/* Due Date & Time Pickers */}
                <View className="flex-row justify-between mt-4">
                    <View className="flex-1 mr-2">
                        <Text className="text-sm font-semibold text-slate-900 mb-2">Due Date</Text>
                        <TouchableOpacity
                            className={`flex-row items-center border rounded-xl px-3.5 py-3 ${isSyncedEvent ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-200'}`}
                            onPress={() => !isSyncedEvent && setShowDatePicker(true)}
                            activeOpacity={isSyncedEvent ? 1 : 0.7}
                        >
                            <Calendar size={18} color={isSyncedEvent ? "#9CA3AF" : "#1A237E"} />
                            <Text className={`text-sm font-medium ml-2 ${isSyncedEvent ? 'text-gray-500' : 'text-slate-900'}`}>
                                {dueDate || 'Select Date'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View className="flex-1 ml-2">
                        <Text className="text-sm font-semibold text-slate-900 mb-2">Time</Text>
                        <TouchableOpacity
                            className={`flex-row items-center border rounded-xl px-3.5 py-3 ${isSyncedEvent ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-200'}`}
                            onPress={() => !isSyncedEvent && setShowTimePicker(true)}
                            activeOpacity={isSyncedEvent ? 1 : 0.7}
                        >
                            <Clock size={18} color={isSyncedEvent ? "#9CA3AF" : "#1A237E"} />
                            <Text className={`text-sm font-medium ml-2 ${isSyncedEvent ? 'text-gray-500' : 'text-slate-900'}`}>
                                {dueTime || 'Select Time'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={dateValue}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onValueChange={onDateChange}
                        minimumDate={new Date()}
                    />
                )}

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
                        className={`border rounded-xl px-4 py-3 text-base min-h-[110px] ${isSyncedEvent ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-white border-gray-200 text-slate-900'}`}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        placeholder="Add assignment details..."
                        placeholderTextColor="#77767D"
                        editable={!isSyncedEvent}
                    />
                </View>

                {/* Save Changes Button (Hidden if Read-Only) */}
                {!isSyncedEvent && (
                    <Button
                        title={isSaving ? 'Saving...' : 'Save Changes'}
                        onPress={handleSaveChanges}
                        variant="primary"
                        isLoading={isSaving}
                        className="mt-7"
                        icon={<Save size={22} color="#FFFFFF" />}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
}