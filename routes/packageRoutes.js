const express = require('express');
const router = express.Router();
const packageController = require('../controllers/packageController');
const { verifyToken } = require('../middleware/auth');

router.get('/', packageController.getPackages);
router.post('/', verifyToken, packageController.createPackage);
router.put('/:id', verifyToken, packageController.updatePackage);
router.delete('/:id', verifyToken, packageController.deletePackage);

// Override user connects (Admin only)
router.post('/user-connects', verifyToken, packageController.updateUserConnects);

module.exports = router;
