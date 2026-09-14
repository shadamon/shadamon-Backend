const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Ad = require('./models/Ad'); // Use Ad model

const seedAds = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const dummyAds = [
            {
                headline: 'iPhone 13 Pro Max - Pristine Condition',
                description: 'Selling my iPhone 13 Pro Max, 256GB storage, graphite color. Always kept in a case. Battery health 95%.',
                category: 'Electronics',
                subCategory: 'Mobile Phones',
                location: 'Dhaka',
                subLocation: 'Gulshan',
                phone: '+8801712345678',
                price: 95000,
                priceType: 'Negotiable',
                status: 'active',
                images: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=600&auto=format&fit=crop']
            },
            {
                headline: 'Toyota Corolla 2018 XLI',
                description: 'Well maintained Toyota Corolla 2018 model, single hand driven. All papers up to date. White color.',
                category: 'Vehicles',
                subCategory: 'Cars',
                location: 'Dhaka',
                subLocation: 'Banani',
                phone: '+8801812345678',
                price: 1850000,
                priceType: 'Fixed',
                status: 'active',
                images: ['https://images.unsplash.com/photo-1621007947382-bb3c3994e3fd?q=80&w=600&auto=format&fit=crop']
            },
            {
                headline: 'Luxury Apartment in Dhanmondi',
                description: '3 Bedroom, 3 Bathroom apartment available for rent. High floor, south facing with plenty of natural light. 1800 sqft.',
                category: 'Property',
                subCategory: 'Apartments For Rent',
                location: 'Dhaka',
                subLocation: 'Dhanmondi',
                phone: '+8801912345678',
                price: 45000,
                priceType: 'Fixed',
                status: 'active',
                images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=600&auto=format&fit=crop']
            },
            {
                headline: 'MacBook Pro M1 2020',
                description: 'Space Gray MacBook Pro with M1 chip. 8GB RAM, 256GB SSD. Barely used, comes with original box and charger.',
                category: 'Electronics',
                subCategory: 'Laptops',
                location: 'Chattogram',
                subLocation: 'Agrabad',
                phone: '+8801788888888',
                price: 85000,
                priceType: 'Negotiable',
                status: 'active',
                images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=600&auto=format&fit=crop']
            },
            {
                headline: 'Designer Sofa Set - 5 Seater',
                description: 'Premium quality wooden sofa set with comfortable cushions. 3+1+1 combination. Moving out sale.',
                category: 'Home & Living',
                subCategory: 'Furniture',
                location: 'Sylhet',
                subLocation: 'Zindabazar',
                phone: '+8801612345678',
                price: 25000,
                priceType: 'Negotiable',
                status: 'active',
                images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=600&auto=format&fit=crop']
            },
            {
                headline: 'KTM Duke 125cc Bike',
                description: 'KTM Duke 125cc for urgent sale. Registered in 2022. Driven only 8,000km. Excellent condition.',
                category: 'Vehicles',
                subCategory: 'Motorcycles',
                location: 'Khulna',
                subLocation: 'Sonadanga',
                phone: '+8801512345678',
                price: 210000,
                priceType: 'Fixed',
                status: 'active',
                images: ['https://images.unsplash.com/photo-1568772585407-9361f9bfce87?q=80&w=600&auto=format&fit=crop']
            }
        ];

        await Ad.insertMany(dummyAds);
        console.log('Dummy ads seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding ads:', error);
        process.exit(1);
    }
};

seedAds();
