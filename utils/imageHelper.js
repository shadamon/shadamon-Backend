/**
 * Converts a file buffer to a base64 Data URI string.
 * @param {Object} file - The file object from multer (must have buffer and mimetype).
 * @returns {string|null} - The base64 Data URI.
 */
const fileToBase64 = (file) => {
    if (!file || !file.buffer || !file.mimetype) return null;
    return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
};

/**
 * Ensures a string is a valid Data URI or returns it if it's a URL/path.
 * @param {string} str - The string to check.
 * @returns {string|null}
 */
const processImageString = (str) => {
    if (!str || typeof str !== 'string') return null;
    if (str.startsWith('data:') || str.startsWith('/') || str.startsWith('http')) return str;
    // Assume raw base64, default to jpeg
    return `data:image/jpeg;base64,${str}`;
};

module.exports = { fileToBase64, processImageString };
