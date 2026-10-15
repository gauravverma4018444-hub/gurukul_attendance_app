const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'teacher'], default: 'teacher' },

    // ✅ Unique + sparse so Android App can login securely via phone
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },

    // ───────── Google Authenticator (2FA) ─────────
    isTwoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: {
      type: String
    },

    // ───────── 🆕 FORGOT PASSWORD RECOVERY (Brute-force protection) ─────────
    failedResetAttempts: {
      type: Number,
      default: 0
    },
    resetLockUntil: {
      type: Date,
      default: null
    },
    lastPasswordResetAt: {
      type: Date,
      default: null
    },

    assignedClasses: [{ type: String }],

    // ✅ Access control: Admin toggles this to grant/revoke app access
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ============================================================
// Hash password automatically before saving
// ============================================================
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ============================================================
// Method used by your login route
// ============================================================
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ============================================================
// 🆕 HELPER: Is the account currently locked from reset attempts?
// ============================================================
userSchema.methods.isResetLocked = function () {
  return !!(this.resetLockUntil && this.resetLockUntil > new Date());
};

// ============================================================
// 🆕 HELPER: Minutes remaining on the reset lock
// ============================================================
userSchema.methods.resetLockMinutesLeft = function () {
  if (!this.isResetLocked()) return 0;
  return Math.ceil((this.resetLockUntil - new Date()) / 60000);
};

// ============================================================
// 🆕 HELPER: Register a failed reset attempt (locks after 5 tries)
// ============================================================
userSchema.methods.registerFailedReset = async function () {
  this.failedResetAttempts = (this.failedResetAttempts || 0) + 1;

  let locked = false;
  if (this.failedResetAttempts >= 5) {
    this.resetLockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    this.failedResetAttempts = 0;
    locked = true;
  }

  await this.save();
  return locked;
};

// ============================================================
// 🆕 HELPER: Clear lock counters on successful verification
// ============================================================
userSchema.methods.clearResetLock = async function () {
  this.failedResetAttempts = 0;
  this.resetLockUntil = null;
  await this.save();
};

module.exports = mongoose.model('User', userSchema);