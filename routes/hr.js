const express = require('express');
const router = express.Router();
const TransferRequest = require('../models/TransferRequest');
const User = require('../models/User');

// Middleware to check if user is HR
const isHR = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'hr') {
        return next();
    }
    req.flash('error_msg', 'Please log in as HR to view this page');
    res.redirect('/auth/login');
};

// HR Dashboard
router.get('/dashboard', isHR, async (req, res) => {
    try {
        // Get all pending transfer requests
        const pendingRequests = await TransferRequest.find({
            status: 'pending'
        }).populate('employee', 'name email department');

        // Get all approved requests
        const approvedRequests = await TransferRequest.find({
            status: 'hr_approved'
        }).populate('employee', 'name email department');

        // Get all rejected requests
        const rejectedRequests = await TransferRequest.find({
            status: 'hr_rejected'
        }).populate('employee', 'name email department');

        res.render('hr/dashboard', {
            user: req.user,
            pendingRequests,
            approvedRequests,
            rejectedRequests,
            messages: {
                success: req.flash('success_msg'),
                error: req.flash('error_msg')
            }
        });
    } catch (error) {
        console.error('Error fetching transfer requests:', error);
        req.flash('error_msg', 'Error loading dashboard');
        res.redirect('/auth/login');
    }
});

// Transfer Request Details
router.get('/transfer-request/:id', isHR, async (req, res) => {
    try {
        const request = await TransferRequest.findById(req.params.id)
            .populate('employee', 'name email department');

        if (!request) {
            req.flash('error_msg', 'Transfer request not found');
            return res.redirect('/hr/dashboard');
        }

        res.render('hr/transfer-details', {
            user: req.user,
            request,
            messages: {
                success: req.flash('success_msg'),
                error: req.flash('error_msg')
            }
        });
    } catch (error) {
        console.error('Error fetching transfer request:', error);
        req.flash('error_msg', 'Error loading transfer request details');
        res.redirect('/hr/dashboard');
    }
});

// Handle HR Action (Approve/Reject)
router.post('/transfer-request/:id/action', isHR, async (req, res) => {
    try {
        const { action, hrComments } = req.body;
        const request = await TransferRequest.findById(req.params.id)
            .populate('employee', 'name email department');

        if (!request) {
            req.flash('error_msg', 'Transfer request not found');
            return res.redirect('/hr/dashboard');
        }

        if (request.status !== 'pending') {
            req.flash('error_msg', 'This request has already been processed');
            return res.redirect('/hr/dashboard');
        }

        // Update request status and comments
        request.status = action === 'approve' ? 'hr_approved' : 'hr_rejected';
        request.hrComments = hrComments;
        await request.save();

        req.flash('success_msg', `Transfer request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
        res.redirect('/hr/dashboard');
    } catch (error) {
        console.error('Error processing HR action:', error);
        req.flash('error_msg', 'Error processing your action');
        res.redirect('/hr/dashboard');
    }
});

module.exports = router; 