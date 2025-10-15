const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  track: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Track',
    required: true
  }
}, {
  timestamps: true
});

teamSchema.index({ name: 1, track: 1 }, { unique: true });

module.exports = mongoose.model('Team', teamSchema);