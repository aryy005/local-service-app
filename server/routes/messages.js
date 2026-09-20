const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// @route   GET api/messages/conversations
// @desc    Get all conversation threads for the current user (customer or provider)
router.get('/conversations', auth, async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const userId = req.user.id;
    const isProvider = req.user.role === 'provider';

    // Find bookings where user is involved
    const query = isProvider ? { providerId: userId } : { customerId: userId };

    const bookings = await Booking.find(query)
      .populate('customerId', 'name phone avatarUrl')
      .populate('providerId', 'name phone avatarUrl providerDetails')
      .sort({ updatedAt: -1 });

    const conversations = await Promise.all(
      bookings.map(async (b) => {
        const lastMessage = await Message.findOne({ bookingId: b._id })
          .sort({ createdAt: -1 });

        const otherParty = isProvider ? b.customerId : b.providerId;
        return {
          bookingId: b._id,
          orderId: b.orderId || `ORD-${b._id.toString().slice(-6).toUpperCase()}`,
          serviceCategory: b.providerId?.providerDetails?.categoryName || b.providerId?.providerDetails?.category || 'Service',
          serviceStage: b.serviceStage || b.status,
          status: b.status,
          serviceDate: b.date,
          serviceAddress: b.serviceAddress,
          otherUser: {
            id: otherParty?._id,
            name: otherParty?.name || (isProvider ? 'Customer' : 'Service Specialist'),
            phone: otherParty?.phone,
            avatarUrl: otherParty?.avatarUrl || otherParty?.providerDetails?.avatarUrl,
            role: isProvider ? 'customer' : 'provider'
          },
          lastMessage: lastMessage ? {
            text: lastMessage.text,
            createdAt: lastMessage.createdAt,
            isMine: lastMessage.sender?.toString() === userId.toString()
          } : null,
          updatedAt: lastMessage ? lastMessage.createdAt : b.updatedAt
        };
      })
    );

    conversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.json(conversations);
  } catch (err) {
    console.error('Error in GET /api/messages/conversations:', err);
    res.status(500).json({ message: 'Server error fetching conversations' });
  }
});

router.get('/:bookingId', auth, async (req, res) => {
  try {
    const messages = await Message.find({ bookingId: req.params.bookingId })
      .populate('sender', 'name')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   POST api/messages
// @desc    Send a message for a booking with real-time socket emit
router.post('/', auth, async (req, res) => {
  try {
    const { bookingId, receiverId, text } = req.body;
    if (!bookingId || !text || !text.trim()) {
      return res.status(400).json({ message: 'bookingId and text are required' });
    }

    const Booking = require('../models/Booking');
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const userIdStr = req.user.id.toString();
    const customerIdStr = (booking.customerId?._id || booking.customerId)?.toString();
    const providerIdStr = (booking.providerId?._id || booking.providerId)?.toString();

    // Determine receiver if not explicitly provided
    let targetReceiverId = receiverId;
    if (!targetReceiverId) {
      targetReceiverId = (userIdStr === providerIdStr) ? customerIdStr : providerIdStr;
    }

    if (!targetReceiverId) {
      return res.status(400).json({ message: 'Could not resolve message receiver' });
    }

    const newMsg = new Message({
      bookingId,
      sender: req.user.id,
      receiver: targetReceiverId,
      text: text.trim()
    });

    await newMsg.save();
    await newMsg.populate('sender', 'name');

    // Broadcast via socket.io if attached
    const io = req.app.get('io');
    if (io) {
      const room = String(bookingId);
      io.to(room).emit('receive_message', newMsg);
    }

    res.json(newMsg);
  } catch (err) {
    console.error('Error in POST /api/messages:', err);
    res.status(500).json({ message: 'Server error sending message' });
  }
});

module.exports = router;
