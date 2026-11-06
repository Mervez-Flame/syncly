import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto'; // Generates true UUIDs
import NetInfo from '@react-native-community/netinfo';
import { processSyncQueue } from '../utils/offlineSync';
import { useAuth } from './AuthContext'; // adjust relative path if needed

const TaskContext = createContext();

export function TaskProvider({ children }) {
    const [tasks, setTasks] = useState([]);
    const API_URL = process.env.EXPO_PUBLIC_API_URL;
    // const { user, token } = useAuth();

    useEffect(() => {
        // Automatically run sync when the phone regains internet
        const unsubscribe = NetInfo.addEventListener(async (state) => {
            if (state.isConnected) {
                // Pass your Express URL and Auth Token
                // console.log('Auth Debug -> Token variable:', token);
                // console.log('Auth Debug -> User object token:', user?.token);
                const sessionString = await AsyncStorage.getItem('@user_session');
                const sessionData = sessionString ? JSON.parse(sessionString) : null;

                // Extract the token safely from the session object structure
                const activeToken = sessionData?.token || sessionData?.user?.token;

                console.log('Retrieved token from storage for sync:', activeToken ? 'Token Found ✅' : 'Token Missing ❌');
                const didSync = await processSyncQueue(API_URL, activeToken);

                if (didSync) {
                    // Force the context to re-read the newly synced array from storage
                    const updatedStorage = await AsyncStorage.getItem('@focusflow_tasks');
                    if (updatedStorage) setTasks(JSON.parse(updatedStorage));
                }
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        async function loadTasks() {
            try {
                const stored = await AsyncStorage.getItem('@focusflow_tasks');
                if (stored) {
                    setTasks(JSON.parse(stored));
                }
            } catch (error) {
                console.error("Failed to load tasks from local storage", error);
            }
        }
        loadTasks();
    }, []);

    const saveTasks = async (updated) => {
        setTasks(updated);
        try {
            await AsyncStorage.setItem('@focusflow_tasks', JSON.stringify(updated));
        } catch (error) {
            console.error("Failed to save tasks locally", error);
        }
    };

    const addTask = async (newTaskData) => {
        const taskObj = {
            localTaskId: Crypto.randomUUID(),
            _id: null,
            title: newTaskData.title,
            description: newTaskData.description || '',
            courseCode: newTaskData.courseCode || '',
            dueDate: newTaskData.dueDate || null,
            isCompleted: false,
            source: 'manual',
            calendarEventId: null,
            isDeleted: false,
            syncState: 'pending_create',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const updatedTasks = [taskObj, ...tasks];
        // Save locally first for instant UI responsiveness
        await saveTasks(updatedTasks);

        // Immediately trigger backend synchronization queue
        try {
            // console.log('Auth Debug -> Token variable:', token);
            // console.log('Auth Debug -> User object token:', user?.token);
            // Fetch the session directly from AsyncStorage where login stored it
            const sessionString = await AsyncStorage.getItem('@user_session');
            const sessionData = sessionString ? JSON.parse(sessionString) : null;

            // Extract the token safely from the session object structure
            const activeToken = sessionData?.token || sessionData?.user?.token;

            console.log('Retrieved token from storage for sync:', activeToken ? 'Token Found ✅' : 'Token Missing ❌');
            await processSyncQueue(API_URL, activeToken);
        } catch (error) {
            console.log('Background sync triggered post-save failed, queued for next network event:', error);
        }
    };

    const updateTask = (id, updatedFields) => {
        const updated = tasks.map((t) => {
            if (t.localTaskId === id || t._id === id) {
                return {
                    ...t,
                    ...updatedFields,
                    // If it hasn't been created on the server yet, keep it as pending_create
                    syncState: t.syncState === 'pending_create' ? 'pending_create' : 'pending_update',
                    updatedAt: new Date().toISOString()
                };
            }
            return t;
        });
        saveTasks(updated);
    };

    const toggleTask = (id) => {
        const updated = tasks.map((t) => {
            if (t.localTaskId === id || t._id === id) {
                return {
                    ...t,
                    isCompleted: !t.isCompleted,
                    syncState: t.syncState === 'pending_create' ? 'pending_create' : 'pending_update',
                    updatedAt: new Date().toISOString()
                };
            }
            return t;
        });
        saveTasks(updated);
    };

    const deleteTask = (id) => {
        const updated = tasks.map((t) => {
            if (t.localTaskId === id || t._id === id) {
                return {
                    ...t,
                    isDeleted: true, // Soft deletion
                    syncState: 'pending_delete', // Tells offlineSync to DELETE this
                    updatedAt: new Date().toISOString()
                };
            }
            return t;
        });
        saveTasks(updated);
    };

    // Helper functions for the UI
    const getTaskById = (id) => tasks.find((t) => t.localTaskId === id || t._id === id);

    // The UI should only render tasks that aren't soft-deleted
    const getActiveTasks = () => tasks.filter((t) => !t.isDeleted);

    return (
        <TaskContext.Provider value={{
            tasks,
            activeTasks: getActiveTasks(), // Use this in your FlatList/Dashboard
            toggleTask,
            addTask,
            updateTask,
            deleteTask,
            getTaskById
        }}>
            {children}
        </TaskContext.Provider>
    );
}

export const useTasks = () => useContext(TaskContext);