const Admin = require('../models/Admin');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
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
            { id: admin._id, role: admin.role, email: admin.email },
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

// @desc    Get all users (for admin panel)
// @route   GET /api/admins/users
// @access  Private (Admin)
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
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
        name, email, password, dob, gender, mobile,
        storeName, actionType, accountStatus, verifiedBy,
        location, category, pageName, merchantType
    } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const newUser = new User({
            name, email, password, dob, gender, mobile,
            storeName, actionType, accountStatus, verifiedBy,
            location, category, pageName, merchantType,

            photo: req.files?.photo ? fileToBase64(req.files.photo[0]) : processImageString(req.body.photo),
            storeLogo: req.files?.storeLogo ? fileToBase64(req.files.storeLogo[0]) : processImageString(req.body.storeLogo),
            storeBanner: req.files?.storeBanner ? fileToBase64(req.files.storeBanner[0]) : processImageString(req.body.storeBanner)
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
        name, email, dob, gender, mobile,
        storeName, actionType, accountStatus, verifiedBy,
        location, category, pageName, merchantType, password,
        storeLogoStatus, storeBannerStatus, photoStatus
    } = req.body;

    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update fields
        if (name) user.name = name;
        if (email) user.email = email;
        if (dob) user.dob = dob;
        if (gender) user.gender = gender;
        if (mobile) user.mobile = mobile;
        if (storeName) user.storeName = storeName;
        if (actionType) user.actionType = actionType;
        if (accountStatus) user.accountStatus = accountStatus;
        if (verifiedBy) user.verifiedBy = verifiedBy;
        if (location) user.location = location;
        if (category) user.category = category;
        if (pageName) user.pageName = pageName;

        if (merchantType) user.merchantType = merchantType;
        if (storeLogoStatus) user.storeLogoStatus = storeLogoStatus;
        if (storeBannerStatus) user.storeBannerStatus = storeBannerStatus;
        if (photoStatus) user.photoStatus = photoStatus;

        // Process images
        if (req.files?.photo) {
            user.photo = fileToBase64(req.files.photo[0]);
        } else if (req.body.photo) {
            const processed = processImageString(req.body.photo);
            if (processed) user.photo = processed;
        }

        if (req.files?.storeLogo) {
            user.storeLogo = fileToBase64(req.files.storeLogo[0]);
        } else if (req.body.storeLogo) {
            const processed = processImageString(req.body.storeLogo);
            if (processed) user.storeLogo = processed;
        }

        if (req.files?.storeBanner) {
            user.storeBanner = fileToBase64(req.files.storeBanner[0]);
        } else if (req.body.storeBanner) {
            const processed = processImageString(req.body.storeBanner);
            if (processed) user.storeBanner = processed;
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

module.exports = {
    loginAdmin,
    getAllAdmins,
    createAdmin,
    deleteAdmin,
    updateAdmin,
    getAllUsers,
    addUser,
    updateUser,
    deleteUser
};
