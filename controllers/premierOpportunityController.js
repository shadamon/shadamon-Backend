const PremierOpportunity = require('../models/PremierOpportunity');

exports.getSettings = async (req, res) => {
    try {
        let settings = await PremierOpportunity.findOne();
        if (!settings) {
            settings = await PremierOpportunity.create({
                verifyBadgePrice: 200,
                highlightPostPrice: 300,
                addLabelPrice: 100,
                freeAdCredit: 200
            });
        }
        res.json({ success: true, data: settings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const { verifyBadgePrice, highlightPostPrice, addLabelPrice, freeAdCredit } = req.body;

        // Find existing settings or create new one (Upsert style)
        let settings = await PremierOpportunity.findOne();

        if (settings) {
            settings.verifyBadgePrice = verifyBadgePrice !== undefined ? verifyBadgePrice : settings.verifyBadgePrice;
            settings.highlightPostPrice = highlightPostPrice !== undefined ? highlightPostPrice : settings.highlightPostPrice;
            settings.addLabelPrice = addLabelPrice !== undefined ? addLabelPrice : settings.addLabelPrice;
            settings.freeAdCredit = freeAdCredit !== undefined ? freeAdCredit : settings.freeAdCredit;
            await settings.save();
        } else {
            settings = await PremierOpportunity.create({
                verifyBadgePrice,
                highlightPostPrice,
                addLabelPrice,
                freeAdCredit
            });
        }

        res.json({ success: true, data: settings, message: 'Premier Settings updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
