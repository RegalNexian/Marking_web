const Track = require('../models/Track');
const Team = require('../models/Team');
const Marks = require('../models/Marks');
const bcrypt = require('bcryptjs');

const PASSWORD_ATTEMPTS = {
  windowMs: 5 * 60 * 1000,
  maxAttempts: 5
};

const passwordAttemptCache = new Map();

const slugify = (value) => value
  .toString()
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  || 'track';

const getAllTracks = async (req, res) => {
  try {
    const { active } = req.query;
    const filters = {};
    if (active !== undefined) {
      filters.isActive = active === 'true';
    }
    const tracks = await Track.find(filters).sort({ createdAt: 1 }).select('-accessPassword');
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTrackById = async (req, res) => {
  try {
    const track = await Track.findById(req.params.id).select('-accessPassword');
    if (!track) {
      return res.status(404).json({ message: 'Track not found' });
    }
    res.json(track);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createTrack = async (req, res) => {
  try {
    const { name, eventName, description, schedule, isActive, accessPassword } = req.body;
    const slug = slugify(req.body.slug || name);

    const trimmedPassword = typeof accessPassword === 'string' ? accessPassword.trim() : '';
    if (!trimmedPassword) {
      return res.status(400).json({ message: 'Track password is required.' });
    }

    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);

    const track = new Track({
      name,
      eventName: eventName || name,
      description: description || '',
      schedule: schedule || {},
      accessPassword: hashedPassword,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      slug
    });

    await track.save();
    const created = track.toObject();
    delete created.accessPassword;
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const verifyTrackPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const track = await Track.findById(id);
    if (!track) {
      return res.status(404).json({ message: 'Track not found' });
    }

    const stored = track.accessPassword || '';

    if (!stored) {
      return res.json({ success: true, unused: true });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    const key = track._id.toString();
    const now = Date.now();
    const attemptInfo = passwordAttemptCache.get(key) || { count: 0, expires: 0 };

    if (attemptInfo.expires > now && attemptInfo.count >= PASSWORD_ATTEMPTS.maxAttempts) {
      return res.status(429).json({ success: false, message: 'Too many attempts. Please try again later.' });
    }

    const matches = await bcrypt.compare(password.trim(), stored);

    if (!matches) {
      if (attemptInfo.expires <= now) {
        attemptInfo.count = 1;
        attemptInfo.expires = now + PASSWORD_ATTEMPTS.windowMs;
      } else {
        attemptInfo.count += 1;
      }
      passwordAttemptCache.set(key, attemptInfo);
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    passwordAttemptCache.delete(key);

    return res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateTrack = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, eventName, description, schedule, isActive, accessPassword } = req.body;

    const updates = {};

    if (name) {
      updates.name = name;
      updates.slug = slugify(req.body.slug || name);
    }
    if (eventName !== undefined) updates.eventName = eventName;
    if (description !== undefined) updates.description = description;
    if (schedule !== undefined) updates.schedule = schedule;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (accessPassword !== undefined) {
      const trimmed = String(accessPassword).trim();
      updates.accessPassword = trimmed ? await bcrypt.hash(trimmed, 10) : '';
    }

    const track = await Track.findByIdAndUpdate(id, updates, { new: true }).select('-accessPassword');

    if (!track) {
      return res.status(404).json({ message: 'Track not found' });
    }

    res.json(track);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteTrack = async (req, res) => {
  try {
    const { id } = req.params;

    const teamCount = await Team.countDocuments({ track: id });
    if (teamCount > 0) {
      return res.status(409).json({ message: 'Cannot delete track with assigned teams' });
    }

    const markCount = await Marks.countDocuments({ track: id });
    if (markCount > 0) {
      return res.status(409).json({ message: 'Cannot delete track with saved marks' });
    }

    const deletion = await Track.findByIdAndDelete(id);

    if (!deletion) {
      return res.status(404).json({ message: 'Track not found' });
    }

    res.json({ message: 'Track deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllTracks,
  getTrackById,
  createTrack,
  updateTrack,
  deleteTrack,
  verifyTrackPassword
};
