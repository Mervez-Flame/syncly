import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { View, Text, Image, TouchableOpacity, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, GraduationCap, Infinity as InfinityIcon, CalendarCheck, Sparkles, CheckSquare,} from 'lucide-react-native';

const SLIDES = [
    {
        id: 1,
        title: 'Never Miss a Deadline',
        description:
            'FocusFlow automatically syncs your assignments from your student email directly into your task list.',
        imageUri:
            'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=600',
    },
    {
        id: 2,
        title: 'Your Schedule, Unified',
        description:
            'Seamlessly bridge your Google Calendar with your academic tasks for a complete view of your day.',
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const { login } = useAuth();
    const [currentStep, setCurrentStep] = useState(0); // 0: Step 1, 1: Step 2, 2: Step 3 (Auth)

    const handleNext = () => {
        if (currentStep < 2) {
            setCurrentStep((prev) => prev + 1);
        }
    };

    const handleMockLogin = async (email, name) => {
    await login({ name, email }); // Saves session to AsyncStorage & sets user state
    router.replace ('dashboard'); // Routes to dashboard
    };

    const handleSkip = () => {
        setCurrentStep(2);
    };

    return (
        <SafeAreaView className="flex-1 bg-[#F4F5FF]">
            <View className="flex-1 px-6 pt-4 pb-6 justify-between items-center">
                {/* Header Branding */}
                <View className="items-center w-full">
                    {currentStep === 2 ? (
                        <View className="items-center mt-2">
                            <View className="w-14 h-14 bg-primary rounded-2xl items-center justify-center mb-2 shadow-md">
                                <InfinityIcon size={32} color="#FFFFFF" />
                            </View>
                            <Text className="text-xl font-bold text-primary">FocusFlow</Text>
                        </View>
                    ) : (
                        <Text className="text-xl font-bold text-primary mt-2">
                            FocusFlow
                        </Text>
                    )}
                </View>

                {/* STEP 1 & STEP 2: Onboarding Content */}
                {currentStep < 2 && (
                    <View className="flex-1 items-center justify-center my-4 w-full">
                        {/* Graphic Illustration Card */}
                        <View className="w-full h-80 rounded-3xl overflow-hidden shadow-sm mb-6 border border-white/80 bg-white items-center justify-center">
                            {currentStep === 0 ? (
                                <Image
                                    source={{ uri: SLIDES[0].imageUri }}
                                    className="w-full h-full"
                                    resizeMode="cover"
                                />
                            ) : (
                                <View className="w-full h-full bg-[#F8FAFC] p-6 items-center justify-center relative">
                                    {/* Mock Card Preview Graphic */}
                                    <View className="w-52 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 absolute top-8 left-4 z-10">
                                        <CalendarCheck size={22} color="#3F51B5" />
                                        <View className="w-28 h-2.5 bg-indigo-100 rounded-full mt-3" />
                                        <View className="w-16 h-2 bg-gray-100 rounded-full mt-2" />
                                    </View>
                                    <View className="w-56 bg-white p-4 rounded-2xl shadow-md border border-gray-100 absolute bottom-10 right-4 z-20">
                                        <View className="flex-row items-center gap-2.5 mb-2.5">
                                            <CheckSquare size={16} color="#3F51B5" />
                                            <View className="w-32 h-2.5 bg-gray-200 rounded-full" />
                                        </View>
                                        <View className="flex-row items-center gap-2.5">
                                            <View className="w-4 h-4 rounded border border-gray-300" />
                                            <View className="w-24 h-2.5 bg-gray-100 rounded-full" />
                                        </View>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Slide Titles & Descriptions */}
                        <Text className="text-2xl font-bold text-primary text-center mb-3">
                            {SLIDES[currentStep].title}
                        </Text>
                        <Text className="text-sm font-regular text-neutral text-center leading-6 px-4 mb-6">
                            {SLIDES[currentStep].description}
                        </Text>

                        {/* Pagination Indicators */}
                        <View className="flex-row items-center gap-2 mb-2">
                            <View
                                className={`h-2 rounded-full ${currentStep === 0 ? 'w-8 bg-primary' : 'w-2 bg-gray-300'
                                    }`}
                            />
                            <View
                                className={`h-2 rounded-full ${currentStep === 1 ? 'w-8 bg-primary' : 'w-2 bg-gray-300'
                                    }`}
                            />
                            <View className="w-2 h-2 rounded-full bg-gray-300" />
                        </View>
                    </View>
                )}

                {/* STEP 3: Welcome & Auth Options */}
                {currentStep === 2 && (
                    <View className="w-full flex-1 justify-center my-4">
                        {/* Step 3 Bar Indicator */}
                        <View className="flex-row items-center justify-center gap-1.5 mb-6">
                            <View className="w-10 h-1.5 bg-secondary rounded-full" />
                            <View className="w-10 h-1.5 bg-secondary rounded-full" />
                            <View className="w-10 h-1.5 bg-secondary rounded-full" />
                            <Text className="text-xs font-semibold text-neutral ml-1.5">
                                3 of 3
                            </Text>
                        </View>

                        {/* White Auth Card Container */}
                        <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 w-full items-center">
                            <Text className="text-2xl font-bold text-primary text-center mb-1.5">
                                Welcome to FocusFlow
                            </Text>
                            <Text className="text-sm font-regular text-neutral text-center mb-6 px-2">
                                The ultimate task manager for modern students.
                            </Text>

                            {/* Sign in with Google */}
                            <TouchableOpacity
                                onPress={() => handleMockLogin('a.thompson@gmail.com', 'Alex Thompson')}
                                activeOpacity={0.85}
                                className="w-full border border-gray-200 py-3.5 rounded-2xl flex-row items-center justify-center gap-3 bg-white mb-4"
                            >
                                <Sparkles size={18} color="#EA4335" />
                                <Text className="text-primary font-bold text-base">
                                    Sign in with Google
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Bottom Actions & Footer */}
                <View className="w-full items-center">
                    {currentStep < 2 ? (
                        <>
                            <TouchableOpacity
                                onPress={handleNext}
                                activeOpacity={0.9}
                                className="w-full bg-primary py-4 rounded-2xl flex-row items-center justify-center gap-2 shadow-md mb-4"
                            >
                                <Text className="text-white font-bold text-lg">Next</Text>
                                <ArrowRight size={20} color="#FFFFFF" strokeWidth={2.5} />
                            </TouchableOpacity>

                            {currentStep === 0 ? (
                                <Text className="text-xs font-semibold text-neutral">
                                    1 of 3 Steps
                                </Text>
                            ) : (
                                <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
                                    <Text className="text-xs font-semibold text-neutral">
                                        Skip for now
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </>
                    ) : (
                        <Text className="text-[11px] text-neutral text-center px-6 leading-4">
                            By signing up, you agree to our{' '}
                            <Text className="font-bold text-primary">Terms of Service</Text>{' '}
                            and <Text className="font-bold text-primary">Privacy Policy</Text>.
                        </Text>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}