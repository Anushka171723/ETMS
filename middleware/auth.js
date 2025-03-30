const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please log in to view this page');
    res.redirect('/auth/login');
};

const isEmployee = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'employee') {
        return next();
    }
    req.flash('error_msg', 'Please log in as Employee to view this page');
    res.redirect('/auth/login');
};

const isHR = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'hr') {
        return next();
    }
    req.flash('error_msg', 'Please log in as HR to view this page');
    res.redirect('/auth/login');
};

const isHOD = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'hod') {
        return next();
    }
    req.flash('error_msg', 'Please log in as HOD to view this page');
    res.redirect('/auth/login');
};

module.exports = {
    isAuthenticated,
    isEmployee,
    isHR,
    isHOD
}; 