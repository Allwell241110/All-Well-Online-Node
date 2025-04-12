const express = require('express');
const router = express.Router();
const activityController = require('../controllers/userActivityController');

// Log activity
router.post('/', activityController.logActivity);

// Get all activities (admin use)
router.get('/', activityController.getAllActivities);

// Get user-specific activity
router.get('/user/:userId', activityController.getUserActivities);

// Delete all activities (admin use)
router.delete('/', activityController.deleteAllActivities);

module.exports = router;
