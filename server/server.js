require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/providers', require('./routes/providers'));
app.use('/api/bookings', require('./routes/bookings'));

const PORT = process.env.PORT || 5000;

// Connect Database
const connectDB = async () => {
  try {
    let uri = process.env.MONGO_URI;

    if (!uri) {
      console.log('No MONGO_URI provided. Starting in-memory MongoDB instance for development...');
      const mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
    }

    await mongoose.connect(uri);
    console.log('==============================================');
    console.log('✅ MongoDB Connected!');
    console.log('🔗 Connection String:');
    console.log(uri);
    console.log('==============================================');

    app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
};

async function seedDatabase() {
  const User = require('./models/User');
  const bcrypt = require('bcrypt');

  const count = await User.countDocuments();
  if (count === 0) {
    console.log('Seeding mock providers...');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);

    const mockProviders = [
      {
        name: 'Sham the Cobbler',
        email: 'sham@example.com',
        password: hash,
        role: 'provider',
        providerDetails: {
          category: 'cat-4',
          hourlyRate: 15,
          location: 'Main Market Square',
          description: 'Trusted by the community for 20 years. Specialized in leather.',
          skills: ['Leather', 'Polishing'],
          rating: 4.8,
          reviewsCount: 120
        }
      },
      {
        name: 'Rajesh Kumar Tailor',
        email: 'rajesh@example.com',
        password: hash,
        role: 'provider',
        providerDetails: {
          category: 'cat-1',
          hourlyRate: 20,
          location: 'Downtown Area',
          description: 'Expert tailor with over 15 years experience.',
          skills: ['Suits', 'Alterations'],
          rating: 4.9,
          reviewsCount: 89
        }
      }
    ];

    await User.insertMany(mockProviders);
    console.log('Database seeded with test providers. Use password: password123 to test login.');
  }
}

connectDB();
