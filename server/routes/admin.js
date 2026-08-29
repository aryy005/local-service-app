const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// Middleware to verify admin privileges
const admin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    req.adminUser = user;
    next();
  } catch (err) {
    console.error('Admin middleware error:', err);
    res.status(500).json({ message: 'Server Error verifying admin role' });
  }
};

// @route   GET api/admin/stats
// @desc    Get executive metrics, category breakdowns, booking stages, and recent activity
router.get('/stats', [auth, admin], async (req, res) => {
  try {
    const [
      totalCustomers,
      totalProviders,
      totalAdmins,
      totalBookings,
      allBookings,
      allPayments,
      recentUsers,
      recentBookings
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'provider' }),
      User.countDocuments({ role: 'admin' }),
      Booking.countDocuments(),
      Booking.find().select('status serviceStage finalPrice paidAmount paymentStatus createdAt providerId'),
      Payment.find().select('amount platformFee serviceAmount paymentMethod status createdAt'),
      User.find().select('-password').sort({ createdAt: -1 }).limit(10),
      Booking.find()
        .populate('customerId', 'name email')
        .populate('providerId', 'name email providerDetails')
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    // Financial calculations
    const totalGrossVolume = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPlatformRevenue = allPayments.reduce((sum, p) => sum + (p.platformFee || 0), 0);
    const totalPaidBookingsCount = allBookings.filter(b => b.paymentStatus === 'paid').length;

    // Stage breakdown
    const stageCounts = {
      requested: 0,
      accepted: 0,
      in_transit: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      declined: 0
    };
    allBookings.forEach(b => {
      const stage = b.serviceStage || b.status || 'requested';
      if (stageCounts[stage] !== undefined) {
        stageCounts[stage]++;
      } else {
        stageCounts[stage] = 1;
      }
    });

    // Verification stats
    const verifiedProvidersCount = await User.countDocuments({ 
      role: 'provider', 
      'providerDetails.aadhaarVerified': true 
    });

    // System uptime & server info
    const serverUptimeSeconds = Math.floor(process.uptime());
    const memoryUsageMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

    res.json({
      totalUsers: totalCustomers + totalProviders + totalAdmins,
      totalCustomers,
      totalProviders,
      verifiedProvidersCount,
      totalAdmins,
      totalBookings,
      totalGrossVolume: Number(totalGrossVolume.toFixed(2)),
      totalPlatformRevenue: Number(totalPlatformRevenue.toFixed(2)),
      totalPaidBookingsCount,
      stageCounts,
      recentUsers,
      recentBookings,
      systemHealth: {
        status: 'Operational',
        uptimeSeconds: serverUptimeSeconds,
        memoryUsageMB,
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Admin Stats Error:', err);
    res.status(500).json({ message: 'Server error fetching admin statistics', error: err.message });
  }
});

// @route   GET api/admin/customers
// @desc    Get list of all customer accounts with aggregated booking stats
router.get('/customers', [auth, admin], async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' }).select('-password').sort({ createdAt: -1 }).lean();
    
    // Enrich with booking count and total spent
    const customerIds = customers.map(c => c._id);
    const customerBookings = await Booking.find({ customerId: { $in: customerIds } }).select('customerId paidAmount finalPrice status paymentStatus');
    
    const customerStatsMap = {};
    customerBookings.forEach(b => {
      const cid = b.customerId.toString();
      if (!customerStatsMap[cid]) {
        customerStatsMap[cid] = { bookingCount: 0, totalSpent: 0 };
      }
      customerStatsMap[cid].bookingCount++;
      if (b.paymentStatus === 'paid') {
        customerStatsMap[cid].totalSpent += (b.paidAmount || b.finalPrice || 0);
      }
    });

    const enrichedCustomers = customers.map(c => ({
      ...c,
      totalBookings: customerStatsMap[c._id.toString()]?.bookingCount || 0,
      totalSpent: customerStatsMap[c._id.toString()]?.totalSpent || 0
    }));

    res.json(enrichedCustomers);
  } catch (err) {
    console.error('Fetch Customers Error:', err);
    res.status(500).json({ message: 'Server error fetching customers' });
  }
});

// @route   GET api/admin/providers
// @desc    Get list of all service provider accounts with stats
router.get('/providers', [auth, admin], async (req, res) => {
  try {
    const providers = await User.find({ role: 'provider' }).select('-password').sort({ createdAt: -1 }).lean();
    
    const providerIds = providers.map(p => p._id);
    const providerBookings = await Booking.find({ providerId: { $in: providerIds } }).select('providerId paidAmount finalPrice status serviceStage');
    
    const providerStatsMap = {};
    providerBookings.forEach(b => {
      const pid = b.providerId.toString();
      if (!providerStatsMap[pid]) {
        providerStatsMap[pid] = { totalJobs: 0, completedJobs: 0, earnings: 0 };
      }
      providerStatsMap[pid].totalJobs++;
      if (b.serviceStage === 'completed' || b.status === 'completed') {
        providerStatsMap[pid].completedJobs++;
        providerStatsMap[pid].earnings += (b.paidAmount || b.finalPrice || 0);
      }
    });

    const enrichedProviders = providers.map(p => ({
      ...p,
      jobsCount: providerStatsMap[p._id.toString()]?.totalJobs || 0,
      completedJobs: providerStatsMap[p._id.toString()]?.completedJobs || 0,
      totalEarnings: providerStatsMap[p._id.toString()]?.earnings || 0
    }));

    res.json(enrichedProviders);
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
      .populate('customerId', 'name email phone addressDetails city')
      .populate('providerId', 'name email phone providerDetails')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Fetch Orders Error:', err);
    res.status(500).json({ message: 'Server error fetching master orders' });
  }
});

