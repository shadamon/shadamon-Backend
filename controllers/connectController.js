const ConnectLog = require('../models/ConnectLog');
const User = require('../models/User');

exports.deductConnect = async (req, res) => {
    try {
        const { actionType, amountSpent, targetUserId } = req.body;
        const userId = req.user.id; // from auth middleware

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.connectsBalance < amountSpent) {
            return res.status(400).json({ success: false, message: "Insufficient connects balance" });
        }

        // Deduct balance
        user.connectsBalance -= amountSpent;
        await user.save();

        // Create log
        const log = new ConnectLog({
            userId,
            actionType,
            amountSpent,
            targetUserId
        });
        await log.save();

        res.status(200).json({ success: true, message: "Connect deducted successfully", balance: user.connectsBalance });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getConnectLogs = async (req, res) => {
    try {
        // Admin or user route. Admin could pass ?userId= to filter
        const filter = {};
        if (req.query.userId) {
            filter.userId = req.query.userId;
        }

        const logs = await ConnectLog.find(filter)
            .populate('userId', 'name email mobile')
            .populate('targetUserId', 'name email mobile')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: logs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
