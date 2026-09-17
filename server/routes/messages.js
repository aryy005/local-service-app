const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');

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
