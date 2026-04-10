import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import User from './models/User.js';

dotenv.config();

const providers = [
  {
    name: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    password: 'password123',
    role: 'provider',
    phone: '+919876543210',
    emailVerified: true,
    phoneVerified: true,
    providerDetails: {
      category: 'cat-1',
      rating: 4.8,
      reviewsCount: 124,
      location: 'Downtown Area',
      hourlyRate: 15,
      description: 'Expert tailor with over 15 years of experience in custom suiting and quick alterations. I guarantee a perfect fit every time.',
      skills: ['Suits', 'Alterations', 'Embroidery'],
      avatarUrl: 'https://images.unsplash.com/photo-1544723795-3cj5a4a5t6f1?auto=format&fit=crop&q=80&w=150&h=150',
      aadhaarVerified: true,
      aadhaarLastFour: '1234'
    }
  },
  {
    name: 'Vikram Singh',
    email: 'vikram@example.com',
    password: 'password123',
    role: 'provider',
    phone: '+919876543211',
    emailVerified: true,
    phoneVerified: true,
    providerDetails: {
      category: 'cat-2',
      rating: 4.9,
      reviewsCount: 89,
      location: 'North Side',
      hourlyRate: 25,
      description: 'Master carpenter specializing in bespoke furniture and modern wooden interiors. Quality timber only.',
      skills: ['Furniture', 'Cabinetry', 'Repairs'],
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150',
      aadhaarVerified: true,
      aadhaarLastFour: '5678'
    }
  },
  {
    name: 'Anil Painter',
    email: 'anil@example.com',
    password: 'password123',
    role: 'provider',
    phone: '+919876543212',
    emailVerified: true,
    phoneVerified: true,
    providerDetails: {
      category: 'cat-3',
      rating: 4.6,
      reviewsCount: 56,
      location: 'East Side',
      hourlyRate: 18,
      description: 'Professional painter with expertise in home interiors and waterproofing. I leave the place spotless.',
      skills: ['Interior', 'Exterior', 'Textures'],
      avatarUrl: 'https://images.unsplash.com/photo-1552058544-e2eb4ba49d8e?auto=format&fit=crop&q=80&w=150&h=150',
      aadhaarVerified: false
    }
  },
  {
    name: 'Sham the Cobbler',
    email: 'sham@example.com',
    password: 'password123',
    role: 'provider',
    phone: '+919876543213',
    emailVerified: true,
    phoneVerified: true,
    providerDetails: {
      category: 'cat-4',
      rating: 4.7,
      reviewsCount: 200,
      location: 'Main Market Stage',
      hourlyRate: 10,
      description: 'Trusted by the community for 20 years. Give your old shoes a new life! Specialized in leather.',
      skills: ['Leather Repair', 'Polishing', 'Stitching'],
      avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=150&h=150',
      aadhaarVerified: true,
      aadhaarLastFour: '9012'
    }
  },
  {
    name: 'Arun Electric',
    email: 'arun@example.com',
    password: 'password123',
    role: 'provider',
    phone: '+919876543214',
    emailVerified: true,
    phoneVerified: true,
    providerDetails: {
      category: 'cat-5',
      rating: 4.9,
      reviewsCount: 312,
      location: 'West Zone',
      hourlyRate: 22,
      description: 'Licensed electrician for all home and commercial needs. Safety first!',
      skills: ['Wiring', 'Appliance Repair', 'Lighting'],
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150&h=150',
      aadhaarVerified: true,
      aadhaarLastFour: '4321'
    }
  },
  {
    name: 'Deepak Plumbing Services',
    email: 'deepak@example.com',
    password: 'password123',
    role: 'provider',
    phone: '+919876543215',
    emailVerified: true,
    phoneVerified: false,
    providerDetails: {
      category: 'cat-6',
      rating: 4.5,
      reviewsCount: 145,
      location: 'South Side',
      hourlyRate: 20,
      description: 'Fast and reliable plumbing services. 24/7 emergency calls accepted.',
      skills: ['Pipe Fitting', 'Leak fixes', 'Installation'],
      avatarUrl: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&q=80&w=150&h=150',
      aadhaarVerified: false
    }
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding');

    // Delete existing providers to prevent duplicates during multiple seeds
    await User.deleteMany({ role: 'provider', email: { $ne: 'admin@localpro.com' } });
    console.log('Cleared existing mock providers');

    for (let p of providers) {
      const salt = await bcrypt.genSalt(10);
      p.password = await bcrypt.hash(p.password, salt);
    }

    await User.insertMany(providers);
    console.log('Mock providers seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedDB();
