const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true }, // Total paid by customer
  serviceAmount: { type: Number, required: true }, // Amount for service provider
  platformFee: { type: Number, required: true }, // 5% platform fee
  tax: { type: Number, required: true }, // 18% tax/GST
  currency: { type: String, default: 'INR' },
  gateway: { type: String, enum: ['razorpay', 'stripe', 'mock'], default: 'mock' },
  paymentMethod: { 
    type: String, 
    enum: ['card', 'upi', 'netbanking', 'wallet', 'cash'], 
    required: true 
  },
  transactionId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['success', 'failed', 'pending', 'refunded'], default: 'success' },
  paidAt: { type: Date, default: Date.now },
  metadata: { type: Object }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
