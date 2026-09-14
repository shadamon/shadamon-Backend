const ProfileView = require('../models/ProfileView');

exports.logProfileView = async (req, res) => {
    try {
        const { viewedProfileId } = req.body;
        const viewerId = req.user.id;

        // Prevent self-view logging
        if (viewerId === viewedProfileId) {
            return res.status(200).json({ success: true, message: "Self view, not logged." });
        }

        // Optional: Check if already viewed recently to prevent spamming
        const recentView = await ProfileView.findOne({
            viewerId,
            viewedProfileId,
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // within last 24h
        });

        if (!recentView) {
            const view = new ProfileView({ viewerId, viewedProfileId });
            await view.save();
            
            // Also increment the views count on the user document
            const User = require('../models/User');
            await User.findByIdAndUpdate(viewedProfileId, { $inc: { profileViews: 1 } });
        }

        res.status(200).json({ success: true, message: "Profile view logged" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getProfileViews = async (req, res) => {
    try {
        const userId = req.user.id;
        const views = await ProfileView.find({ viewedProfileId: userId })
            .populate('viewerId', 'name photo storeName')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: views });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
