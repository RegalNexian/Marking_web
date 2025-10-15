require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/database');

const Track = require('../models/Track');
const Team = require('../models/Team');
const Jury = require('../models/Jury');
const Marks = require('../models/Marks');

const DEFAULT_TRACK_NAME = process.env.DEFAULT_TRACK_NAME || 'Default Track';

const slugify = (value) => value
  .toString()
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  || 'default-track';

const ensureDefaultTrack = async () => {
  const slug = slugify(DEFAULT_TRACK_NAME);
  let track = await Track.findOne({ slug });

  if (!track) {
    track = await Track.create({
      name: DEFAULT_TRACK_NAME,
      slug,
      eventName: DEFAULT_TRACK_NAME,
      description: 'Auto-generated track to migrate legacy data.',
      isActive: true
    });
    console.log(`Created default track: ${DEFAULT_TRACK_NAME}`);
  } else {
    console.log(`Default track already exists: ${DEFAULT_TRACK_NAME}`);
  }

  return track;
};

const migrateTeams = async (defaultTrack) => {
  const teams = await Team.find({ $or: [{ track: { $exists: false } }, { track: null }] });

  if (!teams.length) {
    console.log('All teams already linked to a track.');
    return;
  }

  await Promise.all(teams.map(async (team) => {
    team.track = defaultTrack._id;
    if (!team.category) {
      team.category = defaultTrack.name;
    }
    await team.save();
  }));

  console.log(`Migrated ${teams.length} team(s) to default track.`);
};

const migrateJuries = async (defaultTrack) => {
  const juries = await Jury.find({});

  if (!juries.length) {
    console.log('No juries found for migration.');
    return;
  }

  await Promise.all(juries.map(async (jury) => {
    const legacyHasSubmitted = jury.hasSubmitted || false;
    const legacyPaused = jury.paused || false;
    const legacySubmittedAt = jury.submittedAt || null;

    const alreadyAssigned = jury.assignments.some((assignment) =>
      assignment.track && assignment.track.toString() === defaultTrack._id.toString()
    );

    if (!alreadyAssigned) {
      jury.assignments.push({
        track: defaultTrack._id,
        hasSubmitted: legacyHasSubmitted,
        paused: legacyPaused,
        submittedAt: legacySubmittedAt
      });
    }

    if (!jury.defaultTrack) {
      jury.defaultTrack = defaultTrack._id;
    }

    // Remove legacy root fields if present
    jury.set('hasSubmitted', undefined);
    jury.set('paused', undefined);
    jury.set('submittedAt', undefined);

    await jury.save();
  }));

  console.log(`Migrated ${juries.length} jury/juries to assignments.`);
};

const migrateMarks = async (defaultTrack) => {
  const marks = await Marks.find({ $or: [{ track: { $exists: false } }, { track: null }] });

  if (!marks.length) {
    console.log('All marks already linked to a track.');
    return;
  }

  let updated = 0;

  for (const mark of marks) {
    const team = await Team.findOne({ name: mark.teamName });
    const trackId = team?.track || defaultTrack._id;
    mark.track = trackId;
    await mark.save();
    updated += 1;
  }

  console.log(`Migrated ${updated} mark(s) to include track reference.`);
};

const run = async () => {
  try {
    await connectDB();
    const defaultTrack = await ensureDefaultTrack();
    await migrateTeams(defaultTrack);
    await migrateJuries(defaultTrack);
    await migrateMarks(defaultTrack);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Mongo connection closed.');
  }
};

run();
