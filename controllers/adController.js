const Ad = require('../models/Ad');
const Category = require('../models/Category');
const Location = require('../models/Location');
const fs = require('fs');
const path = require('path');
// Removed unused imageHelper import

const User = require('../models/User'); // Import User model
const PromotionPlan = require('../models/PromotionPlan'); // Import PromotionPlan model

// @route   POST api/ads
// @desc    Create a new ad
// @access  Public (Optional Auth)
exports.createAd = async (req, res) => {
    try {
        // Optional: Associate with user if logged in
        let userId = null;
        if (req.user) {
            const user = await User.findById(req.user.id);
            if (user) {
                userId = user._id;
                // Removed verification check as per requirement
            }
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
            actionType,
            price,
            priceType,
            features
        } = req.body;

        if (!phone) {
            return res.status(400).json({ success: false, message: 'Phone number is required' });
        }

        // Process images
        // Process images
        let imagePaths = req.files ? req.files.map(file => file.path.replace(/\\/g, "/")) : [];
        // Removed base64 image processing

        const newAd = new Ad({
            user: userId, // Can be null now
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
            price,
            priceType,
            features: features ? (typeof features === 'string' ? JSON.parse(features) : features) : {},
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
            .populate('user', 'name email mobile storeLogo storeBanner merchantType') // Populate user details
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
            .populate('user', 'name email mobile storeLogo storeBanner merchantType')
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

        // Delete file from filesystem
        if (imageUrl && !imageUrl.startsWith('data:') && !imageUrl.startsWith('http')) {
            const filePath = path.join(__dirname, '..', imageUrl);
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
            priceType,
            status,
            features
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
        if (priceType !== undefined) ad.priceType = priceType;
        if (status !== undefined) ad.status = status;
        if (features !== undefined) ad.features = typeof features === 'string' ? JSON.parse(features) : features;

        // Process images: Combine remaining (existing) images + new uploads
        let currentImages = [];
        if (req.body.remainingImages) {
            try {
                const remaining = typeof req.body.remainingImages === 'string'
                    ? JSON.parse(req.body.remainingImages)
                    : req.body.remainingImages;
                if (Array.isArray(remaining)) {
                    currentImages = remaining;
                }
            } catch (e) {
                console.error("Error parsing remainingImages", e);
            }
        } else {
            // If remainingImages is NOT provided, assume we keep all existing images?
            // Or if this is coming from a form that always sends remainingImages, absence means empty?
            // For safety, if not provided, keep formatted ad.images.
            // But usually frontend sends it. Let's assume append mode if not provided, for backward compatibility.
            currentImages = ad.images;
        }

        const oldImages = ad.images;
        let newAdImages = [];

        if (req.files && req.files.length > 0) {
            const newImagePaths = req.files.map(file => file.path.replace(/\\/g, "/"));
            newAdImages = [...currentImages, ...newImagePaths].slice(0, 5);
        } else {
            // No new files, just update with remaining images (deletion case)
            if (req.body.remainingImages) {
                newAdImages = currentImages.slice(0, 5);
            } else {
                newAdImages = ad.images;
            }
        }

        ad.images = newAdImages;

        // Delete removed images from filesystem
        if (oldImages && oldImages.length > 0) {
            const deletedImages = oldImages.filter(img => !newAdImages.includes(img));
            deletedImages.forEach(img => {
                if (img && !img.startsWith('data:') && !img.startsWith('http')) {
                    const filePath = path.join(__dirname, '..', img);
                    fs.unlink(filePath, (err) => {
                        if (err && err.code !== 'ENOENT') console.error("Failed to delete old image:", err);
                    });
                }
            });
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
        const { category, subCategory, location, subLocation, promoteTag, sort, search, limit } = req.query;

        let query = { status: 'active' };

        if (category) query.category = category;
        if (subCategory) query.subCategory = subCategory;
        if (location) query.location = location;
        if (subLocation) query.subLocation = subLocation;
        if (promoteTag && promoteTag !== 'All') {
            query.promoteTag = promoteTag;
            query.adType = 'Promoted';
        }

        if (search) {
            const searchRegex = new RegExp(search.split(/\s+/).filter(Boolean).join('|'), 'i');
            query.$or = [
                { headline: searchRegex },
                { description: searchRegex }
            ];
        }

        let sortQuery = {};
        if (search) {
            // Priority to promoted ads when searching
            sortQuery = { adType: 1, createdAt: -1 };
        } else {
            sortQuery = { createdAt: -1 };
        }

        if (sort === 'oldest') sortQuery = { createdAt: 1 };
        else if (sort === 'price-high') sortQuery = { price: -1 };
        else if (sort === 'price-low') sortQuery = { price: 1 };

        // Fetch active ads
        let adsQuery = Ad.find(query)
            .select('headline price images location subLocation category subCategory createdAt deliveryCount user adType')
            .populate('user', 'name storeName photo photoStatus storeLogo storeBanner merchantType createdAt verifiedBy')
            .sort(sortQuery);

        if (limit) {
            adsQuery = adsQuery.limit(parseInt(limit));
        }

        const ads = await adsQuery;

        // Map ads to only include the first image in the response to save bandwidth
        const optimizedAds = ads.map(ad => {
            const adObj = ad.toObject();
            if (adObj.images && adObj.images.length > 0) {
                adObj.images = [adObj.images[0]]; // Only send first image for list/suggestion view
            }
            return adObj;
        });

        // Increment views for these ads (Impression counting)
        if (ads.length > 0) {
            const adIds = ads.map(ad => ad._id);
            // Non-blocking update (don't await)
            Ad.updateMany(
                { _id: { $in: adIds } },
                { $inc: { deliveryCount: 1 } }
            ).catch(err => console.error("Error updating delivery counts:", err));
        }

        res.json({
            success: true,
            count: optimizedAds.length,
            data: optimizedAds
        });
    } catch (err) {
        console.error("Error fetching public ads:", err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   GET api/ads/public/count
// @desc    Get count of active ads based on filters
// @access  Public
exports.getAdsCount = async (req, res) => {
    try {
        const { category, subCategory, location, subLocation, promoteTag } = req.query;

        let query = { status: 'active' };

        if (category) query.category = category;
        if (subCategory) query.subCategory = subCategory;
        if (location) query.location = location;
        if (subLocation) query.subLocation = subLocation;
        if (promoteTag && promoteTag !== 'All') {
            query.promoteTag = promoteTag;
            query.adType = 'Promoted';
        }

        const count = await Ad.countDocuments(query);

        res.json({
            success: true,
            count: count
        });
    } catch (err) {
        console.error("Error fetching ad count:", err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   GET api/ads/public/:id
// @desc    Get single public ad
// @access  Public
exports.getSingleAdPublic = async (req, res) => {
    try {
        const ad = await Ad.findById(req.params.id)
            .populate('user', 'name storeName photo photoStatus storeLogo storeBanner merchantType verifiedBy');

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
            actionType,
            price,
            priceType,
            features
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
        if (price !== undefined) ad.price = price;
        if (priceType !== undefined) ad.priceType = priceType;
        if (features !== undefined) ad.features = typeof features === 'string' ? JSON.parse(features) : features;

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
            ad.images.forEach(img => {
                if (img && !img.startsWith('data:') && !img.startsWith('http')) {
                    const filePath = path.join(__dirname, '..', img);
                    fs.unlink(filePath, (err) => {
                        if (err && err.code !== 'ENOENT') console.error("Failed to delete image:", err);
                    });
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
            note,
            features
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
        // Process images
        let imagePaths = req.files ? req.files.map(file => file.path.replace(/\\/g, "/")) : [];
        // Removed base64 image processing

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
            features: features ? (typeof features === 'string' ? JSON.parse(features) : features) : {},
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
            ad.images.forEach(img => {
                if (img && !img.startsWith('data:') && !img.startsWith('http')) {
                    const filePath = path.join(__dirname, '..', img);
                    fs.unlink(filePath, (err) => {
                        if (err && err.code !== 'ENOENT') console.error("Failed to delete image:", err);
                    });
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

// @route   GET api/ads/public/promotion-plans
// @desc    Get all promotion plans for public use
// @access  Public
exports.getAllPromotionPlansPublic = async (req, res) => {
    try {
        const plans = await PromotionPlan.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            data: plans
        });
    } catch (err) {
        console.error("Error fetching promotion plans:", err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
