require('dotenv').config();
const mongoose = require('mongoose');

async function cleanDatabase() {
  try {
    let uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/localfixr';
    console.log('Connecting to MongoDB at:', uri);

    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
      console.log('Connected to MongoDB.');
    } catch(connErr) {
      console.log('Local MongoDB not running. Using MongoDB Memory Server...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      await mongoose.connect(uri);
      console.log('Connected to MongoDB Memory Server.');
    }

    const User = require('./models/User');
    const Booking = require('./models/Booking');
    const Payment = require('./models/Payment');
    const Message = require('./models/Message');

    console.log('Clearing all collections...');
    await Promise.all([
      User.deleteMany({}),
      Booking.deleteMany({}),
      Payment.deleteMany({}),
      Message.deleteMany({})
    ]);
    console.log('✓ All Users, Bookings, Payments, and Messages deleted.');

    // Seed fresh System Admin
    const adminUser = new User({
      name: 'System Admin',
      email: 'admin@localfixr.com',
      password: 'password123',
      phone: '+919999999999',
      role: 'admin',
      emailVerified: true,
      phoneVerified: true
    });

    await adminUser.save();
    console.log('✓ Clean System Admin created: admin@localfixr.com / password123');

    console.log('\n✨ Database clean reset completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error during DB clean reset:', err);
    process.exit(1);
  }
}

cleanDatabase();
