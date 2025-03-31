const mongoose = require('mongoose');

const transferRequestSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    currentDepartment: {
        type: String,
        required: true
    },
    requestedDepartment: {
        type: String,
        required: true
    },
    requestedRole: {
        type: String,
        required: true,
        enum: ['employee', 'hr', 'hod']
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'hr_approved', 'hr_rejected', 'hod_approved', 'hod_rejected', 'completed'],
        default: 'pending'
    },
    assignedHR: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    hrComments: {
        type: String
    },
    hodComments: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
transferRequestSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('TransferRequest', transferRequestSchema); 