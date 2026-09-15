import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import User from './models/User.js';

dotenv.config();

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/localfixr';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Purge any legacy mock providers
    await User.deleteMany({ role: 'provider', email: { $ne: 'admin@localfixr.com' } });
    console.log('Cleared existing mock providers');

    // Ensure System Admin exists
    const adminExists = await User.findOne({ email: 'admin@localfixr.com' });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      await User.create({
        name: 'System Admin',
        email: 'admin@localfixr.com',
        password: hashedPassword,
        phone: '+919999999999',
        role: 'admin',
        emailVerified: true,
        phoneVerified: true
      });
      console.log('✔ System Admin account created: admin@localfixr.com');
    }

    console.log('Database is clean. Only real registered accounts allowed.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedDB();

