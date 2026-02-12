const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { fileToBase64 } = require('../utils/imageHelper');

// @desc    Register a new user
// @route   POST /api/user/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, dob, gender, mobile, storeName, actionType } = req.body;

    try {
        // Validate required fields
        if (!name || !password) {
            return res.status(400).json({ message: 'Name and password are required' });
        }

        if (!email && !mobile) {
            return res.status(400).json({ message: 'Email or Mobile number is required' });
        }

        // Check if user already exists
        if (email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'User with this email already exists' });
            }
        }

        if (mobile) {
            const existingMobile = await User.findOne({ mobile });
            if (existingMobile) {
                return res.status(400).json({ message: 'User with this mobile number already exists' });
            }
        }

        // Create new user (password will be hashed automatically by the pre-save hook)
        const newUser = new User({
            name,
            email: email || undefined,
            password,
            dob: dob || undefined,
            gender: gender || undefined,
            mobile: mobile || undefined,
            storeName: storeName || undefined,
            actionType: actionType || 'call'
        });

        await newUser.save();

        // Generate JWT token
        const token = jwt.sign(
            { id: newUser._id, email: newUser.email, role: 'user' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                storeName: newUser.storeName,
                actionType: newUser.actionType
            }
        });
    } catch (err) {
        console.error('Error registering user:', err);

        // Handle duplicate email error from MongoDB
        if (err.code === 11000) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        res.status(500).json({ message: 'Server error during registration', error: err.message });
    }
};

// @desc    Login user
// @route   POST /api/user/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Validate input
        if ((!email && !req.body.mobile) || !password) {
            return res.status(400).json({ message: 'Email/Mobile and password are required' });
        }

        // Find user by email OR mobile
        let user;
        if (email) {
            user = await User.findOne({
                $or: [
                    { email: email },
                    { mobile: email }
                ]
            });
        } else if (req.body.mobile) {
            user = await User.findOne({ mobile: req.body.mobile });
        }

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email, role: 'user' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                storeName: user.storeName,
                actionType: user.actionType
            }
        });
    } catch (err) {
        console.error('Error logging in user:', err);
        res.status(500).json({ message: 'Server error during login', error: err.message });
    }
};

// @desc    Get current user profile
// @route   GET /api/user/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error('Error fetching user profile:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update user profile
// @route   PUT /api/user/update
// @access  Private
// @desc    Update user profile
// @route   PUT /api/user/update
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const fields = [
            'name', 'mobile', 'dob', 'gender', 'storeName',
            'actionType', 'pageName', 'category', 'location',
            'education', 'aboutYourself', 'profession', 'professionalExperience', 'sellerPageUrl', 'aboutBusiness',
            'additionalMobiles'
        ];

        // 1. Handle Text Fields
        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                user[field] = req.body[field];
            }
        });

        // 2. Handle File Uploads (mapped from req.files)
        if (req.files) {
            if (req.files.storeBanner?.[0]) {
                const filePath = req.files.storeBanner[0].path.replace(/\\/g, "/");
                if (filePath) {
                    user.storeBanner = filePath;
                    user.storeBannerStatus = 'pending';
                }
            }

            if (req.files.storeLogo?.[0]) {
                const filePath = req.files.storeLogo[0].path.replace(/\\/g, "/");
                if (filePath) {
                    user.storeLogo = filePath;
                    user.storeLogoStatus = 'pending';
                }
            }

            if (req.files.photo?.[0]) {
                const filePath = req.files.photo[0].path.replace(/\\/g, "/");
                if (filePath) {
                    user.photo = filePath;
                    user.photoStatus = 'pending';
                }
            }
        }

        // Handle Base64 strings ONLY if they are coming as text (fallback for older frontend code)
        // But preferable to rely on req.files now.
        // If frontend sends base64, it might come in body.storeBanner. 
        // We should check if it's NOT a base64 string to avoid overwriting file with string if logic mixed.
        // Actually, with upload.fields, body fields might be present.
        // Let's prioritize file uploads.

        // If email update is requested, check for uniqueness (optional, skipped for now to avoid complexity)
        // if (req.body.email && req.body.email !== user.email) { ... }

        await user.save();

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                storeName: user.storeName,
                storeLogo: user.storeLogo,
                storeBanner: user.storeBanner,
                photo: user.photo,
                actionType: user.actionType
            }
        });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ message: 'Server error during update', error: err.message });
    }
};

