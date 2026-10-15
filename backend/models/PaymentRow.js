// models/PaymentRow.js
const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema(
  {
    receiptNo: { type: String, required: true },
    academicYear: { type: String, required: true },
    paymentDate: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    feeHead: { type: String, required: true, trim: true },
    paymentMode: {
      type: String,
      enum: ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque'],
      default: 'Cash',
    },
    remarks: { type: String, default: '' },
    totalFee: { type: Number, default: null },
    totalPaidTillDate: { type: Number, default: 0 },
    balance: { type: Number, default: null },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    collectedByName: { type: String, default: '' },
    details: {
      name: String,
      studentId: String,
      className: String,
      section: String,
      rollNumber: String,
      gender: String,
      dateOfBirth: Date,
      fatherName: String,
      parentPhone: String,
      phone: String,
      address: String,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const paymentRowSchema = new mongoose.Schema(
  {
    sheet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentSheet',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    data: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    rowColor: {
      type: String,
      enum: ['none', 'green', 'red'],
      default: 'none',
    },
    payments: { type: [receiptSchema], default: [] },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

paymentRowSchema.index({ sheet: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('PaymentRow', paymentRowSchema);