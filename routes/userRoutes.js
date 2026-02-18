const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, updateProfile, getUserActivity, updateNotifySettings, addNotifyPreference, removeNotifyPreference } = require('../controllers/userController');
const { requestOTP, verifyOTP } = require('../controllers/authController');
const { authenticateUser: protect } = require('../middleware/auth');

// @route   POST /api/user/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerUser);

// @route   POST /api/user/login
// @desc    Login user
// @access  Public
router.post('/login', loginUser);
router.post('/check-mobile', require('../controllers/userController').checkMobile);

// @route   POST /api/user/facebook-login
// @desc    Login with Facebook
// @access  Public
router.post('/facebook-login', require('../controllers/userController').facebookLogin);

// @route   POST /api/user/google-login
// @desc    Login with Google
// @access  Public
router.post('/google-login', require('../controllers/userController').googleLogin);

// @route   GET /api/user/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, getMe);

// @route   GET /api/user/activity
// @desc    Get user activity
// @access  Private
router.get('/activity', protect, getUserActivity);

const upload = require('../middleware/upload');

// @route   PUT /api/user/update
// @desc    Update user profile
// @access  Private
router.put(
    '/update',
    protect,
    upload.fields([
        { name: 'storeBanner', maxCount: 1 },
        { name: 'storeLogo', maxCount: 1 },
        { name: 'photo', maxCount: 1 }
    ]),
    updateProfile
);

// @route   POST /api/user/notify-preference
// @desc    Add notify preference
// @access  Private
router.post('/notify-preference', protect, addNotifyPreference);

// @route   DELETE /api/user/notify-preference/:id
// @desc    Remove notify preference
// @access  Private
router.delete('/notify-preference/:id', protect, removeNotifyPreference);

// @route   PUT /api/user/notify-settings
// @desc    Update notification settings
// @access  Private
router.put('/notify-settings', protect, updateNotifySettings);

// @route   POST /api/user/otp/request
// @desc    Request OTP for verification
// @access  Private
router.post('/otp/request', protect, requestOTP);

// @route   POST /api/user/otp/verify
// @desc    Verify OTP
// @access  Private
router.post('/otp/verify', protect, verifyOTP);

// @route   GET /api/user/profile/:id
// @desc    Get public profile
// @access  Public
router.get('/profile/:id', require('../controllers/userController').getPublicProfile);

// @route   GET /api/user/premium
// @desc    Get all premium users
// @access  Public
router.get('/premium', require('../controllers/userController').getPremiumUsers);

// @route   POST /api/user/follow/:id
// @desc    Follow or Unfollow a user
// @access  Private
router.post('/follow/:id', protect, require('../controllers/userController').followUser);

// @route   POST /api/user/rate/:id
// @desc    Rate a user
// @access  Private
router.post('/rate/:id', protect, require('../controllers/userController').rateUser);

module.exports = router;
