import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function EntryScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // User is logged in -> route to Dashboard
        router.replace('/dashboard');
      } else {
        // First time / logged out -> route to Onboarding
        router.replace('/onboarding');
      }
    }
  }, [user, isLoading]);

  return (
    <View className="flex-1 items-center justify-center bg-[#F8FAFC]">
      <ActivityIndicator size="large" color="#1A237E" />
    </View>
  );
}