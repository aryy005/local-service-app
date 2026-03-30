const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST api/bookings
// @desc    Create a booking request (Customer only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can book providers' });
    }

    const { providerId, date, timePreference, description, serviceAddress } = req.body;

    const provider = await User.findById(providerId);
    if (!provider || provider.role !== 'provider') {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const newBooking = new Booking({
      customerId: req.user.id,
      providerId,
      date,
      timePreference,
      description,
      serviceAddress: serviceAddress || 'Customer Location'
    });

    const booking = await newBooking.save();
    res.json(booking);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/bookings
// @desc    Get user's bookings (Both Customer and Provider)
router.get('/', auth, async (req, res) => {
  try {
    let bookings;
    if (req.user.role === 'customer') {
      bookings = await Booking.find({ customerId: req.user.id })
        .populate('providerId', ['name', 'phone', 'providerDetails'])
        .sort({ date: -1 });
    } else {
      // Provider
      bookings = await Booking.find({ providerId: req.user.id })
        .populate('customerId', ['name', 'phone', 'email'])
        .sort({ date: -1 });
    }
    res.json(bookings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/bookings/:id/status
// @desc    Update booking status (Provider only for accept/decline)
router.put('/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({ message: 'Not authorized to update status' });
    }

    const { status } = req.body;
    let booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Make sure provider owns booking
    if (booking.providerId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    booking.status = status;
    await booking.save();
    res.json(booking);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
