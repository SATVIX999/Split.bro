const mongoose = require('mongoose');
const crypto = require('crypto');

const expenseSchema = new mongoose.Schema({
    expenseId: {
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
    title: {
        type: String,
        required: [true, 'Expense title is required'],
        trim: true,
        minlength: [1, 'Title cannot be empty'],
        maxlength: [120, 'Title cannot exceed 120 characters']
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0.01, 'Amount must be greater than zero']
    },
    category: {
        type: String,
        enum: ['Food', 'Hotel', 'Transport', 'Activities', 'Shopping', 'Other'],
        default: 'Food'
    },
    payerId: {
        type: String,
        required: [true, 'Payer ID is required'],
        trim: true
    },
    payerName: {
        type: String,
        required: [true, 'Payer name is required'],
        trim: true
    },
    payerType: {
        type: String,
        enum: ['registered', 'guest'],
        default: 'registered'
    },
    splitType: {
        type: String,
        enum: ['equal', 'percentage', 'custom'],
        default: 'equal'
    },
    participants: {
        type: [String],
        validate: {
            validator: function(participants) {
                return Array.isArray(participants) && participants.length >= 1;
            },
            message: 'An expense must involve at least one participant.'
        }
    },
    shares: {
        type: Map,
        of: Number,
        required: true
    },
    receiptUrl: {
        type: String,
        default: null
    },
    receiptOriginalName: {
        type: String,
        default: null
    },
    receiptMimeType: {
        type: String,
        default: null
    },
    receiptSize: {
        type: Number,
        default: null
    },
    notes: {
        type: String,
        default: ''
    },
    date: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform(doc, ret) {
            delete ret.__v;
            delete ret.id;
            // Convert Map to plain object for clean JSON serialization
            if (ret.shares instanceof Map) {
                ret.shares = Object.fromEntries(ret.shares);
            }
            return ret;
        }
    },
    toObject: { virtuals: true }
});

expenseSchema.virtual('payerProfile', {
    ref: 'User',
    localField: 'payerId',
    foreignField: 'userId',
    justOne: true
});

expenseSchema.virtual('groupDetails', {
    ref: 'Group',
    localField: 'groupId',
    foreignField: 'groupId',
    justOne: true
});

expenseSchema.statics.generateExpenseId = function() {
    return `EXP${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
};

const Expense = mongoose.model('Expense', expenseSchema);
module.exports = Expense;
