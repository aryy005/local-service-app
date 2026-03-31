const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true, default: '000-000-0000' }, // Default for legacy users without a phone
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'provider', 'admin'], required: true },
  
  // Provider specific fields
  providerDetails: {
    category: { type: String }, // e.g. 'cat-1'
    hourlyRate: { type: Number },
    location: { type: String },
    description: { type: String },
    skills: [{ type: String }],
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    avatarUrl: { type: String, default: 'https://images.unsplash.com/photo-1544723795-3cj5a4a5t6f1?auto=format&fit=crop&q=80&w=150&h=150' }
  }
}, { timestamps: true });

// Ensure a user can only have one account per role
userSchema.index({ email: 1, role: 1 }, { unique: true });

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
