const mongoose = require('mongoose');
const crypto = require('crypto');

const settlementSchema = new mongoose.Schema({
    settlementId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    groupId: {
        type: String,
        required: [true, 'Group ID is required'],
        index: true
    },
    from: {
        type: String,
        required: [true, 'Payer/Debtor (from) is required'],
        trim: true
    },
    fromName: {
        type: String,
        default: ''
    },
    to: {
        type: String,
        required: [true, 'Recipient/Creditor (to) is required'],
        trim: true
    },
    toName: {
        type: String,
        default: ''
    },
    amount: {
        type: Number,
        required: [true, 'Settlement amount is required'],
        min: [0.01, 'Settlement amount must be greater than zero']
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'UPI', 'Bank Transfer', 'Other'],
        default: 'UPI'
    },
    notes: {
        type: String,
        default: ''
    },
    settledBy: {
        type: String,
        required: true,
        trim: true
    },
    settledAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: {
        transform(doc, ret) {
            delete ret.__v;
            return ret;
        }
    }
});

settlementSchema.statics.generateSettlementId = function() {
    return `SET${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
};

const Settlement = mongoose.model('Settlement', settlementSchema);
module.exports = Settlement;
