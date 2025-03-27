const express = require('express');
const router = express.Router();

// Landing Page
router.get('/', (req, res) => {
    if (req.user) {
        // If user is logged in, redirect to their dashboard
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
        res.render('index');
    }
});

// Dashboard Redirect
router.get('/dashboard', (req, res) => {
    if (!req.user) {
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
            res.redirect('/auth/login');
    }
});

module.exports = router; 