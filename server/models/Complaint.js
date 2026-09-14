const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  bookingRef: { type: String, default: '' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['open', 'under_review', 'resolved', 'dismissed'], 
    default: 'under_review' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    default: 'medium' 
  },
  resolutionNotes: { type: String, default: '' },
  resolvedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);
