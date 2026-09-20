const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Message = require('../models/Message');
const Complaint = require('../models/Complaint');
const Review = require('../models/Review');
const { sendPartnerWelcomeEmail } = require('../services/verification');
const auth = require('../middleware/auth');
const {
  isValidEmail,
  isValidPhone,
  normalizePhone,
  isValidRate
} = require('../utils/validation');

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
// @desc    Get live real-time executive metrics, dynamic 7-day chart, category breakdowns, and real activity feed
router.get('/stats', [auth, admin], async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalCustomers,
      totalProviders,
      totalAdmins,
      totalBookings,
      bookingsToday,
      allBookings,
      allPayments,
      recentUsers,
      recentBookings,
      recentComplaints,
      recentReviews,
      unresolvedComplaintsCount,
      allProviders
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'provider' }),
      User.countDocuments({ role: 'admin' }),
      Booking.countDocuments(),
      Booking.countDocuments({ createdAt: { $gte: startOfDay } }),
      Booking.find().select('status serviceStage finalPrice paidAmount paymentStatus createdAt providerId').lean(),
      Payment.find().select('amount platformFee serviceAmount paymentMethod status createdAt').lean(),
      User.find().select('-password').sort({ createdAt: -1 }).limit(8).lean(),
      Booking.find()
        .populate('customerId', 'name email phone')
        .populate('providerId', 'name email providerDetails')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      Complaint.find()
        .populate('customerId', 'name email')
        .populate('providerId', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Review.find()
        .populate('customer', 'name')
        .populate('provider', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Complaint.countDocuments({ status: { $in: ['open', 'under_review'] } }),
      User.find({ role: 'provider' }).select('providerDetails name').lean()
    ]);

    // Financial calculations
    const totalGrossVolume = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPlatformRevenue = allPayments.reduce((sum, p) => sum + (p.platformFee || ((p.amount || 0) * 0.15)), 0);
    const totalPaidBookingsCount = allBookings.filter(b => b.paymentStatus === 'paid').length;

    // Monthly revenue
    const monthlyPayments = allPayments.filter(p => new Date(p.createdAt) >= startOfMonth);
    const revenueThisMonth = monthlyPayments.reduce((sum, p) => sum + (p.platformFee || ((p.amount || 0) * 0.15)), 0);

    // Provider status counts
    let verifiedProvidersCount = 0;
    let pendingProvidersCount = 0;
    let suspendedProvidersCount = 0;

    allProviders.forEach(p => {
      const st = p.providerDetails?.status || (p.providerDetails?.aadhaarVerified ? 'Verified' : 'Pending');
      if (st === 'Verified') verifiedProvidersCount++;
      else if (st === 'Suspended') suspendedProvidersCount++;
      else pendingProvidersCount++;
    });

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

    // Dynamic 7 Days bookings chart points
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartPoints = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      
      const count = allBookings.filter(b => {
        const ct = new Date(b.createdAt);
        return ct >= dayStart && ct <= dayEnd;
      }).length;

      const dateLabel = `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`;
      // Coordinates mapped for SVG viewport (width 540, height 160)
      const x = 45 + (6 - i) * 75;
      const y = Math.max(30, 140 - (count * 15));

      chartPoints.push({
        date: dateLabel,
        val: count,
        x,
        y
      });
    }

    // Dynamic Top Services
    const categoryCountMap = {};
    allProviders.forEach(p => {
      const cat = p.providerDetails?.category || 'General';
      if (!categoryCountMap[cat]) categoryCountMap[cat] = { providers: 0, bookings: 0 };
      categoryCountMap[cat].providers++;
    });

    const topServices = Object.keys(categoryCountMap).map((catName, idx) => ({
      id: `ts-${idx + 1}`,
      name: catName,
      meta: `${categoryCountMap[catName].providers} providers`,
      bookings: `${allBookings.filter(b => b.providerId && b.providerId.toString()).length} bookings`,
      type: catName.toLowerCase().replace(/\s+/g, '')
    }));

    // Dynamic Real Activity Feed
    const activities = [];
    recentBookings.forEach(b => {
      activities.push({
        id: `act-b-${b._id}`,
        title: `Booking #${b.orderId || b._id.toString().slice(-6).toUpperCase()}`,
        desc: `${b.customerId?.name || 'Customer'} booked with ${b.providerId?.name || 'Provider'}`,
        time: new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        badgeClass: b.status === 'completed' ? 'green' : b.status === 'accepted' ? 'blue' : 'orange',
        type: 'booking'
      });
    });
    recentUsers.forEach(u => {
      activities.push({
        id: `act-u-${u._id}`,
        title: `New ${u.role === 'provider' ? 'Provider' : 'Customer'} Registered`,
        desc: `${u.name} (${u.email})`,
        time: new Date(u.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        badgeClass: 'slate',
        type: 'user'
      });
    });
    recentComplaints.forEach(c => {
      activities.push({
        id: `act-c-${c._id}`,
        title: `Complaint Filed`,
        desc: `${c.subject} � ${c.customerId?.name || 'Customer'}`,
        time: new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        badgeClass: 'red',
        type: 'complaint'
      });
    });

    activities.sort((a, b) => b.id.localeCompare(a.id));

    // Low rated reviews
    const reportedReviewsCount = await Review.countDocuments({ rating: { $lte: 2 } });

    res.json({
      totalUsers: totalCustomers + totalProviders + totalAdmins,
      totalCustomers,
      totalProviders,
      verifiedProvidersCount,
      pendingProvidersCount,
      suspendedProvidersCount,
      totalAdmins,
      totalBookings,
      bookingsToday,
      totalGrossVolume: Number(totalGrossVolume.toFixed(2)),
      totalPlatformRevenue: Number(totalPlatformRevenue.toFixed(2)),
      revenueThisMonth: Number(revenueThisMonth.toFixed(2)),
      totalPaidBookingsCount,
      stageCounts,
      chartPoints,
      topServices,
      recentActivities: activities.slice(0, 10),
      recentBookings,
      attention: {
        providersAwaiting: pendingProvidersCount,
        reportedReviews: reportedReviewsCount,
        unresolvedComplaints: unresolvedComplaintsCount
      },
      systemHealth: {
        status: 'Operational',
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Admin Stats Error:', err);
    res.status(500).json({ message: 'Server error fetching admin statistics', error: err.message });
  }
});

// @route   GET api/admin/providers
// @desc    Get live list of all service provider accounts with real bookings, reviews, and complaints
router.get('/providers', [auth, admin], async (req, res) => {
  try {
    const providers = await User.find({ role: 'provider' }).select('-password').sort({ createdAt: -1 }).lean();
    const providerIds = providers.map(p => p._id);

    // Fetch related bookings, reviews, and complaints concurrently
    const [allBookings, allReviews, allComplaints] = await Promise.all([
      Booking.find({ providerId: { $in: providerIds } })
        .populate('customerId', 'name email phone')
        .sort({ createdAt: -1 })
        .lean(),
      Review.find({ provider: { $in: providerIds } })
        .populate('customer', 'name email')
        .sort({ createdAt: -1 })
        .lean(),
      Complaint.find({ providerId: { $in: providerIds } })
        .populate('customerId', 'name email')
        .sort({ createdAt: -1 })
        .lean()
    ]);

    // Group by provider ID
    const bookingsByProv = {};
    const reviewsByProv = {};
    const complaintsByProv = {};

    allBookings.forEach(b => {
      const pid = b.providerId?.toString();
      if (!bookingsByProv[pid]) bookingsByProv[pid] = [];
      bookingsByProv[pid].push({
        id: b.orderId || `#BK-${b._id.toString().slice(-4).toUpperCase()}`,
        _id: b._id,
        customer: b.customerId?.name || 'Customer',
        service: b.description || 'General Service',
        date: new Date(b.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        amount: `₹${b.paidAmount || b.finalPrice || 0}`,
        status: b.serviceStage || b.status || 'requested'
      });
    });

    allReviews.forEach(r => {
      const pid = r.provider?.toString();
      if (!reviewsByProv[pid]) reviewsByProv[pid] = [];
      reviewsByProv[pid].push({
        _id: r._id,
        customer: r.customer?.name || 'Customer',
        rating: r.rating || 5,
        date: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        comment: r.comment || ''
      });
    });

    allComplaints.forEach(c => {
      const pid = c.providerId?.toString();
      if (!complaintsByProv[pid]) complaintsByProv[pid] = [];
      complaintsByProv[pid].push({
        id: c.bookingRef || `#CP-${c._id.toString().slice(-3).toUpperCase()}`,
        _id: c._id,
        customer: c.customerId?.name || 'Customer',
        date: new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        reason: c.description || c.subject,
        status: c.status
      });
    });

    const formattedProviders = providers.map(p => {
      const pid = p._id.toString();
      const pBookings = bookingsByProv[pid] || [];
      const pReviews = reviewsByProv[pid] || [];
      const pComplaints = complaintsByProv[pid] || [];

      // Calculate rating
      let avgRating = p.providerDetails?.rating || 0;
      if (pReviews.length > 0) {
        const sum = pReviews.reduce((acc, r) => acc + (r.rating || 0), 0);
        avgRating = Number((sum / pReviews.length).toFixed(1));
      } else if (!avgRating) {
        avgRating = 5.0;
      }

      const status = p.providerDetails?.status || (p.providerDetails?.aadhaarVerified ? 'Verified' : 'Pending');

      const docs = [];
      if (p.providerDetails?.aadhaarVerified) docs.push('Aadhaar Card (Verified)');
      else docs.push('Aadhaar Card (Pending)');
      if (p.providerDetails?.documents && p.providerDetails.documents.length > 0) {
        p.providerDetails.documents.forEach(d => docs.push(`${d.title} (${d.status})`));
      } else {
        docs.push('Trade Certificate (Verified)');
        docs.push('Police Clearance Report (Verified)');
      }

      return {
        id: p._id,
        _id: p._id,
        name: p.name,
        category: p.providerDetails?.category || 'Electrician',
        categoryPill: (p.providerDetails?.category || 'general').toLowerCase().replace(/\s+/g, ''),
        rating: avgRating,
        status: status,
        phone: p.phone || '+91 99999 00000',
        email: p.email,
        location: p.providerDetails?.location || p.city || 'Chandigarh',
        experience: p.providerDetails?.experienceYears ? `${p.providerDetails.experienceYears} years` : '3 years',
        hourlyRate: p.providerDetails?.hourlyRate ? `?${p.providerDetails.hourlyRate}/hr` : '?350/hr',
        completedJobs: pBookings.filter(b => b.status === 'completed').length,
        avatar: p.providerDetails?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        providerId: p.providerDetails?.providerId || (p.providerDetails?.status === 'Verified' ? `LFX-PRV-${p._id.toString().slice(-4).toUpperCase()}` : ''),
        description: p.providerDetails?.description || '',
        portfolioImages: p.providerDetails?.portfolioImages || [],
        aadhaarVerified: Boolean(p.providerDetails?.aadhaarVerified),
        aadhaarLastFour: p.providerDetails?.aadhaarLastFour || '',
        phoneVerified: Boolean(p.phoneVerified),
        verifiedByAdmin: Boolean(p.providerDetails?.verifiedByAdmin),
        idCardIssued: Boolean(p.providerDetails?.idCardIssued),
        idCardIssueDate: p.providerDetails?.idCardIssueDate || null,
        welcomeEmailSent: Boolean(p.providerDetails?.welcomeEmailSent),
        welcomeEmailSentAt: p.providerDetails?.welcomeEmailSentAt || null,
        docs,
        bookings: pBookings,
        reviews: pReviews,
        complaints: pComplaints
      };
    });

    res.json(formattedProviders);
  } catch (err) {
    console.error('Fetch Providers Error:', err);
    res.status(500).json({ message: 'Server error fetching providers' });
  }
});

// @route   PUT api/admin/providers/:id/status
// @desc    Update provider status (Verified, Pending, Suspended, Rejected) in real MongoDB
router.put('/providers/:id/status', [auth, admin], async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Verified', 'Pending', 'Suspended', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const provider = await User.findById(req.params.id);
    if (!provider || provider.role !== 'provider') {
      return res.status(404).json({ message: 'Provider not found' });
    }

    if (!provider.providerDetails) provider.providerDetails = {};
    provider.providerDetails.status = status;

    if (status === 'Verified') {
      if (!provider.providerDetails.providerId) {
        provider.providerDetails.providerId = `LFX-PRV-${provider._id.toString().slice(-4).toUpperCase()}`;
      }
      provider.providerDetails.verifiedByAdmin = true;
      provider.providerDetails.verifiedAt = new Date();
      provider.providerDetails.idCardIssued = true;
      provider.providerDetails.idCardIssueDate = new Date();
      provider.providerDetails.aadhaarVerified = true;
      provider.providerDetails.aadhaarVerifiedAt = provider.providerDetails.aadhaarVerifiedAt || new Date();
      provider.emailVerified = true;
      provider.phoneVerified = true;
    } else if (status === 'Suspended' || status === 'Rejected') {
      provider.providerDetails.verifiedByAdmin = false;
    }

    await provider.save();

    res.json({
      message: `Provider status updated to ${status} successfully`,
      provider: {
        id: provider._id,
        name: provider.name,
        status: provider.providerDetails.status,
        providerId: provider.providerDetails.providerId || ''
      }
    });
  } catch (err) {
    console.error('Update Provider Status Error:', err);
    res.status(500).json({ message: 'Server error updating provider status' });
  }
});


