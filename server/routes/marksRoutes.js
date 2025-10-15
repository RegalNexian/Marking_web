const express = require('express');
const {
  saveMarks,
  getMarksByJury,
  getLeaderboard,
  getSubmissionStatus,
  getAllMarks
} = require('../controllers/marksController');

const router = express.Router();

// GET /api/marks/leaderboard - Get leaderboard data
router.get('/leaderboard', getLeaderboard);

// GET /api/marks/status - Get jury submission statuses
router.get('/status', getSubmissionStatus);

// GET /api/marks/all - Get all marks
router.get('/all', getAllMarks);

// POST /api/marks/track/:trackId/jury/:juryName - Save marks for a jury within a track
router.post('/track/:trackId/jury/:juryName', saveMarks);

// GET /api/marks/track/:trackId/jury/:juryName - Get marks for a specific jury within a track
router.get('/track/:trackId/jury/:juryName', getMarksByJury);

module.exports = router;
