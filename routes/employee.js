const express = require('express');
const router = express.Router();
const TransferRequest = require('../models/TransferRequest');

// Middleware to check if user is Employee
const isEmployee = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'employee') {
        return next();
    }
    req.flash('error_msg', 'Please log in as Employee to view this page');
    res.redirect('/auth/login');
};

// Employee Dashboard
router.get('/dashboard', isEmployee, async (req, res) => {
    try {
        const requests = await TransferRequest.find({ employee: req.user._id })
            .sort({ createdAt: -1 });
        
        res.render('employee/dashboard', {
            user: req.user,
            requests: requests,
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

// New Transfer Request Form
router.get('/transfer-request', isEmployee, (req, res) => {
    res.render('employee/transfer-request', {
        user: req.user,
        messages: {
            error: req.flash('error_msg')
        }
    });
});

// Create Transfer Request
router.post('/transfer-request', isEmployee, async (req, res) => {
    const { currentDepartment, requestedDepartment, reason } = req.body;
    let errors = [];

    if (!currentDepartment || !requestedDepartment || !reason) {
        errors.push({ msg: 'Please fill in all fields' });
    }

    if (currentDepartment === requestedDepartment) {
        errors.push({ msg: 'Current and requested departments cannot be the same' });
    }

    if (errors.length > 0) {
        res.render('employee/transfer-request', {
            user: req.user,
            errors,
            messages: {
                error: errors[0].msg
            }
        });
    } else {
        try {
            const newRequest = new TransferRequest({
                employee: req.user._id,
                currentDepartment,
                requestedDepartment,
                reason,
                status: 'pending'
            });

            await newRequest.save();
            req.flash('success_msg', 'Transfer request submitted successfully and is pending HR approval');
            res.redirect('/employee/dashboard');
        } catch (error) {
            console.error('Error creating transfer request:', error);
            req.flash('error_msg', 'Error submitting transfer request');
            res.redirect('/employee/transfer-request');
        }
    }
});

// View Transfer Request Details
router.get('/transfer-request/:id', isEmployee, async (req, res) => {
    try {
        const request = await TransferRequest.findById(req.params.id)
            .populate('employee', 'name email department');
        
        if (!request) {
            req.flash('error_msg', 'Transfer request not found');
            return res.redirect('/employee/dashboard');
        }

        // Check if the request belongs to the logged-in employee
        if (request.employee._id.toString() !== req.user._id.toString()) {
            req.flash('error_msg', 'Not authorized to view this request');
            return res.redirect('/employee/dashboard');
        }

        res.render('employee/transfer-details', {
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
        res.redirect('/employee/dashboard');
    }
});

module.exports = router; 