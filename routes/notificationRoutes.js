const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead } = require('../controllers/notificationController');
const { authenticateUser } = require('../middleware/auth'); // User auth

router.use(authenticateUser);

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);

module.exports = router;
