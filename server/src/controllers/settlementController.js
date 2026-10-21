const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const AppError = require('../utils/AppError');
const { calculateBalances, simplifyDebts, validateSettlement } = require('../services/settlementService');
const appEvents = require('../utils/eventEmitter');

const getSettlements = async (req, res, next) => {
    try {
        const { groupId } = req.query;
        const userId = req.user.userId;

        if (groupId) {
            const group = await Group.findOne({ groupId });
            if (!group) {
                return next(new AppError('Group not found', 404));
            }

            const isMember = (group.createdBy === userId) ||
                group.members.some(m => (m.memberId || m.userId) === userId);

            if (!isMember) {
                return next(new AppError('Access denied: You are not a member of this group', 403));
            }

            const settlements = await Settlement.find({ groupId }).sort({ settledAt: -1, createdAt: -1 });

            return res.status(200).json({
                status: 'success',
                count: settlements.length,
                settlements
            });
        }

        // When no groupId is specified, only return settlements for groups user belongs to
        const userGroups = await Group.find({
            $or: [
                { createdBy: userId },
                { 'members.userId': userId },
                { 'members.memberId': userId }
            ]
        }).select('groupId');

        const allowedGroupIds = userGroups.map(g => g.groupId);
        const settlements = await Settlement.find({ groupId: { $in: allowedGroupIds } }).sort({ settledAt: -1, createdAt: -1 });

        res.status(200).json({
            status: 'success',
            count: settlements.length,
            settlements
        });
    } catch (err) {
        next(err);
    }
};

const getBalancesAndSuggestions = async (req, res, next) => {
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

        const expenses = await Expense.find({ groupId });
        const settlements = await Settlement.find({ groupId });

        const balances = calculateBalances(group.members, expenses, settlements);
        const suggestions = simplifyDebts(balances);

        let totalOutstanding = 0;
        Object.values(balances).forEach(val => {
            if (val > 0) totalOutstanding += val;
        });
        totalOutstanding = Number(totalOutstanding.toFixed(2));

        const memberNameMap = {};
        group.members.forEach(m => {
            const id = m.memberId || m.userId;
            memberNameMap[id] = m.name || id;
        });

        const enrichedSuggestions = suggestions.map(s => ({
            ...s,
            fromName: memberNameMap[s.from] || s.from,
            toName: memberNameMap[s.to] || s.to
        }));

        res.status(200).json({
            status: 'success',
            groupId,
            groupName: group.groupName,
            members: group.members,
            balances,
            suggestions: enrichedSuggestions,
            totalOutstanding,
            transactionCount: suggestions.length
        });
    } catch (err) {
        next(err);
    }
};

const createSettlement = async (req, res, next) => {
    try {
        const { groupId, from, to, amount, paymentMethod = 'UPI', notes = '' } = req.body;
        const settledBy = req.user ? req.user.userId : (req.body.settledBy || from);

        const group = await Group.findOne({ groupId });
        if (!group) {
            return next(new AppError('Group not found', 404));
        }

        const userId = req.user.userId;
        const isMember = (group.createdBy === userId) ||
            group.members.some(m => (m.memberId || m.userId) === userId);

        if (!isMember) {
            return next(new AppError('Access denied: You cannot record settlements in this group', 403));
        }

        const validatedAmount = validateSettlement(from, to, amount, group.members);

        const fromMember = group.members.find(m => (m.memberId || m.userId) === from);
        const toMember = group.members.find(m => (m.memberId || m.userId) === to);

        const settlementId = Settlement.generateSettlementId();

        const newSettlement = await Settlement.create({
            settlementId,
            groupId,
            from,
            fromName: fromMember ? fromMember.name : from,
            to,
            toName: toMember ? toMember.name : to,
            amount: validatedAmount,
            paymentMethod,
            notes: notes ? notes.trim() : '',
            settledBy
        });

        appEvents.emit('settlement:recorded', {
            groupId,
            settlementId,
            from,
            to,
            amount: validatedAmount
        });

        res.status(201).json({
            status: 'success',
            message: 'Settlement recorded successfully',
            settlement: newSettlement
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getSettlements,
    getBalancesAndSuggestions,
    createSettlement
};
