const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Admin = require('./models/Admin'); // Use Admin model

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const existingAdmin = await Admin.findOne({ email: 'admin@shadamon.com' });
        if (existingAdmin) {
            console.log('Admin user already exists.');
            process.exit(0);
        }

        const adminUser = new Admin({
            email: 'admin@shadamon.com',
            password: 'password123', // Will be hashed by pre-save hook
            staffName: 'Super Admin',
            staffType: 'Super Admin',
            status: true,
            permissions: {
                all: true
            }
        });

        await adminUser.save();
        console.log('Admin user seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
