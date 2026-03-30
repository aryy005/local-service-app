const express = require('express');
const router = express.Router();
const User = require('../models/User');

// @route   GET api/providers
// @desc    Get all service providers
router.get('/', async (req, res) => {
  try {
    const providers = await User.find({ role: 'provider' }).select('-password');
    res.json(providers);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/providers/:id
// @desc    Get provider by ID
router.get('/:id', async (req, res) => {
  try {
    const provider = await User.findOne({ _id: req.params.id, role: 'provider' }).select('-password');
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    res.json(provider);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Provider not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;
