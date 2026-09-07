import React, { useState } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, GraduationCap, Infinity, CalendarCheck, Sparkles } from 'lucide-react-native';

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
        imageUri:
            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600',
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0); // 0: Slide 1, 1: Slide 2, 2: Login Auth

    const handleNext = () => {
        if (currentStep < 2) {
            setCurrentStep((prev) => prev + 1);
        } else {
            router.push('/');
        }
    };

    const handleSkip = () => {
        setCurrentStep(2);
    };

    return (
        <SafeAreaView className="flex-1 bg-[#F4F5FF]">
            <View className="flex-1 px-6 pt-4 pb-6 justify-between items-center">

                {/* Top Header Logo */}
                <View className="items-center w-full">
                    {currentStep === 2 ? (
                        <View className="items-center mt-2">
                            <View className="w-14 h-14 bg-[#0A0E3F] rounded-2xl items-center justify-center mb-2 shadow-md">
                                <Infinity size={32} color="#FFFFFF" />
                            </View>
                            <Text className="text-xl font-bold text-primary">FocusFlow</Text>
                        </View>
                    ) : (
                        <Text className="text-xl font-bold text-primary mt-2">FocusFlow</Text>
                    )}
                </View>

                {/* STEP 1 & STEP 2: Onboarding Slides */}
                {currentStep < 2 && (
                    <View className="flex-1 items-center justify-center my-4 w-full">
                        {/* Main Visual Image Card */}
                        <View className="w-full h-80 rounded-3xl overflow-hidden shadow-lg mb-6 border border-white/60 bg-white">
                            {currentStep === 0 ? (
                                <Image
                                    source={{ uri: SLIDES[0].imageUri }}
                                    className="w-full h-full"
                                    resizeMode="cover"
                                />
                            ) : (
                                <View className="w-full h-full bg-slate-50 p-6 justify-center items-center relative">
                                    {/* Mock Card Preview Graphic */}
                                    <View className="w-48 bg-white p-4 rounded-2xl shadow-md border border-gray-100 absolute -top-2 left-6 z-10">
                                        <CalendarCheck size={20} color="#3F51B5" />
                                        <View className="w-24 h-2.5 bg-indigo-100 rounded-full mt-3" />
                                        <View className="w-16 h-2 bg-gray-100 rounded-full mt-2" />
                                    </View>
                                    <View className="w-52 bg-white p-4 rounded-2xl shadow-lg border border-gray-100 absolute bottom-6 right-4 z-20">
                                        <View className="flex-row items-center gap-2 mb-2">
                                            <View className="w-4 h-4 rounded border border-secondary bg-secondary/20 items-center justify-center" />
                                            <View className="w-28 h-2.5 bg-gray-200 rounded-full" />
                                        </View>
                                        <View className="flex-row items-center gap-2">
                                            <View className="w-4 h-4 rounded border border-gray-300" />
                                            <View className="w-20 h-2.5 bg-gray-100 rounded-full" />
                                        </View>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Slide Text Content */}
                        <Text className="text-2xl font-bold text-slate-900 text-center mb-3">
                            {SLIDES[currentStep].title}
                        </Text>
                        <Text className="text-sm font-regular text-neutral text-center leading-6 px-4 mb-6">
                            {SLIDES[currentStep].description}
                        </Text>

                        {/* Pagination Dots */}
                        <View className="flex-row items-center gap-2 mb-2">
                            <View
                                className={`h-2 rounded-full transition-all ${currentStep === 0 ? 'w-8 bg-[#0A0E3F]' : 'w-2 bg-gray-300'
                                    }`}
                            />
                            <View
                                className={`h-2 rounded-full transition-all ${currentStep === 1 ? 'w-8 bg-[#0A0E3F]' : 'w-2 bg-gray-300'
                                    }`}
                            />
                            <View className="w-2 h-2 rounded-full bg-gray-300" />
                        </View>
                    </View>
                )}

                {/* STEP 3: Welcome & Auth Screen */}
                {currentStep === 2 && (
                    <View className="w-full flex-1 justify-center my-4">
                        {/* Step Bar Indicator */}
                        <View className="flex-row items-center justify-center gap-2 mb-6">
                            <View className="w-10 h-1.5 bg-secondary rounded-full" />
                            <View className="w-10 h-1.5 bg-secondary rounded-full" />
                            <View className="w-10 h-1.5 bg-secondary rounded-full" />
                            <Text className="text-xs font-semibold text-neutral ml-1">3 of 3</Text>
                        </View>

                        {/* White Auth Card Container */}
                        <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 w-full items-center">
                            <Text className="text-2xl font-bold text-slate-900 text-center mb-2">
                                Welcome to FocusFlow
                            </Text>
                            <Text className="text-sm font-regular text-neutral text-center mb-6 px-2">
                                The ultimate task manager for modern students.
                            </Text>

                            {/* Sign in with Google */}
                            <TouchableOpacity
                                onPress={handleNext}
                                activeOpacity={0.85}
                                className="w-full border border-gray-200 py-3.5 rounded-2xl flex-row items-center justify-center gap-3 bg-white mb-4"
                            >
                                <Sparkles size={18} color="#EA4335" />
                                <Text className="text-slate-800 font-bold text-base">
                                    Sign in with Google
                                </Text>
                            </TouchableOpacity>

                            {/* OR Divider */}
                            <View className="flex-row items-center my-2 w-full">
                                <View className="flex-1 h-[1px] bg-gray-200" />
                                <Text className="text-xs font-bold text-gray-400 mx-3">OR</Text>
                                <View className="flex-1 h-[1px] bg-gray-200" />
                            </View>

                            {/* Sign in with University Email */}
                            <TouchableOpacity
                                onPress={handleNext}
                                activeOpacity={0.9}
                                className="w-full bg-secondary py-3.5 rounded-2xl flex-row items-center justify-center gap-2 mt-2 mb-4"
                            >
                                <GraduationCap size={20} color="#FFFFFF" />
                                <Text className="text-white font-bold text-base">
                                    Sign in with University Email
                                </Text>
                            </TouchableOpacity>

                            {/* Manual Account Link */}
                            <TouchableOpacity
                                onPress={handleNext}
                                className="py-2"
                                activeOpacity={0.7}
                            >
                                <Text className="text-xs font-semibold text-secondary text-center">
                                    New here? Create a manual account
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Bottom CTA & Footers */}
                <View className="w-full items-center">
                    {currentStep < 2 ? (
                        <>
                            <TouchableOpacity
                                onPress={handleNext}
                                activeOpacity={0.9}
                                className="w-full bg-[#0A0E3F] py-4 rounded-2xl flex-row items-center justify-center gap-2 shadow-md mb-4"
                            >
                                <Text className="text-white font-bold text-lg">Next</Text>
                                <ArrowRight size={20} color="#FFFFFF" strokeWidth={2.5} />
                            </TouchableOpacity>

                            {currentStep === 0 ? (
                                <Text className="text-xs font-semibold text-neutral">
                                    1 of 3 Steps
                                </Text>
                            ) : (
                                <TouchableOpacity onPress={handleSkip}>
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