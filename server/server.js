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
  // ── Chat Events ──────────────────────────────────────────────────────────
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

  // ── Live GPS Tracking Events ──────────────────────────────────────────────
  // Customer joins the tracking room for a booking to receive live location
  socket.on('join_tracking_room', (bookingId) => {
    socket.join(`track-${bookingId}`);
    console.log(`Socket ${socket.id} joined tracking room track-${bookingId}`);
  });

  // Provider emits their GPS coordinates; server relays to all in the room
  socket.on('provider_location', ({ bookingId, lat, lng, accuracy }) => {
    io.to(`track-${bookingId}`).emit('provider_location_update', {
      lat,
      lng,
      accuracy,
      ts: Date.now()
    });
  });

  // Provider signals tracking has stopped (moved to in_progress or beyond)
  socket.on('stop_tracking', (bookingId) => {
    io.to(`track-${bookingId}`).emit('tracking_stopped');
  });

  socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
  origin: (origin, callback) => { callback(null, true); },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

const path = require('path');

app.use('/api/auth', require('./routes/auth'));
app.use('/api/verify', require('./routes/verification'));
app.use('/api/providers', require('./routes/providers'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/payments', require('./routes/payments'));

// Serve static build assets & SPA fallback for page reloads (e.g. /provider-dashboard, /customer-dashboard)
const distPath = path.join(__dirname, '../dist');
if (require('fs').existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}


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
  const Booking = require('./models/Booking');
  const Payment = require('./models/Payment');
  const Review = require('./models/Review');
  const Complaint = require('./models/Complaint');

  // 1. Ensure System Admin exists
  const adminExists = await User.findOne({ email: 'admin@localfixr.com', role: 'admin' });
  if (!adminExists) {
    await User.create({
      name: 'System Admin',
      email: 'admin@localfixr.com',
      password: 'password123',
      phone: '+919999999999',
      role: 'admin',
      emailVerified: true,
      phoneVerified: true
    });
    console.log('✔ System Admin ready: admin@localfixr.com / password123');
  }

  // 2. Seed Providers if empty
  const providerCount = await User.countDocuments({ role: 'provider' });
  if (providerCount === 0) {
    console.log('Seeding initial providers into database...');
    const seedProviders = [
      {
        name: 'Arun Sharma',
        email: 'arun.electrician@localfixr.com',
        phone: '+91 98150 11223',
        password: 'password123',
        role: 'provider',
        city: 'Chandigarh',
        emailVerified: true,
        phoneVerified: true,
        providerDetails: {
          category: 'Electrician',
          categoryName: 'Electrician',
          location: 'Sector 35, Chandigarh',
          hourlyRate: 350,
          experienceYears: 6,
          rating: 4.9,
          status: 'Verified',
          aadhaarVerified: true,
          aadhaarLastFour: '4821',
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
          skills: ['Wiring', 'MCB Installation', 'Inverter Repairs', 'Ceiling Fans'],
          documents: [
            { title: 'Aadhaar Card', status: 'Verified', uploadedAt: new Date() },
            { title: 'Electrical License (Class A)', status: 'Verified', uploadedAt: new Date() }
          ]
        }
      },
      {
        name: 'Deepak Verma',
        email: 'deepak.plumber@localfixr.com',
        phone: '+91 98760 22334',
        password: 'password123',
        role: 'provider',
        city: 'Mohali',
        emailVerified: true,
        phoneVerified: true,
        providerDetails: {
          category: 'Plumber',
          categoryName: 'Plumber',
          location: 'Phase 7, Mohali',
          hourlyRate: 300,
          experienceYears: 8,
          rating: 4.8,
          status: 'Verified',
          aadhaarVerified: true,
          aadhaarLastFour: '7192',
          avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=200',
          skills: ['Pipe Leakages', 'Sanitary Fittings', 'Water Tank Cleaning'],
          documents: [
            { title: 'Aadhaar Card', status: 'Verified', uploadedAt: new Date() },
            { title: 'Trade Certificate', status: 'Verified', uploadedAt: new Date() }
          ]
        }
      },
      {
        name: 'Vikram Singh',
        email: 'vikram.carpenter@localfixr.com',
        phone: '+91 98880 33445',
        password: 'password123',
        role: 'provider',
        city: 'Panchkula',
        emailVerified: true,
        phoneVerified: true,
        providerDetails: {
          category: 'Carpenter',
          categoryName: 'Carpenter',
          location: 'Sector 12, Panchkula',
          hourlyRate: 400,
          experienceYears: 5,
          rating: 4.7,
          status: 'Pending',
          aadhaarVerified: false,
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
          skills: ['Furniture Assembly', 'Door Locks', 'Modular Kitchen Repair'],
          documents: [
            { title: 'Aadhaar Card (Pending Review)', status: 'Pending', uploadedAt: new Date() },
            { title: 'Apprenticeship Proof', status: 'Pending', uploadedAt: new Date() }
          ]
        }
      },
      {
        name: 'Anil Kapoor',
        email: 'anil.painter@localfixr.com',
        phone: '+91 98140 44556',
        password: 'password123',
        role: 'provider',
        city: 'Chandigarh',
        emailVerified: true,
        phoneVerified: true,
        providerDetails: {
          category: 'Painter',
          categoryName: 'Painter',
          location: 'Sector 22, Chandigarh',
          hourlyRate: 350,
          experienceYears: 7,
          rating: 4.6,
          status: 'Verified',
          aadhaarVerified: true,
          aadhaarLastFour: '9903',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
          skills: ['Interior Painting', 'Wall Textures', 'Waterproofing'],
          documents: [
            { title: 'Aadhaar Card', status: 'Verified', uploadedAt: new Date() }
          ]
        }
      },
      {
        name: 'Sunil Mehta',
        email: 'sunil.ac@localfixr.com',
        phone: '+91 98720 55667',
        password: 'password123',
        role: 'provider',
        city: 'Zirakpur',
        emailVerified: true,
        phoneVerified: false,
        providerDetails: {
          category: 'AC Repair',
          categoryName: 'AC Repair',
          location: 'VIP Road, Zirakpur',
          hourlyRate: 500,
          experienceYears: 4,
          rating: 4.5,
          status: 'Pending',
          aadhaarVerified: false,
          avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=200',
          skills: ['Split AC Jet Service', 'Gas Refill', 'Compressor Diagnostics'],
          documents: [
            { title: 'Aadhaar Card (Pending)', status: 'Pending', uploadedAt: new Date() },
            { title: 'HVAC Certification', status: 'Pending', uploadedAt: new Date() }
          ]
        }
      },
      {
        name: 'Rakesh Joshi',
        email: 'rakesh.pest@localfixr.com',
        phone: '+91 98890 66778',
        password: 'password123',
        role: 'provider',
        city: 'Chandigarh',
        emailVerified: true,
        phoneVerified: true,
        providerDetails: {
          category: 'Pest Control',
          categoryName: 'Pest Control',
          location: 'Industrial Area, Chandigarh',
          hourlyRate: 450,
          experienceYears: 3,
          rating: 3.9,
          status: 'Suspended',
          aadhaarVerified: true,
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
          skills: ['Termite Treatment', 'Bedbug Control', 'Cockroach Gel'],
          documents: [
            { title: 'Aadhaar Card', status: 'Verified', uploadedAt: new Date() }
          ]
        }
      }
    ];

    await User.insertMany(seedProviders);
    console.log('✔ Seeded 6 providers');
  }

  // 3. Seed Customers if empty
  const customerCount = await User.countDocuments({ role: 'customer' });
  if (customerCount === 0) {
    console.log('Seeding initial customers into database...');
    const seedCustomers = [
      {
        name: 'Priya Patel',
        email: 'priya.patel@gmail.com',
        phone: '+91 98140 12345',
        password: 'password123',
        role: 'customer',
        city: 'Chandigarh',
        emailVerified: true,
        phoneVerified: true,
        addressDetails: {
          street: '#402, Sector 34-C',
          city: 'Chandigarh',
          state: 'Punjab',
          pincode: '160022'
        }
      },
      {
        name: 'Rahul Khanna',
        email: 'rahul.khanna@gmail.com',
        phone: '+91 98720 54321',
        password: 'password123',
        role: 'customer',
        city: 'Mohali',
        emailVerified: true,
        phoneVerified: true,
        addressDetails: {
          street: 'House 112, Phase 3B2',
          city: 'Mohali',
          state: 'Punjab',
          pincode: '160059'
        }
      },
      {
        name: 'Neha Gupta',
        email: 'neha.gupta@gmail.com',
        phone: '+91 98880 67890',
        password: 'password123',
        role: 'customer',
        city: 'Panchkula',
        emailVerified: true,
        phoneVerified: true,
        addressDetails: {
          street: 'Flat 5B, Sector 20',
          city: 'Panchkula',
          state: 'Haryana',
          pincode: '134116'
        }
      }
    ];

    await User.insertMany(seedCustomers);
    console.log('✔ Seeded 3 customers');
  }

  // 4. Seed Bookings if empty
  const bookingCount = await Booking.countDocuments();
  if (bookingCount === 0) {
    console.log('Seeding initial bookings into database...');
    const arun = await User.findOne({ email: 'arun.electrician@localfixr.com' });
    const deepak = await User.findOne({ email: 'deepak.plumber@localfixr.com' });
    const priya = await User.findOne({ email: 'priya.patel@gmail.com' });
    const rahul = await User.findOne({ email: 'rahul.khanna@gmail.com' });
    const neha = await User.findOne({ email: 'neha.gupta@gmail.com' });

    if (arun && deepak && priya && rahul && neha) {
      const b1 = new Booking({
        orderId: 'BK-8491',
        orderNumber: 8491,
        customerId: priya._id,
        providerId: arun._id,
        date: new Date().toLocaleDateString('en-US'),
        timePreference: '10:00 AM - 12:00 PM',
        description: 'Emergency MCB Tripping & Full Switchboard Diagnostics',
        serviceAddress: '#402, Sector 34-C, Chandigarh',
        status: 'completed',
        serviceStage: 'completed',
        finalPrice: 850,
        paidAmount: 850,
        paymentStatus: 'paid',
        paymentMethod: 'upi',
        billingDetails: { serviceAmount: 722.5, platformFee: 127.5, tax: 0, totalAmount: 850 },
        stageHistory: [
          { stage: 'requested', title: 'Booking Requested', timestamp: new Date(Date.now() - 3600000 * 5) },
          { stage: 'accepted', title: 'Provider Accepted', timestamp: new Date(Date.now() - 3600000 * 4) },
          { stage: 'completed', title: 'Service Completed', timestamp: new Date(Date.now() - 3600000 * 2) }
        ]
      });
      await b1.save();

      // Linked Payment record
      await Payment.create({
        bookingId: b1._id,
        customerId: priya._id,
        providerId: arun._id,
        amount: 850,
        platformFee: 127.5,
        serviceAmount: 722.5,
        tax: 0,
        transactionId: 'TXN-8491-' + Date.now(),
        paymentMethod: 'upi',
        status: 'success'
      });

      const b2 = new Booking({
        orderId: 'BK-8492',
        orderNumber: 8492,
        customerId: rahul._id,
        providerId: deepak._id,
        date: new Date().toLocaleDateString('en-US'),
        timePreference: '02:00 PM - 04:00 PM',
        description: 'Kitchen Sink Drain Blockage & Pipe Replacement',
        serviceAddress: 'House 112, Phase 3B2, Mohali',
        status: 'accepted',
        serviceStage: 'in_progress',
        finalPrice: 450,
        paidAmount: 0,
        paymentStatus: 'unpaid',
        stageHistory: [
          { stage: 'requested', title: 'Booking Requested', timestamp: new Date(Date.now() - 3600000 * 3) },
          { stage: 'accepted', title: 'Provider Accepted', timestamp: new Date(Date.now() - 3600000 * 2) },
          { stage: 'in_progress', title: 'Work In Progress', timestamp: new Date(Date.now() - 1800000) }
        ]
      });
      await b2.save();

      const b3 = new Booking({
        orderId: 'BK-8493',
        orderNumber: 8493,
        customerId: neha._id,
        providerId: arun._id,
        date: new Date().toLocaleDateString('en-US'),
        timePreference: '04:00 PM - 06:00 PM',
        description: 'Living Room Fancy Chandelier & Fan Installation',
        serviceAddress: 'Flat 5B, Sector 20, Panchkula',
        status: 'accepted',
        serviceStage: 'accepted',
        finalPrice: 600,
        paidAmount: 0,
        paymentStatus: 'unpaid',
        stageHistory: [
          { stage: 'requested', title: 'Booking Requested', timestamp: new Date(Date.now() - 3600000) },
          { stage: 'accepted', title: 'Provider Accepted', timestamp: new Date(Date.now() - 1800000) }
        ]
      });
      await b3.save();

      // Seed Reviews
      await Review.create([
        {
          provider: arun._id,
          customer: priya._id,
          rating: 5,
          comment: 'Arun was extremely punctual and fixed the MCB issue within 30 minutes! Highly professional.'
        },
        {
          provider: deepak._id,
          customer: rahul._id,
          rating: 4,
          comment: 'Quick and clean work on the kitchen pipe leak.'
        }
      ]);

      // Seed Complaints
      await Complaint.create([
        {
          bookingId: b2._id,
          bookingRef: '#BK-8492',
          customerId: rahul._id,
          providerId: deepak._id,
          subject: 'Provider arrived 20 minutes late without prior call',
          description: 'Provider was delayed due to traffic but did not inform beforehand. Service quality was good though.',
          status: 'under_review',
          priority: 'low'
        }
      ]);

      console.log('✔ Seeded bookings, payments, reviews & complaints');
    }
  }
}

connectDB();
