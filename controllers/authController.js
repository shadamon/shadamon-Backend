const User = require('../models/User');
const OTP = require('../models/OTP');
const MobileOTP = require('../models/MobileOTP');
const { sendOTP } = require('../utils/emailService');
const { sendSMSOTP } = require('../utils/smsService');

// Generate 6 digit numeric OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.requestOTP = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.verifiedBy !== 'Not Verified') {
            return res.json({ success: true, message: 'User already verified', isVerified: true });
        }

        // Logic to limit requests could be added here (e.g., redis or simply check OTP count in last minute)

        const otp = generateOTP();

        // Remove existing OTPs for this user
        await OTP.deleteMany({ userId });

        // Save new OTP
        await new OTP({ userId, otp }).save();

        // Send Email
        const emailSent = await sendOTP(user.email, otp);

        if (emailSent) {
            res.json({ success: true, message: 'OTP sent to your email', isVerified: false });
        } else {
            res.status(500).json({ success: false, message: 'Failed to send email' });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { otp } = req.body;
        const userId = req.user.id;

        const record = await OTP.findOne({ userId, otp });

        if (!record) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }

        // If correct, update user verification status
        await User.findByIdAndUpdate(userId, { verifiedBy: 'Email' });

        // Cleanup OTP
        await OTP.deleteOne({ _id: record._id });

        res.json({ success: true, message: 'Verification successful', isVerified: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.requestMobileOTP = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ success: false, message: 'Phone number is required' });
        }

        const otp = generateOTP();

        // Remove existing OTPs for this phone
        await MobileOTP.deleteMany({ phone });

        // Save new OTP
        await new MobileOTP({ phone, otp }).save();

        // Send SMS
        const smsSent = await sendSMSOTP(phone, otp);

        if (smsSent) {
            res.json({ success: true, message: 'OTP sent to your mobile' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to send SMS' });
        }

    } catch (err) {
        console.error("Mobile OTP Request Error:", err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.verifyMobileOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) {
            return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
        }

        const record = await MobileOTP.findOne({ phone, otp });

        if (!record) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }

        // Cleanup OTP
        await MobileOTP.deleteOne({ _id: record._id });

        res.json({ success: true, message: 'Mobile verification successful', isVerified: true });

    } catch (err) {
        console.error("Mobile OTP Verify Error:", err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
