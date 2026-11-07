import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import NetInfo from '@react-native-community/netinfo';
import { processSyncQueue } from '../utils/offlineSync';

const TaskContext = createContext();

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const TASKS_KEY = '@focusflow_tasks';

async function getActiveToken() {
    const sessionString = await AsyncStorage.getItem('@user_session');
    const sessionData = sessionString ? JSON.parse(sessionString) : null;
    return sessionData?.token || sessionData?.user?.token || null;
}

async function readStored() {
    const stored = await AsyncStorage.getItem(TASKS_KEY);
    return stored ? JSON.parse(stored) : [];
}

export function TaskProvider({ children }) {
    const [tasks, setTasks] = useState([]);

    const reloadFromStorage = async () => {
        setTasks(await readStored());
    };

    const syncNow = async () => {
        try {
            const activeToken = await getActiveToken();
            console.log('Token for sync:', activeToken ? 'Found ✅' : 'Missing ❌');
            if (!activeToken) return false;

            const didSync = await processSyncQueue(API_URL, activeToken);
            if (didSync) await reloadFromStorage();
            return !!didSync;
        } catch (error) {
            console.log('syncNow failed, will retry on next network event:', error);
            return false;
        }
    };

    // Sync (push + pull) when the app opens or the phone regains internet
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            if (state.isConnected) syncNow();
        });
        return () => unsubscribe();
    }, []);

    // Load tasks saved on the phone
    useEffect(() => {
        async function loadTasks() {
            try {
                await reloadFromStorage();
            } catch (error) {
                console.error('Failed to load tasks from local storage', error);
            }
        }
        loadTasks();
    }, []);

    const saveTasks = async (updated) => {
        setTasks(updated);
        try {
            await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(updated));
        } catch (error) {
            console.error('Failed to save tasks locally', error);
        }
    };

    const nextSyncState = (t) =>
        t.syncState === 'pending_create' ? 'pending_create' : 'pending_update';

    // Change one task using the freshest stored data, save, then sync in the background
    const mutateTask = async (id, changeFn) => {
        const current = await readStored();
        const updated = current.map((t) =>
            t.localTaskId === id || t._id === id ? changeFn(t) : t
        );
        await saveTasks(updated);
        syncNow();
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

        const current = await readStored();
        await saveTasks([taskObj, ...current]);
        syncNow();
    };

    const updateTask = (id, updatedFields) =>
        mutateTask(id, (t) => ({
            ...t,
            ...updatedFields,
            syncState: nextSyncState(t),
            updatedAt: new Date().toISOString(),
        }));

    const toggleTask = (id) =>
        mutateTask(id, (t) => ({
            ...t,
            isCompleted: !t.isCompleted,
            syncState: nextSyncState(t),
            updatedAt: new Date().toISOString(),
        }));

    const deleteTask = (id) =>
        mutateTask(id, (t) => ({
            ...t,
            isDeleted: true,
            syncState: 'pending_delete',
            updatedAt: new Date().toISOString(),
        }));

    // Used by the Scan button after a sync finishes
    const refreshTasks = async () => {
        try {
            const activeToken = await getActiveToken();
            if (!activeToken) return false;

            await processSyncQueue(API_URL, activeToken);
            await reloadFromStorage();
            return true;
        } catch (error) {
            console.log('refreshTasks failed:', error);
            return false;
        }
    };

    const getTaskById = (id) => tasks.find((t) => t.localTaskId === id || t._id === id);
    const getActiveTasks = () => tasks.filter((t) => !t.isDeleted);

    return (
        <TaskContext.Provider value={{
            tasks,
            activeTasks: getActiveTasks(),
            toggleTask,
            addTask,
            updateTask,
            deleteTask,
            getTaskById,
            refreshTasks,
        }}>
            {children}
        </TaskContext.Provider>
    );
}

export const useTasks = () => useContext(TaskContext);