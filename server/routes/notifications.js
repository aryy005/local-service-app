const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// @route   GET api/notifications
// @desc   Get users notifications + unread count
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user.id, 
      isRead: false 
    });

    res.json({
      notifications,
      unreadCount
    });
  } catch (err) {
    console.error('Fetch Notifications Error:', err.message);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

// @route   PUT api/notifications/:id/read
// @desc   Mark a single notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user.id, 
      isRead: false 
    });

    res.json({ notification, unreadCount });
  } catch (err) {
    console.error('Mark Read Error:', err.message);
    res.status(500).json({ message: 'Server error marking notification read' });
  }
});

// @route   PUT api/notifications/read-all
// @desc   Mark all user notifications as read
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ message: 'All notifications marked as read', unreadCount: 0 });
  } catch (err) {
    console.error('Mark All Read Error:', err.message);
    res.status(500).json({ message: 'Server error marking all read' });
  }
});

// @route   DELETE api/notifications/:id
// @desc   Delete a notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user.id, 
      isRead: false 
    });

    res.json({ message: 'Notification removed', unreadCount });
  } catch (err) {
    console.error('Delete Notification Error:', err.message);
    res.status(500).json({ message: 'Server error deleting notification' });
  }
});

// @desc   Clear all notifications for user
router.delete('/clear-all', auth, async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user.id });
    res.json({ message: 'All notifications cleared', unreadCount: 0 });
  } catch (err) {
    console.error('Clear All Error:', err.message);
    res.status(500).json({ message: 'Server error clearing notifications' });
  }
});

module.exports = router;