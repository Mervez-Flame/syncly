// mobile/src/screens/EditTaskScreen.jsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ArrowLeft,
    Trash2,
    Tag,
    Plus,
    Calendar,
    Clock,
    Save,
    CalendarCheck2,
} from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';
import Button from '../components/Button';
import { updateTaskWithOfflineSupport, processSyncQueue } from '../utils/offlineSync';

const API_BASE_URL = 'http://localhost:5000';

export default function EditTaskScreen({ route, navigation }) {
    const initialTask = route?.params?.task || {
        _id: '12345',
        title: 'Final Project Submission',
        course: 'CS 401',
        dueDate: 'Oct 24, 2023',
        dueTime: '11:59 PM',
        description:
            'Research paper on Human-Computer Interaction models. Needs to include 5 peer-reviewed sources and a high-fidelity prototype link.',
        syncToCalendar: true,
    };

    const [title, setTitle] = useState(initialTask.title);
    const [selectedCourse, setSelectedCourse] = useState(initialTask.course);
    const [dueDate, setDueDate] = useState(initialTask.dueDate);
    const [dueTime, setDueTime] = useState(initialTask.dueTime);
    const [description, setDescription] = useState(initialTask.description);
    const [syncToCalendar, setSyncToCalendar] = useState(initialTask.syncToCalendar);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            if (state.isConnected) {
                processSyncQueue(API_BASE_URL);
            }
        });
        return () => unsubscribe();
    }, []);

    const courses = [
        { id: 'CS 401', label: 'Selected', code: 'CS 401', color: '#3F51B5' },
        { id: 'PSY 101', label: 'Elective', code: 'PSY 101', color: '#5C1800' },
        { id: 'Misc', label: 'Other', code: 'Misc', color: '#77767D' },
    ];

    const handleSaveChanges = async () => {
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

        const result = await updateTaskWithOfflineSupport(initialTask._id, updatedData, API_BASE_URL);
        setIsSaving(false);

        if (result.status === 'queued_offline') {
            Alert.alert('Saved Offline', 'Changes saved locally. Syncing occurs when online.', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } else {
            Alert.alert('Success', 'Task updated successfully!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        }
    };

    return (
        <SafeAreaView className={`flex-1 bg-white ${Platform.OS === 'android' ? 'pt-7' : ''}`}>
            {/* Navigation Header */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
                <TouchableOpacity className="p-2" onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color="#1A237E" />
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-primary">Edit Task</Text>
                <TouchableOpacity className="p-2" onPress={() => navigation.goBack()}>
                    <Trash2 size={22} color="#5C1800" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {/* Banner */}
                <View className="flex-row bg-surface-light rounded-2xl p-4.5 items-center justify-between my-3 border border-surface-light">
                    <View className="flex-1 pr-3">
                        <Text className="text-xs font-bold text-primary tracking-wide mb-1">ASSIGNMENT DETAILS</Text>
                        <Text className="text-xs text-neutral leading-5">Organize your academic journey with clarity and focus.</Text>
                    </View>
                    <Tag size={30} color="#1A237E" />
                </View>

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
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
                        {courses.map((c) => {
                            const isSelected = selectedCourse === c.id;
                            return (
                                <TouchableOpacity
                                    key={c.id}
                                    onPress={() => setSelectedCourse(c.id)}
                                    activeOpacity={0.7}
                                    className={`flex-row items-center bg-white border rounded-2xl py-2 px-3 mr-2.5 min-w-[100px] ${isSelected ? 'border-primary bg-surface-light' : 'border-gray-200'
                                        }`}
                                >
                                    <View className="w-1.5 h-7 rounded-sm mr-2.5" style={{ backgroundColor: c.color }} />
                                    <View>
                                        <Text className={`text-[11px] font-medium ${isSelected ? 'text-primary' : 'text-neutral'}`}>
                                            {c.label}
                                        </Text>
                                        <Text className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-slate-900'}`}>
                                            {c.code}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                        <TouchableOpacity className="w-11 h-11 rounded-full bg-surface-light items-center justify-center">
                            <Plus size={20} color="#1A237E" />
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* Due Date & Time */}
                <View className="flex-row justify-between mt-4">
                    <View className="flex-1 mr-2">
                        <Text className="text-sm font-semibold text-slate-900 mb-2">Due Date</Text>
                        <TouchableOpacity className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3.5 py-3">
                            <Calendar size={18} color="#1A237E" />
                            <Text className="text-sm font-medium text-slate-900 ml-2">{dueDate}</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="flex-1 ml-2">
                        <Text className="text-sm font-semibold text-slate-900 mb-2">Time</Text>
                        <TouchableOpacity className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3.5 py-3">
                            <Clock size={18} color="#1A237E" />
                            <Text className="text-sm font-medium text-slate-900 ml-2">{dueTime}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

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