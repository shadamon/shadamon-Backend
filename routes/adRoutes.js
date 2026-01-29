const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');
const { authenticateUser, verifyToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   POST api/ads
// @desc    Create a new ad
// @access  Private (User)
router.post(
    '/',
    authenticateUser,
    upload.array('images', 5), // 'images' is the field name, max 5 files
    adController.createAd
);

// @route   GET api/ads/me
// @desc    Get all ads for logged-in user
// @access  Private
router.get('/me', authenticateUser, adController.getMyAds);

// @route   PUT api/ads/:id
// @desc    Update user's own ad
// @access  Private
router.put('/:id', authenticateUser, adController.updateMyAd);

// @route   DELETE api/ads/:id
// @desc    Delete user's own ad
// @access  Private
// @route   DELETE api/ads/:id
// @desc    Delete user's own ad
// @access  Private
router.delete('/:id', authenticateUser, adController.deleteMyAd);

// @route   PUT api/ads/:id/promote
// @desc    Promote an ad
// @access  Private
router.put('/:id/promote', authenticateUser, adController.promoteAd);

// @route   GET api/ads/public/all
// @desc    Get all active ads for public feed
// @access  Public
router.get('/public/all', adController.getAllAdsPublic);

// @route   GET api/ads/public/:id
// @desc    Get single public ad
// @access  Public
router.get('/public/:id', adController.getSingleAdPublic);

// @route   GET api/ads/admin/all
// @desc    Get all ads for admin
// @access  Private (Admin)
router.get('/admin/all', verifyToken, adController.getAllAdsAdmin);

// @route   GET api/ads/admin/promoted
// @desc    Get all promoted ads for admin
// @access  Private (Admin)
router.get('/admin/promoted', verifyToken, adController.getAllPromotedAdsAdmin);

// @route   PUT api/ads/admin/:id/status
// @desc    Update ad status
// @access  Private (Admin)
router.put('/admin/:id/status', verifyToken, adController.updateAdStatus);

// @route   PUT api/ads/admin/:id/update
// @desc    Update ad details by admin
// @access  Private (Admin)
router.put('/admin/:id/update', verifyToken, upload.array('images', 5), adController.updateAdDetails);

// @route   DELETE api/ads/admin/:id/image
// @desc    Remove specific image from ad
// @access  Private (Admin)
router.delete('/admin/:id/image', verifyToken, adController.deleteAdImage);

// @route   POST api/ads/admin/create
// @desc    Create ad by admin
// @access  Private (Admin)
router.post('/admin/create', verifyToken, upload.array('images', 5), adController.createAdAdmin);

// @route   DELETE api/ads/admin/:id
// @desc    Delete ad by admin
// @access  Private (Admin)
router.delete('/admin/:id', verifyToken, adController.deleteAdAdmin);

module.exports = router;
