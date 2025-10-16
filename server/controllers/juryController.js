const Jury = require('../models/Jury');
const Marks = require('../models/Marks');
const {
  ensureTrackDocument,
  normalizeJuries
} = require('../utils/trackNormalization');

const populateJury = (query) => query.populate('assignments.track').populate('defaultTrack');

const normalizeName = (value) => String(value || '').trim();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildNameFilter = (value) => {
  const normalized = escapeRegex(normalizeName(value));
  if (!normalized) {
    return null;
  }
  return { name: new RegExp(`^${normalized}$`, 'i') };
};

// Get all juries
const getAllJuries = async (req, res) => {
  try {
    const { trackId } = req.query;
    const filter = {};
    if (trackId) {
      const track = await ensureTrackDocument(trackId);
      if (!track) {
        return res.json([]);
      }
      filter['assignments.track'] = track._id;
    }

    await normalizeJuries();

    const juries = await populateJury(Jury.find(filter).sort({ name: 1 }));
    res.json(juries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new jury
const createJury = async (req, res) => {
  try {
    const { name, trackIds = [], defaultTrackId } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    let assignments = [];
    let resolvedTracks = [];

    if (trackIds.length > 0) {
      resolvedTracks = await Promise.all(trackIds.map((id) => ensureTrackDocument(id)));
      if (resolvedTracks.some((track) => !track)) {
        return res.status(404).json({ message: 'One or more tracks not found' });
      }
      assignments = resolvedTracks.map((track) => ({ track: track._id }));
    }

    let resolvedDefault = null;
    if (defaultTrackId) {
      const defaultTrack = await ensureTrackDocument(defaultTrackId);
      resolvedDefault = defaultTrack?._id || null;
    }
    if (!resolvedDefault && assignments.length > 0) {
      resolvedDefault = assignments[0].track;
    }

    if (
      resolvedDefault &&
      !assignments.some((assignment) => assignment.track.toString() === resolvedDefault.toString())
    ) {
      resolvedDefault = assignments[0]?.track || null;
    }

    const jury = new Jury({
      name,
      assignments,
      defaultTrack: resolvedDefault
    });

    await jury.save();
    const populated = await populateJury(Jury.findById(jury._id));
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update jury assignments (tracks and default)
const updateJuryAssignments = async (req, res) => {
  try {
    const { id } = req.params;
    const { trackIds = [], defaultTrackId } = req.body;

    await normalizeJuries();

    const jury = await Jury.findById(id);
    if (!jury) {
      return res.status(404).json({ message: 'Jury not found' });
    }

    if (!Array.isArray(trackIds) || trackIds.length === 0) {
      jury.assignments = [];
      jury.defaultTrack = null;
      await jury.save();
      const populated = await populateJury(Jury.findById(jury._id));
      return res.json(populated);
    }

    const resolvedTracks = await Promise.all(trackIds.map((id) => ensureTrackDocument(id)));
    if (resolvedTracks.some((track) => !track)) {
      return res.status(404).json({ message: 'One or more tracks not found' });
    }

    const existingMap = new Map(
      jury.assignments.map((assignment) => [String(assignment.track), assignment])
    );

    jury.assignments = resolvedTracks.map((track) => {
      const key = track._id.toString();
      const existing = existingMap.get(key) || {};
      return {
        track: track._id,
        hasSubmitted: existing.hasSubmitted || false,
        paused: existing.paused || false,
        submittedAt: existing.submittedAt || null
      };
    });

    let resolvedDefault = null;
    if (defaultTrackId) {
      const defaultTrack = await ensureTrackDocument(defaultTrackId);
      resolvedDefault = defaultTrack?._id || null;
    }
    if (!resolvedDefault && jury.assignments.length > 0) {
      resolvedDefault = jury.assignments[0].track;
    }

    if (
      resolvedDefault &&
      !jury.assignments.some((assignment) => assignment.track.toString() === resolvedDefault.toString())
    ) {
      resolvedDefault = jury.assignments[0]?.track || null;
    }

    jury.defaultTrack = resolvedDefault;

    await jury.save();

    const populated = await populateJury(Jury.findById(jury._id));
    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update jury status for a specific track assignment
const updateJuryStatus = async (req, res) => {
  try {
    const { name } = req.params;
    const { trackId, hasSubmitted, paused, submittedAt } = req.body;

    if (!trackId) {
      return res.status(400).json({ message: 'trackId is required' });
    }

    await normalizeJuries();

    const nameFilter = buildNameFilter(name);
    if (!nameFilter) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const jury = await Jury.findOne(nameFilter);
    if (!jury) {
      return res.status(404).json({ message: 'Jury not found' });
    }

    const track = await ensureTrackDocument(trackId);
    if (!track) {
      return res.status(404).json({ message: 'Track not found' });
    }

    const assignmentIndex = jury.assignments.findIndex(
      (assignment) => String(assignment.track) === track._id.toString()
    );

    if (assignmentIndex === -1) {
      jury.assignments.push({
        track: track._id,
        hasSubmitted: Boolean(hasSubmitted),
        paused: Boolean(paused),
        submittedAt: hasSubmitted ? (submittedAt ? new Date(submittedAt) : new Date()) : null
      });
    } else {
      const assignment = jury.assignments[assignmentIndex];
      if (hasSubmitted !== undefined) {
        assignment.hasSubmitted = Boolean(hasSubmitted);
        assignment.submittedAt = hasSubmitted
          ? (submittedAt ? new Date(submittedAt) : new Date())
          : null;
        if (hasSubmitted) {
          assignment.paused = false;
        }
      }

      if (paused !== undefined) {
        assignment.paused = Boolean(paused);
      }

      if (submittedAt && hasSubmitted === undefined) {
        assignment.submittedAt = new Date(submittedAt);
      }
    }

    if (!jury.defaultTrack) {
      jury.defaultTrack = track._id;
    }

    await jury.save();

    const populated = await populateJury(Jury.findById(jury._id));
    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get jury by name
const getJuryByName = async (req, res) => {
  try {
    const { name } = req.params;
    const { trackId } = req.query;

    await normalizeJuries();

    const nameFilter = buildNameFilter(name);
    if (!nameFilter) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const jury = await populateJury(Jury.findOne(nameFilter));
    if (!jury) {
      return res.status(404).json({ message: 'Jury not found' });
    }

    const data = jury.toObject();
    if (trackId) {
      const track = await ensureTrackDocument(trackId);
      if (!track) {
        return res.status(404).json({ message: 'Track not found' });
      }

      data.assignment = data.assignments.find(
        (assignment) => assignment.track && assignment.track._id.toString() === track._id.toString()
      ) || null;
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete jury
const deleteJury = async (req, res) => {
  try {
    const { name } = req.params;
    const nameFilter = buildNameFilter(name);
    if (!nameFilter) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const jury = await Jury.findOne(nameFilter);

    if (!jury) {
      return res.status(404).json({ message: 'Jury not found' });
    }

    await Jury.deleteOne({ _id: jury._id });
    await Marks.deleteMany({ juryName: jury.name });

    res.json({ message: 'Jury deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllJuries,
  createJury,
  updateJuryAssignments,
  updateJuryStatus,
  getJuryByName,
  deleteJury
};