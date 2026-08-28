const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { hashAadhaar, isValidAadhaar } = require('../services/verification');

// @route   POST api/auth/google
// @route   POST api/auth/google
// @desc    Authenticate user with Google OAuth 2.0 Credential Token (Enforces strict registration check)
router.post('/google', async (req, res) => {
  try {
    const { 
      credential, 
      role = 'customer', 
      action = 'login',
      street = '',
      city = '',
      state = '',
      pincode = '',
      phone = '',
      category = 'cat-5',
      hourlyRate = 25,
      description = ''
    } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential token is required' });
    }

    let payload;
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (clientId) {
      const client = new OAuth2Client(clientId);
      try {
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: clientId,
        });
        payload = ticket.getPayload();
      } catch (verifyErr) {
        console.error('Google ID token verification failed:', verifyErr.message);
        return res.status(400).json({ message: 'Invalid or expired Google token. Please sign in again.' });
      }
    } else {
      // Fallback decode for local testing when GOOGLE_CLIENT_ID is not configured in env
      try {
        const base64Url = credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        payload = JSON.parse(jsonPayload);
      } catch (parseErr) {
        return res.status(400).json({ message: 'Failed to parse Google credential token' });
      }
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ message: 'Invalid token payload: Email missing' });
    }

    const { email, name, sub: googleId, picture } = payload;
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedRole = ['customer', 'provider', 'admin'].includes(role) ? role : 'customer';

    // Find existing user by email
    let user = await User.findOne({ email: normalizedEmail });

    // IF LOGIN: User MUST already exist in the database
    if (action === 'login') {
      if (!user) {
        return res.status(400).json({
          message: `No account found for "${normalizedEmail}". You must sign up first before signing in.`
        });
      }
      if (user.role !== normalizedRole) {
        return res.status(400).json({
          message: `This email is registered as a "${user.role}". Please switch to the ${user.role} role to sign in.`
        });
      }
      if (!user.googleId) {
        user.googleId = googleId;
      }
      user.emailVerified = true;
      if (!user.emailVerifiedAt) user.emailVerifiedAt = new Date();
      await user.save();
    } else {
      // IF REGISTER: User must NOT already exist
      if (user) {
        return res.status(400).json({
          message: `An account with email "${normalizedEmail}" already exists. Please sign in instead.`
        });
      }

      const primaryCity = city.trim() || 'Delhi NCR';
      const addressObj = {
        street: street.trim(),
        city: primaryCity,
        state: state.trim(),
        pincode: pincode.trim()
      };

      const initialSavedAddresses = [];
      if (street.trim() || city.trim()) {
        initialSavedAddresses.push({
          label: 'Home',
          street: street.trim(),
          city: primaryCity,
          state: state.trim(),
          pincode: pincode.trim(),
          isDefault: true
        });
      }

      user = new User({
        name: name || 'Google User',
        email: normalizedEmail,
        phone: phone.trim(),
        role: normalizedRole,
        googleId,
        authProvider: 'google',
        city: primaryCity,
        addressDetails: addressObj,
        savedAddresses: initialSavedAddresses,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        providerDetails: normalizedRole === 'provider' ? {
          avatarUrl: picture || '',
          category: category || 'cat-5',
          hourlyRate: Number(hourlyRate) || 25,
          location: primaryCity,
          description: description.trim() || 'Verified professional service provider.',
          rating: 5.0,
          reviewsCount: 0,
          experienceYears: 1,
          totalJobsCompleted: 0,
          aadhaarVerified: false
        } : undefined
      });
      await user.save();
    }

    // Sign Application JWT
    const jwtPayload = { user: { id: user.id, role: user.role } };
    jwt.sign(
      jwtPayload,
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '5h' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      }
    );
  } catch (err) {
    console.error('Google Auth Error:', err.message);
    res.status(500).json({ message: 'Google authentication failed' });
  }
});