// @route   POST api/admin/providers/:id/send-welcome-email
// @desc    Send official Localfixr welcome email with Digital ID Card to provider
router.post('/providers/:id/send-welcome-email', [auth, admin], async (req, res) => {
  try {
    const provider = await User.findById(req.params.id);
    if (!provider || provider.role !== 'provider') {
      return res.status(404).json({ message: 'Provider not found' });
    }

    if (!provider.providerDetails) provider.providerDetails = {};
    if (!provider.providerDetails.providerId) {
      provider.providerDetails.providerId = `LFX-PRV-${provider._id.toString().slice(-4).toUpperCase()}`;
    }

    const emailResult = await sendPartnerWelcomeEmail(provider);

    provider.providerDetails.welcomeEmailSent = true;
    provider.providerDetails.welcomeEmailSentAt = new Date();
    await provider.save();

    res.json({
      message: `Official welcome email with Digital ID Card dispatched to ${provider.email}`,
      previewUrl: emailResult?.previewUrl || null,
      providerId: provider.providerDetails.providerId
    });
  } catch (err) {
    console.error('Send Welcome Email Error:', err);
    res.status(500).json({ message: 'Failed to send welcome email', error: err.message });
  }
});

// @route   PUT api/admin/providers/:id
// @desc    Update any provider details (name, email, phone, category, location, hourlyRate, experience, status, rating)
router.put('/providers/:id', [auth, admin], async (req, res) => {
  try {
    const provider = await User.findById(req.params.id);
    if (!provider || provider.role !== 'provider') {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const { name, email, phone, category, location, hourlyRate, experienceYears, status, rating } = req.body;

    if (name) {
      if (name.trim().length < 2) return res.status(400).json({ message: 'Name must be at least 2 characters' });
      provider.name = name.trim();
    }
    if (email) {
      if (!isValidEmail(email)) return res.status(400).json({ message: 'Please provide a valid email address' });
      provider.email = email.toLowerCase().trim();
    }
    if (phone !== undefined) {
      if (phone && phone.trim() !== '') {
        if (!isValidPhone(phone)) return res.status(400).json({ message: 'Please provide a valid 10-digit Indian mobile number' });
        provider.phone = normalizePhone(phone);
      } else {
        provider.phone = '';
      }
    }
    if (location) provider.city = location;

    if (!provider.providerDetails) provider.providerDetails = {};
    if (category) {
      provider.providerDetails.category = category;
      provider.providerDetails.categoryName = category;
    }
    if (location) provider.providerDetails.location = location;
    if (hourlyRate !== undefined && hourlyRate !== '') {
      const parsedRate = typeof hourlyRate === 'string' ? parseFloat(hourlyRate.replace(/[^0-9.]/g, '')) : hourlyRate;
      provider.providerDetails.hourlyRate = parsedRate || 0;
    }
    if (experienceYears !== undefined && experienceYears !== '') {
      const parsedExp = typeof experienceYears === 'string' ? parseInt(experienceYears.replace(/[^0-9]/g, '')) : experienceYears;
      provider.providerDetails.experienceYears = parsedExp || 0;
    }
    if (rating !== undefined && rating !== '') {
      provider.providerDetails.rating = parseFloat(rating);
    }
    if (status) {
      provider.providerDetails.status = status;
      if (status === 'Verified') {
        provider.providerDetails.aadhaarVerified = true;
        provider.emailVerified = true;
        provider.phoneVerified = true;
      } else if (status === 'Suspended' || status === 'Rejected') {
        provider.providerDetails.aadhaarVerified = false;
      }
    }

    await provider.save();

    res.json({
      message: 'Provider details updated successfully',
      provider: {
        id: provider._id,
        _id: provider._id,
        name: provider.name,
        email: provider.email,
        phone: provider.phone,
        location: provider.providerDetails?.location || provider.city,
        category: provider.providerDetails?.category,
        hourlyRate: '₹' + (provider.providerDetails?.hourlyRate || 350) + '/hr',
        experience: (provider.providerDetails?.experienceYears || 3) + ' years',
        status: provider.providerDetails?.status || 'Verified',
        rating: provider.providerDetails?.rating || 5.0
      }
    });
  } catch (err) {
    console.error('Update Provider Error:', err);
    res.status(500).json({ message: 'Failed to update provider details', error: err.message });
  }
});

// @route   POST api/admin/providers
// @desc    Admin onboards a new provider directly into the real database
router.post('/providers', [auth, admin], async (req, res) => {
  try {
    const { name, email, phone, category, location, hourlyRate, experienceYears } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({ message: 'Provider name must be at least 2 characters' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    if (phone && phone.trim() !== '' && !isValidPhone(phone)) {
      return res.status(400).json({ message: 'Please provide a valid 10-digit Indian mobile number' });
    }

    if (hourlyRate !== undefined && hourlyRate !== '' && !isValidRate(hourlyRate)) {
      return res.status(400).json({ message: 'Starting / base hourly rate must be greater than ₹0' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    const newProvider = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? normalizePhone(phone) : '',
      password: 'Provider@123',
      role: 'provider',
      city: location || 'Chandigarh',
      emailVerified: true,
      phoneVerified: true,
      providerDetails: {
        category: category || 'Electrician',
        categoryName: category || 'Electrician',
        location: location || 'Chandigarh',
        hourlyRate: hourlyRate ? Number(hourlyRate) : 350,
        experienceYears: experienceYears ? Number(experienceYears) : 2,
        status: 'Pending',
        aadhaarVerified: false,
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
        documents: [
          { title: 'Aadhaar Card', status: 'Pending', uploadedAt: new Date() },
          { title: 'Trade License', status: 'Pending', uploadedAt: new Date() }
        ]
      }
    });

    await newProvider.save();

    res.status(201).json({
      message: 'Provider onboarded successfully into database',
      provider: newProvider
    });
  } catch (err) {
    console.error('Create Provider Error:', err);
    res.status(500).json({ message: 'Failed to onboard provider', error: err.message });
  }
});

// @route   GET api/admin/customers
// @desc    Get list of all customer accounts with aggregated booking stats
router.get('/customers', [auth, admin], async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' }).select('-password').sort({ createdAt: -1 }).lean();
    const customerIds = customers.map(c => c._id);
    const customerBookings = await Booking.find({ customerId: { $in: customerIds } }).select('customerId paidAmount finalPrice status paymentStatus').lean();

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
      id: c._id,
      totalBookings: customerStatsMap[c._id.toString()]?.bookingCount || 0,
      totalSpent: customerStatsMap[c._id.toString()]?.totalSpent || 0,
      status: 'Active'
    }));

    res.json(enrichedCustomers);
  } catch (err) {
    console.error('Fetch Customers Error:', err);
    res.status(500).json({ message: 'Server error fetching customers' });
  }
});


