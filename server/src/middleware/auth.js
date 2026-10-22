const jwt = require('jsonwebtoken');
const config = require('../config/config');
const AppError = require('../utils/AppError');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return next(new AppError('Authentication required. Please log in to access this resource.', 401));
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret);

        // Fetch user from database to ensure account still exists
        const currentUser = await User.findOne({ userId: decoded.userId });
        if (!currentUser) {
            return next(new AppError('The user belonging to this token no longer exists.', 401));
        }

        req.user = {
            id: currentUser._id,
            userId: currentUser.userId,
            name: currentUser.name,
            email: currentUser.email
        };

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(new AppError('Session expired. Please log in again.', 401));
        }
        return next(new AppError('Invalid authentication token. Please log in again.', 401));
    }
};

const optionalAuth = async (req, res, next) => {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) return next();

    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        const currentUser = await User.findOne({ userId: decoded.userId });
        if (currentUser) {
            req.user = {
                id: currentUser._id,
                userId: currentUser.userId,
                name: currentUser.name,
                email: currentUser.email
            };
        }
    } catch {
        // Silently proceed without req.user
    }
    next();
};

module.exports = {
    protect,
    optionalAuth
};
