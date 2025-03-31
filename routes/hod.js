const express = require('express');
const router = express.Router();
const TransferRequest = require('../models/TransferRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { getStatusBadgeColor } = require('../utils/helpers');
const { isAuthenticated, isHOD } = require('../middleware/auth');

// HOD Dashboard
router.get('/dashboard', isAuthenticated, isHOD, async (req, res) => {
    try {
        console.log('HOD User:', {
            id: req.user._id,
            name: req.user.name,
            department: req.user.department
        });
        
        // Get HR-approved requests
        const pendingRequests = await TransferRequest.find({
            status: 'hr_approved'
        }).populate('employee', 'name email department')
          .populate('assignedHR', 'name email')
          .sort({ createdAt: -1 });

        console.log('Found HR-approved requests:', {
            count: pendingRequests.length,
            requests: pendingRequests.map(req => ({
                id: req._id,
                employee: req.employee.name,
                status: req.status,
                requestedDepartment: req.requestedDepartment,
                currentDepartment: req.currentDepartment
            }))
        });

        // Get processed requests
        const processedRequests = await TransferRequest.find({
            status: { $in: ['hr_rejected', 'hod_approved', 'hod_rejected', 'completed'] }
        }).populate('employee', 'name email department')
          .populate('assignedHR', 'name email')
          .sort({ updatedAt: -1 });

        console.log('Found processed requests:', {
            count: processedRequests.length,
            requests: processedRequests.map(req => ({
                id: req._id,
                employee: req.employee.name,
                status: req.status,
                requestedDepartment: req.requestedDepartment,
                currentDepartment: req.currentDepartment
            }))
        });

        res.render('hod/dashboard', {
            pendingRequests,
            processedRequests,
            getStatusBadgeColor,
            messages: req.flash()
        });
    } catch (error) {
        console.error('Error in HOD dashboard:', error);
        req.flash('error', 'Error loading dashboard');
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

// Review Transfer Request
router.post('/transfer-request/:id/review', isAuthenticated, isHOD, async (req, res) => {
    try {
        const { status, comments } = req.body;
        console.log('Reviewing transfer request:', {
            requestId: req.params.id,
            status,
            comments
        });

        // Validate status
        if (!['hod_approved', 'hod_rejected'].includes(status)) {
            console.log('Invalid status provided:', status);
            return res.status(400).json({ 
                error: 'Invalid status. Must be either hod_approved or hod_rejected.' 
            });
        }

        const request = await TransferRequest.findById(req.params.id)
            .populate('employee')
            .populate('assignedHR');

        if (!request) {
            console.log('Transfer request not found:', req.params.id);
            return res.status(404).json({ error: 'Transfer request not found' });
        }

        // Check if request is in correct status for HOD review
        if (request.status !== 'hr_approved') {
            console.log('Invalid request status for HOD review:', request.status);
            return res.status(400).json({ 
                error: `Cannot review request. Current status: ${request.status}. Request must be approved by HR first.` 
            });
        }

        // Ensure requestedRole is set
        if (!request.requestedRole) {
            request.requestedRole = request.employee.role; // Use current role as default
        }

        // Update request status
        request.status = status;
        request.hodComments = comments;
        await request.save();

        // Create notifications
        await Notification.create([
            {
                recipient: request.employee._id,
                title: 'Transfer Request Reviewed',
                message: `Your transfer request has been ${status === 'hod_approved' ? 'approved' : 'rejected'} by HOD.`,
                type: 'transfer_reviewed'
            },
            {
                recipient: request.assignedHR._id,
                title: 'Transfer Request Reviewed',
                message: `The transfer request for ${request.employee.name} has been ${status === 'hod_approved' ? 'approved' : 'rejected'} by HOD.`,
                type: 'transfer_reviewed'
            }
        ]);

        // If approved, update employee's department and role
        if (status === 'hod_approved') {
            const employee = await User.findById(request.employee._id);
            if (!employee) {
                throw new Error('Employee not found');
            }
            employee.department = request.requestedDepartment;
            employee.role = request.requestedRole;
            await employee.save();
        }

        console.log('Transfer request reviewed successfully:', {
            requestId: req.params.id,
            status
        });

        res.json({ 
            success: true, 
            message: `Transfer request ${status === 'hod_approved' ? 'approved' : 'rejected'} successfully` 
        });
    } catch (error) {
        console.error('Error reviewing transfer request:', error);
        res.status(500).json({ 
            error: 'Error processing request',
            details: error.message
        });
    }
});

// Finalize Transfer Request
router.post('/transfer-request/:id/finalize', isAuthenticated, isHOD, async (req, res) => {
    try {
        const { decision, comments } = req.body;
        console.log('HOD finalizing transfer request:', {
            requestId: req.params.id,
            decision,
            comments
        });

        const request = await TransferRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ error: 'Transfer request not found' });
        }

        // Check if request is HR approved
        if (request.status !== 'hr_approved') {
            return res.status(400).json({ error: 'Only HR approved requests can be finalized' });
        }

        // Update request status
        request.status = decision === 'approve' ? 'hod_approved' : 'hod_rejected';
        request.hodComments = comments;
        request.hodDecisionDate = new Date();
        await request.save();

        // Update employee's department and role if approved
        if (decision === 'approve') {
            const employee = await User.findById(request.employee);
            if (employee) {
                employee.department = request.requestedDepartment;
                employee.role = request.requestedRole || employee.role;
                await employee.save();
            }
        }

        // Create notification for employee
        await Notification.create({
            recipient: request.employee,
            title: 'Transfer Request Finalized',
            message: `Your transfer request has been ${decision === 'approve' ? 'approved' : 'rejected'} by the HOD.`,
            type: 'transfer_request',
            link: '/employee/dashboard'
        });

        // Create notification for HR
        await Notification.create({
            recipient: request.assignedHR,
            title: 'Transfer Request Finalized',
            message: `Transfer request has been ${decision === 'approve' ? 'approved' : 'rejected'} by the HOD.`,
            type: 'transfer_request',
            link: '/hr/dashboard'
        });

        res.json({ 
            success: true, 
            message: `Transfer request ${decision === 'approve' ? 'approved' : 'rejected'} successfully` 
        });
    } catch (error) {
        console.error('Error finalizing transfer request:', error);
        res.status(500).json({ 
            error: 'Error finalizing transfer request',
            details: error.message
        });
    }
});

module.exports = router; 