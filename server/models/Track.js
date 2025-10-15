const mongoose = require('mongoose');

const trackSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  eventName: {
    type: String,
    trim: true,
    default: ''
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  accessPassword: {
    type: String,
    trim: true,
    default: ''
  },
  schedule: {
    start: { type: Date, default: null },
    end: { type: Date, default: null }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

trackSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Track', trackSchema);
