const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    trim: true, 
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v);
      },
      message: props => `"${props.value}" is not a valid email address.`
    }
  },
  phone: { 
    type: String, 
    default: '', 
    trim: true,
    validate: {
      validator: function(v) {
        if (!v || v.trim() === '') return true;
        const clean = v.replace(/[\s\-()]/g, '').replace(/^\+91|^91/, '');
        return /^[6-9]\d{9}$/.test(clean);
      },
      message: props => `"${props.value}" is not a valid 10-digit Indian mobile number.`
    }
  },
  password: { 
    type: String, 
    required: function() { return this.authProvider === 'local'; } 
  },
  role: { type: String, enum: ['customer', 'provider', 'admin'], required: true },
  googleId: { type: String },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },

  // Detailed address & location precision for all users
  city: { type: String, default: '', trim: true },
  addressDetails: {
    street: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    state: { type: String, default: '', trim: true },
    pincode: { 
      type: String, 
      default: '', 
      trim: true,
      validate: {
        validator: function(v) {
          if (!v || v.trim() === '') return true;
          return /^[1-9][0-9]{5}$/.test(v.trim());
        },
        message: props => `"${props.value}" is not a valid 6-digit Indian pincode.`
      }
    }
  },
  savedAddresses: [{
    label: { type: String, default: 'Home', trim: true }, // 'Home', 'Work', 'Other'
    street: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    state: { type: String, default: '', trim: true },
    pincode: { 
      type: String, 
      default: '', 
      trim: true,
      validate: {
        validator: function(v) {
          if (!v || v.trim() === '') return true;
          return /^[1-9][0-9]{5}$/.test(v.trim());
        },
        message: props => `"${props.value}" is not a valid 6-digit Indian pincode.`
      }
    },
    isDefault: { type: Boolean, default: false }
  }],

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
    upiId: { 
      type: String, 
      trim: true,
      validate: {
        validator: function(v) {
          if (!v || v.trim() === '') return true;
          return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(v.trim());
        },
        message: props => `"${props.value}" is not a valid UPI ID (e.g. mobile@upi or name@okhdfcbank).`
      }
    }, // For Instant Payouts
    experienceYears: { type: Number, default: 0, min: 0 },
    totalJobsCompleted: { type: Number, default: 0 },
    category: { type: String },
    categoryName: { type: String, default: '' },
    hourlyRate: { 
      type: Number,
      validate: {
        validator: function(v) {
          if (v === undefined || v === null) return true;
          return v > 0;
        },
        message: 'Hourly rate must be greater than 0.'
      }
    },
    location: { type: String },
    locationGeo: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0,0] } // [longitude, latitude]
    },
    description: { type: String },
    skills: [{ type: String }],
    portfolioImages: [{ type: String }], // Images of past work / portfolio photos
    isProfileComplete: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    avatarUrl: { type: String, default: '' },
    // Account & Verification Status
    status: { type: String, enum: ['Pending', 'Verified', 'Suspended', 'Rejected'], default: 'Pending' },
    documents: [{
      title: { type: String, required: true },
      status: { type: String, enum: ['Verified', 'Pending', 'Rejected'], default: 'Pending' },
      fileUrl: { type: String, default: '' },
      uploadedAt: { type: Date, default: Date.now }
    }],
    // Aadhaar Verification (UIDAI)
    aadhaarHash: { type: String, default: '' },       // SHA-256 hashed Aadhaar for security
    aadhaarLastFour: { type: String, default: '' },   // Last 4 digits for display (XXXX-XXXX-1234)
    aadhaarVerified: { type: Boolean, default: false },
    aadhaarVerifiedAt: { type: Date },
    aadhaarRefId: { type: String, default: '' },      // UIDAI transaction reference ID
    // Partner Welcome Email Tracking
    welcomeEmailSent: { type: Boolean, default: false },
    welcomeEmailSentAt: { type: Date },
    // Official Provider ID & Admin Verification
    providerId: { type: String, default: '' },
    verifiedByAdmin: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    idCardIssued: { type: Boolean, default: false },
    idCardIssueDate: { type: Date }
  },
  // Password Reset Token & OTP fields
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
  resetPasswordOtp: { type: String, default: null }
}, { timestamps: true });

// Ensure strict ONE account per email address across the entire application
userSchema.index({ email: 1 }, { unique: true });
// Add geospatial index for fast nearby radius queries
userSchema.index({ 'providerDetails.locationGeo': '2dsphere' });

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
