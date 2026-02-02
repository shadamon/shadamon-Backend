const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    headline: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: false
    },
    subCategory: {
        type: String
    },
    location: {
        type: String,
        required: false
    },
    subLocation: {
        type: String
    },
    phone: {
        type: String,
        required: false
    },
    phoneTypes: {
        type: [String], // ['whatsapp', 'telegram', 'call']
        default: ['call']
    },
    hidePhone: {
        type: Boolean,
        default: false
    },
    additionalPhones: [{
        number: String,
        types: [String] // ['whatsapp', 'telegram', 'call']
    }],
    url: {
        type: String
    },
    actionType: {
        type: String,
        enum: ['detail', 'click'],
        default: 'detail'
    },
    images: {
        type: [String], // Array of image URLs/paths
        validate: [arrayLimit, '{PATH} exceeds the limit of 5']
    },
    adType: {
        type: String,
        default: 'Free'
    },
    // Promotion Details
    promoteType: {
        type: String,
        enum: ['call_msg', 'traffic']
    },
    targetLocations: {
        type: [String]
    },
    promoteDuration: {
        type: Number
    },
    promoteEndDate: {
        type: Date
    },
    promoteBudget: {
        type: Number
    },
    estimatedReach: {
        type: String
    },
    status: {
        type: String,
        enum: ['active', 'pending', 'rejected', 'expired', 'notification', 'pause', 'review', 'atv_msg', 'unatv_msg'],
        default: 'active'
    },
    views: {
        type: Number,
        default: 0
    },
    deliveryCount: {
        type: Number,
        default: 0
    },
    targetValue: {
        type: Number,
        default: 0
    },
    price: {
        type: Number
    },
    merchantID: {
        type: String
    },
    pwrTarget: {
        type: [String] // Array of colors like ['red', 'yellow', 'green', 'blue']
    },
    targetD: {
        type: String
    },
    notificationDialogue: {
        type: String
    },
    showTill: {
        type: Date
    },
    rep: {
        type: String
    },
    lgs: {
        type: String
    },
    senBy: {
        type: String
    },
    edBy: {
        type: String
    },
    note: {
        type: String
    },
    photoStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    }
}, { timestamps: true });

function arrayLimit(val) {
    return val.length <= 5;
}

module.exports = mongoose.model('Ad', adSchema);
