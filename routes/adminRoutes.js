const express = require('express');
const router = express.Router();
const {
    loginAdmin,
    getAllAdmins,
    createAdmin,
    deleteAdmin,
    updateAdmin,
    getAllUsers,
    addUser,
    updateUser,
    deleteUser,
    searchUsersByMobile,
    getUserCount,
    sendNotification
} = require('../controllers/adminController');
const PromotionPlan = require('../models/PromotionPlan');
const Ad = require('../models/Ad');
const { verifyToken, checkSuperAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   POST /api/auth/login
// @desc    Admin login
// @access  Public
router.post('/login', loginAdmin);

// @route   GET /api/admins
// @desc    Get all admins
// @access  Private (Admin)
router.get('/', verifyToken, getAllAdmins);

// @route   POST /api/admins
// @desc    Create new admin
// @access  Private (Super Admin only)
router.post('/', verifyToken, checkSuperAdmin, createAdmin);

// @route   DELETE /api/admins/:id
// @desc    Delete admin
// @access  Private (Super Admin only)
router.delete('/:id', verifyToken, checkSuperAdmin, deleteAdmin);

// @access  Private (Super Admin only)
router.put('/:id', verifyToken, checkSuperAdmin, updateAdmin);

// User Management Routes (for Admin Panel)
// @route   GET /api/admins/users/search-mobile
router.get('/users/search-mobile', verifyToken, searchUsersByMobile);

// @route   GET /api/admins/users/count
router.get('/users/count', verifyToken, getUserCount);

// @route   GET /api/admins/users
router.get('/users', verifyToken, getAllUsers);

// @route   POST /api/admins/users
router.post('/users', verifyToken, upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'storeLogo', maxCount: 1 },
    { name: 'storeBanner', maxCount: 1 }
]), addUser);

// @route   PUT /api/admins/users/:id
router.put('/users/:id', verifyToken, upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'storeLogo', maxCount: 1 },
    { name: 'storeBanner', maxCount: 1 }
]), updateUser);

// @route   DELETE /api/admins/users/:id
router.delete('/users/:id', verifyToken, deleteUser);

// @route   POST /api/admins/notifications/send
router.post('/notifications/send', verifyToken, sendNotification);

// @route   POST /api/admins/notifications/count
router.post('/notifications/count', verifyToken, require('../controllers/adminController').getNotificationTargetCount);

// --- Promotion Plan Routes ---

// GET all promotion plans
router.get('/promotion-plans', verifyToken, async (req, res) => {
    try {
        const plans = await PromotionPlan.find().sort({ createdAt: -1 });
        res.json(plans);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST new promotion plan
router.post('/promotion-plans', verifyToken, async (req, res) => {
    try {
        const plan = new PromotionPlan(req.body);
        const newPlan = await plan.save();
        res.status(201).json(newPlan);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update promotion plan
router.put('/promotion-plans/:id', verifyToken, async (req, res) => {
    try {
        const updatedPlan = await PromotionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedPlan);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE promotion plan
router.delete('/promotion-plans/:id', verifyToken, async (req, res) => {
    try {
        await PromotionPlan.findByIdAndDelete(req.params.id);
        res.json({ message: 'Plan deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST manual product promote
router.post('/manual-promote', verifyToken, async (req, res) => {
    const { productId, adType, amount, runTill } = req.body;
    try {
        const ad = await Ad.findById(productId);
        if (!ad) return res.status(404).json({ message: 'Product not found' });

        ad.adType = adType;
        ad.promoteBudget = amount;
        ad.showTill = runTill;
        ad.status = 'active';

        await ad.save();
        res.json({ success: true, message: 'Ad promoted manually', data: ad });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
