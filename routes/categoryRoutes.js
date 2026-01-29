const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { verifyToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Categories
router.get('/', categoryController.getAllCategories);
router.post('/', verifyToken, upload.single('icon'), categoryController.createCategory);
router.put('/:id', verifyToken, upload.single('icon'), categoryController.updateCategory);
router.delete('/:id', verifyToken, categoryController.deleteCategory);

// SubCategories
router.get('/sub', categoryController.getAllSubCategories);
router.post('/sub', verifyToken, upload.single('image'), categoryController.createSubCategory);
router.put('/sub/:id', verifyToken, upload.single('image'), categoryController.updateSubCategory);
router.delete('/sub/:id', verifyToken, categoryController.deleteSubCategory);

// Features
router.get('/features', categoryController.getAllFeatures);
router.post('/features', verifyToken, categoryController.createFeature);
router.put('/features/:id', verifyToken, categoryController.updateFeature);
router.delete('/features/:id', verifyToken, categoryController.deleteFeature);

module.exports = router;
