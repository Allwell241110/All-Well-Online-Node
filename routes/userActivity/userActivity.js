const express = require('express');
const router = express.Router();
const Papa = require('papaparse');
const UserActivity = require('../../models/UserActivity');

// Helper to flatten metadata into top-level fields
function flattenActivity(activity) {
  const { metadata = {}, ...rest } = activity;
  return {
    ...rest,
    ...metadata, // flatten metadata properties into main object
  };
}

router.get('/user-activities.csv', async (req, res) => {
  try {
    const activities = await UserActivity.find().lean();

    if (!activities.length) {
      return res.status(404).send('No user activities found.');
    }

    const flattened = activities.map(flattenActivity);

    const csv = Papa.unparse(flattened);

    res.header('Content-Type', 'text/csv');
    res.attachment('user-activities.csv');
    res.send(csv);
  } catch (err) {
    console.error('Error generating CSV:', err);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;