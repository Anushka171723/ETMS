const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');
const initializeUsers = require('../config/initUsers');

// Initialize default users
initializeUsers();

// Login Page
router.get('/login', (req, res) => {
    console.log('Login page accessed. User:', req.user);
    if (req.user) {
        // If user is already logged in, redirect to their dashboard
        switch (req.user.role) {
            case 'hr':
                res.redirect('/hr/dashboard');
                break;
            case 'hod':
                res.redirect('/hod/dashboard');
                break;
            case 'employee':
                res.redirect('/employee/dashboard');
                break;
            default:
                res.redirect('/auth/login');
        }
    } else {
        res.render('auth/login', {
            messages: {
                error: req.flash('error'),
                success: req.flash('success_msg')
            }
        });
    }
});

// Login Handle
router.post('/login', (req, res, next) => {
    console.log('Login attempt for email:', req.body.email);
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error('Authentication error:', err);
            return next(err);
        }
        if (!user) {
            console.log('Login failed:', info.message);
            req.flash('error', info.message);
            return res.redirect('/auth/login');
        }
        req.logIn(user, (err) => {
            if (err) {
                console.error('Login error:', err);
                return next(err);
            }
            console.log('Login successful. User:', user);
            // Redirect based on role
            switch (user.role) {
                case 'hr':
                    return res.redirect('/hr/dashboard');
                case 'hod':
                    return res.redirect('/hod/dashboard');
                case 'employee':
                    return res.redirect('/employee/dashboard');
                default:
                    return res.redirect('/auth/login');
            }
        });
    })(req, res, next);
});

// Logout Handle
router.get('/logout', (req, res) => {
    // Set success message
    req.flash('success_msg', 'You have been successfully logged out');
    
    // Clear the session first
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
            req.flash('error_msg', 'Error logging out');
            return res.redirect('/auth/login');
        }
        
        // Then perform the logout
        req.logout((err) => {
            if (err) {
                console.error('Logout error:', err);
                req.flash('error_msg', 'Error logging out');
                return res.redirect('/auth/login');
            }
            
            // Clear the session cookie
            res.clearCookie('sessionId');
            
            // Redirect to login page
            res.redirect('/auth/login');
        });
    });
});

module.exports = router; 