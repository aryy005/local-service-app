const Notification = require('../models/Notification');

/**
 * Dispatch an in-app notification to a user via MongoDB and Socket.io
 */
async function notifyUser(io, { recipient, sender, title, message, type = 'system', link = '', metadata = {} }) {
  try {
    if (!recipient) return null;

    const notification = new Notification({
      recipient,
      sender,
      title,
      message,
      type,
      link,
      metadata
    });

    await notification.save();

    // If socket.io is available, emit directly to user's private channel
    if (io) {
      const recipientRoom = 'user-' + (recipient._id || recipient).toString();
      io.to(recipientRoom).emit('new_notification', notification);
    }

    return notification;
  } catch (err) {
    console.error('[NOTIFY USER ERROR]', err.message);
    return null;
  }
}

module.exports = { notifyUser };
