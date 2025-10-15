const mongoose = require('mongoose');
const Track = require('../models/Track');
const Team = require('../models/Team');
const Jury = require('../models/Jury');
const Marks = require('../models/Marks');

const slugify = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'track';

const toObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : null;

const ensureTrackDocument = async (rawRef) => {
  if (!rawRef) {
    return null;
  }

  if (rawRef instanceof mongoose.Model && rawRef instanceof Track) {
    return rawRef;
  }

  if (rawRef instanceof mongoose.Types.ObjectId) {
    const doc = await Track.findById(rawRef.toString());
    if (doc) {
      return doc;
    }
  }

  if (rawRef._id) {
    const doc = await Track.findById(rawRef._id);
    if (doc) {
      return doc;
    }
  }

  let asString = '';
  try {
    asString = String(rawRef).trim();
  } catch (err) {
    return null;
  }
  if (!asString) {
    return null;
  }

  const maybeObjectId = toObjectId(asString);
  if (maybeObjectId) {
    const doc = await Track.findById(maybeObjectId);
    if (doc) {
      return doc;
    }
  }

  const slug = slugify(asString);
  const track = await Track.findOne({ slug }) || await Track.findOne({ name: asString });
  if (!track) {
    return null;
  }

  let changed = false;
  if (!track.slug) {
    track.slug = slug;
    changed = true;
  }
  if (!track.eventName) {
    track.eventName = track.name;
    changed = true;
  }
  if (changed) {
    await track.save();
  }

  return track;
};

const defaultTrackName = process.env.DEFAULT_TRACK_NAME || 'Default Track';

const normalizeTeams = async () => {
  const teams = await Team.find({});
  for (const team of teams) {
    let changed = false;
    const current = team.track;

    let trackDoc = null;
    if (current) {
      if (current instanceof mongoose.Types.ObjectId) {
        trackDoc = await Track.findById(current);
      } else {
        trackDoc = await ensureTrackDocument(current);
      }
    }

    if (!trackDoc) {
      trackDoc = await ensureTrackDocument(defaultTrackName);
    }

    if (trackDoc && (!team.track || team.track.toString() !== trackDoc._id.toString())) {
      team.track = trackDoc._id;
      changed = true;
    }

    if (!team.category) {
      team.category = trackDoc ? trackDoc.name : 'General';
      changed = true;
    }

    if (changed) {
      await team.save();
    }
  }
};

const normalizeJuries = async () => {
  const juries = await Jury.find({});
  for (const jury of juries) {
    let changed = false;
    const normalizedAssignments = [];

    for (const assignment of jury.assignments || []) {
      const trackDoc = await ensureTrackDocument(assignment.track);
      if (!trackDoc) {
        changed = true;
        continue;
      }

      if (!assignment.track || assignment.track.toString() !== trackDoc._id.toString()) {
        assignment.track = trackDoc._id;
        changed = true;
      }

      normalizedAssignments.push(assignment);
    }

    const defaultTrackDoc = await ensureTrackDocument(jury.defaultTrack || normalizedAssignments[0]?.track);
    if (defaultTrackDoc && (!jury.defaultTrack || jury.defaultTrack.toString() !== defaultTrackDoc._id.toString())) {
      jury.defaultTrack = defaultTrackDoc._id;
      changed = true;
    }

    if (normalizedAssignments.length !== (jury.assignments || []).length) {
      jury.assignments = normalizedAssignments;
      changed = true;
    } else {
      jury.assignments = normalizedAssignments;
    }

    if (changed) {
      await jury.save();
    }
  }
};

const normalizeMarks = async () => {
  const marks = await Marks.find({});
  for (const mark of marks) {
    let changed = false;
    let trackDoc = await ensureTrackDocument(mark.track);

    if (!trackDoc) {
      const team = await Team.findOne({ name: mark.teamName });
      if (team) {
        trackDoc = await ensureTrackDocument(team.track);
      }
    }

    if (trackDoc && (!mark.track || mark.track.toString() !== trackDoc._id.toString())) {
      mark.track = trackDoc._id;
      changed = true;
    }

    if (changed) {
      await mark.save();
    }
  }
};

const normalizeCoreData = async () => {
  await normalizeTeams();
  await normalizeJuries();
  await normalizeMarks();
};

module.exports = {
  ensureTrackDocument,
  normalizeTeams,
  normalizeJuries,
  normalizeMarks,
  normalizeCoreData
};
