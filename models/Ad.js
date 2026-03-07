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
    pendingDescription: {
        type: String
    },
    pendingImages: {
        type: [String]
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
    trafficLink: {
        type: String
    },
    trafficButtonType: {
        type: String
    },
    promoteTag: {
        type: String,
        default: 'All'
    },
    targetLocations: {
        type: [String]
    },
    promoteDuration: {
        type: Number
    },
    promoteStartDate: {
        type: Date
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
        enum: ['active', 'pending', 'rejected', 'expired', 'notification', 'pause', 'review', 'atv_msg', 'unatv_msg', 'deleted', 'inactive'],
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
    dailyDeliveryCount: {
        type: Number,
        default: 0
    },
    lastDeliveryDate: {
        type: Date,
        default: Date.now
    },
    promotedDeliveryCount: {
        type: Number,
        default: 0
    },
    dailyViewsCount: {
        type: Number,
        default: 0
    },
    lastViewsDate: {
        type: Date,
        default: Date.now
    },
    promotedViews: {
        type: Number,
        default: 0
    },
    price: {
        type: Number
    },
    priceType: {
        type: String,
        enum: ['Negotiable', 'Fixed'],
        default: 'Negotiable'
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
    },
    features: {
        type: Object, // Store as key-value pairs
        default: {}
    },
    userUpdated: {
        type: Boolean,
        default: false
    },
    userNewPhotos: {
        type: Boolean,
        default: false
    },
    promotionHistory: [{
        startDate: Date,
        endDate: Date,
        adType: String,
        promoteType: String,
        promoteTag: String,
        budget: Number,
        views: Number,
        deliveryCount: Number,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

adSchema.index({ status: 1, createdAt: -1 });
adSchema.index({ category: 1, status: 1 });
adSchema.index({ location: 1, status: 1 });
adSchema.index({ headline: 'text', description: 'text' });
adSchema.index({ adType: 1, createdAt: -1 });

function arrayLimit(val) {
    return val.length <= 5;
}

module.exports = mongoose.model('Ad', adSchema);
