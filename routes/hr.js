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
        console.log('HR User:', {
            id: req.user._id,
            name: req.user.name,
            department: req.user.department
        });

        // Get pending requests for HR's department
        const pendingRequests = await TransferRequest.find({
            assignedHR: req.user._id,
            status: 'pending'
        }).populate('employee', 'name email department skills');

        console.log('Pending Requests:', {
            count: pendingRequests.length,
            requests: pendingRequests.map(req => ({
                id: req._id,
                employee: req.employee.name,
                status: req.status,
                department: req.employee.department
            }))
        });

        const approvedRequests = await TransferRequest.find({
            assignedHR: req.user._id,
            status: 'hr_approved'
        }).populate('employee', 'name email department skills')
        .sort({ updatedAt: -1 });

        console.log('Approved Requests:', {
            count: approvedRequests.length,
            requests: approvedRequests.map(req => ({
                id: req._id,
                employee: req.employee.name,
                status: req.status,
                department: req.employee.department
            }))
        });

        const rejectedRequests = await TransferRequest.find({
            assignedHR: req.user._id,
            status: 'hr_rejected'
        }).populate('employee', 'name email department skills')
        .sort({ updatedAt: -1 });

        console.log('Rejected Requests:', {
            count: rejectedRequests.length,
            requests: rejectedRequests.map(req => ({
                id: req._id,
                employee: req.employee.name,
                status: req.status,
                department: req.employee.department
            }))
        });

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
        console.error('Error in HR dashboard:', error);
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