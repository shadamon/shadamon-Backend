const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Ad = require('../models/Ad');
const Transaction = require('../models/Transaction');
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
const deleteAdmin = async (req, res) => {
    try {
        await Admin.findByIdAndDelete(req.params.id);
        res.json({ message: 'Admin removed' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update admin
const updateAdmin = async (req, res) => {
    try {
        const updatedAdmin = await Admin.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedAdmin);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// User Management
const getAllUsers = async (req, res) => {
    try {
        let query = {};
        const { id, mobile, email, category, location, status, merchantType, dateFrom, dateTo } = req.query;

        if (id) {
            if (mongoose.Types.ObjectId.isValid(id)) {
                query._id = id;
            } else {
                return res.json({ success: true, count: 0, total: 0, page: 1, pages: 1, data: [] });
            }
        }
        if (mobile) query.mobile = new RegExp(mobile, 'i');
        if (email) query.email = new RegExp(email, 'i');
        if (category && category !== 'Select') query.category = category;
        if (location && location !== 'Select') query.location = location;
        if (status && status !== 'Select') query.accountStatus = status;

        if (merchantType && merchantType !== 'both' && merchantType !== 'Both') {
            if (merchantType === 'seller') {
                query.merchantType = { $in: ['Premium', 'Free Saller'] };
            } else if (merchantType === 'customer') {
                query.merchantType = 'Free';
            }
        }

        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
            if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                query.createdAt.$lte = toDate;
            }
        }

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        const skip = (page - 1) * limit;

        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            count: users.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            data: users
        });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const getUserCount = async (req, res) => {
    try {
        const count = await User.countDocuments();
        res.json({ count });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

const addUser = async (req, res) => {
    try {
        const userData = { ...req.body };
        const files = req.files;

        if (files) {
            if (files.photo) userData.photo = await processImageString(files.photo[0]);
            if (files.storeLogo) userData.storeLogo = await processImageString(files.storeLogo[0]);
            if (files.storeBanner) userData.storeBanner = await processImageString(files.storeBanner[0]);
        }

        const user = new User(userData);
        await user.save();
        res.status(201).json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const userData = { ...req.body };
        const files = req.files;

        if (files) {
            if (files.photo) userData.photo = await processImageString(files.photo[0]);
            if (files.storeLogo) userData.storeLogo = await processImageString(files.storeLogo[0]);
            if (files.storeBanner) userData.storeBanner = await processImageString(files.storeBanner[0]);
        }

        const user = await User.findByIdAndUpdate(req.params.id, userData, { new: true });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

const searchUsersByMobile = async (req, res) => {
    try {
        const { mobile } = req.query;
        const users = await User.find({ mobile: new RegExp(mobile, 'i') });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

const sendNotification = async (req, res) => {
    try {
        const { target, targetValue, title, message, action, link } = req.body;
        let query = {};

        if (target === 'division') query.location = targetValue;
        if (target === 'category') {
            // Find users who posted in this category
            const ads = await Ad.find({ category: targetValue }).distinct('user');
            query._id = { $in: ads };
        }
        if (target === 'status') query.merchantTrustStatus = targetValue;

        const users = await User.find(query);
        const notifications = users.map(user => ({
            user: user._id,
            title,
            message,
            action,
            link
        }));

        await Notification.insertMany(notifications);
        res.json({ success: true, count: users.length });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getNotificationTargetCount = async (req, res) => {
    try {
        const { target, targetValue } = req.body;
        let query = {};
        if (target === 'division') query.location = targetValue;
        if (target === 'status') query.merchantTrustStatus = targetValue;
        const count = await User.countDocuments(query);
        res.json({ count });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

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
        res.status(500).json({ message: 'Server error' });
    }
};

const getTransactions = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        const skip = (page - 1) * limit;

        const { tnxId, productId, sellerMobile, sellerId, item, mode, fromDate, toDate } = req.query;
        let query = {};

        if (tnxId) query.tnxId = new RegExp(tnxId, 'i');
        if (sellerMobile) query.mobileNumber = new RegExp(sellerMobile, 'i');
        if (item) query.item = new RegExp(item, 'i');
        if (mode) query.mode = new RegExp(mode, 'i');

        if (productId) {
            if (mongoose.Types.ObjectId.isValid(productId)) {
                query.productId = productId;
            } else {
                return res.json({ success: true, total: 0, page: 1, pages: 1, data: [] });
            }
        }
        if (sellerId) {
            if (mongoose.Types.ObjectId.isValid(sellerId)) {
                query.sellerId = sellerId;
            } else {
                return res.json({ success: true, total: 0, page: 1, pages: 1, data: [] });
            }
        }
        if (fromDate || toDate) {
            query.payTime = {};
            if (fromDate) query.payTime.$gte = new Date(fromDate);
            if (toDate) {
                const to = new Date(toDate);
                to.setHours(23, 59, 59, 999);
                query.payTime.$lte = to;
            }
        }

        const transactions = await Transaction.find(query)
            .populate('sellerId', 'name mobile')
            .populate('productId', 'headline')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Transaction.countDocuments(query);

        res.json({
            success: true,
            total,
            page,
            pages: Math.ceil(total / limit),
            data: transactions
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const deleteTransaction = async (req, res) => {
    try {
        await Transaction.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Transaction deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
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
    checkUsername,
    getTransactions,
    deleteTransaction
};
