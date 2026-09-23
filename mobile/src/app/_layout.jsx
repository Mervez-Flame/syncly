import '../app/global.css';
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { TaskProvider } from '../context/TaskContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <TaskProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="calendar" />
          <Stack.Screen name="create-task" />
        </Stack>
      </TaskProvider>
    </AuthProvider>
  );
}