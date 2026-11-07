import React from 'react';
import { View } from 'react-native';
import { Calendar } from 'react-native-calendars';

export default function CalendarView({ tasks, onSelectDate }) {
    // Transform your tasks into the format required by react-native-calendars
    // e.g., { '2026-11-15': { marked: true, dotColor: '#4F46E5' } }
    const markedDates = tasks.reduce((acc, task) => {
        if (task.dueDate) {
            const dateStr = task.dueDate.split('T')[0]; // Format: YYYY-MM-DD
            acc[dateStr] = { marked: true, dotColor: '#4F46E5', activeOpacity: 0.7 };
        }
        return acc;
    }, {});

    return (
        <View className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
            <Calendar
                markedDates={markedDates}
                onDayPress={(day) => onSelectDate(day.dateString)}
                theme={{
                    backgroundColor: '#ffffff',
                    calendarBackground: '#ffffff',
                    textSectionTitleColor: '#b6c1cd',
                    selectedDayBackgroundColor: '#4F46E5',
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: '#4F46E5',
                    dayTextColor: '#1f2937',
                    textDisabledColor: '#d9e1e8',
                    dotColor: '#4F46E5',
                    selectedDotColor: '#ffffff',
                    arrowColor: '#4F46E5',
                    monthTextColor: '#111827',
                    textDayFontWeight: '500',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: '600',
                    textDayFontSize: 14,
                    textMonthFontSize: 16,
                    textDayHeaderFontSize: 13
                }}
            />
        </View>
    );
}