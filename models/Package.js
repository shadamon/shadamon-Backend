const mongoose = require('mongoose');

const PackageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    packageType: {
        type: String,
        enum: ['Trial', 'Basic', 'Standard', 'Premium', 'Platinum', 'VIP'],
        default: 'Basic'
    },
    oldPrice: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        required: true
    },
    total_connects: {
        type: Number,
        required: true
    },
    maxProfileView: {
        type: Number,
        default: 0
    },
    validDays: {
        type: Number,
        default: 30
    },
    bestValueSuggestion: {
        type: Boolean,
        default: false
    },
    checkedFeatures: {
        type: [String],
        default: []
    },
    uncheckedFeatures: {
        type: [String],
        default: []
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Package', PackageSchema);
