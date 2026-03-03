const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Ad = require('../models/Ad');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const emailService = require('../utils/emailService');
const { fileToBase64, processImageString } = require('../utils/imageHelper');

// @desc    Admin login
// @route   POST /api/auth/login
// @access  Public
const loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: admin._id, role: admin.role, email: admin.email, staffName: admin.staffName || admin.email.split('@')[0] },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            token,
            admin: {
                id: admin._id,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all admins
// @route   GET /api/admins
// @access  Private (Admin)
const getAllAdmins = async (req, res) => {
    try {
        const admins = await Admin.find().select('-password');
        res.json(admins);
    } catch (err) {
        console.error('Error fetching admins:', err);
        res.status(500).json({ message: 'Database operation failed', error: err.message });
    }
};

// @desc    Create new admin
// @route   POST /api/admins
// @access  Private (Super Admin only)
const createAdmin = async (req, res) => {
    const { email, password, role, staffName, staffType, status } = req.body;

    try {
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Admin already exists' });
        }

        const newAdmin = new Admin({
            email,
            password,
            role: role || 'admin',
            staffName,
            staffType,
            status,
            permissions: req.body.permissions || {}
        });

        await newAdmin.save();
        res.status(201).json({
            message: 'Admin created successfully',
            admin: {
                id: newAdmin._id,
                email: newAdmin.email,
                role: newAdmin.role,
                staffName: newAdmin.staffName,
                staffType: newAdmin.staffType,
                status: newAdmin.status,
                createdAt: newAdmin.createdAt
            }
        });
    } catch (err) {
        console.error('Error adding admin:', err);
        res.status(500).json({ message: 'Database operation failed', error: err.message });
    }
};

// @desc    Delete admin
// @route   DELETE /api/admins/:id
// @access  Private (Super Admin only)
const deleteAdmin = async (req, res) => {
    try {
        await Admin.findByIdAndDelete(req.params.id);
        res.json({ message: 'Admin deleted' });
    } catch (err) {
        console.error('Error deleting admin:', err);
        res.status(500).json({ message: 'Database operation failed', error: err.message });
    }
};

// @desc    Update admin role
// @route   PUT /api/admins/:id
// @access  Private (Super Admin only)
const updateAdmin = async (req, res) => {
    const { email, role, staffName, staffType, status, password, permissions } = req.body;

    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        if (email) admin.email = email;
        if (role) admin.role = role;
        if (staffName !== undefined) admin.staffName = staffName;
        if (staffType) admin.staffType = staffType;
        if (status !== undefined) admin.status = status;
        if (password) admin.password = password; // Will be hashed by pre-save hook
        if (permissions) admin.permissions = permissions;

        await admin.save();
        res.json({
            message: 'Admin updated',
            admin: {
                id: admin._id,
                email: admin.email,
                role: admin.role,
                staffName: admin.staffName,
                staffType: admin.staffType,
                status: admin.status,
                updatedAt: admin.updatedAt
            }
        });
    } catch (err) {
        console.error('Error updating admin:', err);
        res.status(500).json({ message: 'Database operation failed', error: err.message });
    }
};

// @desc    Get total user count
// @route   GET /api/admins/users/count
// @access  Private (Admin)
const getUserCount = async (req, res) => {
    try {
        const count = await User.countDocuments();
        res.json({ count });
    } catch (err) {
        console.error('Error fetching user count:', err);
        res.status(500).json({ message: 'Database operation failed', error: err.message });
    }
};

