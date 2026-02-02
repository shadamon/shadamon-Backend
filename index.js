require('dotenv').config();
const express = require('express');
const connectDB = require('./config/database');

// Import routes
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adRoutes = require('./routes/adRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const locationRoutes = require('./routes/locationRoutes');
const premierOpportunityRoutes = require('./routes/premierOpportunityRoutes');

console.log('✅ Routes imported successfully');
console.log('User routes:', typeof userRoutes);
console.log('Admin routes:', typeof adminRoutes);

// Error handlers
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// CORS middleware
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token, Accept');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Request logging middleware (for debugging)
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    next();
});

// Health check route
app.get('/', (req, res) => {
    res.json({
        message: 'Shadamon API Server',
        status: 'Running',
        version: '1.0.0'
    });
});

// API Routes
app.use('/api/user', userRoutes);
app.use('/api/auth', adminRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/premier-opportunity', premierOpportunityRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        message: 'Route not found',
        path: req.originalUrl
    });
});

const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();

        // Start Express server
        app.listen(PORT, () => {
            console.log(`\n🚀 Server running on port ${PORT}`);
            console.log(`\n📍 Available routes:`);
            console.log(`   GET  /                        - Health check`);
            console.log(`   POST /api/user/register       - User Registration`);
            console.log(`   POST /api/user/login          - User Login`);
            console.log(`   POST /api/auth/login          - Admin Login`);
            console.log(`   GET  /api/admins              - Get all admins (Protected)`);
            console.log(`   POST /api/admins              - Create admin (Super Admin)`);
            console.log(`   PUT  /api/admins/:id          - Update admin (Super Admin)`);
            console.log(`   DELETE /api/admins/:id        - Delete admin (Super Admin)`);
            console.log(`\n✨ Ready to accept requests!\n`);
        });
    } catch (err) {
        console.error("❌ Failed to start server:", err);
        process.exit(1);
    }
};

startServer();