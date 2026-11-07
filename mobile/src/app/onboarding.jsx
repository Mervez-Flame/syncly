import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, Infinity as InfinityIcon, CalendarCheck, Sparkles, CheckSquare } from 'lucide-react-native';
// import * as Google from 'expo-auth-session/providers/google';
// import * as WebBrowser from 'expo-web-browser';
// import * as AuthSession from 'expo-auth-session';
import { useAuth } from '../context/AuthContext';
import { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes, } from '@react-native-google-signin/google-signin';

// Complete auth session redirect handling for mobile web browser overlays
// WebBrowser.maybeCompleteAuthSession();

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

GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    offlineAccess: true,            // gives you the serverAuthCode
    forceCodeForRefreshToken: true, // like prompt: 'consent', so you get a refresh token
    scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/calendar.events',
    ],
});

export default function OnboardingScreen() {
    const router = useRouter();
    const { login } = useAuth();
    const [currentStep, setCurrentStep] = useState(0); // 0: Step 1, 1: Step 2, 2: Step 3 (Auth)
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Make Expo Auth Proxy URL (https://auth.expo.io/@username/slug)
    // const redirectUri = AuthSession.makeRedirectUri({
    //     scheme: 'syncly',
    //     // native: 'com.mstrato.syncly://',
    // });
    // console.log("Generated Redirect URI:", redirectUri);

    // const [request, response, promptAsync] = Google.useAuthRequest({
    //     androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    //     iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    //     webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    //     // redirectUri: redirectUri,
    //     scopes: [
    //         'openid',
    //         'profile',
    //         'email',
    //         'https://www.googleapis.com/auth/gmail.readonly',
    //         'https://www.googleapis.com/auth/calendar.events',
    //     ],
    //     responseType: 'code',
    //     extraParams: {
    //         access_type: 'offline',
    //         prompt: 'consent',
    //     },
    // });

    // // Handle Google OAuth response
    // useEffect(() => {
    //     console.log("🟢 [2. OAUTH RESPONSE EVENT]:", JSON.stringify(response, null, 2));
    //     if (response?.type === 'success') {
    //         const { code } = response.params;
    //         console.log("🟢 [3. AUTH CODE CAPTURED]:", code ? "Code Present" : "Missing Code");
    //         handleBackendExchange(code);
    //     } else if (response?.type) {
    //         console.warn("🔴 [2b. OAUTH NON-SUCCESS TYPE]:", response.type);
    //     }
    // }, [response]);

    const handleGoogleSignIn = async () => {
        try {
            setIsLoggingIn(true);
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

            try {
                await GoogleSignin.signOut();
            } catch (e) {
                // Errors here, just means they were already signed out
            };

            const response = await GoogleSignin.signIn();

            if (isSuccessResponse(response)) {
                const { serverAuthCode } = response.data;
                if (!serverAuthCode) {
                    Alert.alert('Sign-in failed', 'No auth code returned from Google.');
                    return;
                }
                await handleBackendExchange(serverAuthCode);
            }
        } catch (error) {
            console.error('🔴 [GOOGLE SIGN-IN ERROR]:', error);
            if (isErrorWithCode(error)) {
                if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
                if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                    Alert.alert('Google Play Services is not available on this device.');
                    return;
                }
            }
            Alert.alert('Sign-in failed', 'Something went wrong, please try again.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    // // Send authorization code to Express server
    const handleBackendExchange = async (authCode) => {
        const apiUrl = `${process.env.EXPO_PUBLIC_API_URL}/api/auth/google`;
        console.log("🟢 [4. SENDING TO BACKEND]:", apiUrl);

        try {
            setIsLoggingIn(true);
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: authCode }),
            });

            const data = await res.json();
            console.log("🟢 [5. BACKEND HTTP STATUS]:", res.status);

            if (res.ok) {
                console.log("🟢 [7. AUTH SUCCESSFUL - NAVIGATING]");
                await login(data);
                router.replace('/dashboard');
            } else {
                console.error("🔴 [5b. BACKEND REJECTED AUTH]:", data.error);
                Alert.alert('Sign-in failed', data.error)
            }
        } catch (err) {
            console.error("🔴 [4b. FETCH NETWORK ERROR]:", err.message);
        } finally {
            setIsLoggingIn(false);
        }
    };


    const handleNext = () => {
        if (currentStep < 2) {
            setCurrentStep((prev) => prev + 1);
        }
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
                                className={`h-2 rounded-full ${currentStep === 0 ? 'w-8 bg-primary' : 'w-2 bg-gray-300'}`}
                            />
                            <View
                                className={`h-2 rounded-full ${currentStep === 1 ? 'w-8 bg-primary' : 'w-2 bg-gray-300'}`}
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

                            {/* Sign in with Google Button */}
                            <TouchableOpacity
                                onPress={() => {
                                    console.log("🟢 [0. SIGN-IN BUTTON TAPPED]");
                                    handleGoogleSignIn();
                                }}
                                disabled={isLoggingIn}
                                activeOpacity={0.85}
                                className={`w-full border border-gray-200 py-3.5 rounded-2xl flex-row items-center justify-center gap-3 bg-white mb-4 ${isLoggingIn ? 'opacity-50' : 'opacity-100'
                                    }`}
                            >
                                {isLoggingIn ? (
                                    <ActivityIndicator color="#EA4335" />
                                ) : (
                                    <>

                                        <Text className="text-primary font-bold text-base">
                                            Sign in with Google
                                        </Text>
                                    </>
                                )}
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