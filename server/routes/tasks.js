const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');

// @route   GET /api/tasks
// @desc    Fetch all tasks for logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.user.userId }).sort({ dueDate: 1 });
        res.status(200).json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving tasks', error: error.message });
    }
});

// @route   POST /api/tasks/manual
// @desc    Create student-entered task (source: 'manual')
// @access  Private
router.post('/manual', auth, async (req, res) => {
    try {
        const { title, description, courseCode, dueDate } = req.body;

        if (!title) {
            return res.status(400).json({ message: 'Title is required' });
        }

        const task = await Task.create({
            userId: req.user.userId,
            title,
            description,
            courseCode,
            dueDate: dueDate ? new Date(dueDate) : null,
            source: 'manual',
            status: 'unscheduled',
        });

        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: 'Error creating manual task', error: error.message });
    }
});

// @route   PATCH /api/tasks/:id
// @desc    Update task fields (Restricted if calendarEventId != null)
// @access  Private
router.patch('/:id', auth, async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, userId: req.user.userId });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Specification Guardrail
        if (task.calendarEventId) {
            return res.status(403).json({
                message: 'Local edits are disabled for tasks synced with Google Calendar. Edit directly in Google Calendar.',
            });
        }

        const allowedUpdates = ['title', 'description', 'courseCode', 'dueDate', 'isCompleted'];
        allowedUpdates.forEach((field) => {
            if (req.body[field] !== undefined) {
                task[field] = req.body[field];
            }
        });

        await task.save();
        res.status(200).json(task);
    } catch (error) {
        res.status(500).json({ message: 'Error updating task', error: error.message });
    }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete task (Restricted if calendarEventId != null)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, userId: req.user.userId });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Specification Guardrail
        if (task.calendarEventId) {
            return res.status(403).json({
                message: 'Local deletion is disabled for tasks synced with Google Calendar. Delete directly in Google Calendar.',
            });
        }

        await task.deleteOne();
        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting task', error: error.message });
    }
});

module.exports = router;