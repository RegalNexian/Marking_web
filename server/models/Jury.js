const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  track: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Track',
    required: true
  },
  hasSubmitted: {
    type: Boolean,
    default: false
  },
  paused: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date,
    default: null
  }
}, { _id: false });

const jurySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  assignments: {
    type: [assignmentSchema],
    default: []
  },
  defaultTrack: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Track',
    default: null
  }
}, {
  timestamps: true
});

jurySchema.index({ 'assignments.track': 1 });

module.exports = mongoose.model('Jury', jurySchema);