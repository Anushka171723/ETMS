const express = require('express');
const router = express.Router();
const TransferRequest = require('../models/TransferRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { getStatusBadgeColor } = require('../utils/helpers');
const { isAuthenticated, isEmployee } = require('../middleware/auth');

// Employee Dashboard
router.get('/dashboard', isAuthenticated, isEmployee, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const activeRequest = await TransferRequest.findOne({
            employee: req.user._id,
            status: { $nin: ['hr_rejected', 'hod_rejected'] }
        });
        const transferHistory = await TransferRequest.find({
            employee: req.user._id,
            status: { $in: ['hr_rejected', 'hod_rejected'] }
        }).sort({ createdAt: -1 });

        // Get unread notifications
        const unreadNotifications = await Notification.find({
            recipient: req.user._id,
            read: false
        }).sort({ createdAt: -1 });

        res.render('employee/dashboard', {
            user,
            activeRequest,
            transferHistory,
            unreadNotifications,
            getStatusBadgeColor,
            messages: req.flash()
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server Error');
    }
});

// New Transfer Request Form
router.get('/transfer-request', isAuthenticated, isEmployee, (req, res) => {
    res.render('employee/transfer-request', {
        user: req.user,
        messages: {
            error: req.flash('error_msg')
        }
    });
});

// Create Transfer Request
router.post('/transfer-request', isAuthenticated, isEmployee, async (req, res) => {
    try {
        const { requestedDepartment, reason } = req.body;
        
        // Validate required fields
        if (!requestedDepartment || !reason) {
            return res.status(400).json({ 
                error: 'Department and reason are required' 
            });
        }

        // Check if employee already has an active request
        const existingRequest = await TransferRequest.findOne({
            employee: req.user._id,
            status: { $nin: ['hr_rejected', 'hod_rejected'] }
        });

        if (existingRequest) {
            return res.status(400).json({ 
                error: 'You already have an active transfer request' 
            });
        }

        // Find HR for the current department
        const hrUser = await User.findOne({ 
            role: 'hr',
            department: req.user.department 
        });

        if (!hrUser) {
            return res.status(400).json({ 
                error: 'No HR assigned to your department' 
            });
        }

        // Create new transfer request
        const transferRequest = new TransferRequest({
            employee: req.user._id,
            currentDepartment: req.user.department,
            requestedDepartment,
            reason,
            status: 'pending',
            assignedHR: hrUser._id
        });

        await transferRequest.save();

        // Create notification for HR
        const notification = new Notification({
            recipient: hrUser._id,
            message: `New transfer request from ${req.user.name}`,
            type: 'transfer_request',
            link: '/hr/dashboard'
        });
        await notification.save();

        req.flash('success', 'Transfer request submitted successfully');
        res.json({ 
            success: true, 
            message: 'Transfer request submitted successfully' 
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: 'Error submitting transfer request' 
        });
    }
});

// Get Transfer Request Details
router.get('/transfer-request/:id', isAuthenticated, isEmployee, async (req, res) => {
    try {
        const request = await TransferRequest.findOne({
            _id: req.params.id,
            employee: req.user._id
        }).populate('assignedHR', 'name email');

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        res.json(request);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server Error' });
    }
});

// Profile page with transfer requests
router.get('/profile', isAuthenticated, isEmployee, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        // Get active transfer request (if any)
        const activeRequest = await TransferRequest.findOne({
            employee: req.user._id,
            status: { $in: ['pending', 'hr_approved'] }
        });

        // Get transfer request history
        const transferHistory = await TransferRequest.find({
            employee: req.user._id,
            status: { $in: ['hr_rejected', 'hod_approved', 'hod_rejected'] }
        }).sort({ createdAt: -1 });

        res.render('employee/profile', {
            user,
            activeRequest,
            transferHistory,
            messages: req.flash()
        });
    } catch (error) {
        req.flash('error', 'Error loading profile');
        res.redirect('/employee/dashboard');
    }
});

// Update profile
router.post('/profile/update', isAuthenticated, isEmployee, async (req, res) => {
    try {
        const { name, email } = req.body;
        
        // Validate required fields
        if (!name || !email) {
            req.flash('error', 'Name and email are required');
            return res.redirect('/employee/dashboard');
        }

        // Check if email is already taken by another user
        const existingUser = await User.findOne({ 
            email: email,
            _id: { $ne: req.user._id }
        });

        if (existingUser) {
            req.flash('error', 'Email is already in use');
            return res.redirect('/employee/dashboard');
        }

        // Update user profile
        const user = await User.findById(req.user._id);
        user.name = name;
        user.email = email;
        await user.save();

        req.flash('success', 'Profile updated successfully');
        res.redirect('/employee/dashboard');
    } catch (error) {
        console.error('Error:', error);
        req.flash('error', 'Error updating profile');
        res.redirect('/employee/dashboard');
    }
});

// Add new skill
router.post('/profile/skills', isAuthenticated, isEmployee, async (req, res) => {
    try {
        const { name, category, level } = req.body;
        
        // Validate required fields
        if (!name || !category || !level) {
            return res.status(400).json({ 
                success: false, 
                error: 'All fields are required' 
            });
        }

        const user = await User.findById(req.user._id);
        
        // Check if skill already exists
        const existingSkill = user.skills.find(skill => 
            skill.name.toLowerCase() === name.toLowerCase()
        );

        if (existingSkill) {
            return res.status(400).json({ 
                success: false, 
                error: 'This skill already exists in your profile' 
            });
        }
        
        user.skills.push({ name, category, level });
        await user.save();

        res.json({ 
            success: true, 
            skillId: user.skills[user.skills.length - 1]._id,
            message: 'Skill added successfully'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error adding skill' 
        });
    }
});

// Delete skill
router.delete('/profile/skills/:skillId', isAuthenticated, isEmployee, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        // Check if skill exists
        const skillExists = user.skills.some(skill => 
            skill._id.toString() === req.params.skillId
        );

        if (!skillExists) {
            return res.status(404).json({ 
                success: false, 
                error: 'Skill not found' 
            });
        }

        user.skills = user.skills.filter(skill => 
            skill._id.toString() !== req.params.skillId
        );
        
        await user.save();
        
        res.json({ 
            success: true,
            message: 'Skill deleted successfully'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error deleting skill' 
        });
    }
});

// Mark notification as read
router.post('/notifications/:id/read', isAuthenticated, isEmployee, async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { read: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error marking notification as read' });
    }
});

module.exports = router; 