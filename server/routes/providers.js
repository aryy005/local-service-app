const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Review = require('../models/Review');
const auth = require('../middleware/auth');

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

// @route   POST api/providers/:id/reviews
// @desc    Add a review for a provider
router.post('/:id/reviews', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const providerId = req.params.id;
    const customerId = req.user.id;

    const provider = await User.findById(providerId);
    if (!provider || provider.role !== 'provider') {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const existingReview = await Review.findOne({ provider: providerId, customer: customerId });
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this provider' });
    }

    const review = new Review({
      provider: providerId,
      customer: customerId,
      rating,
      comment
    });

    await review.save();

    // Update aggregate logic
    const allReviews = await Review.find({ provider: providerId });
    const totalRating = allReviews.reduce((acc, curr) => acc + curr.rating, 0);
    provider.providerDetails.rating = Number((totalRating / allReviews.length).toFixed(1));
    provider.providerDetails.reviewsCount = allReviews.length;
    await provider.save();

    res.json(review);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/providers/:id/reviews
// @desc    Get all reviews for provider
router.get('/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ provider: req.params.id }).populate('customer', 'name');
    res.json(reviews);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