// @route   POST api/auth/register
// @desc    Register a user with location precision address details (Instant Sign-Up)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'customer', category, hourlyRate, location, description, phone, street, city, state, pincode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedRole = ['customer', 'provider', 'admin'].includes(role) ? role : 'customer';

    // Strict 1 Email = 1 Account Global Check
    let user = await User.findOne({ email: normalizedEmail });
    if (user) {
      return res.status(400).json({ message: `An account with email address "${email}" already exists. Only one account can be created per email address. Please sign in instead or reset your password.` });
    }

    const formattedLocation = location || [street, city, state, pincode].filter(Boolean).join(', ') || 'City Center';

    user = new User({
      name,
      email: normalizedEmail,
      phone: phone || '',
      password,
      role: normalizedRole,
      authProvider: 'local',
      city: (city || location || '').trim(),
      addressDetails: {
        street: street || '',
        city: (city || location || '').trim(),
        state: state || '',
        pincode: pincode || ''
      },
      emailVerified: false,
      phoneVerified: false,
      providerDetails: normalizedRole === 'provider' ? {
        category: category || 'cat-5',
        hourlyRate: Number(hourlyRate) || 20,
        location: formattedLocation,
        description: description || `Professional ${category || 'service'} provider dedicated to quality work.`,
        rating: 5.0,
        reviewsCount: 0,
        experienceYears: 1,
        totalJobsCompleted: 0,
        aadhaarVerified: false
      } : undefined
    });

    await user.save();

    const payload = { user: { id: user.id, role: user.role } };
    jwt.sign(payload, process.env.JWT_SECRET || 'secret123', { expiresIn: '5h' }, (err, token) => {
      if (err) throw err;
      res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, city: user.city, addressDetails: user.addressDetails }
      });
    });
  } catch (err) {
    console.error('Registration Error:', err.message);
    res.status(500).json({ message: err.message || 'Server error during registration' });
  }
});

// @route   POST api/auth/forgot-password
// @desc    Request Password Reset OTP & Token
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email address is required' });

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address.' });
    }

    // Generate 6-digit OTP and Reset Token
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

    user.resetPasswordOtp = otp;
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = expiresAt;

    await user.save();

    res.json({
      success: true,
      message: `Password reset OTP generated successfully for ${email}.`,
      otp, // Provided directly for seamless instant testing & reset
      resetToken
    });
  } catch (err) {
    console.error('Forgot Password Error:', err.message);
    res.status(500).json({ message: 'Server error processing password reset request' });
  }
});

