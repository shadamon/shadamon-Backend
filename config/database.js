const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
    } catch (err) {
        console.error("❌ MongoDB connection failed:", err);
        process.exit(1);
    }
};

mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
});

module.exports = connectDB;
