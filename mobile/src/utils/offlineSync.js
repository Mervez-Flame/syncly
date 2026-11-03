import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const QUEUE_KEY = '@focusflow_sync_queue';
const TASKS_KEY = '@focusflow_tasks';

// Process pending backend updates when network is active
export const processSyncQueue = async (apiBaseUrl) => {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return;

    try {
        const queueData = await AsyncStorage.getItem(QUEUE_KEY);
        const queue = queueData ? JSON.parse(queueData) : [];
        if (queue.length === 0) return;

        const remainingQueue = [];

        for (const item of queue) {
            try {
                let response;
                if (item.action === 'UPDATE') {
                    response = await fetch(`${apiBaseUrl}/api/tasks/${item.taskId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(item.payload),
                    });
                } else if (item.action === 'DELETE') {
                    response = await fetch(`${apiBaseUrl}/api/tasks/${item.taskId}`, {
                        method: 'DELETE',
                    });
                }

                if (!response || !response.ok) {
                    remainingQueue.push(item);
                }
            } catch (err) {
                remainingQueue.push(item);
            }
        }

        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
    } catch (error) {
        console.error('Failed to process offline queue:', error);
    }
};

// Save task changes locally and queue network sync
export const updateTaskWithOfflineSupport = async (taskId, updatedData, apiBaseUrl) => {
    // 1. Instantly update local cache (Optimistic UI)
    const cachedTasksData = await AsyncStorage.getItem(TASKS_KEY);
    let tasks = cachedTasksData ? JSON.parse(cachedTasksData) : [];
    tasks = tasks.map((t) => (t._id === taskId ? { ...t, ...updatedData } : t));
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));

    // 2. Check current connectivity
    const state = await NetInfo.fetch();

    if (state.isConnected) {
        try {
            const response = await fetch(`${apiBaseUrl}/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
            });

            if (response.ok) {
                return { success: true, status: 'synced' };
            }
        } catch (err) {
            // Fallback to queue if request throws
        }
    }

    // 3. Queue update for later backend sync if offline or request failed
    const queueData = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = queueData ? JSON.parse(queueData) : [];
    queue.push({
        taskId,
        action: 'UPDATE',
        payload: updatedData,
        timestamp: Date.now(),
    });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

    return { success: true, status: 'queued_offline' };
};