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
        const pendingRequests = await TransferRequest.find({
            assignedHR: req.user._id,
            status: 'pending'
        }).populate('employee', 'name email department skills');

        const approvedRequests = await TransferRequest.find({
            assignedHR: req.user._id,
            status: 'hr_approved'
        }).populate('employee', 'name email department skills')
        .sort({ updatedAt: -1 });

        const rejectedRequests = await TransferRequest.find({
            assignedHR: req.user._id,
            status: 'hr_rejected'
        }).populate('employee', 'name email department skills')
        .sort({ updatedAt: -1 });

        res.render('hr/dashboard', {
            user: req.user,
            pendingRequests,
            approvedRequests,
            rejectedRequests,
            getStatusBadgeColor,
            messages: {
                success: req.flash('success_msg'),
                error: req.flash('error_msg')
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server Error');
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
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        request.status = status;
        request.hrComments = comments;
        await request.save();

        // Create notification for employee
        const notification = new Notification({
            recipient: request.employee,
            message: `Your transfer request has been ${status === 'hr_approved' ? 'approved' : 'rejected'} by HR`,
            type: 'transfer_request',
            link: '/employee/dashboard'
        });
        await notification.save();

        // If approved, create notification for HOD
        if (status === 'hr_approved') {
            const hodUser = await User.findOne({ role: 'hod' });
            if (hodUser) {
                const hodNotification = new Notification({
                    recipient: hodUser._id,
                    message: `New transfer request from ${request.employee.name} needs HOD approval`,
                    type: 'transfer_request',
                    link: '/hod/dashboard'
                });
                await hodNotification.save();
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