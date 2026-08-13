import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Index() {

    return (
        <SafeAreaView className="flex-1 bg-[#F8FAFC]">
            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <Text className="text-xl font-bold text-[#0A0E5C]">
                    Profile Page
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}