// @desc    Get all users (for admin panel)
// @route   GET /api/admins/users
// @access  Private (Admin)
const getAllUsers = async (req, res) => {
    try {
        const {
            id,
            mobile,
            email,
            category,
            location,
            status,
            merchantType,
            dateFrom,
            dateTo
        } = req.query;

        let query = {};

        if (id && id.trim()) {
            if (mongoose.Types.ObjectId.isValid(id.trim())) {
                query._id = id.trim();
            } else {
                return res.json([]); // Invalid ObjectID
            }
        }

        if (mobile && mobile.trim()) {
            query.mobile = { $regex: mobile.trim(), $options: 'i' };
        }

        if (email && email.trim()) {
            query.email = { $regex: email.trim(), $options: 'i' };
        }

        if (category && category !== 'Select' && category !== 'Both' && category !== 'All') {
            query.category = category;
        }

        if (location && location !== 'Select' && location !== 'All') {
            query.location = location;
        }

        if (status && status !== 'Select') {
            query.accountStatus = status;
        }

        if (merchantType && merchantType !== 'both' && merchantType !== 'All') {
            if (merchantType === 'seller') {
                query.merchantType = { $in: ['Premium', 'Free Saller'] };
            } else if (merchantType === 'customer') {
                query.merchantType = 'Free';
            }
        }

        // Date filters for registration (createdAt)
        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
            if (dateTo) query.createdAt.$lte = new Date(dateTo);
        }

        const users = await User.find(query).select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Database operation failed', error: err.message });
    }
};

// @desc    Add new user (by admin)
// @route   POST /api/admins/users
// @access  Private (Admin)
const addUser = async (req, res) => {
    const {
        name, email, password, dob, gender, mobile, mobileVerified,
        storeName, accountStatus, verifiedBy,
        location, category, sellerPageUrl, merchantType,
        mVerified, merchantTrustStatus, rating,
        education, currentJob, jobExperience, note,
        additionalMobiles
    } = req.body;

    try {
        if (email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'User with this email already exists' });
            }
        }

        if (sellerPageUrl) {
            const existingUrl = await User.findOne({ sellerPageUrl });
            if (existingUrl) {
                return res.status(400).json({ message: 'Page Username already in use' });
            }
        }

        const newUser = new User({
            name, email, password, dob, gender, mobile,
            mobileVerified: mobileVerified === 'true' || mobileVerified === true,
            storeName, accountStatus, verifiedBy,
            location, category, sellerPageUrl, merchantType,
            mVerified: mVerified === 'true' || mVerified === true,
            merchantTrustStatus: merchantTrustStatus || 'Untrusted',
            rating: Number(rating) || 0,
            education, currentJob, jobExperience, note,
            additionalMobiles: Array.isArray(additionalMobiles) ? additionalMobiles : (additionalMobiles ? [additionalMobiles] : []),

            photo: req.files?.photo ? `uploads/${req.files.photo[0].filename}` : processImageString(req.body.photo),
            photoStatus: (req.files?.photo || req.body.photo) ? 'approved' : 'pending',
            storeLogo: req.files?.storeLogo ? `uploads/${req.files.storeLogo[0].filename}` : processImageString(req.body.storeLogo),
            storeLogoStatus: (req.files?.storeLogo || req.body.storeLogo) ? 'approved' : 'pending',
            storeBanner: req.files?.storeBanner ? `uploads/${req.files.storeBanner[0].filename}` : processImageString(req.body.storeBanner),
            storeBannerStatus: (req.files?.storeBanner || req.body.storeBanner) ? 'approved' : 'pending'
        });

        await newUser.save();
        res.status(201).json({
            message: 'User created successfully',
            user: { id: newUser._id, name: newUser.name, email: newUser.email }
        });
    } catch (err) {
        console.error('Error adding user:', err);
        res.status(500).json({ message: 'Database operation failed', error: err.message });
    }
};

