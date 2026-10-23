const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');
const AppError = require('../utils/AppError');

const signToken = (user) => {
    return jwt.sign(
        { id: user._id, userId: user.userId, email: user.email },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );
};

const sendAuthResponse = (user, statusCode, res, message = 'Success') => {
    const token = signToken(user);

    const cookieOptions = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    };
    res.cookie('token', token, cookieOptions);

    res.status(statusCode).json({
        status: 'success',
        message,
        token,
        user: {
            id: user._id,
            userId: user.userId,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
            upiId: user.upiId,
            phone: user.phone
        }
    });
};

const register = async (req, res, next) => {
    try {
        const { name, email, password, userId: requestedUserId } = req.body;

        const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingEmail) {
            return next(new AppError('This email is already registered. Please log in.', 409));
        }

        let userId = requestedUserId ? requestedUserId.trim().toUpperCase() : null;
        if (userId) {
            const existingId = await User.findOne({ userId });
            if (existingId) {
                return next(new AppError('This User ID is already taken. Please choose another.', 409));
            }
        } else {
            userId = await User.generateUserId(name);
        }

        const newUser = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            userId,
            password
        });

        sendAuthResponse(newUser, 201, res, 'Account created successfully');
    } catch (err) {
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return next(new AppError('Please provide an email/user ID and password', 400));
        }

        const cleanIdentifier = identifier.trim().toLowerCase();

        const user = await User.findOne({
            $or: [
                { email: cleanIdentifier },
                { userId: identifier.trim().toUpperCase() }
            ]
        }).select('+password');

        if (!user || !(await user.comparePassword(password))) {
            return next(new AppError('Incorrect email/User ID or password.', 401));
        }

        sendAuthResponse(user, 200, res, 'Login successful');
    } catch (err) {
        next(err);
    }
};

const getMe = async (req, res, next) => {
    try {
        const user = await User.findOne({ userId: req.user.userId });
        if (!user) {
            return next(new AppError('User not found', 404));
        }

        res.status(200).json({
            status: 'success',
            user: {
                id: user._id,
                userId: user.userId,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                bio: user.bio,
                upiId: user.upiId,
                phone: user.phone,
                createdAt: user.createdAt
            }
        });
    } catch (err) {
        next(err);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const { name, bio, upiId, phone, avatar } = req.body;
        const user = await User.findOne({ userId: req.user.userId });

        if (!user) {
            return next(new AppError('User not found', 404));
        }

        if (name && name.trim()) user.name = name.trim();
        if (bio !== undefined) user.bio = bio.trim();
        if (upiId !== undefined) user.upiId = upiId.trim();
        if (phone !== undefined) user.phone = phone.trim();
        if (avatar !== undefined) user.avatar = avatar.trim();

        await user.save();

        res.status(200).json({
            status: 'success',
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                userId: user.userId,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                bio: user.bio,
                upiId: user.upiId,
                phone: user.phone
            }
        });
    } catch (err) {
        next(err);
    }
};

const logout = (req, res) => {
    res.clearCookie('token');
    res.status(200).json({
        status: 'success',
        message: 'Logged out successfully'
    });
};

module.exports = {
    register,
    login,
    getMe,
    updateProfile,
    logout
};
