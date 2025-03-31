// Suppress punycode warning
process.removeAllListeners('warning');

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const initializeUsers = require('./config/initUsers');
const dropIndexes = require('./config/dropIndexes');
const app = express();

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ETS', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(async () => {
    console.log('Connected to MongoDB');
    try {
        // Drop existing indexes first
        await dropIndexes();
        // Then initialize users
        await initializeUsers();
    } catch (error) {
        console.error('Error during initialization:', error);
    }
})
.catch(err => console.error('MongoDB connection error:', err));

// Passport Config
require('./config/passport')(passport);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Express Session
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    name: 'sessionId' // Custom session name
}));

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect Flash
app.use(flash());

// Global Variables
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user;
    next();
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/employee', require('./routes/employee'));
app.use('/hr', require('./routes/hr'));
app.use('/hod', require('./routes/hod'));

// Root Route
app.get('/', (req, res) => {
    res.render('index', {
        messages: {
            success: req.flash('success_msg'),
            error: req.flash('error_msg')
        }
    });
});

// Dashboard Route
app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('error_msg', 'Please log in to view this page');
        return res.redirect('/auth/login');
    }

    // Redirect based on user role
    switch (req.user.role) {
        case 'employee':
            res.redirect('/employee/dashboard');
            break;
        case 'hr':
            res.redirect('/hr/dashboard');
            break;
        case 'hod':
            res.redirect('/hod/dashboard');
            break;
        default:
            res.redirect('/auth/login');
    }
});

// Handle 404
app.use((req, res) => {
    res.status(404).render('404');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 