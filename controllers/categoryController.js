const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const Feature = require('../models/Feature');
const { fileToBase64, processImageString } = require('../utils/imageHelper');

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
            icon: req.file ? fileToBase64(req.file) : processImageString(req.body.icon)
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
        if (req.file) {
            updateData.icon = fileToBase64(req.file);
        } else if (req.body.icon) {
            const processed = processImageString(req.body.icon);
            if (processed) updateData.icon = processed;
        }

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
        const { name, category, features, buttonType, freePost, order, status, tags, priceBoxShow, priceBoxName } = req.body;

        const names = Array.isArray(name) ? name : [name];
        let featuresArray = [];
        if (features) {
            try {
                featuresArray = typeof features === 'string' ? JSON.parse(features) : features;
            } catch (e) {
                featuresArray = [features];
            }
        }

        const subCategories = [];

        for (const subName of names) {
            if (!subName.trim()) continue;

            const subCategory = new SubCategory({
                name: subName,
                category,
                features: featuresArray,
                buttonType,
                freePost,
                order,
                status: status === 'true' || status === true,
                priceBoxShow: priceBoxShow === 'true' || priceBoxShow === true,
                priceBoxName: priceBoxName,
                tags: tags || [],
                image: req.file ? fileToBase64(req.file) : processImageString(req.body.image),
                createdBy: {
                    adminId: req.admin.id,
                    adminName: req.admin.name || 'Admin'
                }
            });
            await subCategory.save();
            subCategories.push(subCategory);
        }

        res.status(201).json({ success: true, data: subCategories.length === 1 ? subCategories[0] : subCategories });
    } catch (err) {
        console.error('Error creating subcategory:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateSubCategory = async (req, res) => {
    try {
        const { name, category, features, buttonType, freePost, order, status, tags, priceBoxShow, priceBoxName } = req.body;

        let featuresArray = [];
        if (features) {
            try {
                featuresArray = typeof features === 'string' ? JSON.parse(features) : features;
            } catch (e) {
                featuresArray = [features];
            }
        }

        const updateData = {
            name,
            category,
            features: featuresArray,
            buttonType,
            freePost,
            order,
            status: status === 'true' || status === true,
            priceBoxShow: priceBoxShow === 'true' || priceBoxShow === true,
            priceBoxName: priceBoxName,
            tags: tags || []
        };
        if (req.file) {
            updateData.image = fileToBase64(req.file);
        } else if (req.body.image) {
            const processed = processImageString(req.body.image);
            if (processed) updateData.image = processed;
        }

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
            .populate('features')
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