// @route   POST api/auth/reset-password
// @desc    Reset Password using OTP or Token
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp.trim()) {
      return res.status(400).json({ message: 'Invalid OTP verification code' });
    }

    if (user.resetPasswordExpires && new Date(user.resetPasswordExpires) < new Date()) {
      return res.status(400).json({ message: 'OTP verification code has expired. Please request a new code.' });
    }

    // Update password (pre-save hook will hash password)
    user.password = newPassword;
    user.resetPasswordOtp = null;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.'
    });
  } catch (err) {
    console.error('Reset Password Error:', err.message);
    res.status(500).json({ message: 'Server error resetting password' });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token (Enforces strict account existence check)
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password, and role are all required to sign in' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ message: `No account found with email "${normalizedEmail}". Please sign up first.` });
    }

    if (user.role !== role) {
      return res.status(400).json({
        message: `This email is registered as a "${user.role}". Please select the ${user.role} role to sign in.`
      });
    }

    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({
        message: 'This account was created with Google Sign-In. Please click "Continue with Google" to sign in.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password. Please check your credentials or reset your password.' });
    }

    const payload = { user: { id: user.id, role: user.role } };
    jwt.sign(payload, process.env.JWT_SECRET || 'secret123', { expiresIn: '5h' }, (err, token) => {
      if (err) throw err;
      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          city: user.city,
          addressDetails: user.addressDetails
        }
      });
    });
  } catch (err) {
    console.error('Login Error:', err.message);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET api/auth/me
// @desc    Get logged in user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT api/auth/me
// @desc    Update user profile, address, and verification status
router.put('/me', auth, async (req, res) => {
  try {
    const { name, phone, city, addressDetails, savedAddresses, emailVerified, phoneVerified, providerDetails } = req.body;
    let user = await User.findById(req.user.id);
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (city) user.city = city;
    
    if (addressDetails) {
      user.addressDetails = {
        ...user.addressDetails,
        ...addressDetails
      };
      if (addressDetails.city) user.city = addressDetails.city;
    }

    if (Array.isArray(savedAddresses)) {
      user.savedAddresses = savedAddresses;
    }

    if (typeof emailVerified === 'boolean') {
      user.emailVerified = emailVerified;
      if (emailVerified && !user.emailVerifiedAt) user.emailVerifiedAt = new Date();
    }
    if (typeof phoneVerified === 'boolean') {
      user.phoneVerified = phoneVerified;
      if (phoneVerified && !user.phoneVerifiedAt) user.phoneVerifiedAt = new Date();
    }
    
    if (user.role === 'provider') {
      if (providerDetails) {
        user.providerDetails = {
          ...user.providerDetails,
          ...providerDetails
        };
        if (Array.isArray(providerDetails.portfolioImages)) {
          user.providerDetails.portfolioImages = providerDetails.portfolioImages;
        }
      }

      // Check completeness
      const p = user.providerDetails || {};
      const missing = [];
      if (!user.name || !user.name.trim()) missing.push('Full Name');
      if (!user.phone || !user.phone.trim()) missing.push('Phone Number');
      if (!user.city && !user.addressDetails?.city && !p.location) missing.push('City / Service Area');
      if (!p.category || !p.category.trim()) missing.push('Service Category');
      if (!p.hourlyRate || Number(p.hourlyRate) <= 0) missing.push('Hourly Rate');
      if (p.experienceYears === undefined || p.experienceYears === null || Number(p.experienceYears) < 0) missing.push('Years of Experience');
      if (!p.description || p.description.trim().length < 10) missing.push('Bio / Description');
      if (!p.upiId || !p.upiId.trim()) missing.push('UPI ID');
      if (!p.portfolioImages || !Array.isArray(p.portfolioImages) || p.portfolioImages.length === 0) missing.push('Work Portfolio Images');
      if (!user.phoneVerified && !p.aadhaarVerified) missing.push('Phone or Aadhaar Verification');

      user.providerDetails.isProfileComplete = (missing.length === 0);
    }
    
    await user.save();
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (err) {
    console.error('Profile update error:', err.message);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// @route   POST api/auth/addresses
// @desc    Add a new address to user's savedAddresses
router.post('/addresses', auth, async (req, res) => {
  try {
    const { label = 'Home', street = '', city = '', state = '', pincode = '', isDefault = false } = req.body;

    if (!street || !city) {
      return res.status(400).json({ message: 'Street address and City are required' });
    }

    let user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!Array.isArray(user.savedAddresses)) {
      user.savedAddresses = [];
    }

    const shouldBeDefault = isDefault || user.savedAddresses.length === 0;

    if (shouldBeDefault) {
      user.savedAddresses.forEach(a => a.isDefault = false);
      user.city = city.trim();
      user.addressDetails = {
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim()
      };
    }

    user.savedAddresses.push({
      label: label.trim() || 'Home',
      street: street.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      isDefault: shouldBeDefault
    });

    await user.save();
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (err) {
    console.error('Add address error:', err.message);
    res.status(500).json({ message: 'Failed to add address' });
  }
});

// @route   PUT api/auth/addresses/:id
// @desc    Update an existing saved address or set as default
router.put('/addresses/:id', auth, async (req, res) => {
  try {
    const { label, street, city, state, pincode, isDefault } = req.body;
    let user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const addr = user.savedAddresses.id(req.params.id);
    if (!addr) return res.status(404).json({ message: 'Address not found' });

    if (label !== undefined) addr.label = label.trim();
    if (street !== undefined) addr.street = street.trim();
    if (city !== undefined) addr.city = city.trim();
    if (state !== undefined) addr.state = state.trim();
    if (pincode !== undefined) addr.pincode = pincode.trim();

    if (isDefault) {
      user.savedAddresses.forEach(a => a.isDefault = false);
      addr.isDefault = true;
      user.city = addr.city;
      user.addressDetails = {
        street: addr.street,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode
      };
    }

    await user.save();
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (err) {
    console.error('Update address error:', err.message);
    res.status(500).json({ message: 'Failed to update address' });
  }
});

// @route   DELETE api/auth/addresses/:id
// @desc    Delete a saved address
router.delete('/addresses/:id', auth, async (req, res) => {
  try {
    let user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.savedAddresses.pull({ _id: req.params.id });

    // If remaining addresses exist and none is default, set the first one as default
    if (user.savedAddresses.length > 0 && !user.savedAddresses.some(a => a.isDefault)) {
      user.savedAddresses[0].isDefault = true;
      user.city = user.savedAddresses[0].city;
      user.addressDetails = {
        street: user.savedAddresses[0].street,
        city: user.savedAddresses[0].city,
        state: user.savedAddresses[0].state,
        pincode: user.savedAddresses[0].pincode
      };
    }

    await user.save();
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (err) {
    console.error('Delete address error:', err.message);
    res.status(500).json({ message: 'Failed to delete address' });
  }
});

module.exports = router;
