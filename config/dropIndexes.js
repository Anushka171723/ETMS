const mongoose = require('mongoose');
const User = require('../models/User');

async function dropIndexes() {
    try {
        // Drop all indexes from the users collection
        await User.collection.dropIndexes();
        console.log('Successfully dropped all indexes from users collection');
        
        // Recreate only the email index
        await User.collection.createIndex({ email: 1 }, { unique: true });
        console.log('Successfully recreated email index');
    } catch (error) {
        console.error('Error dropping indexes:', error);
        throw error;
    }
}

module.exports = dropIndexes; 