const mongoose = require('mongoose');

const transferHistorySchema = new mongoose.Schema({
    transferRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TransferRequest',
        required: true
    },
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    previousDepartment: {
        type: String,
        required: true
    },
    newDepartment: {
        type: String,
        required: true
    },
    previousRole: {
        type: String,
        required: true
    },
    newRole: {
        type: String,
        required: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    approvalDate: {
        type: Date,
        default: Date.now
    },
    comments: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['completed', 'cancelled'],
        default: 'completed'
    }
}, {
    timestamps: true
});

// Add indexes for better query performance
transferHistorySchema.index({ employee: 1, approvalDate: -1 });
transferHistorySchema.index({ previousDepartment: 1, newDepartment: 1 });

const TransferHistory = mongoose.model('TransferHistory', transferHistorySchema);

module.exports = TransferHistory; 