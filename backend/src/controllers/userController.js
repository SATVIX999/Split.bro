const User = require('../models/User');
const AppError = require('../utils/AppError');

const searchUsers = async (req, res, next) => {
    try {
        const { q } = req.query;

        if (!q || !q.trim()) {
            return res.status(200).json({ status: 'success', users: [] });
        }

        const query = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const users = await User.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { userId: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        })
        .select('name userId email avatar')
        .limit(10);

        res.status(200).json({
            status: 'success',
            users
        });
    } catch (err) {
        next(err);
    }
};

const getUserProfile = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const user = await User.findOne({ userId: userId.toUpperCase() })
            .select('name userId email avatar bio upiId createdAt');

        if (!user) {
            return next(new AppError('User not found', 404));
        }

        res.status(200).json({
            status: 'success',
            user
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    searchUsers,
    getUserProfile
};
