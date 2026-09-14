const express = require('express');
const router = express.Router();
const profileViewController = require('../controllers/profileViewController');
const { authenticateUser } = require('../middleware/auth');

router.post('/log', authenticateUser, profileViewController.logProfileView);
router.get('/', authenticateUser, profileViewController.getProfileViews);

module.exports = router;
