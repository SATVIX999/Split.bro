const Expense = require('../models/Expense');
const Group = require('../models/Group');
const Settlement = require('../models/Settlement');
const AppError = require('../utils/AppError');
const { calculateBalances } = require('../services/settlementService');

const getGroupInsights = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const group = await Group.findOne({ groupId });

        if (!group) {
            return next(new AppError('Group not found', 404));
        }

        const userId = req.user.userId;
        const isMember = (group.createdBy === userId) ||
            group.members.some(m => (m.memberId || m.userId) === userId);

        if (!isMember) {
            return next(new AppError('Access denied: You are not a member of this group', 403));
        }

        const expenses = await Expense.find({ groupId }).sort({ date: -1 });
        const settlements = await Settlement.find({ groupId });

        const categoryMap = {};
        let totalExpenseAmount = 0;
        const payerMap = {};
        const participantMap = {};

        expenses.forEach(exp => {
            const amount = exp.amount;
            totalExpenseAmount += amount;

            categoryMap[exp.category] = (categoryMap[exp.category] || 0) + amount;

            const payer = exp.payerName || exp.payerId;
            payerMap[payer] = (payerMap[payer] || 0) + amount;

            const shares = exp.shares instanceof Map ? Object.fromEntries(exp.shares) : (exp.shares || {});
            Object.entries(shares).forEach(([memberId, share]) => {
                participantMap[memberId] = (participantMap[memberId] || 0) + Number(share);
            });
        });

        const categoryBreakdown = Object.entries(categoryMap).map(([category, total]) => ({
            category,
            total: Number(total.toFixed(2)),
            percentage: totalExpenseAmount > 0 ? Number(((total / totalExpenseAmount) * 100).toFixed(1)) : 0
        })).sort((a, b) => b.total - a.total);

        const payerBreakdown = Object.entries(payerMap).map(([payer, total]) => ({
            payer,
            total: Number(total.toFixed(2)),
            percentage: totalExpenseAmount > 0 ? Number(((total / totalExpenseAmount) * 100).toFixed(1)) : 0
        })).sort((a, b) => b.total - a.total);

        const balances = calculateBalances(group.members, expenses, settlements);

        res.status(200).json({
            status: 'success',
            groupId,
            groupName: group.groupName,
            totalExpenses: Number(totalExpenseAmount.toFixed(2)),
            expenseCount: expenses.length,
            settlementCount: settlements.length,
            categoryBreakdown,
            payerBreakdown,
            balances,
            recentExpenses: expenses.slice(0, 5)
        });
    } catch (err) {
        next(err);
    }
};

const getUserInsights = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const groups = await Group.find({
            $or: [
                { createdBy: userId },
                { 'members.userId': userId },
                { 'members.memberId': userId }
            ]
        });

        const groupIds = groups.map(g => g.groupId);
        const expenses = await Expense.find({ groupId: { $in: groupIds } });
        const settlements = await Settlement.find({ groupId: { $in: groupIds } });

        let totalPaidUpfront = 0;
        let totalShareOwed = 0;
        const categoryMap = {};

        expenses.forEach(exp => {
            const shares = exp.shares instanceof Map ? Object.fromEntries(exp.shares) : (exp.shares || {});

            if (exp.payerId === userId) {
                totalPaidUpfront += exp.amount;
            }

            if (shares[userId] !== undefined) {
                const userShare = Number(shares[userId]);
                totalShareOwed += userShare;
                categoryMap[exp.category] = (categoryMap[exp.category] || 0) + userShare;
            }
        });

        let netBalance = totalPaidUpfront - totalShareOwed;

        settlements.forEach(s => {
            if (s.from === userId) netBalance += s.amount;
            if (s.to === userId) netBalance -= s.amount;
        });

        const categoryBreakdown = Object.entries(categoryMap).map(([category, amount]) => ({
            category,
            amount: Number(amount.toFixed(2))
        })).sort((a, b) => b.amount - a.amount);

        res.status(200).json({
            status: 'success',
            userId,
            totalGroups: groups.length,
            totalPaidUpfront: Number(totalPaidUpfront.toFixed(2)),
            totalShareOwed: Number(totalShareOwed.toFixed(2)),
            netBalance: Number(netBalance.toFixed(2)),
            categoryBreakdown
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getGroupInsights,
    getUserInsights
};
