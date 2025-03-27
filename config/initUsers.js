const User = require('../models/User');
const bcrypt = require('bcryptjs');

const defaultUsers = [
    {
        name: 'HR Admin',
        email: 'hr@company.com',
        password: 'hr123',
        role: 'hr',
        department: 'HR'
    },
    {
        name: 'HOD Admin',
        email: 'hod@company.com',
        password: 'hod123',
        role: 'hod',
        department: 'IT'
    },
    {
        name: 'Employee',
        email: 'employee@company.com',
        password: 'emp123',
        role: 'employee',
        department: 'IT'
    }
];

async function initializeUsers() {
    try {
        for (const userData of defaultUsers) {
            const existingUser = await User.findOne({ email: userData.email });
            
            if (!existingUser) {
                // Create new user - password will be hashed by the pre-save middleware
                const user = new User(userData);
                await user.save();
                console.log(`Created ${userData.role} user: ${userData.email}`);
            } else {
                // Update existing user's password if needed
                const isMatch = await existingUser.comparePassword(userData.password);
                if (!isMatch) {
                    existingUser.password = userData.password; // Will be hashed by pre-save middleware
                    await existingUser.save();
                    console.log(`Updated password for ${userData.role} user: ${userData.email}`);
                } else {
                    console.log(`User already exists with correct password: ${userData.email}`);
                }
            }
        }
        console.log('User initialization completed');
    } catch (error) {
        console.error('Error initializing users:', error);
    }
}

module.exports = initializeUsers; 