import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TaskContext = createContext();

const INITIAL_TASKS = [
    {
        id: '1',
        title: 'History Essay: The Cold War',
        course: 'POL301',
        dueDate: 'Today, 11:59 PM',
        category: 'Today',
        completed: false,
    },
    {
        id: '2',
        title: 'Organic Chemistry Lab Report',
        course: 'CHM201',
        dueDate: 'Oct 28',
        category: 'Upcoming',
        completed: false,
    },
    {
        id: '3',
        title: 'CS 401 Group Project Meeting',
        course: 'CS401',
        dueDate: 'Oct 29',
        category: 'Upcoming',
        completed: true,
    },
];

export function TaskProvider({ children }) {
    const [tasks, setTasks] = useState([]);

    useEffect(() => {
        async function loadTasks() {
            const stored = await AsyncStorage.getItem('@focusflow_tasks');
            if (stored) {
                setTasks(JSON.parse(stored));
            } else {
                setTasks(INITIAL_TASKS);
                await AsyncStorage.setItem('@focusflow_tasks', JSON.stringify(INITIAL_TASKS));
            }
        }
        loadTasks();
    }, []);

    const saveTasks = async (updated) => {
        setTasks(updated);
        await AsyncStorage.setItem('@focusflow_tasks', JSON.stringify(updated));
    };

    const toggleTask = (id) => {
        const updated = tasks.map((t) =>
            (t.id === id || t._id === id) ? { ...t, completed: !t.completed } : t
        );
        saveTasks(updated);
    };

    const addTask = (newTask) => {
        const taskObj = {
            id: Date.now().toString(),
            completed: false,
            category: 'Today',
            ...newTask,
        };
        saveTasks([taskObj, ...tasks]);
    };

    // ✅ Update task function for EditTaskScreen
    const updateTask = (id, updatedFields) => {
        const updated = tasks.map((t) =>
            (t.id === id || t._id === id) ? { ...t, ...updatedFields } : t
        );
        saveTasks(updated);
    };

    // Delete task function for edit task screen 
    const deleteTask = (id) => {
        const updated = tasks.filter((t) => t.id !== id && t._id !== id);
        saveTasks(updated);
        // --- MONGODB BACKEND SYNC (Phase 2/3) ---
        // fetch(`${API_URL}/api/tasks/${id}`, { method: 'DELETE' }).catch(console.error);
    };

    // ✅ Helper function to retrieve a specific task by ID
    const getTaskById = (id) => tasks.find((t) => t.id === id || t._id === id);

    return (
        <TaskContext.Provider value={{ tasks, toggleTask, addTask, updateTask, deleteTask, getTaskById }}>
            {children}
        </TaskContext.Provider>
    );
}

export const useTasks = () => useContext(TaskContext);