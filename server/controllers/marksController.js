const Marks = require('../models/Marks');
const Jury = require('../models/Jury');
const Team = require('../models/Team');
const Track = require('../models/Track');
const Config = require('../models/Config');
const {
  ensureTrackDocument,
  normalizeTeams,
  normalizeJuries,
  normalizeCoreData
} = require('../utils/trackNormalization');

// Remove global state - it doesn't work in serverless
// Each function invocation is separate
const ensureCoreDataReady = async () => {
  // Skip normalization on every request - too slow
  // Only normalize when creating/updating data
  return;
};

const ensureTrack = async (trackId) => {
  if (!trackId) {
    const err = new Error('trackId is required');
    err.statusCode = 400;
    throw err;
  }
  const track = await ensureTrackDocument(trackId);
  if (!track) {
    const err = new Error('Track not found');
    err.statusCode = 404;
    throw err;
  }
  return track;
};

const getCriteriaList = async () => {
  const config = await Config.findOne();
  return (config?.criteria || []).map((c) => c.toUpperCase());
};

// -------------------- Save Marks --------------------
const saveMarks = async (req, res) => {
  try {
    const { juryName, trackId } = req.params;
    const { marks } = req.body;

    // Skip normalization - too slow for every save
    const track = await ensureTrack(trackId);

    const jury = await Jury.findOne({ name: juryName });
    if (!jury) {
      return res.status(404).json({ success: false, message: 'Jury not found' });
    }

    const assignment = jury.assignments.find(
      (item) => item.track.toString() === track._id.toString()
    );

    if (!assignment) {
      return res.status(403).json({ success: false, message: 'Jury is not assigned to this track' });
    }

    const teams = await Team.find({ track: track._id });
    const teamNames = new Set(teams.map((team) => team.name));

    const criteriaList = await getCriteriaList();

    await Marks.deleteMany({ juryName, track: track._id });

    const docs = marks.map((mark) => {
      if (!teamNames.has(mark.teamName)) {
        throw new Error(`Team ${mark.teamName} does not belong to selected track`);
      }

      const markCriteria = {};
      Object.keys(mark.criteria || {}).forEach((key) => {
        markCriteria[key.toUpperCase()] = mark.criteria[key];
      });

      const filteredCriteria = {};
      criteriaList.forEach((criterion) => {
        filteredCriteria[criterion] = markCriteria[criterion] ?? 0;
      });

      return {
        juryName,
        teamName: mark.teamName,
        track: track._id,
        criteria: filteredCriteria,
        total: Object.values(filteredCriteria).reduce((sum, value) => sum + (value || 0), 0)
      };
    });

    await Marks.insertMany(docs);

    assignment.hasSubmitted = true;
    assignment.paused = false;
    assignment.submittedAt = new Date();
    await jury.save();

    res.json({ success: true, message: 'Marks saved successfully.' });
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ success: false, message: error.message });
  }
};

// -------------------- Get Marks By Jury --------------------
const getMarksByJury = async (req, res) => {
  try {
    const { juryName, trackId } = req.params;

    if (!trackId) {
      return res.status(400).json({ message: 'Track ID is required' });
    }

    if (!juryName) {
      return res.status(400).json({ message: 'Jury name is required' });
    }

    const track = await ensureTrack(trackId);

    const jury = await Jury.findOne({ name: juryName });
    if (!jury) {
      return res.status(404).json({ message: 'Jury not found' });
    }

    const assignment = jury.assignments.find(
      (item) => item.track && item.track.toString() === track._id.toString()
    );

    if (!assignment) {
      return res.status(403).json({ message: 'Jury is not assigned to this track' });
    }

    const marks = await Marks.find({ juryName, track: track._id });
    const criteriaList = await getCriteriaList();

    const filteredMarks = marks.map((mark) => {
      const filteredCriteria = {};
      criteriaList.forEach((criterion) => {
        filteredCriteria[criterion] = mark.criteria.get(criterion) ?? 0;
      });

      return {
        ...mark.toObject(),
        criteria: filteredCriteria,
        total: Object.values(filteredCriteria).reduce((sum, v) => sum + (v || 0), 0)
      };
    });

    res.json({
      marks: filteredMarks,
      assignment: {
        hasSubmitted: assignment.hasSubmitted,
        paused: assignment.paused,
        submittedAt: assignment.submittedAt
      }
    });
  } catch (err) {
    console.error('Error in getMarksByJury:', err);
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message || 'Server error' });
  }
};

