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
    sendNotification,
    checkUsername,
    getNotificationTargetCount,
    getTransactions,
    deleteTransaction,
    getCurrentAdmin
} = require('../controllers/adminController');
const PromotionPlan = require('../models/PromotionPlan');
const Ad = require('../models/Ad');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { verifyToken, checkPermission } = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   POST /api/auth/login
// @desc    Admin login
// @access  Public
router.post('/login', loginAdmin);

// @route   GET /api/admins/me
router.get('/me', verifyToken, getCurrentAdmin);

// @route   GET /api/admins
// @desc    Get all admins
router.get('/', verifyToken, checkPermission('Admin Create'), getAllAdmins);

// @route   POST /api/admins
// @desc    Create new admin
router.post('/', verifyToken, checkPermission('Admin Create'), createAdmin);

// @route   DELETE /api/admins/:id
// @desc    Delete admin
router.delete('/:id', verifyToken, checkPermission('Admin Create'), deleteAdmin);

// @route   PUT /api/admins/:id
// @desc    Update admin
router.put('/:id', verifyToken, checkPermission('Admin Create'), updateAdmin);

// User Management Routes (for Admin Panel)
// @route   GET /api/admins/users/search-mobile
router.get('/users/search-mobile', verifyToken, searchUsersByMobile);

// @route   GET /api/admins/users/count
router.get('/users/count', verifyToken, getUserCount);

// @route   GET /api/admins/users
router.get('/users', verifyToken, checkPermission('User'), getAllUsers);

// @route   POST /api/admins/users
router.post('/users', verifyToken, checkPermission('User'), upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'storeLogo', maxCount: 1 },
    { name: 'storeBanner', maxCount: 1 }
]), addUser);

// @route   PUT /api/admins/users/:id
router.put('/users/:id', verifyToken, checkPermission('User'), upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'storeLogo', maxCount: 1 },
    { name: 'storeBanner', maxCount: 1 }
]), updateUser);

// @route   DELETE /api/admins/users/:id
router.delete('/users/:id', verifyToken, checkPermission('User'), deleteUser);

// @route   POST /api/admins/users/check-username
router.post('/users/check-username', verifyToken, checkUsername);

// @route   POST /api/admins/notifications/send
router.post('/notifications/send', verifyToken, checkPermission('Notification & Messaging'), sendNotification);

// @route   POST /api/admins/notifications/count
router.post('/notifications/count', verifyToken, checkPermission('Notification & Messaging'), getNotificationTargetCount);

// --- Transaction Routes ---
// @route   GET /api/admins/transactions
router.get('/transactions', verifyToken, checkPermission('Transaction Manager'), getTransactions);

// @route   DELETE /api/admins/transactions/:id
router.delete('/transactions/:id', verifyToken, checkPermission('Transaction Manager'), deleteTransaction);

// --- Promotion Plan Routes ---

