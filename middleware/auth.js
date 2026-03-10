const jwt = require('jsonwebtoken');

// Verify JWT token for admin routes
const verifyToken = (req, res, next) => {
    let token = req.header('x-auth-token');

    // Also check Authorization header
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    // Handle missing or invalid token strings
    if (!token || token === 'undefined' || token === 'null') {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (e) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Check specific permission
const checkPermission = (permission) => {
    return async (req, res, next) => {
        try {
            // First check if permissions are in the JWT payload (for performance)
            if (req.admin.permissions && req.admin.permissions[permission] === true) {
                return next();
            }

            // Fallback: Fetch latest from database (in case of old tokens or fresh updates)
            const Admin = require('../models/Admin');
            const admin = await Admin.findById(req.admin.id);

            if (!admin || !admin.permissions || admin.permissions.get(permission) !== true) {
                return res.status(403).json({
                    message: `Access denied. Requires '${permission}' permission.`
                });
            }

            // Update req.admin for subsequent middleware in this request
            req.admin.permissions = admin.permissions;
            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ message: 'Internal server error during permission check' });
        }
    };
};


// Authenticate regular users
const authenticateUser = (req, res, next) => {
    let token = req.cookies?.token;

    // Also check Authorization header
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Optional Authentication
const optionalAuthenticateUser = (req, res, next) => {
    let token = req.cookies?.token;

    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        } catch (err) {
            // Invalid token, just proceed as guest
        }
    }
    next();
};

module.exports = {
    verifyToken,
    checkPermission,
    authenticateUser,
    optionalAuthenticateUser
};