// @route   PUT api/admin/customers/:id
// @desc    Update customer details (name, email, phone, city)
router.put('/customers/:id', [auth, admin], async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer || customer.role !== 'customer') {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const { name, email, phone, city } = req.body;
    if (name) {
      if (name.trim().length < 2) return res.status(400).json({ message: 'Customer name must be at least 2 characters' });
      customer.name = name.trim();
    }
    if (email) {
      if (!isValidEmail(email)) return res.status(400).json({ message: 'Please provide a valid email address' });
      customer.email = email.toLowerCase().trim();
    }
    if (phone !== undefined) {
      if (phone && phone.trim() !== '') {
        if (!isValidPhone(phone)) return res.status(400).json({ message: 'Please provide a valid 10-digit Indian mobile number' });
        customer.phone = normalizePhone(phone);
      } else {
        customer.phone = '';
      }
    }
    if (city) {
      customer.city = city.trim();
      if (!customer.addressDetails) customer.addressDetails = {};
      customer.addressDetails.city = city.trim();
    }

    await customer.save();

    res.json({
      message: 'Customer details updated successfully',
      customer: {
        id: customer._id,
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        city: customer.city
      }
    });
  } catch (err) {
    console.error('Update Customer Error:', err);
    res.status(500).json({ message: 'Failed to update customer details', error: err.message });
  }
});

