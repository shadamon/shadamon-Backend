const Ad = require('../models/Ad');
const Category = require('../models/Category');
const Location = require('../models/Location');
const fs = require('fs');
const path = require('path');

const User = require('../models/User'); // Import User model

// @route   POST api/ads
// @desc    Create a new ad
// @access  Private
exports.createAd = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.verifiedBy === 'Not Verified') {
            return res.status(403).json({
                success: false,
                message: 'Account not verified. Please verify your account to post ads.'
            });
        }

        const {
            headline,
            description,
            category,
            subCategory,
            location,
            subLocation,
            phone,
            hidePhone,
            url,
            actionType
        } = req.body;

        if (!phone) {
            return res.status(400).json({ success: false, message: 'Phone number is required' });
        }

        // Process images
        const imagePaths = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

        const newAd = new Ad({
            user: req.user.id, // From auth middleware
            headline,
            description,
            category,
            subCategory,
            location,
            subLocation,
            phone,
            phoneTypes: req.body.phoneTypes ? JSON.parse(req.body.phoneTypes) : ['call'],
            hidePhone: hidePhone === 'true' || hidePhone === true,
            additionalPhones: req.body.additionalPhones ? JSON.parse(req.body.additionalPhones) : [],
            url,
            actionType,
            images: imagePaths,
            adType: 'Free',
            status: 'active'
        });

        const ad = await newAd.save();

        // Increment Category Post Count
        await Category.findOneAndUpdate(
            { name: category },
            { $inc: { postCount: 1 } }
        );

        // Increment Location Post Count
        await Location.findOneAndUpdate(
            { name: location },
            { $inc: { postCount: 1 } }
        );

        res.status(201).json({
            success: true,
            message: 'Ad posted successfully',
            data: ad
        });
    } catch (err) {
        console.error("Error creating ad:", err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   GET api/ads/admin/all
// @desc    Get all ads for admin (can filter by adType='Promoted' to get promoted only)
// @access  Private (Admin)
exports.getAllAdsAdmin = async (req, res) => {
    try {
        const { adType } = req.query;
        let query = {};
        if (adType) {
            query.adType = adType;
        }

        const ads = await Ad.find(query)
            .populate('user', 'name email mobile') // Populate user details
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: ads.length,
            data: ads
        });
    } catch (err) {
        console.error("Error fetching ads:", err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   GET api/ads/admin/promoted
// @desc    Get all promoted ads for admin
// @access  Private (Admin)
exports.getAllPromotedAdsAdmin = async (req, res) => {
    try {
        const ads = await Ad.find({ adType: 'Promoted' })
            .populate('user', 'name email mobile')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: ads.length,
            data: ads
        });
    } catch (err) {
        console.error("Error fetching promoted ads:", err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   PUT api/ads/admin/:id/status
// @desc    Update ad status
// @access  Private (Admin)
exports.updateAdStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!['active', 'pending', 'rejected', 'expired'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const ad = await Ad.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!ad) {
            return res.status(404).json({ success: false, message: 'Ad not found' });
        }

        res.json({
            success: true,
            message: `Ad status updated to ${status}`,
            data: ad
        });
    } catch (err) {
        console.error("Error updating ad status:", err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   DELETE api/ads/admin/:id/image
// @desc    Remove specific image from ad
// @access  Private (Admin)
exports.deleteAdImage = async (req, res) => {
    try {
        const { imageUrl } = req.body;
        const adId = req.params.id;

        const ad = await Ad.findById(adId);
        if (!ad) {
            return res.status(404).json({ success: false, message: 'Ad not found' });
        }

        // Remove from database array
        const newImages = ad.images.filter(img => img !== imageUrl);

        if (newImages.length === ad.images.length) {
            return res.status(400).json({ success: false, message: 'Image not found in ad' });
        }

        ad.images = newImages;
        await ad.save();

        // Optionally delete file from filesystem
        // Extract filename from URL: /uploads/filename.jpg
        const filename = imageUrl.split('/uploads/')[1];
        if (filename) {
            const filePath = path.join(__dirname, '../uploads', filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        res.json({
            success: true,
            message: 'Image removed successfully',
            data: ad
        });
    } catch (err) {
        console.error("Error removing image:", err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   PUT api/ads/admin/:id/update
// @desc    Update ad details by admin
// @access  Private (Admin)
exports.updateAdDetails = async (req, res) => {
    try {
        const {
            headline,
            description,
            category,
            subCategory,
            location,
            subLocation,
            phone,
            phoneTypes,
            hidePhone,
            additionalPhones,
            url,
            actionType,
            adType,
            price,
            merchantID,
            pwrTarget,
            targetD,
            notificationDialogue,
            showTill,
            rep,
            lgs,
            senBy,
            edBy,
            note,
            targetValue,
            photoStatus,
            status
        } = req.body;

        const ad = await Ad.findById(req.params.id);
        if (!ad) {
            return res.status(404).json({ success: false, message: 'Ad not found' });
        }

        // Update fields
        if (headline) ad.headline = headline;
        if (description) ad.description = description;
        if (category) ad.category = category;
        if (subCategory !== undefined) ad.subCategory = subCategory;
        if (location) ad.location = location;
        if (subLocation !== undefined) ad.subLocation = subLocation;
        if (phone) ad.phone = phone;
        if (phoneTypes) ad.phoneTypes = typeof phoneTypes === 'string' ? JSON.parse(phoneTypes) : phoneTypes;
        if (hidePhone !== undefined) ad.hidePhone = hidePhone === 'true' || hidePhone === true;
        if (additionalPhones) ad.additionalPhones = typeof additionalPhones === 'string' ? JSON.parse(additionalPhones) : additionalPhones;
        if (url !== undefined) ad.url = url;
        if (actionType) ad.actionType = actionType;
        if (adType) ad.adType = adType;
        if (price !== undefined) ad.price = price;
        if (merchantID !== undefined) ad.merchantID = merchantID;
        if (pwrTarget !== undefined) ad.pwrTarget = typeof pwrTarget === 'string' ? JSON.parse(pwrTarget) : pwrTarget;
        if (targetD !== undefined) ad.targetD = targetD;
        if (notificationDialogue !== undefined) ad.notificationDialogue = notificationDialogue;
        if (showTill !== undefined) ad.showTill = showTill;
        if (rep !== undefined) ad.rep = rep;
        if (lgs !== undefined) ad.lgs = lgs;
        if (senBy !== undefined) ad.senBy = senBy;
        if (edBy !== undefined) ad.edBy = edBy;
        if (note !== undefined) ad.note = note;
        if (targetValue !== undefined) ad.targetValue = targetValue;
        if (photoStatus !== undefined) ad.photoStatus = photoStatus;
        if (status !== undefined) ad.status = status;

        // Process images if uploaded
        if (req.files && req.files.length > 0) {
            const newImagePaths = req.files.map(file => `/uploads/${file.filename}`);
            ad.images = [...ad.images, ...newImagePaths].slice(0, 5);
        }

        await ad.save();

        res.json({
            success: true,
            message: 'Ad updated successfully',
            data: ad
        });
    } catch (err) {
        console.error("Error updating ad details:", err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   GET api/ads/public/all
// @desc    Get all active ads for public feed and increment views
// @access  Public
exports.getAllAdsPublic = async (req, res) => {
    try {
        // Fetch active ads sorted by date (newest first)
        const ads = await Ad.find({ status: 'active' })
            .populate('user', 'name storeName photo photoStatus createdAt verifiedBy')
            .sort({ createdAt: -1 });

        // Increment views for these ads (Impression counting)
        if (ads.length > 0) {
            const adIds = ads.map(ad => ad._id);
            await Ad.updateMany(
                { _id: { $in: adIds } },
                { $inc: { deliveryCount: 1 } }
            );
        }

        res.json({
            success: true,
            count: ads.length,
            data: ads
        });
    } catch (err) {
        console.error("Error fetching public ads:", err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   GET api/ads/public/:id
// @desc    Get single public ad
// @access  Public
exports.getSingleAdPublic = async (req, res) => {
    try {
        const ad = await Ad.findById(req.params.id)
            .populate('user', 'name storeName photo photoStatus verifiedBy');

        if (!ad) {
            return res.status(404).json({ success: false, message: 'Ad not found' });
        }

        // Increment view 
        await Ad.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

        // Return ad with updated view count locally? No need, just return data.
        // Or if user wants to see updated view count immediately:
        ad.views += 1;

        res.json({
            success: true,
            data: ad
        });
    } catch (err) {
        console.error("Error fetching single ad:", err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
// @route   GET api/ads/me
// @desc    Get all ads for logged-in user
// @access  Private
exports.getMyAds = async (req, res) => {
    try {
        const ads = await Ad.find({ user: req.user.id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: ads.length,
            data: ads
        });
    } catch (err) {
        console.error("Error fetching user ads:", err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   PUT api/ads/:id
// @desc    Update an ad by its owner
// @access  Private
exports.updateMyAd = async (req, res) => {
    try {
        const ad = await Ad.findOne({ _id: req.params.id, user: req.user.id });
        if (!ad) {
            return res.status(404).json({ success: false, message: 'Ad not found or unauthorized' });
        }

        const {
            headline,
            description,
            category,
            subCategory,
            location,
            subLocation,
            phone,
            phoneTypes,
            hidePhone,
            additionalPhones,
            url,
            actionType
        } = req.body;

        // Update fields
        if (headline) ad.headline = headline;
        if (description) ad.description = description;
        if (category) ad.category = category;
        if (subCategory !== undefined) ad.subCategory = subCategory;
        if (location) ad.location = location;
        if (subLocation !== undefined) ad.subLocation = subLocation;
        if (phone) ad.phone = phone;
        if (phoneTypes) ad.phoneTypes = phoneTypes;
        if (hidePhone !== undefined) ad.hidePhone = hidePhone;
        if (additionalPhones) ad.additionalPhones = additionalPhones;
        if (url !== undefined) ad.url = url;
        if (actionType) ad.actionType = actionType;

        await ad.save();

        res.json({
            success: true,
            message: 'Ad updated successfully',
            data: ad
        });
    } catch (err) {
        console.error("Error updating user ad:", err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   DELETE api/ads/:id
// @desc    Delete an ad by its owner
// @access  Private
exports.deleteMyAd = async (req, res) => {
    try {
        const ad = await Ad.findOne({ _id: req.params.id, user: req.user.id });
        if (!ad) {
            return res.status(404).json({ success: false, message: 'Ad not found or unauthorized' });
        }

        // Remove images from filesystem
        if (ad.images && ad.images.length > 0) {
            ad.images.forEach(imageUrl => {
                const filename = imageUrl.split('/uploads/')[1];
                if (filename) {
                    const filePath = path.join(__dirname, '../uploads', filename);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }
            });
        }

        await ad.deleteOne();

        res.json({
            success: true,
            message: 'Ad deleted successfully'
        });
    } catch (err) {
        console.error("Error deleting user ad:", err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   PUT api/ads/:id/promote
// @desc    Promote an ad
// @access  Private
exports.promoteAd = async (req, res) => {
    try {
        const {
            promoteType,
            targetLocations,
            promoteDuration,
            promoteEndDate,
            promoteBudget,
            estimatedReach
        } = req.body;

        const ad = await Ad.findOne({ _id: req.params.id, user: req.user.id });

        if (!ad) {
            return res.status(404).json({ success: false, message: 'Ad not found or unauthorized' });
        }

        // Update ad fields
        ad.adType = 'Promoted';
        ad.promoteType = promoteType;
        ad.targetLocations = targetLocations;
        ad.promoteDuration = promoteDuration;
        ad.promoteEndDate = promoteEndDate;
        ad.promoteBudget = promoteBudget;
        ad.estimatedReach = estimatedReach;

        await ad.save();

        res.json({
            success: true,
            message: 'Ad promoted successfully',
            data: ad
        });
    } catch (err) {
        console.error("Error promoting ad:", err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
// @route   POST api/ads/admin/create
// @desc    Create ad by admin
// @access  Private (Admin)
exports.createAdAdmin = async (req, res) => {
    try {
        const {
            userMobile, // Admin might provide user mobile to link post
            headline,
            description,
            category,
            subCategory,
            location,
            subLocation,
            phone,
            phoneTypes,
            hidePhone,
            url,
            actionType,
            adType,
            price,
            merchantID,
            showTill,
            note
        } = req.body;

        // Find user by mobile or use a default admin user ID if provided
        let targetUser = await User.findOne({ mobile: userMobile || phone });
        if (!targetUser) {
            // If user not found, we might want to fail or use the admin's ID
            // For now, let's require a valid user mobile or handle it as needed
            // return res.status(404).json({ success: false, message: 'Owner user not found' });
            // Let's assume the admin provides a valid phone number from a registered user
        }

        // Process images
        const imagePaths = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

        const newAd = new Ad({
            user: targetUser ? targetUser._id : (req.admin ? req.admin.id : null),
            headline,
            description,
            category,
            subCategory,
            location,
            subLocation,
            phone,
            phoneTypes: phoneTypes ? (typeof phoneTypes === 'string' ? JSON.parse(phoneTypes) : phoneTypes) : ['call'],
            hidePhone: hidePhone === 'true' || hidePhone === true,
            url,
            actionType,
            images: imagePaths,
            adType: adType || 'Free',
            price,
            merchantID,
            showTill,
            note,
            status: req.body.status || 'active'
        });

        const ad = await newAd.save();

        // Increment Category Post Count
        await Category.findOneAndUpdate(
            { name: category },
            { $inc: { postCount: 1 } }
        );

        // Increment Location Post Count
        await Location.findOneAndUpdate(
            { name: location },
            { $inc: { postCount: 1 } }
        );

        res.status(201).json({
            success: true,
            message: 'Ad created successfully by admin',
            data: ad
        });
    } catch (err) {
        console.error("Error creating ad by admin:", err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   DELETE api/ads/admin/:id
// @desc    Delete ad by admin
// @access  Private (Admin)
exports.deleteAdAdmin = async (req, res) => {
    try {
        const ad = await Ad.findById(req.params.id);
        if (!ad) {
            return res.status(404).json({ success: false, message: 'Ad not found' });
        }

        // Remove images from filesystem
        if (ad.images && ad.images.length > 0) {
            ad.images.forEach(imageUrl => {
                const filename = imageUrl.split('/uploads/')[1];
                if (filename) {
                    const filePath = path.join(__dirname, '../uploads', filename);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }
            });
        }

        await ad.deleteOne();

        res.json({
            success: true,
            message: 'Ad deleted successfully by admin'
        });
    } catch (err) {
        console.error("Error deleting ad by admin:", err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
