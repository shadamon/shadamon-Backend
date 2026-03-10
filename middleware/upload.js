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
            const filepath = path.join(uploadDir, filename);

            let quality = 80;
            let outputBuffer;
            let metadata = await sharp(file.buffer).metadata();

            // Initial conversion to WebP
            outputBuffer = await sharp(file.buffer)
                .webp({ quality })
                .toBuffer();

            // Loop to reduce quality if size is > 100KB
            while (outputBuffer.length > 100 * 1024 && quality > 15) {
                quality -= 5;
                outputBuffer = await sharp(file.buffer)
                    .webp({ quality })
                    .toBuffer();
            }

            // If still > 100KB, resize the image
            if (outputBuffer.length > 100 * 1024) {
                outputBuffer = await sharp(file.buffer)
                    .resize({ width: 1000, withoutEnlargement: true })
                    .webp({ quality: 60 })
                    .toBuffer();
            }

            // Final checks with more aggressive reduction if still too large
            if (outputBuffer.length > 100 * 1024) {
                outputBuffer = await sharp(file.buffer)
                    .resize({ width: 800, withoutEnlargement: true })
                    .webp({ quality: 40 })
                    .toBuffer();
            }

            // Deep compression for very large files
            if (outputBuffer.length > 100 * 1024) {
                outputBuffer = await sharp(file.buffer)
                    .resize({ width: 600, withoutEnlargement: true })
                    .webp({ quality: 20 })
                    .toBuffer();
            }

            await fs.promises.writeFile(filepath, outputBuffer);

            // Update file object properties for next middleware
            file.filename = filename;
            file.path = `uploads/${filename}`; // Standardized path
            file.destination = uploadDir;
            file.mimetype = 'image/webp';
            file.size = outputBuffer.length;

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
                req.files.forEach(file => promises.push(processFile(file)));
            } else {
                // Handle cases like upload.fields() or upload.any()
                const filesMap = req.files;
                for (const key in filesMap) {
                    const filesArray = filesMap[key];
                    if (Array.isArray(filesArray)) {
                        filesArray.forEach(file => promises.push(processFile(file)));
                    } else {
                        // In case any() is used and it's not an object of arrays
                        promises.push(processFile(filesMap[key]));
                    }
                }
            }
        }

        await Promise.all(promises);
        next();
    } catch (err) {
        console.error('Image Processing Middleware Error:', err);
        next(err);
    }
};

const uploadWrapper = {
    single: (field) => [upload.single(field), processImages],
    array: (field, maxCount) => [upload.array(field, maxCount), processImages],
    fields: (fields) => [upload.fields(fields), processImages],
    any: () => [upload.any(), processImages]
};

module.exports = uploadWrapper;
