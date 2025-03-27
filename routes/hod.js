const express = require('express');
const router = express.Router();
const TransferRequest = require('../models/TransferRequest');
const User = require('../models/User');

// Middleware to check if user is HOD
const isHOD = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'hod') {
        return next();
    }
    req.flash('error_msg', 'Please log in as HOD to view this page');
    res.redirect('/auth/login');
};

// HOD Dashboard
router.get('/dashboard', isHOD, async (req, res) => {
    try {
        // Get all transfer requests that are HR approved and pending HOD review
        const transferRequests = await TransferRequest.find({
            status: 'hr_approved'
        }).populate('employee', 'name email department');

        // Get all requests for the HOD's department
        const pendingRequests = await TransferRequest.find({
            status: 'pending',
            currentDepartment: req.user.department
        }).populate('employee', 'name email department');
        
        const approvedRequests = await TransferRequest.find({
            status: 'hod_approved',
            currentDepartment: req.user.department
        }).populate('employee', 'name email department');
        
        const rejectedRequests = await TransferRequest.find({
            status: 'hod_rejected',
            currentDepartment: req.user.department
        }).populate('employee', 'name email department');

        res.render('hod/dashboard', {
            transferRequests,
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

// Handle HOD Action (Approve/Reject)
router.post('/transfer-request/:id/action', isHOD, async (req, res) => {
    try {
        const { action, hodComments } = req.body;
        const request = await TransferRequest.findById(req.params.id)
            .populate('employee', 'name email department');

        if (!request) {
            req.flash('error_msg', 'Transfer request not found');
            return res.redirect('/hod/dashboard');
        }

        if (request.status !== 'hr_approved') {
            req.flash('error_msg', 'This request is not ready for HOD review');
            return res.redirect('/hod/dashboard');
        }

        // Update request status and comments
        request.status = action === 'approve' ? 'hod_approved' : 'hod_rejected';
        request.hodComments = hodComments;
        await request.save();

        // If approved, update employee's department
        if (action === 'approve') {
            const employee = await User.findById(request.employee._id);
            employee.department = request.requestedDepartment;
            await employee.save();
        }

        req.flash('success_msg', `Transfer request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
        res.redirect('/hod/dashboard');
    } catch (error) {
        console.error('Error processing HOD action:', error);
        req.flash('error_msg', 'Error processing your action');
        res.redirect('/hod/dashboard');
    }
});

module.exports = router; 