const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { hashAadhaar, isValidAadhaar } = require('../services/verification');

// @route   POST api/auth/google
// @desc    Authenticate user with Google OAuth 2.0 Credential Token
router.post('/google', async (req, res) => {
  try {
    const { credential, role = 'customer' } = req.body;

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
    const normalizedRole = ['customer', 'provider', 'admin'].includes(role) ? role : 'customer';

    // Find existing user by email and role
    let user = await User.findOne({ email, role: normalizedRole });

    if (user) {
      // Link Google ID if not already linked
      if (!user.googleId) {
        user.googleId = googleId;
      }
      user.emailVerified = true;
      if (!user.emailVerifiedAt) {
        user.emailVerifiedAt = new Date();
      }
      await user.save();
    } else {
      // Create new user account with Google profile
      user = new User({
        name: name || 'Google User',
        email,
        role: normalizedRole,
        googleId,
        authProvider: 'google',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        providerDetails: normalizedRole === 'provider' ? {
          avatarUrl: picture || ''
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
    console.error('Google Auth Error:', err);
    res.status(500).json({ message: 'Google authentication failed on server' });
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
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!role) {
      return res.status(400).json({ message: 'Role is required for login' });
    }

    let user = await User.findOne({ email, role });
    if (!user) {
      return res.status(400).json({ message: 'Invalid Credentials for this role' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    const payload = { user: { id: user.id, role: user.role } };
    jwt.sign(payload, process.env.JWT_SECRET || 'secret123', { expiresIn: '5h' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
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
// @desc    Update user profile and verification status
router.put('/me', auth, async (req, res) => {
  try {
    const { name, phone, emailVerified, phoneVerified, providerDetails } = req.body;
    let user = await User.findById(req.user.id);
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (typeof emailVerified === 'boolean') {
      user.emailVerified = emailVerified;
      if (emailVerified && !user.emailVerifiedAt) user.emailVerifiedAt = new Date();
    }
    if (typeof phoneVerified === 'boolean') {
      user.phoneVerified = phoneVerified;
      if (phoneVerified && !user.phoneVerifiedAt) user.phoneVerifiedAt = new Date();
    }
    
    if (user.role === 'provider' && providerDetails) {
      user.providerDetails = {
        ...user.providerDetails,
        ...providerDetails
      };
    }
    
    await user.save();
    res.json(user);
  } catch (err) {
    console.error('Profile update error:', err.message);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

module.exports = router;