// @desc    Update user (by admin)
// @route   PUT /api/admins/users/:id
// @access  Private (Admin)
const updateUser = async (req, res) => {
    const {
        name, email, dob, gender, mobile, mobileVerified,
        storeName, accountStatus, verifiedBy,
        location, category, sellerPageUrl, merchantType, password,
        storeLogoStatus, storeBannerStatus, photoStatus,
        mVerified, merchantTrustStatus, rating,
        education, currentJob, jobExperience, note,
        additionalMobiles
    } = req.body;

    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (sellerPageUrl && sellerPageUrl !== user.sellerPageUrl) {
            const existingUrl = await User.findOne({ sellerPageUrl });
            if (existingUrl) {
                return res.status(400).json({ message: 'Page Username already in use' });
            }
        }

        // Update fields
        if (name) user.name = name;
        if (email) user.email = email;
        if (dob) user.dob = dob;
        if (gender) user.gender = gender;
        if (mobile) user.mobile = mobile;
        if (mobileVerified !== undefined) user.mobileVerified = mobileVerified === 'true' || mobileVerified === true;
        if (storeName) user.storeName = storeName;
        if (accountStatus) user.accountStatus = accountStatus;
        if (verifiedBy) user.verifiedBy = verifiedBy;
        if (location !== undefined) user.location = location;
        if (category !== undefined) user.category = category;
        if (sellerPageUrl !== undefined) user.sellerPageUrl = sellerPageUrl;
        if (mVerified !== undefined) user.mVerified = mVerified === 'true' || mVerified === true;
        if (merchantTrustStatus) user.merchantTrustStatus = merchantTrustStatus;
        if (rating !== undefined) user.rating = Number(rating) || 0;
        if (education !== undefined) user.education = education;
        if (currentJob !== undefined) user.currentJob = currentJob;
        if (jobExperience !== undefined) user.jobExperience = jobExperience;
        if (note !== undefined) user.note = note;
        if (additionalMobiles !== undefined) {
            user.additionalMobiles = Array.isArray(additionalMobiles) ? additionalMobiles : (additionalMobiles ? [additionalMobiles] : []);
        }

        if (merchantType) user.merchantType = merchantType;
        if (storeLogoStatus) user.storeLogoStatus = storeLogoStatus;
        if (storeBannerStatus) user.storeBannerStatus = storeBannerStatus;
        if (photoStatus) user.photoStatus = photoStatus;

        // Process images
        if (req.files?.photo) {
            user.photo = `uploads/${req.files.photo[0].filename}`;
            user.photoStatus = 'approved';
        } else if (req.body.photo && req.body.photo.startsWith('data:image')) {
            const processed = processImageString(req.body.photo);
            if (processed) {
                user.photo = processed;
                user.photoStatus = 'approved';
            }
        }

        if (req.files?.storeLogo) {
            user.storeLogo = `uploads/${req.files.storeLogo[0].filename}`;
            user.storeLogoStatus = 'approved';
        } else if (req.body.storeLogo && req.body.storeLogo.startsWith('data:image')) {
            const processed = processImageString(req.body.storeLogo);
            if (processed) {
                user.storeLogo = processed;
                user.storeLogoStatus = 'approved';
            }
        }

        if (req.files?.storeBanner) {
            user.storeBanner = `uploads/${req.files.storeBanner[0].filename}`;
            user.storeBannerStatus = 'approved';
        } else if (req.body.storeBanner && req.body.storeBanner.startsWith('data:image')) {
            const processed = processImageString(req.body.storeBanner);
            if (processed) {
                user.storeBanner = processed;
                user.storeBannerStatus = 'approved';
            }
        }

        // If password is provided, it will be hashed by the pre-save hook
        if (password) user.password = password;

        await user.save();
        res.json({
            message: 'User updated successfully',
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ message: 'Database operation failed', error: err.message });
    }
};

// @desc    Delete user (by admin)
// @route   DELETE /api/admins/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ message: 'Database operation failed', error: err.message });
    }
};

// @desc    Search users by mobile (for selection)
// @route   GET /api/admins/users/search/mobile
// @access  Private (Admin)
const searchUsersByMobile = async (req, res) => {
    const { query } = req.query;
    if (!query || query.length < 2) {
        return res.json([]);
    }

    try {
        const users = await User.find({
            mobile: { $regex: '^' + query, $options: 'i' }
        }).limit(10).select('mobile name');
        res.json(users);
    } catch (err) {
        console.error('Error searching users:', err);
        res.status(500).json({ message: 'Database operation failed', error: err.message });
    }
};

