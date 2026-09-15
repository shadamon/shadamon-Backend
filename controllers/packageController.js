const Package = require('../models/Package');
const User = require('../models/User');

exports.createPackage = async (req, res) => {
    try {
        const { 
            name, packageType, oldPrice, price, total_connects, 
            maxProfileView, validDays, bestValueSuggestion, 
            checkedFeatures, uncheckedFeatures, isActive 
        } = req.body;
        
        const newPackage = new Package({ 
            name, packageType, oldPrice, price, total_connects, 
            maxProfileView, validDays, bestValueSuggestion, 
            checkedFeatures, uncheckedFeatures, isActive 
        });
        await newPackage.save();
        res.status(201).json({ success: true, data: newPackage });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPackages = async (req, res) => {
    try {
        const packages = await Package.find();
        res.status(200).json({ success: true, data: packages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updatePackage = async (req, res) => {
    try {
        const updatedPackage = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedPackage) return res.status(404).json({ success: false, message: "Package not found" });
        res.status(200).json({ success: true, data: updatedPackage });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deletePackage = async (req, res) => {
    try {
        const deletedPackage = await Package.findByIdAndDelete(req.params.id);
        if (!deletedPackage) return res.status(404).json({ success: false, message: "Package not found" });
        res.status(200).json({ success: true, message: "Package deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Manually update connects balance
exports.manualInject = async (req, res) => {
    try {
        const { userId, connects, note, validDays } = req.body;
        const adminId = req.user.id; // from auth middleware

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // Add connects
        user.connectsBalance = (user.connectsBalance || 0) + Number(connects);

        // Extend validity Date
        if (validDays) {
            const currentValidity = user.validityDate && user.validityDate > new Date() ? user.validityDate : new Date();
            user.validityDate = new Date(currentValidity.getTime() + Number(validDays) * 24 * 60 * 60 * 1000);
        }

        await user.save();

        // Create a transaction log
        const Transaction = require('../models/Transaction');
        const trx = new Transaction({
            tnxId: 'MNL-' + Date.now(),
            mode: 'Admin',
            sellerId: user._id,
            amount: 0, // Manual injection is usually free/admin action
            payType: 'Admin',
            payeeName: note || 'Manual Injection',
            item: `${connects} Connects Added`,
            status: 'VALID'
        });
        await trx.save();

        res.status(200).json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
