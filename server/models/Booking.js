const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  timePreference: { type: String, required: true },
  description: { type: String, required: true },
  serviceAddress: { type: String, required: true, default: 'Customer Location' }, // Added service address
  status: { type: String, enum: ['pending', 'accepted', 'declined', 'completed'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
