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
      return res.status(403).json({ message: 'Service Provider accounts cannot book services. Provider accounts are restricted to managing incoming job orders on the Provider Dashboard.' });
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
      serviceAddress: serviceAddress || 'Customer Location',
      serviceStage: 'requested',
      stageHistory: [{
        stage: 'requested',
        title: 'Booking Placed',
        description: 'Customer created the service request.',
        timestamp: new Date()
      }]
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

// @route   PUT api/bookings/:id/stage
// @desc    Advance service tracking stage (Provider / Customer cancel)
router.put('/:id/stage', auth, async (req, res) => {
  try {
    const { stage, finalPrice, workPhotos, note } = req.body;
    let booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Verify ownership
    const isProvider = booking.providerId.toString() === req.user.id;
    const isCustomer = booking.customerId.toString() === req.user.id;

    if (!isProvider && !isCustomer && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
    }

    if (stage === 'cancelled' && !isCustomer && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only customer or admin can cancel booking' });
    }

    if (stage !== 'cancelled' && !isProvider && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only provider can advance service stages' });
    }

    const wasCompleted = booking.status === 'completed';

    // Map stages to title & status
    const stageMeta = {
      requested: { title: 'Booking Requested', status: 'pending' },
      accepted: { title: 'Booking Accepted', status: 'accepted' },
      in_transit: { title: 'Provider On The Way', status: 'accepted' },
      in_progress: { title: 'Work In Progress', status: 'accepted' },
      completed: { title: 'Service Completed & Billed', status: 'completed' },
      paid: { title: 'Payment Completed & Closed', status: 'completed' },
      declined: { title: 'Booking Declined', status: 'declined' },
      cancelled: { title: 'Booking Cancelled', status: 'declined' }
    };

    const currentMeta = stageMeta[stage] || { title: 'Stage Updated', status: booking.status };

    booking.serviceStage = stage;
    booking.status = currentMeta.status;

    if (finalPrice !== undefined && finalPrice !== null) {
      booking.finalPrice = Number(finalPrice);
    }

    if (workPhotos && Array.isArray(workPhotos)) {
      booking.workPhotos = workPhotos;
    }

    // Append to stageHistory audit log
    booking.stageHistory.push({
      stage,
      title: currentMeta.title,
      description: note || `Stage updated to ${currentMeta.title}`,
      timestamp: new Date()
    });

    await booking.save();

    if (stage === 'completed' && !wasCompleted && isProvider) {
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { 'providerDetails.totalJobsCompleted': 1 }
      });
    }

    const populatedBooking = await Booking.findById(booking._id)
      .populate('customerId', 'name phone email customerDetails')
      .populate('providerId', 'name phone providerDetails');

    res.json(populatedBooking);
  } catch (err) {
    console.error('Stage Update Error:', err);
    res.status(500).json({ message: 'Server Error updating service stage' });
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

    if (booking.providerId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    const wasCompleted = booking.status === 'completed';

    booking.status = status;
    if (status === 'accepted') booking.serviceStage = 'accepted';
    if (status === 'declined') booking.serviceStage = 'declined';
    if (status === 'completed') booking.serviceStage = 'completed';

    if (workPhotos && Array.isArray(workPhotos)) {
      booking.workPhotos = workPhotos;
    }
    if (finalPrice !== undefined) {
      booking.finalPrice = Number(finalPrice);
    }

    booking.stageHistory.push({
      stage: booking.serviceStage || status,
      title: `Status set to ${status}`,
      description: `Provider updated status to ${status}`,
      timestamp: new Date()
    });

    await booking.save();
    
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
