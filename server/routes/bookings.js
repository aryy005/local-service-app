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
        .populate('customerId', ['name', 'phone', 'email', 'customerDetails'])
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

    const { status, workPhotos, finalPrice } = req.body;
    let booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Make sure provider owns booking
    if (booking.providerId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    const wasCompleted = booking.status === 'completed';

    booking.status = status;
    if (workPhotos && Array.isArray(workPhotos)) {
      booking.workPhotos = workPhotos;
    }
    if (finalPrice !== undefined) {
      booking.finalPrice = Number(finalPrice);
    }
    await booking.save();
    
    // If newly marked as completed, increment provider's stats
    if (status === 'completed' && !wasCompleted) {
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { 'providerDetails.totalJobsCompleted': 1 }
      });
    }

    res.json(booking);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/bookings/:id/rate-customer
// @desc    Provider rates customer after completion
router.post('/:id/rate-customer', auth, async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({ message: 'Only providers can rate customers' });
    }

    const { rating, comment } = req.body;
    let booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.providerId.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });
    if (booking.status !== 'completed') return res.status(400).json({ message: 'Can only rate completed bookings' });
    if (booking.customerReview && booking.customerReview.rating) {
      return res.status(400).json({ message: 'Customer already rated for this booking' });
    }

    booking.customerReview = { rating: Number(rating), comment };
    await booking.save();

    // Recalculate customer overall rating
    const allBookings = await Booking.find({ 
      customerId: booking.customerId, 
      'customerReview.rating': { $exists: true } 
    });
    
    const sum = allBookings.reduce((acc, curr) => acc + curr.customerReview.rating, 0);
    const avg = sum / allBookings.length;

    await User.findByIdAndUpdate(booking.customerId, {
      'customerDetails.rating': Number(avg.toFixed(1)),
      'customerDetails.reviewsCount': allBookings.length
    });

    res.json(booking);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
