const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Task = require('../models/Task');

// Helper to safely find a task by either MongoDB _id or mobile localTaskId
const findTaskSafely = async (idParam, userId) => {
    const query = { userId, isDeleted: false };
    
    if (mongoose.Types.ObjectId.isValid(idParam)) {
        query.$or = [{ _id: idParam }, { localTaskId: idParam }];
    } else {
        query.localTaskId = idParam;
    }
    
    return await Task.findOne(query);
};

// @route   GET /api/tasks
// @desc    Fetch all active tasks for logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        // Only return tasks that have not been soft-deleted
        const tasks = await Task.find({ 
            userId: req.user.userId, 
            isDeleted: false 
        }).sort({ dueDate: 1 });
        
        res.status(200).json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving tasks', error: error.message });
    }
});

// @route   POST /api/tasks/manual
// @desc    Create student-entered task (Idempotent)
// @access  Private
router.post('/manual', auth, async (req, res) => {
    try {
        const { localTaskId, title, description, courseCode, dueDate, isCompleted } = req.body;

        if (!title || !localTaskId) {
            return res.status(400).json({ message: 'Title and localTaskId are required' });
        }

        // Idempotency Check: If this localTaskId already exists, just return the existing task
        let task = await Task.findOne({ userId: req.user.userId, localTaskId });
        
        if (task) {
            return res.status(200).json(task); 
        }

        // Otherwise, create the new task
        task = await Task.create({
            userId: req.user.userId,
            localTaskId,
            title,
            description,
            courseCode,
            dueDate: dueDate ? new Date(dueDate) : null,
            isCompleted: isCompleted || false,
            source: 'manual',
            status: 'unscheduled',
            syncState: 'synced' // Successfully reached the server
        });

        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: 'Error creating manual task', error: error.message });
    }
});

// @route   PATCH /api/tasks/:id
// @desc    Update task fields 
// @access  Private
router.patch('/:id', auth, async (req, res) => {
    try {
        const task = await findTaskSafely(req.params.id, req.user.userId);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Read-Only Guardrail for AI-synced tasks
        if (task.calendarEventId) {
            // Check if the request is trying to update anything OTHER than isCompleted
            const attemptedUpdates = Object.keys(req.body);
            const isOnlyUpdatingCompletion = attemptedUpdates.every(key => key === 'isCompleted');

            if (!isOnlyUpdatingCompletion) {
                return res.status(403).json({
                    message: 'Locked: Only completion status can be changed for Google Calendar synced tasks.',
                });
            }
        }

        const allowedUpdates = ['title', 'description', 'courseCode', 'dueDate', 'isCompleted'];
        allowedUpdates.forEach((field) => {
            if (req.body[field] !== undefined) {
                task[field] = req.body[field];
            }
        });

        task.syncState = 'synced'; // Mark as synced
        await task.save();
        
        res.status(200).json(task);
    } catch (error) {
        res.status(500).json({ message: 'Error updating task', error: error.message });
    }
});

// @route   DELETE /api/tasks/:id
// @desc    Soft Delete task 
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const task = await findTaskSafely(req.params.id, req.user.userId);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        if (task.calendarEventId) {
            return res.status(403).json({
                message: 'Local deletion is disabled for tasks synced with Google Calendar.',
            });
        }

        // Soft Deletion Implementation
        task.isDeleted = true;
        task.deletedAt = new Date();
        task.syncState = 'synced'; // The server has acknowledged the deletion
        
        await task.save();
        
        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting task', error: error.message });
    }
});

module.exports = router;