// @route   GET api/admin/orders
// @desc    Get list of all master orders with customer & provider populated details
router.get('/orders', [auth, admin], async (req, res) => {
  try {
    const orders = await Booking.find()
      .populate('customerId', 'name email phone addressDetails city')
      .populate('providerId', 'name email phone providerDetails')
      .sort({ createdAt: -1 })
      .lean();

    const formattedOrders = orders.map(b => ({
      ...b,
      id: b.orderId || `#BK-${b._id.toString().slice(-4).toUpperCase()}`,
      service: b.description || 'Home Service',
      provider: b.providerId?.name || 'Unassigned',
      customer: b.customerId?.name || 'Customer',
      amount: b.paidAmount || b.finalPrice || (b.billingDetails?.totalAmount) || 0,
      finalPrice: b.finalPrice || 0,
      paidAmount: b.paidAmount || 0,
      paymentStatus: b.paymentStatus || 'unpaid',
      billingDetails: b.billingDetails || null,
      status: b.serviceStage || b.status || 'requested',
      statusLabel: (b.serviceStage || b.status || 'Pending').replace('_', ' ').toUpperCase(),
      dateTime: new Date(b.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }));

    res.json(formattedOrders);
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

// @route   GET api/admin/complaints
// @desc    Get real customer complaints
router.get('/complaints', [auth, admin], async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate('customerId', 'name email phone')
      .populate('providerId', 'name email phone providerDetails')
      .sort({ createdAt: -1 })
      .lean();
    res.json(complaints);
  } catch (err) {
    console.error('Fetch Complaints Error:', err);
    res.status(500).json({ message: 'Server error fetching complaints' });
  }
});

// @route   PUT api/admin/complaints/:id/resolve
// @desc    Resolve a complaint ticket
router.put('/complaints/:id/resolve', [auth, admin], async (req, res) => {
  try {
    const { resolutionNotes } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    complaint.status = 'resolved';
    complaint.resolutionNotes = resolutionNotes || 'Resolved by Super Administrator';
    complaint.resolvedAt = new Date();
    await complaint.save();

    res.json({ message: 'Complaint ticket marked as resolved', complaint });
  } catch (err) {
    console.error('Resolve Complaint Error:', err);
    res.status(500).json({ message: 'Server error resolving complaint' });
  }
});

// @route   GET api/admin/reviews
// @desc    Get real customer reviews for moderation
router.get('/reviews', [auth, admin], async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('customer', 'name email')
      .populate('provider', 'name email providerDetails')
      .sort({ createdAt: -1 })
      .lean();
    res.json(reviews);
  } catch (err) {
    console.error('Fetch Reviews Error:', err);
    res.status(500).json({ message: 'Server error fetching reviews' });
  }
});

// @route   DELETE api/admin/reviews/:id
// @desc    Delete or dismiss an inappropriate review
router.delete('/reviews/:id', [auth, admin], async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: 'Review removed successfully' });
  } catch (err) {
    console.error('Delete Review Error:', err);
    res.status(500).json({ message: 'Server error deleting review' });
  }
});

// @route   DELETE api/admin/users/:id
// @desc    Delete a specific user account by ID
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

    res.json({ message: `User "${targetUser.name}" and associated records deleted.` });
  } catch (err) {
    console.error('Delete User Error:', err);
    res.status(500).json({ message: 'Server error deleting user' });
  }
});


let platformSettings = {
  platformName: 'LocalFixr',
  platformCommission: 15,
  adminEmail: 'admin@localfixr.com',
  maintenanceMode: false
};

// @route   GET api/admin/settings
router.get('/settings', [auth, admin], (req, res) => {
  res.json(platformSettings);
});

// @route   PUT api/admin/settings
router.put('/settings', [auth, admin], (req, res) => {
  platformSettings = { ...platformSettings, ...req.body };
  res.json({ message: 'Platform settings updated successfully', settings: platformSettings });
});

module.exports = router;
