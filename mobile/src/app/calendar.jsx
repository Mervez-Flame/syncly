import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Bell, Plus, RefreshCw } from 'lucide-react-native';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';

const getTimeZone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Lagos';
    } catch {
        return 'Africa/Lagos';
    }
};

export default function CalendarScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const webViewRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    const calendarUrl =
        'https://calendar.google.com/calendar/embed' +
        `?src=${encodeURIComponent(user?.email || '')}` +
        `&ctz=${encodeURIComponent(getTimeZone())}` +
        '&mode=WEEK&showTitle=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0';

    const reload = () => {
        setFailed(false);
        setLoading(true);
        webViewRef.current?.reload();
    };

    // keep Google pages inside the app, open anything else in the browser
    const handleRequest = (req) => {
        if (/^https:\/\/([a-z0-9-]+\.)*google\.com/.test(req.url) || req.url === 'about:blank') {
            return true;
        }
        Linking.openURL(req.url);
        return false;
    };

    return (
        <SafeAreaView className="flex-1 bg-[#F8FAFC]">
            <View className="flex-1 relative">
                {/* Header */}
                <View className="flex-row items-center justify-between px-5 pt-3 pb-3">
                    <View className="flex-row items-center gap-3">
                        {user?.avatar ? (
                            <Image source={{ uri: user.avatar }} className="w-10 h-10 rounded-full" />
                        ) : (
                            <View className="w-10 h-10 rounded-full bg-secondary" />
                        )}
                        <Text className="text-xl font-bold text-primary">FocusFlow</Text>
                    </View>
                    <View className="flex-row items-center">
                        <TouchableOpacity onPress={reload} className="p-2">
                            <RefreshCw size={20} color="#1A237E" />
                        </TouchableOpacity>
                        <TouchableOpacity className="p-2">
                            <Bell size={22} color="#1A237E" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Google Calendar */}
                <View className="flex-1 mx-4 mb-24 rounded-2xl overflow-hidden bg-white border border-gray-100">
                    <WebView
                        ref={webViewRef}
                        source={{ uri: calendarUrl }}
                        onLoadStart={() => setLoading(true)}
                        onLoadEnd={() => setLoading(false)}
                        onError={() => { setFailed(true); setLoading(false); }}
                        onHttpError={() => setFailed(true)}
                        onShouldStartLoadWithRequest={handleRequest}
                        javaScriptEnabled
                        domStorageEnabled
                        sharedCookiesEnabled
                        startInLoadingState={false}
                    />

                    {loading && (
                        <View className="absolute inset-0 items-center justify-center bg-white">
                            <ActivityIndicator size="large" color="#1A237E" />
                        </View>
                    )}

                    {failed && (
                        <View className="absolute inset-0 items-center justify-center bg-white px-6">
                            <Text className="text-base font-bold text-primary mb-2 text-center">
                                Couldn't load your calendar
                            </Text>
                            <Text className="text-xs text-neutral text-center mb-4">
                                Check your connection and try again.
                            </Text>
                            <TouchableOpacity onPress={reload} className="bg-primary px-6 py-3 rounded-2xl">
                                <Text className="text-white font-bold">Retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Floating Action Button */}
                <TouchableOpacity
                    onPress={() => router.push('/create-task')}
                    className="absolute bottom-24 right-5 w-14 h-14 bg-secondary rounded-full items-center justify-center shadow-lg z-20"
                >
                    <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>

                <BottomNav />
            </View>
        </SafeAreaView>
    );
}