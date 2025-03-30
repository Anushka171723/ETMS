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
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            req.flash('error_msg', info.message);
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
                    return res.redirect('/auth/login');
            }
        });
    })(req, res, next);
});

// Logout Handle
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Error during logout:', err);
        }
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
            }
            req.flash('success_msg', 'You are logged out');
            res.redirect('/auth/login');
        });
    });
});

module.exports = router; 