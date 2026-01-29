const Location = require('../models/Location');
const SubLocation = require('../models/SubLocation');

// --- Location Controllers ---
exports.createLocation = async (req, res) => {
    try {
        const { name, status, order } = req.body;
        const slug = name.toLowerCase().replace(/ /g, '-');

        const location = new Location({
            name,
            slug,
            order,
            status: status === 'true' || status === true,
            createdBy: {
                adminId: req.admin.id,
                adminName: req.admin.name || 'Admin'
            },
            image: req.file ? `/uploads/${req.file.filename}` : undefined
        });

        await location.save();
        res.status(201).json({ success: true, data: location });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateLocation = async (req, res) => {
    try {
        const { name, status, order } = req.body;
        const updateData = {
            name,
            status: status === 'true' || status === true,
            order
        };
        if (name) updateData.slug = name.toLowerCase().replace(/ /g, '-');
        if (req.file) updateData.image = `/uploads/${req.file.filename}`;

        const location = await Location.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ success: true, data: location });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAllLocations = async (req, res) => {
    try {
        const locations = await Location.find().sort({ order: 1 });
        res.json({ success: true, data: locations });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteLocation = async (req, res) => {
    try {
        // Optional: Delete associated sublocations first if strict consistency is needed
        await SubLocation.deleteMany({ location: req.params.id });
        await Location.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Location deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- SubLocation Controllers ---
exports.createSubLocation = async (req, res) => {
    try {
        const { name, location, mapLink, order, status } = req.body;

        const subLocation = new SubLocation({
            name,
            location,
            mapLink,
            order,
            status: status === 'true' || status === true,
            image: req.file ? `/uploads/${req.file.filename}` : undefined,
            createdBy: {
                adminId: req.admin.id,
                adminName: req.admin.name || 'Admin'
            }
        });

        await subLocation.save();
        res.status(201).json({ success: true, data: subLocation });
    } catch (err) {
        console.error('Error creating sublocation:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateSubLocation = async (req, res) => {
    try {
        const { name, location, mapLink, order, status } = req.body;
        const updateData = {
            name,
            location,
            mapLink,
            order,
            status: status === 'true' || status === true
        };
        if (req.file) updateData.image = `/uploads/${req.file.filename}`;

        const subLocation = await SubLocation.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ success: true, data: subLocation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAllSubLocations = async (req, res) => {
    try {
        const subLocations = await SubLocation.find()
            .populate('location', 'name')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: subLocations });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteSubLocation = async (req, res) => {
    try {
        await SubLocation.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'SubLocation deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
