const express = require('express');
const router = express.Router();
const TransferRequest = require('../models/TransferRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { getStatusBadgeColor } = require('../utils/helpers');
const { isAuthenticated, isHOD } = require('../middleware/auth');

// Get HOD Dashboard
router.get('/dashboard', isAuthenticated, isHOD, async (req, res) => {
    try {
        const pendingRequests = await TransferRequest.find({
            status: { $in: ['pending', 'hr_approved'] }
        }).populate('employee', 'name email department skills')
        .populate('assignedHR', 'name email')
        .sort({ updatedAt: -1 });

        const processedRequests = await TransferRequest.find({
            status: { $in: ['hod_approved', 'hod_rejected'] }
        }).populate('employee', 'name email department')
        .populate('assignedHR', 'name email')
        .sort({ updatedAt: -1 });

        res.render('hod/dashboard', {
            user: req.user,
            pendingRequests,
            processedRequests,
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

// Transfer Request Details
router.get('/transfer-request/:id', isHOD, async (req, res) => {
    try {
        const request = await TransferRequest.findById(req.params.id)
            .populate('employee', 'name email department');

        if (!request) {
            req.flash('error_msg', 'Transfer request not found');
            return res.redirect('/hod/dashboard');
        }

        res.render('hod/transfer-details', {
            request,
            messages: {
                success: req.flash('success_msg'),
                error: req.flash('error_msg')
            }
        });
    } catch (error) {
        console.error('Error fetching transfer request:', error);
        req.flash('error_msg', 'Error loading transfer request details');
        res.redirect('/hod/dashboard');
    }
});

// Review Transfer Request
router.post('/transfer-request/:id/review', isAuthenticated, isHOD, async (req, res) => {
    try {
        const { status, comments } = req.body;
        const request = await TransferRequest.findOne({
            _id: req.params.id
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // Check if request is in correct status for HOD review
        if (request.status !== 'hr_approved') {
            return res.status(400).json({ 
                error: `Cannot review request. Current status: ${request.status}. Request must be approved by HR first.` 
            });
        }

        request.status = status;
        request.hodComments = comments;

        // If approved, update employee's department
        if (status === 'hod_approved') {
            const employee = await User.findById(request.employee);
            if (employee) {
                employee.department = request.requestedDepartment;
                await employee.save();
            }
        }

        await request.save();

        // Create notification for employee
        const notification = new Notification({
            recipient: request.employee,
            message: `Your transfer request has been ${status === 'hod_approved' ? 'approved' : 'rejected'} by HOD`,
            type: 'transfer_request',
            link: '/employee/dashboard'
        });
        await notification.save();

        // Create notification for HR
        const hrNotification = new Notification({
            recipient: request.assignedHR,
            message: `Transfer request for ${request.employee.name} has been ${status === 'hod_approved' ? 'approved' : 'rejected'} by HOD`,
            type: 'transfer_request',
            link: '/hr/dashboard'
        });
        await hrNotification.save();

        req.flash('success_msg', `Request ${status === 'hod_approved' ? 'approved' : 'rejected'} successfully`);
        res.json({ 
            success: true, 
            message: `Request ${status === 'hod_approved' ? 'approved' : 'rejected'} successfully` 
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Error processing request');
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router; 