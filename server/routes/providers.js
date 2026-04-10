const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Review = require('../models/Review');
const auth = require('../middleware/auth');

// @route   GET api/providers
// @desc    Get all service providers, optionally filtered by geospatial radius
router.get('/', async (req, res) => {
  try {
    const { lng, lat, radius } = req.query;
    
    let query = { role: 'provider' };
    
    // If coordinates are provided, perform a $near query
    if (lng && lat) {
      const distanceInMeters = radius ? parseInt(radius) : 30000; // Default 30km
      query['providerDetails.locationGeo'] = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: distanceInMeters
        }
      };
    }

    const providers = await User.find(query).select('-password');

    // Mongoose $near automatically sorts by distance. 
    // We can also calculate actual distance here if we switched to aggregation pipeline, 
    // but $near is simpler for filtering + sorting.
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

// @route   GET api/providers/:id/portfolio
// @desc    Get work photos from provider's completed bookings
router.get('/:id/portfolio', async (req, res) => {
  try {
    const bookings = await require('../models/Booking').find({
      providerId: req.params.id,
      status: 'completed',
      workPhotos: { $exists: true, $not: { $size: 0 } }
    });
    
    // Extract all photos into a flat array
    let photos = [];
    bookings.forEach(b => {
      if (b.workPhotos) photos = photos.concat(b.workPhotos);
    });
    
    res.json(photos);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
