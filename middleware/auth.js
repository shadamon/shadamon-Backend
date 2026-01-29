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

// Check if user is super admin
const checkSuperAdmin = (req, res, next) => {
    if (req.admin.role !== 'super-admin') {
        return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }
    next();
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

module.exports = {
    verifyToken,
    checkSuperAdmin,
    authenticateUser
};
