const express = require('express');
const router = express.Router();
const { sendInvite, getInvites } = require('../controllers/inviteController');
const { authenticateUser } = require('../middleware/auth'); // User auth

router.use(authenticateUser);

router.post('/send', sendInvite);
router.get('/', getInvites);

module.exports = router;
