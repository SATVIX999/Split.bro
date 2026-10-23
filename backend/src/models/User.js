const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    userId: {
        type: String,
        required: [true, 'User ID is required'],
        unique: true,
        uppercase: true,
        trim: true,
        minlength: [3, 'User ID must be at least 3 characters'],
        maxlength: [20, 'User ID cannot exceed 20 characters']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
        select: false
    },
    avatar: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: 'Split Bro member'
    },
    upiId: {
        type: String,
        trim: true,
        default: ''
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    }
}, {
    timestamps: true,
    toJSON: {
        transform(doc, ret) {
            delete ret.password;
            delete ret.__v;
            return ret;
        }
    }
});

userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.statics.generateUserId = async function(name) {
    const clean = name.trim().replace(/\s+/g, '').toUpperCase().substring(0, 6);
    let number = 1;
    let candidate = `${clean}${String(number).padStart(2, '0')}`;
    while (await this.findOne({ userId: candidate })) {
        number++;
        candidate = `${clean}${String(number).padStart(2, '0')}`;
    }
    return candidate;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