// @desc    Login with Facebook
// @route   POST /api/user/facebook-login
// @access  Public
const facebookLogin = async (req, res) => {
    const { accessToken } = req.body;
    const axios = require('axios');
    const crypto = require('crypto');

    try {
        const appSecret = process.env.FACEBOOK_APP_SECRET;

        let url = `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`;

        if (appSecret) {
            const appSecretProof = crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
            url += `&appsecret_proof=${appSecretProof}`;
        } else {
            console.warn("Warning: FACEBOOK_APP_SECRET is not set.");
        }

        // 1. Verify token with Facebook
        const fbResponse = await axios.get(url);

        const { email, name, picture, id: fbId } = fbResponse.data;
        const pictureUrl = picture?.data?.url;

        if (!email) {
            // Some users sign up with phone number on FB and might not have email or didn't grant permission
            // If we want to support this, we need to handle non-email users (maybe use fbId as fake email or separate field)
            // For now, sticking to error but maybe relaxed if user wants phone login support via FB (complex)
            return res.status(400).json({ message: 'Facebook account does not have a verified email.' });
        }

        // 2. Check if user exists
        let user = await User.findOne({ email });

        if (user) {
            // Update photo if missing
            if (!user.photo && pictureUrl) {
                user.photo = pictureUrl;
                if (!user.photoStatus) user.photoStatus = 'approved';
                await user.save();
            }

            // User exists - Log them in
            const token = jwt.sign(
                { id: user._id, email: user.email, role: 'user' },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    mobile: user.mobile,
                    storeName: user.storeName,
                    actionType: user.actionType,
                    photo: user.photo
                }
            });
        } else {
            // User does not exist - Create new user
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

            user = new User({
                name,
                email,
                password: randomPassword,
                verifiedBy: 'Facebook',
                accountStatus: 'review',
                merchantType: 'Free',
                photo: pictureUrl,
                photoStatus: pictureUrl ? 'approved' : undefined
            });

            await user.save();

            const token = jwt.sign(
                { id: user._id, email: user.email, role: 'user' },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.status(201).json({
                message: 'User registered via Facebook',
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    storeName: user.storeName,
                    actionType: user.actionType
                }
            });
        }

    } catch (err) {
        console.error('Facebook login error:', err.response?.data || err.message);
        res.status(400).json({ message: 'Invalid Facebook Token or failed to connect to Facebook' });
    }
};

// @desc    Login with Google
// @route   POST /api/user/google-login
// @access  Public
const googleLogin = async (req, res) => {
    const { token } = req.body;
    const axios = require('axios');

    try {
        const googleResponse = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
        const { email, name, picture } = googleResponse.data;

        if (!email) {
            return res.status(400).json({ message: 'Google account does not have a verified email.' });
        }

        // Check if user exists
        let user = await User.findOne({ email });

        if (user) {
            // Update photo if missing
            if (!user.photo && picture) {
                user.photo = picture;
                if (!user.photoStatus) user.photoStatus = 'approved';
                await user.save();
            }

            // If user verifiedBy is 'Not Verified' (e.g. email/mobile not verified yet), update it?
            if (user.verifiedBy === 'Not Verified') {
                // User might have registered by email but not verified. 
                // If they login with Google, trust google?
                // Usually yes, but let's stick to safe 'Google' if new. 
                // If existing, maybe keep as is or update? 
                // User asked "verified by Google".
                // I will update verifiedBy if it is 'Not Verified'.
                user.verifiedBy = 'Google';
                await user.save();
            }

            // User exists - Log them in
            const jwtToken = jwt.sign(
                { id: user._id, email: user.email, role: 'user' },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.json({
                message: 'Login successful',
                token: jwtToken,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    mobile: user.mobile,
                    storeName: user.storeName,
                    actionType: user.actionType,
                    photo: user.photo
                }
            });
        } else {
            // User does not exist - Create new user
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

            user = new User({
                name,
                email,
                password: randomPassword,
                verifiedBy: 'Google',
                accountStatus: 'review',
                merchantType: 'Free',
                photo: picture,
                photoStatus: picture ? 'approved' : undefined
            });

            await user.save();

            const jwtToken = jwt.sign(
                { id: user._id, email: user.email, role: 'user' },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.status(201).json({
                message: 'User registered via Google',
                token: jwtToken,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    storeName: user.storeName,
                    actionType: user.actionType,
                    photo: user.photo
                }
            });
        }

    } catch (err) {
        console.error('Google login error:', err.response?.data || err.message);
        res.status(400).json({ message: 'Invalid Google Token' });
    }
};

