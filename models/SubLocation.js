const mongoose = require('mongoose');

const subLocationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    subLocationNameBn: { type: String, trim: true, default: '' },
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
    mapLink: { type: String },
    order: { type: Number, default: 0 },
    status: { type: Boolean, default: true },
    image: { type: String },
    createdAt: { type: Date, default: Date.now },
    createdBy: {
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
        adminName: String
    }
}, { timestamps: true });

module.exports = mongoose.model('SubLocation', subLocationSchema);
