const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');

const admin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

router.get('/stats', [auth, admin], async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'customer' });
    const totalProviders = await User.countDocuments({ role: 'provider' });
    const totalBookings = await Booking.countDocuments();
    const users = await User.find().select('-password').sort({ createdAt: -1 }).limit(20);
    res.json({ totalUsers, totalProviders, totalBookings, recentUsers: users });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET api/admin/customers
// @desc    Get list of all customer accounts
router.get('/customers', [auth, admin], async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' }).select('-password').sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    console.error('Fetch Customers Error:', err);
    res.status(500).json({ message: 'Server error fetching customers' });
  }
});

// @route   GET api/admin/providers
// @desc    Get list of all service provider accounts
router.get('/providers', [auth, admin], async (req, res) => {
  try {
    const providers = await User.find({ role: 'provider' }).select('-password').sort({ createdAt: -1 });
    res.json(providers);
  } catch (err) {
    console.error('Fetch Providers Error:', err);
    res.status(500).json({ message: 'Server error fetching providers' });
  }
});

// @route   GET api/admin/orders
// @desc    Get list of all master orders with customer & provider populated details
router.get('/orders', [auth, admin], async (req, res) => {
  try {
    const orders = await Booking.find()
      .populate('customerId', 'name email phone')
      .populate('providerId', 'name email phone providerDetails')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Fetch Orders Error:', err);
    res.status(500).json({ message: 'Server error fetching master orders' });
  }
});

// @route   POST api/admin/reset-database
// @desc    Clear all database records (User, Booking, Payment, Message) except Admin
router.post('/reset-database', [auth, admin], async (req, res) => {
  try {
    const Payment = require('../models/Payment');
    const Message = require('../models/Message');

    // Wipe all bookings, payments, and messages
    await Promise.all([
      Booking.deleteMany({}),
      Payment.deleteMany({}),
      Message.deleteMany({}),
      User.deleteMany({ role: { $ne: 'admin' } })
    ]);

    res.json({ message: 'Database wiped successfully. Environment is now fresh and ready.' });
  } catch (err) {
    console.error('Reset DB Error:', err);
    res.status(500).json({ message: 'Server error wiping database' });
  }
});

module.exports = router;
