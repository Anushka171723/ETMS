const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

module.exports = function(passport) {
    passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
        try {
            // Find user by email
            const user = await User.findOne({ email: email });
            
            if (!user) {
                console.log('No user found with email:', email);
                return done(null, false, { message: 'No user found with that email' });
            }

            // Match password using the User model's comparePassword method
            const isMatch = await user.comparePassword(password);
            if (isMatch) {
                console.log('Password matched for user:', email);
                return done(null, user);
            } else {
                console.log('Password mismatch for user:', email);
                return done(null, false, { message: 'Password incorrect' });
            }
        } catch (err) {
            console.error('Passport authentication error:', err);
            return done(err);
        }
    }));

    passport.serializeUser((user, done) => {
        console.log('Serializing user:', user.email);
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            console.log('Deserializing user:', user.email);
            done(null, user);
        } catch (err) {
            console.error('Passport deserialization error:', err);
            done(err);
        }
    });
}; 