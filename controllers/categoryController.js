const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const Feature = require('../models/Feature');

// --- Category Controllers ---
exports.createCategory = async (req, res) => {
    try {
        const { name, status, inputType, order } = req.body;
        const slug = name.toLowerCase().replace(/ /g, '-');

        const category = new Category({
            name,
            slug,
            inputType,
            order,
            status: status === 'true' || status === true,
            createdBy: {
                adminId: req.admin.id,
                adminName: req.admin.name || 'Admin'
            },
            icon: req.file ? `/uploads/${req.file.filename}` : undefined
        });

        await category.save();
        res.status(201).json({ success: true, data: category });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { name, status, inputType, order } = req.body;
        const updateData = {
            name,
            status: status === 'true' || status === true,
            inputType,
            order
        };
        if (name) updateData.slug = name.toLowerCase().replace(/ /g, '-');
        if (req.file) updateData.icon = `/uploads/${req.file.filename}`;

        const category = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ success: true, data: category });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ order: 1 });
        res.json({ success: true, data: categories });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Category deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- SubCategory Controllers ---
exports.createSubCategory = async (req, res) => {
    try {
        const { name, category, feature, buttonType, freePost, order, status, tags } = req.body;

        const subCategory = new SubCategory({
            name,
            category,
            feature: feature || undefined,
            buttonType,
            freePost,
            order,
            status: status === 'true' || status === true,
            tags: tags || [],
            image: req.file ? `/uploads/${req.file.filename}` : undefined,
            createdBy: {
                adminId: req.admin.id,
                adminName: req.admin.name || 'Admin'
            }
        });

        await subCategory.save();
        res.status(201).json({ success: true, data: subCategory });
    } catch (err) {
        console.error('Error creating subcategory:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateSubCategory = async (req, res) => {
    try {
        const { name, category, feature, buttonType, freePost, order, status, tags } = req.body;
        const updateData = {
            name,
            category,
            feature: feature || undefined,
            buttonType,
            freePost,
            order,
            status: status === 'true' || status === true,
            tags: tags || []
        };
        if (req.file) updateData.image = `/uploads/${req.file.filename}`;

        const subCategory = await SubCategory.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ success: true, data: subCategory });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAllSubCategories = async (req, res) => {
    try {
        const subCategories = await SubCategory.find()
            .populate('category', 'name')
            .populate('feature', 'name')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: subCategories });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteSubCategory = async (req, res) => {
    try {
        await SubCategory.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'SubCategory deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- Feature Controllers ---
exports.createFeature = async (req, res) => {
    try {
        const { name, category, inputType, order, status, buttonType, boxFadeName, buttonItemNames } = req.body;

        const feature = new Feature({
            name,
            category,
            inputType,
            order,
            status: status === 'true' || status === true,
            buttonType,
            boxFadeName,
            buttonItemNames: buttonItemNames || []
        });

        await feature.save();
        res.status(201).json({ success: true, data: feature });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateFeature = async (req, res) => {
    try {
        const { name, category, inputType, order, status, buttonType, boxFadeName, buttonItemNames } = req.body;
        const updateData = {
            name,
            category,
            inputType,
            order,
            status: status === 'true' || status === true,
            buttonType,
            boxFadeName,
            buttonItemNames: buttonItemNames || []
        };

        const feature = await Feature.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ success: true, data: feature });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAllFeatures = async (req, res) => {
    try {
        const features = await Feature.find().populate('category', 'name').sort({ order: 1 });
        res.json({ success: true, data: features });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteFeature = async (req, res) => {
    try {
        await Feature.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Feature deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