// @route   PUT api/admin/orders/:id
// @desc    Update order status, service stage, or payment status directly from admin
router.put('/orders/:id', [auth, admin], async (req, res) => {
  try {
    const { serviceStage, status, paymentStatus, paidAmount } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (serviceStage) {
      booking.serviceStage = serviceStage;
      booking.stageHistory.push({
        stage: serviceStage,
        title: `Admin Override: ${serviceStage.replace('_', ' ').toUpperCase()}`,
        description: 'Status modified by Super Administrator',
        timestamp: new Date()
      });
      if (serviceStage === 'completed') booking.status = 'completed';
      if (serviceStage === 'cancelled') booking.status = 'declined';
    }

    if (status) booking.status = status;
    if (paymentStatus) booking.paymentStatus = paymentStatus;
    if (paidAmount !== undefined) booking.paidAmount = Number(paidAmount);

    await booking.save();
    
    const updated = await Booking.findById(booking._id)
      .populate('customerId', 'name email phone')
      .populate('providerId', 'name email phone providerDetails');

    res.json({ message: 'Order updated successfully', order: updated });
  } catch (err) {
    console.error('Admin Update Order Error:', err);
    res.status(500).json({ message: 'Failed to update order' });
  }
});

// @route   DELETE api/admin/orders/:id
// @desc    Delete an individual order
router.delete('/orders/:id', [auth, admin], async (req, res) => {
  try {
    const order = await Booking.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    await Payment.deleteMany({ bookingId: req.params.id });
    await Message.deleteMany({ bookingId: req.params.id });
    res.json({ message: 'Order and linked payment records removed successfully.' });
  } catch (err) {
    console.error('Delete Order Error:', err);
    res.status(500).json({ message: 'Server error deleting order' });
  }
});

// @route   PUT api/admin/users/:id/verify
// @desc    Toggle verification status (Aadhaar, Email, Phone) for a user
router.put('/users/:id/verify', [auth, admin], async (req, res) => {
  try {
    const { field, value } = req.body; // field: 'aadhaar' | 'email' | 'phone'
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (field === 'aadhaar' && targetUser.role === 'provider') {
      if (!targetUser.providerDetails) targetUser.providerDetails = {};
      targetUser.providerDetails.aadhaarVerified = Boolean(value);
      if (value) {
        targetUser.providerDetails.aadhaarVerifiedAt = new Date();
        targetUser.providerDetails.aadhaarLastFour = targetUser.providerDetails.aadhaarLastFour || '9999';
        targetUser.providerDetails.aadhaarRefId = `ADM-VFY-${Date.now().toString(36).toUpperCase()}`;
      }
    } else if (field === 'email') {
      targetUser.emailVerified = Boolean(value);
      if (value) targetUser.emailVerifiedAt = new Date();
    } else if (field === 'phone') {
      targetUser.phoneVerified = Boolean(value);
      if (value) targetUser.phoneVerifiedAt = new Date();
    }

    await targetUser.save();
    res.json({ message: `Verification status for ${field} updated to ${Boolean(value)}`, user: targetUser });
  } catch (err) {
    console.error('Verify User Error:', err);
    res.status(500).json({ message: 'Server error updating verification status' });
  }
});

// @route   POST api/admin/reset-database
// @desc    Clear all database records (User, Booking, Payment, Message) except primary System Admin
router.post('/reset-database', [auth, admin], async (req, res) => {
  try {
    await Promise.all([
      Booking.deleteMany({}),
      Payment.deleteMany({}),
      Message.deleteMany({}),
      User.deleteMany({ email: { $ne: 'admin@localfixr.com' } })
    ]);

    res.json({ message: 'Database wiped successfully. All test accounts, orders, and messages cleared.' });
  } catch (err) {
    console.error('Reset DB Error:', err);
    res.status(500).json({ message: 'Server error wiping database' });
  }
});

// @route   DELETE api/admin/users/:id
// @desc    Delete a specific user account (Customer or Provider) by ID
router.delete('/users/:id', [auth, admin], async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (targetUser.role === 'admin' && targetUser.email === 'admin@localfixr.com') {
      return res.status(400).json({ message: 'Primary system admin cannot be deleted' });
    }

    await User.findByIdAndDelete(req.params.id);
    await Booking.deleteMany({ $or: [{ customerId: req.params.id }, { providerId: req.params.id }] });
    await Payment.deleteMany({ $or: [{ customerId: req.params.id }, { providerId: req.params.id }] });

    res.json({ message: `User "${targetUser.name}" (${targetUser.email}) and all associated records deleted.` });
  } catch (err) {
    console.error('Delete User Error:', err);
    res.status(500).json({ message: 'Server error deleting user' });
  }
});

module.exports = router;

