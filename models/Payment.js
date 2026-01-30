const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ad: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ad'
    },
    amount: {
        type: Number,
        required: true
    },
    method: {
        type: String,
        required: true
    },
    transactionId: {
        type: String,
        required: true
    },
    description: {
        type: String // e.g., "Post ID : 55241778, TId : dfgdgfgg52548"
    },
    validTill: {
        type: Date
    },
    result: {
        type: String // e.g. "8420 views"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Payment', PaymentSchema);
