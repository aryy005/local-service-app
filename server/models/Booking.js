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
  customerReview: {
    rating: { type: Number },
    comment: { type: String }
  },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
