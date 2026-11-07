import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_TASKS_KEY = '@focusflow_pending_tasks';

// 1. Retrieve all unsynced tasks stored on the device
export const getPendingTasks = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(PENDING_TASKS_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (error) {
        console.error('Error reading pending tasks:', error);
        return [];
    }
};

// 2. Save a new temporary task locally
export const addPendingTask = async (task) => {
    try {
        const existingTasks = await getPendingTasks();

        // Assign a temporary local ID so the UI can render it immediately
        const tempTask = {
            ...task,
            _id: `temp_${Date.now()}`,
            isSynced: false,
            createdAt: new Date().toISOString()
        };

        const updatedTasks = [...existingTasks, tempTask];
        await AsyncStorage.setItem(PENDING_TASKS_KEY, JSON.stringify(updatedTasks));
        return tempTask;
    } catch (error) {
        console.error('Error saving task locally:', error);
    }
};

// 3. Remove a task from local storage after successful backend sync
export const removePendingTask = async (tempId) => {
    try {
        const existingTasks = await getPendingTasks();
        const updatedTasks = existingTasks.filter(task => task._id !== tempId);
        await AsyncStorage.setItem(PENDING_TASKS_KEY, JSON.stringify(updatedTasks));
    } catch (error) {
        console.error('Error removing synced task:', error);
    }
};

// 4. Clear all local pending tasks
export const clearPendingTasks = async () => {
    try {
        await AsyncStorage.removeItem(PENDING_TASKS_KEY);
    } catch (error) {
        console.error('Error clearing pending tasks:', error);
    }
};