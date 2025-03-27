const express = require('express');
const router = express.Router();

// Landing Page
router.get('/', (req, res) => {
    res.render('index');
});

// Dashboard Redirect based on role
router.get('/dashboard', (req, res) => {
    if (!req.user) {
        req.flash('error_msg', 'Please log in to view dashboard');
        return res.redirect('/auth/login');
    }

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
            req.flash('error_msg', 'Invalid user role');
            res.redirect('/auth/login');
    }
});

module.exports = router; 