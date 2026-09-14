const express = require('express');
const router = express.Router();
const connectController = require('../controllers/connectController');
const { authenticateUser } = require('../middleware/auth');

router.post('/deduct', authenticateUser, connectController.deductConnect);
router.get('/logs', authenticateUser, connectController.getConnectLogs);

module.exports = router;
