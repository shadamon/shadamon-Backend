const mongoose = require('mongoose');

const featureSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    inputType: { type: String, default: 'Text' },
    order: { type: Number, default: 0 },
    status: { type: Boolean, default: true },
    buttonType: { type: String },
    boxFadeName: { type: String },
    buttonItemNames: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Feature', featureSchema);
