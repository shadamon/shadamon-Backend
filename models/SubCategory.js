const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    feature: { type: mongoose.Schema.Types.ObjectId, ref: 'Feature' },
    buttonType: { type: String },
    freePost: { type: String },
    order: { type: Number, default: 0 },
    status: { type: Boolean, default: true },
    image: { type: String },
    tags: [{ type: String }],
    createdBy: {
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
        adminName: String
    }
}, { timestamps: true });

module.exports = mongoose.model('SubCategory', subCategorySchema);