// Helper to get users matching complex filters
const getFilteredUserIds = async (filters) => {
    const {
        userType, categories, locations, promotedType,
        gender, trustedSeller, loginFrom, loginTo, postQuantity,
        selectedUsers
    } = filters;

    let query = {};

    // 1. Basic User Type / Selection
    if (userType === 'Selected') {
        const users = await User.find({ mobile: { $in: selectedUsers || [] } }).select('_id');
        return users.map(u => u._id);
    } else if (userType === 'Seller') {
        query.merchantType = { $in: ['Premium', 'Free Saller'] };
    } else if (userType === 'Customer') {
        query.merchantType = 'Free';
    }

    // 2. Simple Meta Filters
    if (categories && categories.length > 0 && !categories.includes('All')) {
        query.category = { $in: categories };
    }
    if (locations && locations.length > 0 && !locations.includes('All')) {
        query.location = { $in: locations };
    }
    if (gender && gender !== 'All') {
        query.gender = { $regex: new RegExp(`^${gender}$`, 'i') };
    }
    if (trustedSeller && trustedSeller !== 'All') {
        query.merchantTrustStatus = (trustedSeller === 'Yes') ? 'Trusted' : 'Untrusted';
    }

    // 3. Login Status (Registration Date Range)
    if (loginFrom || loginTo) {
        query.createdAt = {};
        if (loginFrom) query.createdAt.$gte = new Date(loginFrom);
        if (loginTo) query.createdAt.$lte = new Date(loginTo);
    }

    // 4. Complex Filters (Promoted Type, Post Quantity) requiring Ads lookup
    let pipeline = [{ $match: query }];

    if (promotedType || postQuantity) {
        pipeline.push({
            $lookup: {
                from: 'ads',
                localField: '_id',
                foreignField: 'user',
                as: 'userAds'
            }
        });

        if (postQuantity) {
            const minQty = parseInt(postQuantity.replace('+', '')) || 0;
            pipeline.push({
                $match: {
                    $expr: { $gte: [{ $size: '$userAds' }, minQty] }
                }
            });
        }

        if (promotedType && promotedType !== 'All') {
            const now = new Date();
            if (promotedType === 'Running') {
                pipeline.push({
                    $match: {
                        userAds: {
                            $elemMatch: {
                                adType: 'Promoted',
                                status: 'active',
                                $or: [
                                    { promoteEndDate: { $gt: now } },
                                    { showTill: { $gt: now } }
                                ]
                            }
                        }
                    }
                });
            } else if (promotedType === 'PP') {
                // Previously Promoted: Has promoted ads but none currently running/active
                pipeline.push({
                    $match: {
                        $and: [
                            { userAds: { $elemMatch: { adType: 'Promoted' } } },
                            {
                                userAds: {
                                    $not: {
                                        $elemMatch: {
                                            adType: 'Promoted',
                                            status: 'active',
                                            $or: [
                                                { promoteEndDate: { $gt: now } },
                                                { showTill: { $gt: now } }
                                            ]
                                        }
                                    }
                                }
                            }
                        ]
                    }
                });
            } else if (promotedType === 'Never Promoted') {
                pipeline.push({
                    $match: {
                        userAds: { $not: { $elemMatch: { adType: 'Promoted' } } }
                    }
                });
            }
        }
    }

    pipeline.push({ $project: { _id: 1 } });
    const results = await User.aggregate(pipeline);
    return results.map(r => r._id);
};

