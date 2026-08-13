import React, { useState } from 'react';
import { Text, View, ScrollView, TouchableOpacity, Image, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, Mail, Clock, Plus, LayoutGrid, Calendar, User, FileText, Check, } from 'lucide-react-native';

const INITIAL_TASKS = [
  {
    id: '1',
    course: 'CS101',
    courseBg: 'bg-[#E2E4FE]',
    courseTextColor: 'text-[#3B49DF]',
    borderAccent: 'border-l-[#3B49DF]',
    sourceType: 'email',
    sourceLabel: 'Auto Ingested',
    title: 'Submit Logic Quiz',
    dueTime: '11:59 PM',
    completed: false,
  },
  {
    id: '2',
    course: 'ECON202',
    courseBg: 'bg-[#E2E4FE]',
    courseTextColor: 'text-[#3B49DF]',
    borderAccent: 'border-l-[#FF8A65]',
    sourceType: 'manual',
    sourceLabel: 'User Created',
    title: 'Review Chapter 4 Summary',
    dueTime: '4:00 PM',
    completed: false,
  },
  {
    id: '3',
    course: 'MATH301',
    courseBg: 'bg-[#E2E4FE]',
    courseTextColor: 'text-[#3B49DF]',
    borderAccent: 'border-l-[#3B49DF]',
    sourceType: 'email',
    sourceLabel: 'Auto Ingested',
    title: 'Calculus Problem Set',
    dueTime: '8:00 PM',
    completed: false,
  },
];

export default function DashboardScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState(INITIAL_TASKS);

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const filteredTasks = tasks.filter((task) => {
    if (activeFilter === 'email') return task.sourceType === 'email';
    if (activeFilter === 'manual') return task.sourceType === 'manual';
    return true;
  });

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <View className="flex-1 relative">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120,}}>
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-3">
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop',
                }}
                className="w-12 h-12 rounded-full"
              />
              <View>
                <Text className="text-xl font-bold text-[#0A0E5C]">
                  Hello, Alex
                </Text>
                <View className="flex-row items-center gap-1.5 mt-0.5">
                  <View className="w-2.5 h-2.5 rounded-full bg-[#4ADE80]" />
                  <Text className="text-xs text-gray-500 font-medium">
                    Google Calendar Synced
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity className="p-2">
              <Bell size={24} color="#0A0E5C" />
            </TouchableOpacity>
          </View>

          {/* Filter Chips */}
          <View className="flex-row gap-3 mb-7">
            {['all', 'email', 'manual'].map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  className={`px-5 py-2.5 rounded-full ${
                    isActive ? 'bg-[#3B49DF]' : 'bg-[#EFEFF4]'
                  }`}
                >
                  <Text
                    className={`font-semibold text-sm capitalize ${
                      isActive ? 'text-white' : 'text-[#475569]'
                    }`}
                  >
                    {filter === 'all' ? 'All Tasks' : filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Section Title */}
          <Text className="text-2xl font-bold text-[#0A0E5C] mb-4">
            Today's Focus
          </Text>

          {/* Task Cards */}
          <View className="gap-4">
            {filteredTasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                activeOpacity={0.85}
                onPress={() => router.push(`/edit-task?taskId=${task.id}`)}
                className={`bg-white rounded-2xl p-4 border border-gray-100 border-l-[5px] ${task.borderAccent} flex-row items-center gap-3 shadow-sm`}
              >
                {/* Checkbox */}
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleTask(task.id);
                  }}
                  className={`w-6 h-6 rounded-lg border border-gray-300 items-center justify-center ${
                    task.completed
                      ? 'bg-[#3B49DF] border-[#3B49DF]'
                      : 'bg-white'
                  }`}
                >
                  {task.completed && (
                    <Check size={14} color="#FFFFFF" strokeWidth={3} />
                  )}
                </TouchableOpacity>

                {/* Content */}
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-1.5">
                    <View className={`${task.courseBg} px-2.5 py-0.5 rounded-md`}>
                      <Text className={`text-xs font-bold ${task.courseTextColor}`}>
                        {task.course}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      {task.sourceType === 'email' ? (
                        <Mail size={13} color="#64748B" />
                      ) : (
                        <FileText size={13} color="#64748B" />
                      )}
                      <Text className="text-xs text-gray-500 font-medium">
                        {task.sourceLabel}
                      </Text>
                    </View>
                  </View>
                  <Text
                    className={`text-lg font-bold text-[#0A0E5C] mb-1 ${
                      task.completed ? 'line-through text-gray-400' : ''
                    }`}
                  >
                    {task.title}
                  </Text>
                  <View className="flex-row items-center gap-1">
                    <Clock size={14} color="#64748B" />
                    <Text className="text-xs text-gray-500 font-medium">
                      Due {task.dueTime}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Floating Action Button (FAB) */}
        <TouchableOpacity
          onPress={() => router.push('/edit-task')}
          className="absolute bottom-24 right-5 w-14 h-14 bg-[#0A0E5C] rounded-2xl items-center justify-center shadow-lg z-20"
        >
          <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>

        {/* Bottom Navigation */}
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 py-3 px-6 flex-row justify-between items-center z-10">
          <TouchableOpacity
            onPress={() => setActiveTab('dashboard')}
            className={`flex-row items-center gap-2 px-4 py-2.5 rounded-2xl ${
              activeTab === 'dashboard' ? 'bg-[#818CF8]/30' : ''
            }`}
          >
            <LayoutGrid
              size={20}
              color={activeTab === 'dashboard' ? '#3B49DF' : '#64748B'}
            />
            {activeTab === 'dashboard' && (
              <Text className="text-[#3B49DF] font-bold text-sm">Dashboard</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('calendar')}
            className={`flex-row items-center gap-2 px-4 py-2.5 rounded-2xl ${
              activeTab === 'calendar' ? 'bg-[#818CF8]/30' : ''
            }`}
          >
            <Calendar
              size={20}
              color={activeTab === 'calendar' ? '#3B49DF' : '#64748B'}
            />
            {activeTab === 'calendar' && (
              <Text className="text-[#3B49DF] font-bold text-sm">Calendar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('profile')}
            className={`flex-row items-center gap-2 px-4 py-2.5 rounded-2xl ${
              activeTab === 'profile' ? 'bg-[#818CF8]/30' : ''
            }`}
          >
            <User
              size={20}
              color={activeTab === 'profile' ? '#3B49DF' : '#64748B'}
            />
            {activeTab === 'profile' && (
              <Text className="text-[#3B49DF] font-bold text-sm">Profile</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}