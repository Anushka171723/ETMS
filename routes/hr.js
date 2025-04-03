const express = require('express');
const router = express.Router();
const TransferRequest = require('../models/TransferRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { getStatusBadgeColor } = require('../utils/helpers');
const { isAuthenticated, isHR } = require('../middleware/auth');

// Get HR Dashboard
router.get('/dashboard', isAuthenticated, isHR, async (req, res) => {
    try {
        // Get pending transfer requests
        const pendingRequests = await TransferRequest.find({
            status: 'pending',
            assignedHR: req.user._id
        }).populate('employee', 'name email department')
          .sort({ createdAt: -1 });

        // Get processed requests
        const processedRequests = await TransferRequest.find({
            status: { $in: ['hr_approved', 'hr_rejected', 'hod_approved', 'hod_rejected'] },
            assignedHR: req.user._id
        }).populate('employee', 'name email department')
          .sort({ updatedAt: -1 });

        // Get notifications and mark them as read
        const notifications = await Notification.find({ recipient: req.user._id })
            .sort({ createdAt: -1 });

        // Mark all notifications as read
        await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { isRead: true }
        );

        res.render('hr/dashboard', {
            pendingRequests,
            processedRequests,
            notifications,
            getStatusBadgeColor,
            messages: req.flash()
        });
    } catch (error) {
        console.error('Error in HR dashboard:', error);
        req.flash('error', 'Error loading dashboard');
        res.redirect('/auth/login');
    }
});

// View Transfer Request Details
router.get('/transfer-request/:id', isAuthenticated, isHR, async (req, res) => {
    try {
        const request = await TransferRequest.findById(req.params.id)
            .populate('employee', 'name email department location skills')
            .populate('assignedHR', 'name email');

        if (!request) {
            req.flash('error_msg', 'Transfer request not found');
            return res.redirect('/hr/dashboard');
        }

        // Check if the request is assigned to the current HR
        if (request.assignedHR._id.toString() !== req.user._id.toString()) {
            req.flash('error_msg', 'Not authorized to view this request');
            return res.redirect('/hr/dashboard');
        }

        res.render('hr/transfer-details', {
            request,
            messages: {
                success: req.flash('success_msg'),
                error: req.flash('error_msg')
            }
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Error fetching transfer request details');
        res.redirect('/hr/dashboard');
    }
});

// Review Transfer Request
router.post('/transfer-request/:id/review', isAuthenticated, isHR, async (req, res) => {
    try {
        const { status, comments } = req.body;
        const request = await TransferRequest.findOne({
            _id: req.params.id,
            assignedHR: req.user._id,
            status: 'pending'
        }).populate('employee', 'name email department');

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        request.status = status;
        request.hrComments = comments;
        await request.save();

        // Create notification for employee
        await Notification.create({
            recipient: request.employee._id,
            title: 'Transfer Request Reviewed',
            message: `Your transfer request has been ${status === 'hr_approved' ? 'approved' : 'rejected'} by HR.`,
            type: 'transfer_request',
            link: '/employee/dashboard'
        });

        // If approved, create notification for HOD
        if (status === 'hr_approved') {
            const hodUser = await User.findOne({ role: 'hod' });
            if (hodUser) {
                await Notification.create({
                    recipient: hodUser._id,
                    title: 'New Transfer Request',
                    message: `A transfer request from ${request.employee.name} has been approved by HR and needs your review.`,
                    type: 'transfer_request',
                    link: '/hod/dashboard'
                });
            }
        }

        res.json({ 
            success: true, 
            message: `Request ${status === 'hr_approved' ? 'approved' : 'rejected'} successfully` 
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router; 