const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { verifyToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Locations
router.get('/', locationController.getAllLocations);
router.post('/', verifyToken, upload.single('image'), locationController.createLocation);
router.put('/:id', verifyToken, upload.single('image'), locationController.updateLocation);
router.delete('/:id', verifyToken, locationController.deleteLocation);

// SubLocations
router.get('/sub', locationController.getAllSubLocations);
router.post('/sub', verifyToken, upload.single('image'), locationController.createSubLocation);
router.put('/sub/:id', verifyToken, upload.single('image'), locationController.updateSubLocation);
router.delete('/sub/:id', verifyToken, locationController.deleteSubLocation);

module.exports = router;
