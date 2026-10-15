const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused'],
    required: true,
    default: 'absent'
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  }
});

const attendanceSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  className: {
    type: String,
    required: true,
    trim: true
  },
  section: {
    type: String,
    required: true,
    trim: true,
    default: 'A'
  },
  records: [attendanceRecordSchema],
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isFinalized: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index: one attendance record per class-section-date
attendanceSchema.index({ date: 1, className: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);