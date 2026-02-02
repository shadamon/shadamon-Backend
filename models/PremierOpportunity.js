const mongoose = require('mongoose');

const premierOpportunitySchema = new mongoose.Schema({
    verifyBadgePrice: { type: Number, default: 200 },
    verifyBadgeDuration: { type: String, default: 'Year' }, // e.g. Year
    highlightPostPrice: { type: Number, default: 300 },
    addLabelPrice: { type: Number, default: 100 },
    freeAdCredit: { type: Number, default: 200 }
}, { timestamps: true });

module.exports = mongoose.model('PremierOpportunity', premierOpportunitySchema);