// @desc    Get all premium users
// @route   GET /api/user/premium
// @access  Public
const getPremiumUsers = async (req, res) => {
    try {
        const users = await User.find({ merchantType: 'Premium' })
            .select('name storeName photo photoStatus merchantType')
            .lean();

        // Filter users who might have photoStatus != 'approved' if strict
        // But for now, just return all premium users as requested.
        // Maybe ensure photo is visible or fallback handled on frontend.

        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (err) {
        console.error('Error fetching premium users:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const Payment = require('../models/Payment');

// ... existing code ...

// @desc    Get user activity details
// @route   GET /api/user/activity
// @access  Private
const getUserActivity = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('following', 'name storeName photo')
            .populate({
                path: 'favorites',
                select: 'headline price images user',
                populate: { path: 'user', select: 'name storeName' }
            });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const payments = await Payment.find({ user: req.user.id }).sort({ createdAt: -1 });

        res.json({
            following: user.following,
            favorites: user.favorites,
            notifyCategories: user.notifyCategories,
            payments
        });
    } catch (err) {
        console.error('Error fetching activity:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update notification settings
// @route   PUT /api/user/notify-settings
// @access  Private
const updateNotifySettings = async (req, res) => {
    try {
        const { categories } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.notifyCategories = categories;
        await user.save();
        res.json({ message: 'Notification settings updated', categories: user.notifyCategories });
    } catch (err) {
        console.error('Error updating notify settings:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const checkMobile = async (req, res) => {
    const { mobile } = req.body;
    try {
        const user = await User.findOne({ mobile });
        res.json({ exists: !!user });
    } catch (err) {
        console.error('Error checking mobile:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const followUser = async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ message: "You cannot follow yourself" });
        }

        const targetUser = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user.id);

        if (!targetUser || !currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if already following
        if (!currentUser.following.includes(req.params.id)) {
            // Follow
            await currentUser.updateOne({ $push: { following: req.params.id } });
            await targetUser.updateOne({ $push: { followers: req.user.id } });
            res.status(200).json({ message: "User followed", isFollowing: true });
        } else {
            // Unfollow
            await currentUser.updateOne({ $pull: { following: req.params.id } });
            await targetUser.updateOne({ $pull: { followers: req.user.id } });
            res.status(200).json({ message: "User unfollowed", isFollowing: false });
        }
    } catch (err) {
        console.error('Error following user:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get public user profile by ID
// @route   GET /api/user/profile/:id
// @access  Public
const getPublicProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password -accountStatus');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error('Error fetching public profile:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const rateUser = async (req, res) => {
    try {
        if (!req.params.id) {
            return res.status(400).json({ message: "User ID is required" });
        }
        if (req.params.id === req.user.id) {
            return res.status(400).json({ message: "You cannot rate yourself" });
        }

        const { stars } = req.body;
        if (!stars || stars < 1 || stars > 5) {
            return res.status(400).json({ message: "Invalid rating. Must be between 1 and 5 stars" });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if user already rated
        const existingRatingIndex = user.ratings.findIndex(r => r.user.toString() === req.user.id);

        if (existingRatingIndex !== -1) {
            // Update existing rating
            user.ratings[existingRatingIndex].stars = stars;
        } else {
            // Add new rating
            user.ratings.push({ user: req.user.id, stars });
        }

        // Calculate average rating
        const totalStars = user.ratings.reduce((acc, curr) => acc + curr.stars, 0);
        user.rating = Math.round(totalStars / user.ratings.length);

        await user.save();

        res.json({
            message: "Rating submitted successfully",
            rating: user.rating,
            count: user.ratings.length
        });
    } catch (err) {
        console.error('Rate user error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
    updateProfile,
    facebookLogin,
    googleLogin,
    rateUser,
    getPublicProfile,
    getPremiumUsers,
    getUserActivity,
    updateNotifySettings,
    checkMobile,
    followUser
};
