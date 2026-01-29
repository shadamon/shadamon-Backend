const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, updateProfile } = require('../controllers/userController');
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

// @route   PUT /api/user/update
// @desc    Update user profile
// @access  Private
router.put('/update', protect, updateProfile);

// @route   POST /api/user/otp/request
// @desc    Request OTP for verification
// @access  Private
router.post('/otp/request', protect, requestOTP);

// @route   POST /api/user/otp/verify
// @desc    Verify OTP
// @access  Private
router.post('/otp/verify', protect, verifyOTP);

// @route   GET /api/user/premium
// @desc    Get all premium users
// @access  Public
router.get('/premium', require('../controllers/userController').getPremiumUsers);

module.exports = router;
