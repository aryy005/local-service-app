const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
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
app.set('io', io);

io.on('connection', (socket) => {
  // ── Chat Events ──────────────────────────────────────────────────────────
  socket.on('join_chat', (bookingId) => {
    if (bookingId) {
      socket.join(String(bookingId));
    }
  });
  socket.on('send_message', async (data) => {
    const Message = require('./models/Message');
    try {
      if (!data || !data.bookingId || !data.text || !data.text.trim()) return;

      // Deduplicate: avoid double-saving if client sends via REST or rapid emits
      const recentDuplicate = await Message.findOne({
        bookingId: data.bookingId,
        sender: data.senderId,
        text: data.text.trim(),
        createdAt: { $gte: new Date(Date.now() - 3000) }
      });
      if (recentDuplicate) return;

      const newMsg = new Message({
        bookingId: data.bookingId,
        sender: data.senderId,
        receiver: data.receiverId,
        text: data.text.trim()
      });
      await newMsg.save();
      await newMsg.populate('sender', 'name');
      io.to(String(data.bookingId)).emit('receive_message', newMsg);
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

  // ── User Private Notification Room ─────────────────────────────────────────
  socket.on('join_user_room', (userId) => {
    if (userId) {
      socket.join(`user-${userId}`);
    }
  });

  // ── Booking Room for real-time payment / status synchronization ─────────────
  socket.on('join_booking_room', (bookingId) => {
    if (bookingId) {
      socket.join(`booking-${bookingId}`);
    }
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

app.use('/api/auth', require('./routes/auth'));
app.use('/api/verify', require('./routes/verification'));
app.use('/api/providers', require('./routes/providers'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/notifications', require('./routes/notifications'));

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

  // 2. Clear out any demo / mock users, bookings, reviews, complaints, and payments so database is 100% REAL
  const demoUsers = await User.find({
    $or: [
      {
        email: {
          $in: [
            'arun.electrician@localfixr.com',
            'deepak.plumber@localfixr.com',
            'vikram.carpenter@localfixr.com',
            'anil.painter@localfixr.com',
            'rajesh.tailor@localfixr.com',
            'sunil.ac@localfixr.com',
            'pooja.cleaning@localfixr.com',
            'rakesh.pest@localfixr.com',
            'priya.patel@gmail.com',
            'rahul.khanna@gmail.com',
            'neha.gupta@gmail.com',
            'rajesh@example.com',
            'vikram@example.com',
            'anil@example.com',
            'sham@example.com',
            'arun@example.com',
            'deepak@example.com'
          ]
        }
      },
      { email: { $regex: '(@example\\.com|real_test_|realcarpenter_|realuser_|test)' } }
    ]
  });

  const demoUserIds = demoUsers.map(u => u._id);

  if (demoUserIds.length > 0) {
    await User.deleteMany({ _id: { $in: demoUserIds } });
    await Booking.deleteMany({
      $or: [
        { customerId: { $in: demoUserIds } },
        { providerId: { $in: demoUserIds } },
        { orderId: { $in: ['BK-8491', 'BK-8492', 'BK-8493', 'BK-8494', 'BK-8495'] } }
      ]
    });
    await Payment.deleteMany({
      $or: [
        { customerId: { $in: demoUserIds } },
        { providerId: { $in: demoUserIds } }
      ]
    });
    await Review.deleteMany({
      $or: [
        { customer: { $in: demoUserIds } },
        { provider: { $in: demoUserIds } }
      ]
    });
    await Complaint.deleteMany({
      $or: [
        { customerId: { $in: demoUserIds } },
        { providerId: { $in: demoUserIds } }
      ]
    });
    console.log('✔ Purged all demo users and mock records. Database is 100% REAL.');
  }
}

connectDB();
