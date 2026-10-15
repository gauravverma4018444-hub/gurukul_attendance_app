const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  parentPhone: {
    type: String,
    trim: true
  },
  className: {
    type: String,
    required: [true, 'Class is required'],
    trim: true
  },
  section: {
    type: String,
    trim: true,
    default: 'A'
  },
  rollNumber: {
    type: Number,
    required: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  dateOfBirth: {
    type: Date
  },
  address: {
    type: String,
    trim: true
  },
  profileImage: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index for unique roll number per class-section
studentSchema.index({ className: 1, section: 1, rollNumber: 1 }, { unique: true });

// Virtual for full class identifier
studentSchema.virtual('fullClass').get(function() {
  return `${this.className}-${this.section}`;
});

module.exports = mongoose.model('Student', studentSchema);