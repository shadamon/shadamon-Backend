const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    dob: {
        type: Date
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'Male', 'Female', 'Other', ''],
    },
    additionalMobiles: {
        type: [String],
        default: []
    },
    mobile: {
        type: String
    },
    storeName: {
        type: String
    },
    actionType: {
        type: String,
        enum: ['call', 'chat', 'both'],
        default: 'call'
    },
    accountStatus: {
        type: String,
        enum: ['active', 'inactive', 'review', 'active_message', 'inactive_message', 'r_delete'],
        default: 'review'
    },
    verifiedBy: {
        type: String,
        default: 'Not Verified'
    },
    location: {
        type: String
    },
    category: {
        type: String
    },
    pageName: {
        type: String
    },
    merchantType: {
        type: String,
        enum: ['Free', 'Premium', 'Free Saller'],
        default: 'Free'
    },
    storeLogo: {
        type: String // Base64 or URL
    },
    storeLogoStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    storeBanner: {
        type: String // Base64 or URL
    },
    storeBannerStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    photo: {
        type: String // Base64 or URL
    },
    photoStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
UserSchema.pre('save', async function () {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', UserSchema);
