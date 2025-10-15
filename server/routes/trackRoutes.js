const express = require('express');
const {
  getAllTracks,
  getTrackById,
  createTrack,
  updateTrack,
  deleteTrack,
  verifyTrackPassword
} = require('../controllers/trackController');

const router = express.Router();

router.get('/', getAllTracks);
router.get('/:id', getTrackById);
router.post('/', createTrack);
router.put('/:id', updateTrack);
router.delete('/:id', deleteTrack);
router.post('/:id/verify', verifyTrackPassword);

module.exports = router;
