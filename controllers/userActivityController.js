const UserActivity = require('../models/userActivity');

// Log a new user activity
exports.logActivity = async (req, res) => {
  try {
    const { userId, type, productId, metadata } = req.body;

    const activity = new UserActivity({
      userId,
      type,
      productId,
      metadata,
    });

    const savedActivity = await activity.save();
    res.status(201).json(savedActivity);
  } catch (err) {
    res.status(500).json({ error: 'Failed to log activity', details: err.message });
  }
};

// Get all activities (admin access)
exports.getAllActivities = async (req, res) => {
  try {
    const activities = await UserActivity.find()
      .populate('userId', 'username email')
      .populate('productId', 'name');
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve activities' });
  }
};

// Get activities for a specific user
exports.getUserActivities = async (req, res) => {
  try {
    const activities = await UserActivity.find({ userId: req.params.userId })
      .populate('productId', 'name');
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve user activities' });
  }
};

// Delete all activities (optional admin feature)
exports.deleteAllActivities = async (req, res) => {
  try {
    await UserActivity.deleteMany();
    res.json({ message: 'All activities deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete activities' });
  }
};
