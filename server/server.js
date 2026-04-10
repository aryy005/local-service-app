require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
  socket.on('join_chat', (bookingId) => socket.join(bookingId));
  socket.on('send_message', async (data) => {
    const Message = require('./models/Message');
    try {
      const newMsg = new Message({
        bookingId: data.bookingId,
        sender: data.senderId,
        receiver: data.receiverId,
        text: data.text
      });
      await newMsg.save();
      await newMsg.populate('sender', 'name');
      io.to(data.bookingId).emit('receive_message', newMsg);
    } catch(err) {
      console.error('Socket message error:', err);
    }
  });
  socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});

app.use(express.json());
app.use(cors({
  origin: (origin, callback) => { callback(null, true); },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/verify', require('./routes/verification'));
app.use('/api/providers', require('./routes/providers'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/messages', require('./routes/messages'));

const PORT = process.env.PORT || 5000;

const connectDB = async () => {
  try {
    let uri = process.env.MONGO_URI;
    if (!uri) {
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        uri = mongoServer.getUri();
      } catch(e) {
        console.error('No MONGO_URI set.');
        process.exit(1);
      }
    }
    await mongoose.connect(uri);
    console.log('MongoDB Connected!');
    await seedDatabase();
    server.listen(PORT, () => console.log('Server started on port ' + PORT));
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
};

async function seedDatabase() {
  const User = require('./models/User');
  await User.deleteOne({ email: 'admin@localpro.com', role: 'admin' });
  await User.create({
    name: 'System Admin',
    email: 'admin@localpro.com',
    password: 'password123',
    phone: '999-999-9999',
    role: 'admin'
  });
  console.log('Admin seeded: admin@localpro.com / password123');

  await User.deleteMany({ role: 'provider', email: { $ne: 'admin@localpro.com' } });
  
  const providerCount = await User.countDocuments({ role: 'provider' });
  if (providerCount === 0) {
    const providersList = [
      {
        name: 'Rajesh Kumar', email: 'rajesh@example.com', password: 'password123', role: 'provider', phone: '+919876543210', emailVerified: true, phoneVerified: true,
        providerDetails: {
          category: 'cat-1', rating: 4.8, reviewsCount: 124, location: 'Downtown Area', hourlyRate: 15,
          locationGeo: { type: 'Point', coordinates: [75.8573, 30.9010] }, // ~Center
          description: 'Expert tailor with over 15 years of experience in custom suiting and quick alterations. I guarantee a perfect fit every time.',
          skills: ['Suits', 'Alterations', 'Embroidery'],
          avatarUrl: 'https://images.unsplash.com/photo-1544723795-3cj5a4a5t6f1?auto=format&fit=crop&q=80&w=150&h=150', aadhaarVerified: true, aadhaarLastFour: '1234'
        }
      },
      {
        name: 'Vikram Singh', email: 'vikram@example.com', password: 'password123', role: 'provider', phone: '+919876543211', emailVerified: true, phoneVerified: true,
        providerDetails: {
          category: 'cat-2', rating: 4.9, reviewsCount: 89, location: 'North Side', hourlyRate: 25,
          locationGeo: { type: 'Point', coordinates: [75.8800, 30.9200] }, // ~Nearby (approx 3km)
          description: 'Master carpenter specializing in bespoke furniture and modern wooden interiors. Quality timber only.',
          skills: ['Furniture', 'Cabinetry', 'Repairs'],
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150', aadhaarVerified: true, aadhaarLastFour: '5678'
        }
      },
      {
        name: 'Anil Painter', email: 'anil@example.com', password: 'password123', role: 'provider', phone: '+919876543212', emailVerified: true, phoneVerified: true,
        providerDetails: {
          category: 'cat-3', rating: 4.6, reviewsCount: 56, location: 'East Side', hourlyRate: 18,
          locationGeo: { type: 'Point', coordinates: [75.9500, 30.8500] }, // ~Farther (approx 10km)
          description: 'Professional painter with expertise in home interiors and waterproofing. I leave the place spotless.',
          skills: ['Interior', 'Exterior', 'Textures'],
          avatarUrl: 'https://images.unsplash.com/photo-1552058544-e2eb4ba49d8e?auto=format&fit=crop&q=80&w=150&h=150', aadhaarVerified: false
        }
      },
      {
        name: 'Sham the Cobbler', email: 'sham@example.com', password: 'password123', role: 'provider', phone: '+919876543213', emailVerified: true, phoneVerified: true,
        providerDetails: {
          category: 'cat-4', rating: 4.7, reviewsCount: 200, location: 'Jalandhar', hourlyRate: 10,
          locationGeo: { type: 'Point', coordinates: [75.5762, 31.3260] }, // Very far (approx ~60km)
          description: 'Trusted by the community for 20 years. Give your old shoes a new life! Specialized in leather.',
          skills: ['Leather Repair', 'Polishing', 'Stitching'],
          avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=150&h=150', aadhaarVerified: true, aadhaarLastFour: '9012'
        }
      },
      {
        name: 'Arun Electric', email: 'arun@example.com', password: 'password123', role: 'provider', phone: '+919876543214', emailVerified: true, phoneVerified: true,
        providerDetails: {
          category: 'cat-5', rating: 4.9, reviewsCount: 312, location: 'West Zone', hourlyRate: 22,
          locationGeo: { type: 'Point', coordinates: [75.8000, 30.8900] }, // ~Nearby
          description: 'Licensed electrician for all home and commercial needs. Safety first!',
          skills: ['Wiring', 'Appliance Repair', 'Lighting'],
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150&h=150', aadhaarVerified: true, aadhaarLastFour: '4321'
        }
      },
      {
        name: 'Deepak Plumbing Services', email: 'deepak@example.com', password: 'password123', role: 'provider', phone: '+919876543215', emailVerified: true, phoneVerified: false,
        providerDetails: {
          category: 'cat-6', rating: 4.5, reviewsCount: 145, location: 'Amritsar', hourlyRate: 20,
          locationGeo: { type: 'Point', coordinates: [74.8723, 31.6340] }, // Very far (approx ~140km)
          description: 'Fast and reliable plumbing services. 24/7 emergency calls accepted.',
          skills: ['Pipe Fitting', 'Leak fixes', 'Installation'],
          avatarUrl: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&q=80&w=150&h=150', aadhaarVerified: false
        }
      },
      {
        name: 'Pristine Laundry Care', email: 'laundry@example.com', password: 'password123', role: 'provider', phone: '+919876543216', emailVerified: true, phoneVerified: true,
        providerDetails: {
          category: 'cat-7', rating: 4.8, reviewsCount: 220, location: 'Central Downtown', hourlyRate: 12,
          locationGeo: { type: 'Point', coordinates: [75.8600, 30.9050] }, // ~Nearby
          description: 'Premium dry cleaning and laundry services with free pickup & drop. We treat your clothes with utmost care.',
          skills: ['Dry Cleaning', 'Steam Ironing', 'Stain Removal'],
          avatarUrl: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&q=80&w=150&h=150', aadhaarVerified: true, aadhaarLastFour: '7890'
        }
      },
      {
        name: 'Spotless Homes Cleaning', email: 'cleaning@example.com', password: 'password123', role: 'provider', phone: '+919876543217', emailVerified: true, phoneVerified: true,
        providerDetails: {
          category: 'cat-8', rating: 4.9, reviewsCount: 415, location: 'South India', hourlyRate: 35,
          locationGeo: { type: 'Point', coordinates: [77.5946, 12.9716] }, // Bangalore / Very far (~2000km)
          description: 'Top-rated deep cleaning for homes and commercial offices. Professional team, eco-friendly products, and guaranteed satisfaction.',
          skills: ['Deep Cleaning', 'Sanitization', 'Office Maintenance'],
          avatarUrl: 'https://images.unsplash.com/photo-1562663474-6cbb3eaa4d14?auto=format&fit=crop&q=80&w=150&h=150', aadhaarVerified: true, aadhaarLastFour: '2468'
        }
      }
    ];
    await User.insertMany(providersList);
    console.log('Mock providers seeded successfully');
  }
}

connectDB();
