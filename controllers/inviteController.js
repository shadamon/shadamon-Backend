const Invite = require('../models/Invite');
const Notification = require('../models/Notification');
const Activity = require('../models/Activity');
const User = require('../models/User');

// @desc    Send an invite
// @route   POST /api/invites/send
// @access  Private
exports.sendInvite = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Please provide an email' });
        }

        // Check if receiver exists
        const receiver = await User.findOne({ email });
        if (!receiver) {
            return res.status(404).json({ success: false, message: 'User not found with this email' });
        }

        const receiverId = receiver._id;

        // Prevent self-invites
        if (receiverId.toString() === req.user.id) {
            return res.status(400).json({ success: false, message: 'Cannot invite yourself' });
        }

        // Check if invite already exists (pending or accepted)
        const existingInvite = await Invite.findOne({
            senderId: req.user.id,
            receiverId: receiverId,
            status: { $in: ['pending', 'accepted'] }
        });

        if (existingInvite) {
            return res.status(400).json({ success: false, message: 'Invite already sent to this user' });
        }

        // Create the invite
        const invite = await Invite.create({
            senderId: req.user.id,
            receiverId: receiverId,
            status: 'pending'
        });

        // Generate Notification for receiver
        const sender = await User.findById(req.user.id);
        const senderName = sender.name || 'A user';
        
        await Notification.create({
            userId: receiverId,
            title: 'New Invite',
            message: `${senderName} has sent you an invite.`,
            type: 'invite',
            isRead: false
        });

        // Log Activity for sender
        await Activity.create({
            userId: req.user.id,
            actionText: `You sent an invite to ${receiver.name || 'a user'}`
        });

        res.status(201).json({
            success: true,
            data: invite
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get invites for a user
// @route   GET /api/invites
// @access  Private
exports.getInvites = async (req, res) => {
    try {
        const invites = await Invite.find({ receiverId: req.user.id })
            .populate('senderId', 'name email profileImage')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: invites.length,
            data: invites
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
