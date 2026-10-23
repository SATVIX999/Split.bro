const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const AppError = require('../utils/AppError');
const appEvents = require('../utils/eventEmitter');

const getGroups = async (req, res, next) => {
    try {
        if (!req.user) {
            return next(new AppError('Authentication required to access groups', 401));
        }

        const currentUserId = req.user.userId;
        const query = {
            $or: [
                { createdBy: currentUserId },
                { 'members.userId': currentUserId },
                { 'members.memberId': currentUserId }
            ]
        };

        const groups = await Group.find(query).sort({ createdAt: -1 });

        const groupIds = groups.map(g => g.groupId);
        const expenseCounts = await Expense.aggregate([
            { $match: { groupId: { $in: groupIds } } },
            { $group: { _id: '$groupId', totalExpenses: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);

        const countMap = {};
        expenseCounts.forEach(c => {
            countMap[c._id] = { total: c.totalExpenses, count: c.count };
        });

        const enriched = groups.map(group => {
            const gObj = group.toJSON();
            const stats = countMap[group.groupId] || { total: 0, count: 0 };
            gObj.totalExpenses = stats.total;
            gObj.expenseCount = stats.count;
            return gObj;
        });

        res.status(200).json(enriched);
    } catch (err) {
        next(err);
    }
};

const getGroupById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const group = await Group.findOne({ groupId: id })
            .populate('creatorProfile', 'name userId email avatar');

        if (!group) {
            return next(new AppError('Group not found', 404));
        }

        if (!req.user) {
            return next(new AppError('Authentication required to view this group', 401));
        }

        const isMember = group.members.some(m => 
            m.memberId === req.user.userId || m.userId === req.user.userId
        ) || group.createdBy === req.user.userId;

        if (!isMember) {
            return next(new AppError('You do not have permission to access this group', 403));
        }

        const expenses = await Expense.find({ groupId: id }).sort({ date: -1 });
        const settlements = await Settlement.find({ groupId: id }).sort({ settledAt: -1 });

        const groupData = group.toJSON();
        groupData.expenses = expenses;
        groupData.settledPayments = settlements;

        res.status(200).json(groupData);
    } catch (err) {
        next(err);
    }
};

const createGroup = async (req, res, next) => {
    try {
        const { groupName, category, description, members = [] } = req.body;

        if (!req.user || !req.user.userId) {
            return next(new AppError('Authentication required to create a group', 401));
        }

        const currentUserId = req.user.userId;
        const currentUserName = req.user.name || currentUserId;

        if (!groupName || !groupName.trim()) {
            return next(new AppError('Group name is required', 400));
        }

        if (!currentUserId) {
            return next(new AppError('Creator user ID is required', 400));
        }

        const groupId = req.body.groupId || Group.generateGroupId();
        const groupCode = req.body.groupCode || await Group.generateGroupCode();

        const formattedMembers = [];

        // Always ensure creator is a member
        formattedMembers.push({
            memberId: currentUserId,
            name: currentUserName,
            type: 'registered',
            userId: currentUserId,
            joinedAt: new Date()
        });

        if (Array.isArray(members)) {
            members.forEach(m => {
                if (typeof m === 'string') {
                    if (m !== currentUserId && !formattedMembers.some(fm => fm.memberId === m)) {
                        formattedMembers.push({
                            memberId: m,
                            name: m,
                            type: 'registered',
                            userId: m
                        });
                    }
                } else if (typeof m === 'object' && m !== null) {
                    const id = m.memberId || m.userId || m.name;
                    if (id && id !== currentUserId && !formattedMembers.some(fm => fm.memberId === id)) {
                        formattedMembers.push({
                            memberId: id,
                            name: m.name || id,
                            type: m.type === 'guest' ? 'guest' : 'registered',
                            userId: m.userId || null
                        });
                    }
                }
            });
        }

        const newGroup = await Group.create({
            groupId,
            groupName: groupName.trim(),
            groupCode,
            category: category || 'Trip',
            description: description || '',
            createdBy: currentUserId,
            members: formattedMembers
        });

        appEvents.emit('group:created', {
            groupId: newGroup.groupId,
            groupName: newGroup.groupName,
            createdBy: currentUserId
        });

        res.status(201).json({
            message: 'Group created successfully',
            group: newGroup
        });
    } catch (err) {
        next(err);
    }
};

const updateGroup = async (req, res, next) => {
    try {
        const { id } = req.params;
        const group = await Group.findOne({ groupId: id });

        if (!group) {
            return next(new AppError('Group not found', 404));
        }

        if (!req.user) {
            return next(new AppError('Authentication required to modify this group', 401));
        }
        const isMember = group.members.some(m => 
            m.memberId === req.user.userId || m.userId === req.user.userId
        ) || group.createdBy === req.user.userId;

        if (!isMember) {
            return next(new AppError('You do not have permission to modify this group', 403));
        }

        if (req.body.groupName !== undefined) {
            if (!req.body.groupName.trim()) {
                return next(new AppError('Group name cannot be empty', 400));
            }
            group.groupName = req.body.groupName.trim();
        }

        if (req.body.category !== undefined) {
            group.category = req.body.category;
        }

        if (req.body.description !== undefined) {
            group.description = req.body.description.trim();
        }

        if (Array.isArray(req.body.members)) {
            const memberMap = new Map();
            group.members.forEach(m => memberMap.set(m.memberId, m));

            req.body.members.forEach(m => {
                if (typeof m === 'string') {
                    if (!memberMap.has(m)) {
                        memberMap.set(m, { memberId: m, name: m, type: 'registered', userId: m });
                    }
                } else if (typeof m === 'object' && m !== null) {
                    const id = m.memberId || m.userId;
                    if (id && !memberMap.has(id)) {
                        memberMap.set(id, {
                            memberId: id,
                            name: m.name || id,
                            type: m.type === 'guest' ? 'guest' : 'registered',
                            userId: m.userId || null
                        });
                    }
                }
            });

            group.members = Array.from(memberMap.values());
        }

        await group.save();

        res.status(200).json({
            message: 'Group updated successfully',
            group
        });
    } catch (err) {
        next(err);
    }
};

const deleteGroup = async (req, res, next) => {
    try {
        const { id } = req.params;
        const group = await Group.findOne({ groupId: id });

        if (!group) {
            return next(new AppError('Group not found', 404));
        }

        if (!req.user) {
            return next(new AppError('Authentication required to delete this group', 401));
        }

        if (group.createdBy !== req.user.userId) {
            return next(new AppError('Only the group creator can delete this group', 403));
        }

        await Expense.deleteMany({ groupId: id });
        await Settlement.deleteMany({ groupId: id });
        await Group.deleteOne({ groupId: id });

        res.status(200).json({
            message: 'Group and all associated expenses deleted successfully'
        });
    } catch (err) {
        next(err);
    }
};

const joinGroupByCode = async (req, res, next) => {
    try {
        const { groupCode } = req.body;
        if (!groupCode || !groupCode.trim()) {
            return next(new AppError('Group code is required to join a group', 400));
        }

        const group = await Group.findOne({ groupCode: groupCode.trim().toUpperCase() });
        if (!group) {
            return next(new AppError('No group found with this group code. Please check and try again.', 404));
        }

        if (!req.user || !req.user.userId) {
            return next(new AppError('Authentication required to join a group', 401));
        }

        const currentUserId = req.user.userId;
        const currentUserName = req.user.name || currentUserId;

        if (!currentUserId) {
            return next(new AppError('User authentication required to join a group', 401));
        }

        const alreadyMember = group.members.some(m => 
            m.memberId === currentUserId || m.userId === currentUserId
        );

        if (alreadyMember) {
            return res.status(200).json({
                message: 'You are already a member of this group',
                group
            });
        }

        group.members.push({
            memberId: currentUserId,
            name: currentUserName,
            type: 'registered',
            userId: currentUserId,
            joinedAt: new Date()
        });

        await group.save();

        res.status(200).json({
            message: `Successfully joined ${group.groupName}!`,
            group
        });
    } catch (err) {
        next(err);
    }
};

const addGuestMember = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return next(new AppError('Guest member name is required', 400));
        }

        const group = await Group.findOne({ groupId: id });
        if (!group) {
            return next(new AppError('Group not found', 404));
        }

        if (!req.user) {
            return next(new AppError('Authentication required to add members to this group', 401));
        }

        const isMember = group.members.some(m => 
            m.memberId === req.user.userId || m.userId === req.user.userId
        ) || group.createdBy === req.user.userId;

        if (!isMember) {
            return next(new AppError('You do not have permission to add members to this group', 403));
        }

        const guestId = `GUEST_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        group.members.push({
            memberId: guestId,
            name: name.trim(),
            type: 'guest',
            userId: null
        });

        await group.save();

        res.status(201).json({
            message: 'Guest member added successfully',
            member: {
                memberId: guestId,
                name: name.trim(),
                type: 'guest'
            },
            group
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getGroups,
    getGroupById,
    createGroup,
    updateGroup,
    deleteGroup,
    joinGroupByCode,
    addGuestMember
};