const resolveTrackFilter = async (trackId) => {
  if (trackId) {
    const track = await ensureTrack(trackId);
    return track;
  }

  const activeTrack = await Track.findOne({ isActive: true }).sort({ createdAt: -1 });
  if (activeTrack) {
    return activeTrack;
  }

  return await Track.findOne().sort({ createdAt: -1 });
};

// -------------------- Leaderboard --------------------
const getLeaderboard = async (req, res) => {
  try {
    const { trackId } = req.query;

    const track = await resolveTrackFilter(trackId);

    if (!track) {
      return res.json({ leaderboard: [], juries: [], track: null });
    }

    const [teams, juries, allMarks] = await Promise.all([
      Team.find({ track: track._id }).lean(),
      Jury.find({ 'assignments.track': track._id }).lean(),
      Marks.find({ track: track._id }).lean()
    ]);

    const leaderboard = teams.map((team) => {
      let totalScore = 0;
      const juryTotals = {};

      juries.forEach((jury) => {
        const juryMarks = allMarks.find(
          (mark) => mark.juryName === jury.name && mark.teamName === team.name
        );
        const score = juryMarks ? juryMarks.total : 0;
        juryTotals[jury.name] = score;
        totalScore += score;
      });

      return {
        teamName: team.name,
        category: team.category,
        juryTotals,
        grandTotal: totalScore
      };
    });

    leaderboard.sort((a, b) => b.grandTotal - a.grandTotal);

    const rankedLeaderboard = leaderboard.map((team, index) => ({
      rank: index + 1,
      ...team
    }));

    res.json({
      leaderboard: rankedLeaderboard,
      juries: juries.map((jury) => jury.name),
      track
    });
  } catch (error) {
    console.error('Error in getLeaderboard:', error);
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || 'Failed to load leaderboard' });
  }
};

// -------------------- Get Submission Status --------------------
const getSubmissionStatus = async (req, res) => {
  try {
    const { trackId } = req.query;

    const track = trackId ? await ensureTrack(trackId) : null;

    const juries = await Jury.find(track ? { 'assignments.track': track._id } : {})
      .populate('assignments.track')
      .lean();

    const rows = [];

    juries.forEach((jury) => {
      jury.assignments.forEach((assignment) => {
        const assignmentTrack = assignment.track;

        if (!assignmentTrack || !assignmentTrack._id) {
          return;
        }

        if (track && assignmentTrack._id.toString() !== track._id.toString()) {
          return;
        }

        rows.push({
          trackId: assignmentTrack._id,
          trackName: assignmentTrack.name,
          juryName: jury.name,
          status: assignment.hasSubmitted ? 'Submitted' : assignment.paused ? 'Paused' : 'Pending',
          submittedAt: assignment.submittedAt
        });
      });
    });

    res.json(rows);
  } catch (error) {
    console.error('Error in getSubmissionStatus:', error);
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || 'Failed to load status' });
  }
};

// -------------------- Get All Marks --------------------
const getAllMarks = async (req, res) => {
  try {
    const { trackId } = req.query;
    const filter = {};

    if (trackId) {
      const track = await ensureTrack(trackId);
      filter.track = track._id;
    }
    const marks = await Marks.find(filter);
    res.json(marks);
  } catch (error) {
    console.error('Error in getAllMarks:', error);
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || 'Failed to load marks' });
  }
};

module.exports = {
  saveMarks,
  getMarksByJury,
  getLeaderboard,
  getSubmissionStatus,
  getAllMarks
};
