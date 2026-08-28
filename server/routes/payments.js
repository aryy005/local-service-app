const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');

// Helper to calculate price breakdown
const calculateBreakdown = (servicePrice) => {
  const price = Number(servicePrice) || 0;
  const platformFee = Number((price * 0.05).toFixed(2)); // 5% platform fee
  const tax = Number(((price + platformFee) * 0.18).toFixed(2)); // 18% GST/Tax
  const totalAmount = Number((price + platformFee + tax).toFixed(2));

  return {
    serviceAmount: price,
    platformFee,
    tax,
    totalAmount
  };
};

// @route   POST api/payments/create-order
// @desc    Calculate itemized order breakdown for post-service payment
router.post('/create-order', auth, async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    const booking = await Booking.findById(bookingId).populate('providerId', 'name phone providerDetails');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.customerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to initiate payment for this booking' });
    }

    const servicePrice = booking.finalPrice || (booking.providerId?.providerDetails?.hourlyRate || 25);
    const breakdown = calculateBreakdown(servicePrice);
    const orderId = 'ORD_' + Date.now() + '_' + Math.floor(1000 + Math.random() * 9000);

    res.json({
      orderId,
      bookingId: booking._id,
      providerName: booking.providerId?.name || 'Service Professional',
      serviceDate: booking.date,
      breakdown,
      currency: 'INR',
      paymentStatus: booking.paymentStatus
    });
  } catch (err) {
    console.error('Create Payment Order Error:', err);
    res.status(500).json({ message: 'Server Error creating payment order' });
  }
});

// @route   POST api/payments/verify
// @desc    Process & verify payment for a booking
router.post('/verify', auth, async (req, res) => {
  try {
    const { bookingId, paymentMethod, transactionId, gateway } = req.body;

    if (!bookingId || !paymentMethod) {
      return res.status(400).json({ message: 'Missing payment parameters' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.customerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Booking is already paid' });
    }

    const servicePrice = booking.finalPrice || (booking.providerId?.providerDetails?.hourlyRate || 25);
    const breakdown = calculateBreakdown(servicePrice);
    const txnId = transactionId || 'TXN_' + Date.now() + '_' + Math.floor(1000 + Math.random() * 9000);

    // Save payment record
    const payment = new Payment({
      bookingId: booking._id,
      customerId: booking.customerId,
      providerId: booking.providerId,
      amount: breakdown.totalAmount,
      serviceAmount: breakdown.serviceAmount,
      platformFee: breakdown.platformFee,
      tax: breakdown.tax,
      currency: 'INR',
      gateway: gateway || 'mock',
      paymentMethod,
      transactionId: txnId,
      status: 'success',
      paidAt: new Date()
    });

    await payment.save();

    // Update Booking status
    booking.paymentStatus = 'paid';
    booking.paymentMethod = paymentMethod;
    booking.paymentId = txnId;
    booking.paidAmount = breakdown.totalAmount;
    booking.paidAt = new Date();
    booking.billingDetails = breakdown;

    await booking.save();

    res.json({
      message: 'Payment verified and updated successfully',
      payment,
      booking
    });
  } catch (err) {
    console.error('Payment Verification Error:', err);
    res.status(500).json({ message: 'Server Error processing payment' });
  }
});

// @route   GET api/payments/booking/:bookingId
// @desc    Get detailed receipt for a booking
router.get('/booking/:bookingId', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('customerId', 'name email phone')
      .populate('providerId', 'name phone providerDetails');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const payment = await Payment.findOne({ bookingId: booking._id });

    res.json({
      booking,
      payment
    });
  } catch (err) {
    console.error('Get Booking Payment Error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET api/payments/admin/summary
// @desc    Admin financial overview & transaction metrics
router.get('/admin/summary', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const totalPayments = await Payment.find().sort({ createdAt: -1 });

    const totalVolume = totalPayments.reduce((acc, p) => acc + p.amount, 0);
    const totalPlatformFee = totalPayments.reduce((acc, p) => acc + p.platformFee, 0);
    const totalServiceAmount = totalPayments.reduce((acc, p) => acc + p.serviceAmount, 0);

    const countByMethod = totalPayments.reduce((acc, p) => {
      acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + 1;
      return acc;
    }, {});

    res.json({
      totalVolume: Number(totalVolume.toFixed(2)),
      totalPlatformFee: Number(totalPlatformFee.toFixed(2)),
      totalServiceAmount: Number(totalServiceAmount.toFixed(2)),
      totalTransactionsCount: totalPayments.length,
      methodBreakdown: countByMethod,
      recentTransactions: totalPayments.slice(0, 10)
    });
  } catch (err) {
    console.error('Admin Payment Summary Error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
