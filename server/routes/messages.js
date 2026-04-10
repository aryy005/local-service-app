const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// @route   GET api/messages/:bookingId
// @desc    Get all chat messages for a specific booking
router.get('/:bookingId', auth, async (req, res) => {
  try {
    const messages = await Message.find({ bookingId: req.params.bookingId })
      .populate('sender', 'name')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