// GET all promotion plans
router.get('/promotion-plans', verifyToken, checkPermission('Promote Management'), async (req, res) => {
    try {
        const plans = await PromotionPlan.find().sort({ createdAt: -1 });
        res.json(plans);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST new promotion plan
router.post('/promotion-plans', verifyToken, checkPermission('Promote Management'), async (req, res) => {
    try {
        const plan = new PromotionPlan(req.body);
        const newPlan = await plan.save();
        res.status(201).json(newPlan);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update promotion plan
router.put('/promotion-plans/:id', verifyToken, checkPermission('Promote Management'), async (req, res) => {
    try {
        const updatedPlan = await PromotionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedPlan);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE promotion plan
router.delete('/promotion-plans/:id', verifyToken, checkPermission('Promote Management'), async (req, res) => {
    try {
        await PromotionPlan.findByIdAndDelete(req.params.id);
        res.json({ message: 'Plan deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST manual product promote
router.post('/manual-promote', verifyToken, checkPermission('Promote Management'), async (req, res) => {
    const { productId, amount, runTill, sellerId, isVerifyBadge, level, promoteType, trafficLink } = req.body;
    try {
        let ad = null;
        if (productId) {
            ad = await Ad.findById(productId);
            if (!ad) return res.status(404).json({ message: 'Product not found' });

            const originalStatus = ad.status;
            const adOwner = ad.user ? await User.findById(ad.user) : null;
            const isTrusted = adOwner && String(adOwner.merchantTrustStatus || '').trim().toLowerCase() === 'trusted';

            // Update Ad promotion details
            ad.promoteBudget = Number(amount);

            // Set Promote Type and Traffic Link
            if (promoteType) ad.promoteType = promoteType;
            if (trafficLink) ad.trafficLink = trafficLink;
            if (promoteType === 'traffic') ad.trafficButtonType = 'Visit';

            if (runTill) {
                const parsedRunTill = Number(runTill);
                if (!isNaN(parsedRunTill) && parsedRunTill > 0 && String(runTill).indexOf('-') === -1) {
                    ad.promoteDuration = parsedRunTill;
                    const endDate = new Date();
                    endDate.setDate(endDate.getDate() + parsedRunTill);
                    ad.promoteEndDate = endDate;
                    ad.showTill = endDate;
                } else {
                    const targetDate = new Date(runTill);
                    if (targetDate.toString() !== 'Invalid Date') {
                        targetDate.setHours(23, 59, 59, 999);
                        ad.promoteEndDate = targetDate;
                        ad.showTill = targetDate;

                        const now = new Date();
                        const diffTime = targetDate.getTime() - now.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        ad.promoteDuration = diffDays > 0 ? diffDays : 0;
                    }
                }
            }

            // Handle Level/Label
            if (level) {
                // Check if level matches promoteTag enum
                if (['Urgent', 'Discount', 'Offer', 'Highlights'].includes(level)) {
                    ad.promoteTag = level;
                } else {
                    // Store in features if not a standard tag
                    if (!ad.features) ad.features = {};
                    ad.features.promoteLabel = level;
                }
            }

            // Trust gate: if ad is pause/review and owner is untrusted, keep it in review + processing
            if (['pause', 'review'].includes(originalStatus) && !isTrusted) {
                ad.status = 'review';
                ad.adType = 'Processing';
            } else {
                ad.status = 'active';
                ad.adType = 'Promoted';
            }
            await ad.save();

            // Automatically upgrade user to Premium only when ad is actually Promoted
            if (ad.user && (ad.adType || '').toLowerCase() === 'promoted') {
                await User.findByIdAndUpdate(ad.user, { merchantType: 'Premium' });
                console.log(`✅ User ${ad.user} upgraded to Premium via manual ad promotion`);
            }

            // Record Transaction for Ad Promotion
            const transaction = new Transaction({
                tnxId: `ADMIN-AD-${Date.now()}`,
                mode: 'Admin',
                sellerId: ad.user,
                productId: ad._id,
                mobileNumber: adOwner?.mobile || ad.phone,
                amount: Number(amount) || 0,
                payType: 'Admin',
                payeeName: adOwner?.name || 'Admin',
                item: level || 'Manual Promotion',
                status: 'VALID'
            });
            await transaction.save();
        }

        // Handle Seller Verification Badge
        if (sellerId) {
            const user = await User.findById(sellerId);
            if (user) {
                if (isVerifyBadge === 'Yes') {
                    user.merchantTrustStatus = 'Trusted';
                    user.mVerified = true;
                } else if (isVerifyBadge === 'No') {
                    user.merchantTrustStatus = 'Untrusted';
                    user.mVerified = false;
                }
                await user.save();

                // Record Transaction for Seller Verification
                const transaction = new Transaction({
                    tnxId: `ADMIN-VERIFY-${Date.now()}`,
                    mode: 'Admin',
                    sellerId: user._id,
                    mobileNumber: user.mobile,
                    amount: Number(amount) || 0,
                    payType: 'Admin',
                    payeeName: user.name,
                    item: 'Verify Badge',
                    status: 'VALID'
                });
                await transaction.save();
            } else {
                if (!productId) {
                    return res.status(404).json({ message: 'User not found' });
                }
            }
        }

        res.json({
            success: true,
            message: ad ? 'Ad promoted manually' : 'Seller verification updated',
            data: ad
        });
    } catch (err) {
        console.error("Manual promote error:", err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
