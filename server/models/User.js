const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'provider', 'admin'], required: true },
  
  // Verification Status (applicable to all users)
  emailVerified: { type: Boolean, default: false },
  emailVerifiedAt: { type: Date },
  phoneVerified: { type: Boolean, default: false },
  phoneVerifiedAt: { type: Date },

  // Customer specific fields
  customerDetails: {
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 }
  },

  // Provider specific fields
  providerDetails: {
    upiId: { type: String }, // For Instant Payouts
    experienceYears: { type: Number, default: 0 },
    totalJobsCompleted: { type: Number, default: 0 },
    category: { type: String },
    hourlyRate: { type: Number },
    location: { type: String },
    locationGeo: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0,0] } // [longitude, latitude]
    },
    description: { type: String },
    skills: [{ type: String }],
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    avatarUrl: { type: String, default: '' },
    // Aadhaar Verification (UIDAI)
    aadhaarHash: { type: String, default: '' },       // SHA-256 hashed Aadhaar for security
    aadhaarLastFour: { type: String, default: '' },   // Last 4 digits for display (XXXX-XXXX-1234)
    aadhaarVerified: { type: Boolean, default: false },
    aadhaarVerifiedAt: { type: Date },
    aadhaarRefId: { type: String, default: '' }       // UIDAI transaction reference ID
  }
}, { timestamps: true });

// Ensure a user can only have one account per role
userSchema.index({ email: 1, role: 1 }, { unique: true });
// Add geospatial index for fast nearby radius queries
userSchema.index({ 'providerDetails.locationGeo': '2dsphere' });

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
