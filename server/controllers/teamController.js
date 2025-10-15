const Team = require('../models/Team');
const Marks = require('../models/Marks');
const {
  ensureTrackDocument,
  normalizeTeams
} = require('../utils/trackNormalization');

// Get all teams
const getAllTeams = async (req, res) => {
  try {
    const { trackId } = req.query;
    const filter = {};
    if (trackId) {
      const track = await ensureTrackDocument(trackId);
      if (!track) {
        return res.json([]);
      }
      filter.track = track._id;
    }

    await normalizeTeams();

    const teams = await Team.find(filter).populate('track');
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new team
const createTeam = async (req, res) => {
  try {
    const { name, category, trackId } = req.body;

    if (!trackId) {
      return res.status(400).json({ message: 'trackId is required' });
    }

    const track = await ensureTrackDocument(trackId);
    if (!track) {
      return res.status(404).json({ message: 'Track not found' });
    }

    const team = new Team({ name, category, track: track._id });
    await team.save();
    res.status(201).json(team);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update team
const updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, trackId } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (trackId !== undefined) {
      const track = await ensureTrackDocument(trackId);
      if (!track) {
        return res.status(404).json({ message: 'Track not found' });
      }
      updates.track = track._id;
    }

    const team = await Team.findByIdAndUpdate(id, updates, { new: true }).populate('track');
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    res.json(team);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete team
const deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const team = await Team.findByIdAndDelete(id);

    if (team) {
      await Marks.deleteMany({ teamName: team.name, track: team.track });
    }
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get team by name
const getTeamByName = async (req, res) => {
  try {
    const { name } = req.params;
    const { trackId } = req.query;
    const filter = { name };
    if (trackId) {
      const track = await ensureTrackDocument(trackId);
      if (!track) {
        return res.status(404).json({ message: 'Team not found' });
      }
      filter.track = track._id;
    }
    const team = await Team.findOne(filter).populate('track');
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamByName
};