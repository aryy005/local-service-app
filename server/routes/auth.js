const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST api/auth/register
// @desc    Register a user
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role, providerDetails } = req.body;

    let user = await User.findOne({ email, role });
    if (user) {
      return res.status(400).json({ message: `User already exists as a ${role}` });
    }

    user = new User({
      name,
      email,
      phone,
      password,
      role,
      providerDetails: role === 'provider' ? providerDetails : undefined
    });

    await user.save();

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
// @desc    Update user profile
router.put('/me', auth, async (req, res) => {
  try {
    const { name, phone, providerDetails } = req.body;
    let user = await User.findById(req.user.id);
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.name = name || user.name;
    user.phone = phone || user.phone;
    
    if (user.role === 'provider' && providerDetails) {
      user.providerDetails = {
        ...user.providerDetails,
        ...providerDetails
      };
    }
    
    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
