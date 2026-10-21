const { body, validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg);
        return next(new AppError(errorMessages.join('. '), 400, errorMessages));
    }
    next();
};

const validateRegister = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    body('userId')
        .trim()
        .matches(/^[A-Za-z0-9_]{3,20}$/)
        .withMessage('User ID must be 3-20 characters long containing only letters, numbers, and underscores'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    handleValidationErrors
];

const validateLogin = [
    body('identifier')
        .trim()
        .notEmpty()
        .withMessage('Email or User ID is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    handleValidationErrors
];

const validateGroup = [
    body('groupName')
        .trim()
        .isLength({ min: 2, max: 80 })
        .withMessage('Group name must be between 2 and 80 characters'),
    body('category')
        .optional()
        .isIn(['Trip', 'Home', 'Couple', 'Project', 'Other'])
        .withMessage('Category must be one of: Trip, Home, Couple, Project, Other'),
    handleValidationErrors
];

const normalizeMultipartExpenseFields = (req, res, next) => {
    if (req.body) {
        if (req.body['participants[]'] !== undefined && req.body.participants === undefined) {
            req.body.participants = req.body['participants[]'];
        }
        if (typeof req.body.participants === 'string') {
            const raw = req.body.participants.trim();
            if (raw.startsWith('[')) {
                try { req.body.participants = JSON.parse(raw); } catch { req.body.participants = [raw]; }
            } else if (raw.length > 0) {
                req.body.participants = [raw];
            }
        }
        if (typeof req.body.shares === 'string') {
            try { req.body.shares = JSON.parse(req.body.shares); } catch { /* handled by service */ }
        }
    }
    next();
};

const validateExpense = [
    normalizeMultipartExpenseFields,
    body('title')
        .trim()
        .isLength({ min: 1, max: 120 })
        .withMessage('Expense title is required (max 120 characters)'),
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be a positive number greater than 0'),
    body('payerId')
        .trim()
        .notEmpty()
        .withMessage('Payer ID is required'),
    body('splitType')
        .optional()
        .isIn(['equal', 'percentage', 'custom'])
        .withMessage('Split type must be: equal, percentage, or custom'),
    body('participants')
        .isArray({ min: 1 })
        .withMessage('Expense must include at least one participant'),
    handleValidationErrors
];

const validateSettlement = [
    body('groupId')
        .trim()
        .notEmpty()
        .withMessage('Group ID is required'),
    body('from')
        .trim()
        .notEmpty()
        .withMessage('Debtor (from) is required'),
    body('to')
        .trim()
        .notEmpty()
        .withMessage('Creditor (to) is required'),
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Settlement amount must be greater than 0'),
    handleValidationErrors
];

module.exports = {
    handleValidationErrors,
    validateRegister,
    validateLogin,
    validateGroup,
    validateExpense,
    validateSettlement
};
