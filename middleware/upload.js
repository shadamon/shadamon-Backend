const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Ensure uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Memory Storage so we can process buffer with Sharp
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Max 5 files
    }
});

/**
 * Middleware to process uploaded images:
 * - Converts to WebP
 * - Saves to disk with .webp extension
 * - Updates req.file/req.files
 */
const processImages = async (req, res, next) => {
    if (!req.file && !req.files) return next();

    const processFile = async (file) => {
        try {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const filename = (file.fieldname || 'file') + '-' + uniqueSuffix + '.webp';
            const filepath = path.join('uploads', filename);

            // Convert buffer to WebP and ensure it's under 100KB
            let quality = 80;
            let outputBuffer = await sharp(file.buffer)
                .webp({ quality })
                .toBuffer();

            // Loop to reduce quality if size is > 100KB
            while (outputBuffer.length > 100 * 1024 && quality > 10) {
                quality -= 5;
                outputBuffer = await sharp(file.buffer)
                    .webp({ quality })
                    .toBuffer();
            }

            // If still > 100KB, resize the image
            if (outputBuffer.length > 100 * 1024) {
                outputBuffer = await sharp(file.buffer)
                    .resize({ width: 1200, withoutEnlargement: true })
                    .webp({ quality: 60 })
                    .toBuffer();
            }

            // Final check - if still too large, more aggressive reduction
            if (outputBuffer.length > 100 * 1024) {
                outputBuffer = await sharp(file.buffer)
                    .resize({ width: 800, withoutEnlargement: true })
                    .webp({ quality: 40 })
                    .toBuffer();
            }

            await fs.promises.writeFile(filepath, outputBuffer);

            // Update file object properties
            file.filename = filename;
            file.path = filepath.replace(/\\/g, '/'); // Normalize path
            file.destination = 'uploads/';
            file.mimetype = 'image/webp';
            file.size = fs.statSync(filepath).size;

            // Remove buffer to free memory
            delete file.buffer;
        } catch (error) {
            console.error(`Error processing image ${file.originalname}:`, error);
            throw error;
        }
    };

    try {
        const promises = [];

        if (req.file) {
            promises.push(processFile(req.file));
        }

        if (req.files) {
            if (Array.isArray(req.files)) {
                // upload.array()
                req.files.forEach(file => promises.push(processFile(file)));
            } else {
                // upload.fields()
                Object.values(req.files).forEach(filesArray => {
                    if (Array.isArray(filesArray)) {
                        filesArray.forEach(file => promises.push(processFile(file)));
                    }
                });
            }
        }

        await Promise.all(promises);
        next();
    } catch (err) {
        next(err);
    }
};

// Wrapper object to replace direct multer instance
const uploadWrapper = {
    single: (field) => [upload.single(field), processImages],
    array: (field, maxCount) => [upload.array(field, maxCount), processImages],
    fields: (fields) => [upload.fields(fields), processImages],
    any: () => [upload.any(), processImages]
};

module.exports = uploadWrapper;
