const mongoose = require('mongoose');

// Dynamic column definition
const columnSchema = new mongoose.Schema({
  key: { type: String, required: true }, // unique key like "jan_fee", "exam_fee"
  label: { type: String, required: true }, // Display name like "January Fee"
  type: { 
    type: String, 
    enum: ['text', 'number', 'currency', 'date', 'status'], 
    default: 'currency' 
  },
  order: { type: Number, default: 0 },
  width: { type: Number, default: 150 },
  editable: { type: Boolean, default: true },
  isFixed: { type: Boolean, default: false } // Fixed columns can't be deleted
}, { _id: true });

const paymentSheetSchema = new mongoose.Schema({
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
  academicYear: {
    type: String,
    required: true,
    default: () => {
      const year = new Date().getFullYear();
      return `${year}-${year + 1}`;
    }
  },
  // Dynamic columns configuration
  columns: {
    type: [columnSchema],
    default: function () {
      return [
        { key: 'studentId', label: 'Student ID', type: 'text', order: 0, isFixed: true, editable: false, width: 120 },
        { key: 'name', label: 'Student Name', type: 'text', order: 1, isFixed: true, editable: false, width: 200 },
        { key: 'subject', label: 'Subject', type: 'text', order: 2, isFixed: true, editable: true, width: 150 }
      ];
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

paymentSheetSchema.index({ className: 1, section: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('PaymentSheet', paymentSheetSchema);