// @desc    Get count of users matching filters
// @route   POST /api/admins/notifications/count
const getNotificationTargetCount = async (req, res) => {
    try {
        const targetUserIds = await getFilteredUserIds(req.body);
        res.json({ count: targetUserIds.length });
    } catch (err) {
        console.error('Error counting target users:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// @desc    Send notifications to users based on filters
// @route   POST /api/admins/notifications/send
// @access  Private (Admin)
const sendNotification = async (req, res) => {
    const {
        userType, categories, locations, promotedType,
        gender, trustedSeller, loginFrom, loginTo, postQuantity,
        sendIn, message, selectedUsers
    } = req.body;

    try {
        const targetUserIds = await getFilteredUserIds(req.body);

        if (targetUserIds.length === 0) {
            return res.status(400).json({ message: 'No users found matching these filters' });
        }

        // Handle Account Notifications (Optimized Broadcast)
        if (sendIn.includes('Account')) {
            // Check if we can use a "Smart Broadcast" or if we need a "Targeted Broadcast"
            // If it's a simple Group Broadcast (All/Seller/Customer) without other sub-filters, we use dynamic logic
            // But to ensure "perfect" filtering as requested, we now support targetUsers list.

            const isSimpleGroup = (userType === 'All' || userType === 'Seller' || userType === 'Customer') &&
                !promotedType && !postQuantity && !loginFrom && !loginTo &&
                (!categories || categories.includes('All')) &&
                (!locations || locations.includes('All')) &&
                gender === 'All' && trustedSeller === 'All';

            const broadcastNotification = new Notification({
                isBroadcast: true,
                targetGroup: userType,
                message,
                title: 'SHADAMON',
                filters: {
                    categories: (categories && categories.includes('All')) ? [] : categories,
                    locations: (locations && locations.includes('All')) ? [] : locations,
                    gender: gender === 'All' ? undefined : gender,
                    trustedSeller: trustedSeller === 'All' ? undefined : trustedSeller,
                    promotedType: promotedType || undefined,
                    postQuantity: postQuantity || undefined,
                    loginStatus: (loginFrom || loginTo) ? { from: loginFrom, to: loginTo } : undefined
                },
                // If selection or complex filters, store IDs to ensure perfect matching
                targetUsers: isSimpleGroup ? [] : targetUserIds
            });

            await broadcastNotification.save();

            // Emit real-time socket events
            const io = req.app.get('socketio');
            if (io) {
                targetUserIds.forEach(id => {
                    io.to(id.toString()).emit('notification received', {
                        message,
                        title: 'SHADAMON',
                        createdAt: new Date()
                    });
                });
            }
        }

        // Handle Email Notifications
        let usersWithoutEmail = [];
        if (sendIn.includes('Mail')) {
            const usersWithEmail = await User.find({ _id: { $in: targetUserIds } }).select('email name mobile');
            for (const user of usersWithEmail) {
                if (user.email) {
                    await emailService.sendNotificationEmail(user.email, message);
                } else {
                    usersWithoutEmail.push(user.name || user.mobile || user._id);
                }
            }
        }

        res.json({
            success: true,
            message: `Notification sent to ${targetUserIds.length} users`,
            targetCount: targetUserIds.length,
            usersWithoutEmail: usersWithoutEmail.length > 0 ? usersWithoutEmail : undefined
        });

    } catch (err) {
        console.error('Error sending notification:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// @desc    Check if sellerPageUrl is available
// @route   POST /api/admins/users/check-username
// @access  Private (Admin)
const checkUsername = async (req, res) => {
    const { sellerPageUrl, userId } = req.body;
    try {
        if (!sellerPageUrl) return res.status(400).json({ message: 'URL is required' });

        const query = { sellerPageUrl };
        if (userId && userId !== 'null' && userId !== 'undefined') {
            query._id = { $ne: userId };
        }

        const existingUser = await User.findOne(query);
        res.json({ available: !existingUser });
    } catch (err) {
        console.error('Error checking username:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    loginAdmin,
    getAllAdmins,
    createAdmin,
    deleteAdmin,
    updateAdmin,
    getAllUsers,
    getUserCount,
    addUser,
    updateUser,
    deleteUser,
    searchUsersByMobile,
    sendNotification,
    getNotificationTargetCount,
    checkUsername
};
