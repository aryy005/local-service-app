require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { MongoMemoryServer } = require('mongodb-memory-server');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('User connected to websocket:', socket.id);

  socket.on('join_chat', (bookingId) => {
    socket.join(bookingId);
  });

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
      
      // Broadcast to both users in the room
      io.to(data.bookingId).emit('receive_message', newMsg);
    } catch(err) {
      console.error('Socket message error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Middleware
app.use(express.json());

// Explicit CORS config to support:
// - Vercel web frontend
// - Capacitor Android APK (capacitor://localhost, http://localhost)
// - Local development (http://localhost:5173)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    // and all origins for maximum compatibility
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));


// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/providers', require('./routes/providers'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/messages', require('./routes/messages'));

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

    await seedDatabase();

    server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
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

    const mockAdmin = {
      name: 'System Admin',
      email: 'admin@localpro.com',
      password: hash,
      phone: '999-999-9999',
      role: 'admin'
    };

    await User.insertMany([mockAdmin]);
    console.log('Database seeded with admin account.');
    console.log('Admin login -> admin@localpro.com | password123');
  }
}

connectDB();
