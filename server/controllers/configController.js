const Jury = require('../models/Jury');
const Team = require('../models/Team');
const Marks = require('../models/Marks');
const Track = require('../models/Track');
const Config = require('../models/Config');


// Get configuration
const getConfig = async (req, res) => {
  try {
    let config = await Config.findOne({});
    if (!config) {
      config = new Config();
      await config.save();
    }

    // Ensure numeric value is sent
    res.json({
      ...config.toObject(),
      maxMarksPerCriterion: Number(config.maxMarksPerCriterion) || 20
    });
  } catch (error) {
    console.error('Error in getConfig:', error);
    res.status(500).json({ message: error.message });
  }
};


// Update configuration
const updateConfig = async (req, res) => {
  try {
    const {
      criteriaList,
      criteria,
      maxMarksPerCriterion,
      competitionName,
      collegeName,
      clubName
    } = req.body;

    let config = await Config.findOne({});
    if (!config) config = new Config();

    const resolvedCriteria = Array.isArray(criteriaList) ? criteriaList : Array.isArray(criteria) ? criteria : null;
    if (resolvedCriteria) {
      config.criteria = resolvedCriteria.map((item) => String(item).trim().toUpperCase()).filter(Boolean);
    }
    if (maxMarksPerCriterion !== undefined)
      config.maxMarksPerCriterion = maxMarksPerCriterion;
    if (competitionName) config.competitionName = competitionName;
    if (collegeName) config.collegeName = collegeName;
    if (clubName) config.clubName = clubName;

    await config.save();
    res.json(config);
  } catch (error) {
    console.error('Error in updateConfig:', error);
    res.status(400).json({ message: error.message });
  }
};

// Criteria handlers
const getCriteria = async (req, res) => {
  try {
    const config = await Config.findOne();
    res.json(config?.criteria || []);
  } catch (error) {
    console.error('Error in getCriteria:', error);
    res.status(500).json({ message: error.message });
  }
};

const addCriteria = async (req, res) => {
  try {
    const { criterion } = req.body || {};

    if (typeof criterion !== 'string') {
      return res.status(400).json({ message: 'criterion must be a string' });
    }

    const normalized = criterion.trim().toUpperCase();

    if (!normalized) {
      return res.status(400).json({ message: 'criterion cannot be empty' });
    }

    const config = await Config.findOne() || new Config();
    if (!config.criteria.includes(normalized)) {
      config.criteria.push(normalized);
      await config.save();
    }
    res.json(config.criteria);
  } catch (error) {
    console.error('Error in addCriteria:', error);
    res.status(500).json({ message: error.message });
  }
};

const removeCriteria = async (req, res) => {
  try {
    const { index } = req.body;
    const config = await Config.findOne();
    if (!config) return res.status(404).json({ message: "No config found" });

    config.criteria.splice(index, 1);
    await config.save();
    res.json(config.criteria);
  } catch (error) {
    console.error('Error in removeCriteria:', error);
    res.status(500).json({ message: error.message });
  }
};

const resetAll = async (req, res) => {
  try {
    await Jury.deleteMany({});
    await Team.deleteMany({});
    await Marks.deleteMany({});
    await Track.deleteMany({});
    // Optionally, reset criteria and config fields
    const config = await Config.findOne();
    if (config) {
      config.criteria = [];
      config.maxMarksPerCriterion = 20;
      config.competitionName = '';
      config.collegeName = '';
      config.clubName = '';
      await config.save();
    }
    res.json({ success: true, message: 'All data reset.' });
  } catch (error) {
    console.error('Error in resetAll:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Export all functions properly
module.exports = {
  getConfig,
  updateConfig,
  getCriteria,
  addCriteria,
  removeCriteria,
  resetAll,
};
