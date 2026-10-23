const mongoose = require('mongoose');
const crypto = require('crypto');

const groupMemberSchema = new mongoose.Schema({
    memberId: {
        type: String,
        required: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['registered', 'guest'],
        default: 'registered'
    },
    userId: {
        type: String,
        trim: true,
        default: null
    },
    joinedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const groupSchema = new mongoose.Schema({
    groupId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    groupName: {
        type: String,
        required: [true, 'Group name is required'],
        trim: true,
        minlength: [2, 'Group name must be at least 2 characters'],
        maxlength: [80, 'Group name cannot exceed 80 characters']
    },
    groupCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true
    },
    category: {
        type: String,
        enum: ['Trip', 'Home', 'Couple', 'Project', 'Other'],
        default: 'Trip'
    },
    description: {
        type: String,
        default: ''
    },
    createdBy: {
        type: String,
        required: [true, 'Created by is required'],
        trim: true
    },
    members: {
        type: [groupMemberSchema],
        validate: {
            validator: function(members) {
                return Array.isArray(members) && members.length >= 1;
            },
            message: 'A group must have at least one member.'
        }
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform(doc, ret) {
            delete ret.__v;
            delete ret.id;
            return ret;
        }
    },
    toObject: { virtuals: true }
});

groupSchema.virtual('creatorProfile', {
    ref: 'User',
    localField: 'createdBy',
    foreignField: 'userId',
    justOne: true
});

groupSchema.statics.generateGroupCode = async function() {
    let code;
    do {
        code = crypto.randomBytes(3).toString('hex').toUpperCase();
    } while (await this.findOne({ groupCode: code }));
    return code;
};

groupSchema.statics.generateGroupId = function() {
    return `GRP${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
};

const Group = mongoose.model('Group', groupSchema);
module.exports = Group;
