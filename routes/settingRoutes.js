const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { verifyToken, checkPermission } = require('../middleware/auth');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Use multer with memory storage directly, circumventing global upload middleware
const storage = multer.memoryStorage();
const uploadSettings = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadFields = uploadSettings.fields([
    { name: 'siteLogo', maxCount: 1 },
    { name: 'favIcon', maxCount: 1 },
    { name: 'watermarkLogo', maxCount: 1 }
]);

const getDatedUploadParts = () => {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dir = path.join('uploads', year, month, day);
    return { year, month, day, dir };
};

const processSettingsImages = async (req, res, next) => {
    if (!req.files) return next();

    req.customFiles = {};

    const processFile = async (fieldname, fileArray) => {
        if (!fileArray || fileArray.length === 0) return;
        const file = fileArray[0];

        try {
            const { year, month, day, dir } = getDatedUploadParts();
            await fs.promises.mkdir(dir, { recursive: true });

            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            // "make rename as logo always" implies keeping 'logo' in filename as prefix or base
            const filename = fieldname + '-logo-' + uniqueSuffix + '.webp';
            const filepath = path.join(dir, filename);

            // Compress these images in 500*500, webp format, and ensure under 100KB
            let quality = 80;
            let outputBuffer = await sharp(file.buffer)
                .resize(500, 500, {
                    fit: sharp.fit.inside,
                    withoutEnlargement: true
                })
                .webp({ quality })
                .toBuffer();

            // Loop to reduce quality if size is > 100KB
            while (outputBuffer.length > 100 * 1024 && quality > 20) {
                quality -= 10;
                outputBuffer = await sharp(file.buffer)
                    .resize(500, 500, {
                        fit: sharp.fit.inside,
                        withoutEnlargement: true
                    })
                    .webp({ quality })
                    .toBuffer();
            }

            await fs.promises.writeFile(filepath, outputBuffer);

            req.customFiles[fieldname] = `uploads/${year}/${month}/${day}/${filename}`;
        } catch (error) {
            console.error(`Error processing image ${fieldname}:`, error);
        }
    };

    try {
        await Promise.all([
            processFile('siteLogo', req.files['siteLogo']),
            processFile('favIcon', req.files['favIcon']),
            processFile('watermarkLogo', req.files['watermarkLogo']),
        ]);
        next();
    } catch (err) {
        next(err);
    }
};

router.get('/', verifyToken, checkPermission('Settings & Others'), settingController.getSettings);
router.put('/', verifyToken, checkPermission('Settings & Others'), uploadFields, processSettingsImages, settingController.updateSettings);

// Public route to fetch settings (Dashboard)
router.get('/dashboard', settingController.getDashboardSettings);

// Public route to fetch settings (Post Ad)
router.get('/post-ad', settingController.getPostAdSettings);

module.exports = router;
