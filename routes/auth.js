const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { isAuthenticated } = require('../middleware/auth');
const initializeUsers = require('../config/initUsers');

// Initialize default users
initializeUsers();

// Login Page
router.get('/login', (req, res) => {
    res.render('auth/login', {
        messages: req.flash()
    });
});

// Login Handle
router.post('/login', (req, res, next) => {
    const { email, password, role } = req.body;
    
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            req.flash('error_msg', info.message);
            return res.redirect('/auth/login');
        }
        
        // Check if the user's role matches the selected role
        if (user.role !== role) {
            req.flash('error_msg', 'Invalid role selected');
            return res.redirect('/auth/login');
        }

        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            // Redirect based on user role
            switch (user.role) {
                case 'hr':
                    return res.redirect('/hr/dashboard');
                case 'hod':
                    return res.redirect('/hod/dashboard');
                case 'employee':
                    return res.redirect('/employee/dashboard');
                default:
                    req.flash('error_msg', 'Invalid user role');
                    return res.redirect('/auth/login');
            }
        });
    })(req, res, next);
});

// Logout Handle
router.get('/logout', (req, res) => {
    // Clear any flash messages
    req.flash('success_msg', 'You have been successfully logged out');
    
    // Logout the user (synchronous)
    req.logout();
    
    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        
        // Clear the session cookie
        res.clearCookie('connect.sid');
        
        // Redirect to login page
        res.redirect('/auth/login');
    });
});

// Reset HOD Password
router.post('/reset-hod-password', async (req, res) => {
    try {
        const hodUser = await User.findOne({ email: 'thomas.lee@company.com' });
        if (!hodUser) {
            return res.status(404).json({ error: 'HOD user not found' });
        }

        // Set new password
        hodUser.password = 'hod123'; // This will be hashed by the pre-save middleware
        await hodUser.save();

        res.json({ 
            success: true, 
            message: 'HOD password reset successfully' 
        });
    } catch (error) {
        console.error('Error resetting HOD password:', error);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router; 