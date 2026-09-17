const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const User = require('../models/User');
const Counter = require('../models/Counter');
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

    // Atomic sequential order number generation (guaranteed unique & non-repeating)
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'orderId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const generatedOrderId = `ORD-${counter.seq}`;

    const newBooking = new Booking({
      orderId: generatedOrderId,
      orderNumber: counter.seq,
      customerId: req.user.id,
      providerId,
      date,
      timePreference,
      description,
      serviceAddress: serviceAddress || 'Customer Location',
      serviceStage: 'requested',
      stageHistory: [{
        stage: 'requested',
        title: `Order ${generatedOrderId} Placed`,
        description: 'Customer created the service request.',
        timestamp: new Date()
      }]
    });

    const booking = await newBooking.save();
    res.json(booking);
  } catch (err) {
    console.error('Booking Error:', err.message);
    res.status(500).send('Server Error creating booking');
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

function checkProviderProfileCompleteness(user) {
  const p = user.providerDetails || {};
  const missing = [];
  if (!user.name || !user.name.trim()) missing.push('Full Name');
  if (!user.phone || !user.phone.trim()) missing.push('Phone Number');
  if (!user.city && !user.addressDetails?.city && !p.location) missing.push('City / Service Area');
  if (!p.category || !p.category.trim()) missing.push('Service Category');
  if (!p.hourlyRate || Number(p.hourlyRate) <= 0) missing.push('Starting / Base Price (₹)');
  if (p.experienceYears === undefined || p.experienceYears === null || Number(p.experienceYears) < 0) missing.push('Years of Experience');
  if (!p.description || p.description.trim().length < 10) missing.push('Bio / Description (min 10 characters)');
  if (!p.avatarUrl || !p.avatarUrl.trim()) missing.push('Profile Picture');
  if (!p.upiId || !p.upiId.trim()) missing.push('Payout UPI ID');
  if (!p.portfolioImages || !Array.isArray(p.portfolioImages) || p.portfolioImages.length === 0) missing.push('Work Portfolio Images (at least 1 photo of previous work)');
  if (!user.phoneVerified && !p.aadhaarVerified) missing.push('Identity Verification (Phone OTP or Aadhaar KYC)');

  return {
    isComplete: missing.length === 0,
    missing
  };
}

// @route   PUT api/bookings/:id/stage
// @desc    Advance service tracking stage (Provider / Customer cancel)
router.put('/:id/stage', auth, async (req, res) => {
  try {
    const { stage, finalPrice, workPhotos, note } = req.body;
    let booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Verify ownership safely (handling ObjectId or populated object)
    const providerIdStr = (booking.providerId?._id || booking.providerId)?.toString();
    const customerIdStr = (booking.customerId?._id || booking.customerId)?.toString();
    const userIdStr = req.user.id.toString();

    const isProvider = providerIdStr === userIdStr;
    const isCustomer = customerIdStr === userIdStr;

    if (!isProvider && !isCustomer && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
    }

    if (stage === 'cancelled' && !isCustomer && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only customer or admin can cancel booking' });
    }

    if (stage !== 'cancelled' && !isProvider && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the assigned provider or admin can advance service stages' });
    }

    // Strict Gate: Provider cannot provide service or advance stages if profile is incomplete
    if (isProvider && (stage === 'accepted' || stage === 'in_transit' || stage === 'in_progress')) {
      const providerUser = await User.findById(req.user.id);
      if (providerUser) {
        const check = checkProviderProfileCompleteness(providerUser);
        if (!check.isComplete) {
          return res.status(400).json({
            message: `Cannot provide service! Please complete all mandatory profile fields and add portfolio images: ${check.missing.join(', ')}`,
            missingFields: check.missing
          });
        }
      }
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

    const { serviceAmount, extraExpenses, extraExpenseReason } = req.body;
    let baseCharge = serviceAmount !== undefined && !isNaN(serviceAmount) ? Number(serviceAmount) : undefined;
    let extraParts = extraExpenses !== undefined && !isNaN(extraExpenses) ? Number(extraExpenses) : 0;
    let expenseReason = extraExpenseReason !== undefined ? String(extraExpenseReason).trim() : (booking.billingDetails?.extraExpenseReason || '');

    if (finalPrice !== undefined && finalPrice !== null && !isNaN(finalPrice)) {
      const explicitPrice = Number(finalPrice);
      if (baseCharge === undefined) {
        baseCharge = Math.max(0, explicitPrice - extraParts);
      }
      booking.finalPrice = explicitPrice;
    } else if (baseCharge !== undefined) {
      booking.finalPrice = baseCharge + extraParts;
    }

    if (baseCharge !== undefined || extraParts > 0 || booking.finalPrice > 0) {
      const sub = booking.finalPrice || (baseCharge || 0) + extraParts;
      const fee = Number((sub * 0.05).toFixed(2));
      const tax = Number(((sub + fee) * 0.18).toFixed(2));
      const tot = Number((sub + fee + tax).toFixed(2));

      booking.billingDetails = {
        serviceAmount: baseCharge !== undefined ? baseCharge : (booking.billingDetails?.serviceAmount || sub),
        extraExpenses: extraParts,
        extraExpenseReason: expenseReason,
        platformFee: fee,
        tax: tax,
        totalAmount: tot
      };
    }

    if (workPhotos && Array.isArray(workPhotos)) {
      booking.workPhotos = workPhotos;
    }

    if (!Array.isArray(booking.stageHistory)) {
      booking.stageHistory = [];
    }

    let stageDesc = note || `Stage updated to ${currentMeta.title}`;
    if (stage === 'completed' && booking.finalPrice > 0) {
      stageDesc = `Service completed. Bill confirmed: ₹${booking.finalPrice}${extraParts > 0 ? ` (Service: ₹${baseCharge || (booking.finalPrice - extraParts)}, Extra Expenses: ₹${extraParts}${expenseReason ? ` - "${expenseReason}"` : ''})` : ''}`;
    }

    // Append to stageHistory audit log
    booking.stageHistory.push({
      stage,
      title: currentMeta.title,
      description: stageDesc,
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

// @route   PUT api/bookings/:id/final-bill
// @desc    Confirm or adjust final bill breakdown before payment (Provider or Admin)
router.put('/:id/final-bill', auth, async (req, res) => {
  try {
    const { serviceAmount, extraExpenses, extraExpenseReason, finalPrice } = req.body;
    let booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const providerIdStr = (booking.providerId?._id || booking.providerId)?.toString();
    const isProvider = providerIdStr === req.user.id.toString();

    if (!isProvider && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the assigned provider or admin can confirm the final bill' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Cannot modify bill for a booking that is already paid' });
    }

    const base = Number(serviceAmount !== undefined ? serviceAmount : (booking.billingDetails?.serviceAmount || booking.finalPrice || 0));
    const extras = Number(extraExpenses !== undefined ? extraExpenses : (booking.billingDetails?.extraExpenses || 0));
    const reason = extraExpenseReason !== undefined ? String(extraExpenseReason).trim() : (booking.billingDetails?.extraExpenseReason || '');
    const total = finalPrice !== undefined && !isNaN(finalPrice) ? Number(finalPrice) : (base + extras);

    const fee = Number((total * 0.05).toFixed(2));
    const tax = Number(((total + fee) * 0.18).toFixed(2));
    const totalPayable = Number((total + fee + tax).toFixed(2));

    booking.finalPrice = total;
    booking.billingDetails = {
      serviceAmount: base,
      extraExpenses: extras,
      extraExpenseReason: reason,
      platformFee: fee,
      tax: tax,
      totalAmount: totalPayable
    };

    if (!Array.isArray(booking.stageHistory)) {
      booking.stageHistory = [];
    }

    booking.stageHistory.push({
      stage: booking.serviceStage || 'completed',
      title: 'Final Bill Confirmed',
      description: `Provider confirmed final amount ₹${total}${extras > 0 ? ` (Labor: ₹${base}, Parts/Extras: ₹${extras}${reason ? ` - ${reason}` : ''})` : ''}`,
      timestamp: new Date()
    });

    await booking.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate('customerId', 'name phone email customerDetails')
      .populate('providerId', 'name phone providerDetails');

    res.json(populatedBooking);
  } catch (err) {
    console.error('Final Bill Confirm Error:', err);
    res.status(500).json({ message: 'Server Error confirming final bill' });
  }
});

// @route   PUT api/bookings/:id/status
// @desc    Update booking status (Provider only for accept/decline)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status, workPhotos, finalPrice } = req.body;
    let booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const providerIdStr = (booking.providerId?._id || booking.providerId)?.toString();
    const userIdStr = req.user.id.toString();

    if (providerIdStr !== userIdStr && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized to update this booking' });
    }

    // Strict Gate: Provider cannot accept booking if profile is incomplete
    if (status === 'accepted') {
      const providerUser = await User.findById(req.user.id);
      if (providerUser) {
        const check = checkProviderProfileCompleteness(providerUser);
        if (!check.isComplete) {
          return res.status(400).json({
            message: `Cannot accept service request! Please complete all mandatory profile fields and add portfolio images: ${check.missing.join(', ')}`,
            missingFields: check.missing
          });
        }
      }
    }
    
    const wasCompleted = booking.status === 'completed';

    booking.status = status;
    if (status === 'accepted') booking.serviceStage = 'accepted';
    if (status === 'declined') booking.serviceStage = 'declined';
    if (status === 'completed') booking.serviceStage = 'completed';

    if (workPhotos && Array.isArray(workPhotos)) {
      booking.workPhotos = workPhotos;
    }
    if (finalPrice !== undefined && !isNaN(finalPrice)) {
      booking.finalPrice = Number(finalPrice);
    }

    if (!Array.isArray(booking.stageHistory)) {
      booking.stageHistory = [];
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

    const populatedBooking = await Booking.findById(booking._id)
      .populate('customerId', 'name phone email customerDetails')
      .populate('providerId', 'name phone providerDetails');

    res.json(populatedBooking);
  } catch (err) {
    console.error('Status Update Error:', err.message);
    res.status(500).json({ message: 'Server Error updating booking status' });
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
