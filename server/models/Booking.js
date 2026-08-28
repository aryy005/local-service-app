const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  timePreference: { type: String, required: true },
  description: { type: String, required: true },
  serviceAddress: { type: String, required: true, default: 'Customer Location' }, // Added service address
  status: { type: String, enum: ['pending', 'accepted', 'declined', 'completed'], default: 'pending' },
  workPhotos: [{ type: String }], // Array of image URLs for before/after portfolio
  finalPrice: { type: Number, default: 0 }, // Actual amount earned
  paymentStatus: { 
    type: String, 
    enum: ['unpaid', 'pending', 'paid', 'failed', 'refunded'], 
    default: 'unpaid' 
  },
  paymentMethod: { 
    type: String, 
    enum: ['card', 'upi', 'netbanking', 'wallet', 'cash', 'none'], 
    default: 'none' 
  },
  paymentId: { type: String },
  paidAmount: { type: Number, default: 0 },
  paidAt: { type: Date },
  billingDetails: {
    serviceAmount: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 }
  },
  customerReview: {
    rating: { type: Number },
    comment: { type: String }
  },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
