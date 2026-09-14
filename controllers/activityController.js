const Activity = require('../models/Activity');

// @desc    Get user activities
// @route   GET /api/activities
// @access  Private
exports.getActivities = async (req, res) => {
    try {
        const activities = await Activity.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json({
            success: true,
            count: activities.length,
            data: activities
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
