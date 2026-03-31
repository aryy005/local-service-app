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
}

connectDB();
