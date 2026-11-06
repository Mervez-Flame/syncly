import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const TASKS_KEY = '@focusflow_tasks';
const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.3.11:5000';

/**
 * Reads tasks from local storage, finds any with a pending syncState,
 * pushes them to the Express backend, and updates local storage.
 * 
 * @param {string} apiBaseUrl - Your Express server URL
 * @param {string} userToken - Google OAuth or JWT token for backend auth
 * @returns {boolean} - Returns true if tasks were synced and the UI needs a refresh
 */
export const processSyncQueue = async (apiBaseUrl, userToken) => {

    const baseUrl = apiBaseUrl || DEFAULT_API_URL;
    const state = await NetInfo.fetch();
    if (!state.isConnected) return false;

    try {
        const cachedTasksData = await AsyncStorage.getItem(TASKS_KEY);
        if (!cachedTasksData) return false;

        let tasks = JSON.parse(cachedTasksData);
        let hasChanges = false;

        // Isolate only tasks that are NOT synced
        const pendingTasks = tasks.filter(t => t.syncState && t.syncState !== 'synced');
        if (pendingTasks.length === 0) return false;

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
        };

        for (let i = 0; i < tasks.length; i++) {
            let t = tasks[i];

            try {
                // 1. PENDING CREATE (Manual Tasks)
                if (t.syncState === 'pending_create') {
                    const response = await fetch(`${apiBaseUrl}/api/tasks/manual`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            localTaskId: t.localTaskId, // Sends the UUID for Idempotency
                            title: t.title,
                            description: t.description,
                            courseCode: t.courseCode,
                            dueDate: t.dueDate,
                            isCompleted: t.isCompleted
                        })
                    });

                    if (response.ok) {
                        const savedTask = await response.json();
                        // Update local task with MongoDB's generated _id and clear pending state
                        tasks[i] = { ...t, _id: savedTask._id, syncState: 'synced' };
                        hasChanges = true;
                    } else {
                        const errorText = await response.text();
                        console.warn(`Server rejected task sync [${response.status}]:`, errorText);
                    }
                }

                // 2. PENDING UPDATE
                else if (t.syncState === 'pending_update') {
                    const targetId = t._id || t.localTaskId;
                    const response = await fetch(`${apiBaseUrl}/api/tasks/${targetId}`, {
                        method: 'PATCH',
                        headers,
                        body: JSON.stringify({
                            title: t.title,
                            description: t.description,
                            courseCode: t.courseCode,
                            dueDate: t.dueDate,
                            isCompleted: t.isCompleted
                        })
                    });

                    if (response.ok) {
                        tasks[i] = { ...t, syncState: 'synced' };
                        hasChanges = true;
                    }
                }

                // 3. PENDING DELETE
                else if (t.syncState === 'pending_delete') {
                    const targetId = t._id || t.localTaskId;
                    const response = await fetch(`${apiBaseUrl}/api/tasks/${targetId}`, {
                        method: 'DELETE',
                        headers
                    });

                    if (response.ok) {
                        // Backend successfully soft-deleted the record. 
                        // We can now physically remove the local tombstone.
                        tasks[i] = null;
                        hasChanges = true;
                    }
                }
            } catch (err) {
                console.warn(`Sync failed for task ${t.localTaskId}, will retry later:`, err);
                // The loop continues. The failed task stays in its 'pending_*' state.
            }
        }

        // If any tasks successfully synced, save the updated array locally
        if (hasChanges) {
            // Filter out the nulls (the successfully deleted tombstones)
            tasks = tasks.filter(t => t !== null);
            await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
            return true;
        }

        return false;

    } catch (error) {
        console.error('Failed to process offline queue:', error);
        return false;
    }
};

// NOTE: updateTaskWithOfflineSupport has been intentionally deleted.
// TaskContext.jsx handles all local updates perfectly now.