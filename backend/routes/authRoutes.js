const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const router = express.Router();

// Generate standard Auth JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '1d'
  });
};

// Generate Trusted Device Token (30 days validity for the same browser)
const generateTrustedDeviceToken = (id) => {
  return jwt.sign(
    { id, isTrustedDevice: true },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// ── NEW: Generate Short-Lived Password Reset Token (5 minutes) ──
const generateResetToken = (id) => {
  return jwt.sign(
    { id, purpose: 'PASSWORD_RESET' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
};

const userResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  assignedClasses: user.assignedClasses,
  isActive: user.isActive,
  isTwoFactorEnabled: user.isTwoFactorEnabled
});

// ============================================================
// 1. LOGIN ROUTE (Checks Device Trust & Genuine Google 2FA)
// ============================================================
router.post('/login', async (req, res) => {
  try {
    const { email, phone, identifier, password, trustedToken } = req.body;

    const loginKey = phone || email || identifier;
    if (!loginKey || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/phone and password'
      });
    }

    let query = phone
      ? { phone }
      : email
      ? { email }
      : { $or: [{ email: identifier }, { phone: identifier }] };

    const user = await User.findOne(query).select('+password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or account deactivated'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check trusted device token
    let isTrusted = false;
    if (trustedToken) {
      try {
        const decoded = jwt.verify(trustedToken, process.env.JWT_SECRET);
        if (
          decoded.id === user._id.toString() &&
          decoded.isTrustedDevice === true
        ) {
          isTrusted = true;
        }
      } catch (err) {
        isTrusted = false;
      }
    }

    // SAME SYSTEM -> Direct login (No OTP required)
    if (isTrusted) {
      return res.status(200).json({
        success: true,
        token: generateToken(user._id),
        trustedToken: generateTrustedDeviceToken(user._id),
        data: userResponse(user)
      });
    }

    // Scenario A: First-time Admin setup
    if (!user.isTwoFactorEnabled && user.role === 'admin') {
      const secret = speakeasy.generateSecret({
        length: 20,
        name: `Gurukul AMS (${user.email})`,
        issuer: 'Gurukul AMS'
      });

      user.twoFactorSecret = secret.base32;
      await user.save();

      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

      return res.status(200).json({
        success: true,
        requiresSetup2FA: true,
        tempUserId: user._id,
        qrCode: qrCodeUrl,
        secret: secret.base32,
        message: 'Google Authenticator setup required for new system'
      });
    }

    // Scenario B: Admin already setup
    if (user.isTwoFactorEnabled && user.role === 'admin') {
      return res.status(200).json({
        success: true,
        requires2FA: true,
        tempUserId: user._id,
        message: 'New system detected. Please enter 6-digit Google Authenticator code.'
      });
    }

    // Non-admin login fallback
    return res.status(200).json({
      success: true,
      token: generateToken(user._id),
      data: userResponse(user)
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 2. VERIFY GOOGLE AUTHENTICATOR OTP
// ============================================================
router.post('/verify-2fa', async (req, res) => {
  try {
    const { tempUserId, otp, trustDevice, isSetup } = req.body;

    const user = await User.findById(tempUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isVerified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: otp,
      window: 1
    });

    if (!isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Google Authenticator OTP code. Please try again.'
      });
    }

    if (isSetup && !user.isTwoFactorEnabled) {
      user.isTwoFactorEnabled = true;
      await user.save();
    }

    const token = generateToken(user._id);
    let trustedToken = null;

    if (trustDevice) {
      trustedToken = generateTrustedDeviceToken(user._id);
    }

    return res.status(200).json({
      success: true,
      token,
      trustedToken,
      data: userResponse(user)
    });

  } catch (error) {
    console.error('Verify 2FA Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 3. FORGOT PASSWORD — VERIFY IDENTITY VIA GOOGLE AUTHENTICATOR
// ============================================================
router.post('/forgot-password/verify', async (req, res) => {
  try {
    const { identifier, totpCode } = req.body;

    if (!identifier || !totpCode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/username and authenticator code'
      });
    }

    // Find user by email or phone (same logic as login)
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }]
    });

    // Generic error to prevent username enumeration
    if (!user || !user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials or 2FA not enabled on this account.'
      });
    }

    // Must have 2FA enabled to use this recovery method
    if (!user.isTwoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled on this account. Contact super admin.'
      });
    }

    // ── Rate Limiting / Account Lockout ──
    if (user.resetLockUntil && user.resetLockUntil > new Date()) {
      const minsLeft = Math.ceil((user.resetLockUntil - new Date()) / 60000);
      return res.status(429).json({
        success: false,
        message: `Too many failed attempts. Try again in ${minsLeft} minutes.`
      });
    }

    // ── Verify TOTP Code ──
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: totpCode.trim(),
      window: 1  // ±30 seconds
    });

    if (!isValid) {
      // Increment failed attempts
      user.failedResetAttempts = (user.failedResetAttempts || 0) + 1;

      // Lock account after 5 failed attempts for 15 minutes
      if (user.failedResetAttempts >= 5) {
        user.resetLockUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.failedResetAttempts = 0;
        await user.save();
        return res.status(429).json({
          success: false,
          message: 'Too many failed attempts. Account locked for 15 minutes.'
        });
      }

      await user.save();
      return res.status(400).json({
        success: false,
        message: `Invalid authenticator code. ${5 - user.failedResetAttempts} attempts remaining.`
      });
    }

    // ── Success: Reset counters & issue short-lived token ──
    user.failedResetAttempts = 0;
    user.resetLockUntil = null;
    await user.save();

    const resetToken = generateResetToken(user._id);

    return res.status(200).json({
      success: true,
      resetToken,
      message: 'Identity verified. You have 5 minutes to set a new password.'
    });

  } catch (error) {
    console.error('Forgot Password Verify Error:', error);
    res.status(500).json({ success: false, message: 'Server error during recovery.' });
  }
});

// ============================================================
// 4. FORGOT PASSWORD — COMPLETE RESET WITH NEW PASSWORD
// ============================================================
router.post('/forgot-password/reset', async (req, res) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // ── Verify the short-lived reset token ──
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Reset session expired. Please start over.'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid reset token.'
      });
    }

    if (decoded.purpose !== 'PASSWORD_RESET') {
      return res.status(403).json({
        success: false,
        message: 'Invalid token purpose.'
      });
    }

    // ── Find user & update password ──
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // The schema's pre('save') hook will hash it automatically
    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. Please log in with your new password.'
    });

  } catch (error) {
    console.error('Forgot Password Reset Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ============================================================
// 5. GET ALL USERS (Admin Only)
// ============================================================
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 6. REGISTER NEW USER (Admin Only)
// ============================================================
router.post('/register', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, email, password, role, phone, assignedClasses, isActive } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password and role are required'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'User with this phone number already exists'
        });
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      phone,
      assignedClasses,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      success: true,
      message: `${role} registered successfully`,
      data: userResponse(user)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 7. GET LOGGED IN USER DETAILS
// ============================================================
router.get('/me', protect, async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user
  });
});

// ============================================================
// 8. UPDATE USER (Admin Only)
// ============================================================
router.put('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, email, role, phone, assignedClasses, isActive } = req.body;

    if (req.params.id === req.user._id.toString() && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, phone, assignedClasses, isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 9. DELETE USER (Admin Only)
// ============================================================
router.delete('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: `User '${user.name}' deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 10. GET PROFILE
// ============================================================
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id).select(
      '-password -twoFactorSecret'
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({
      success: true,
      data: userResponse(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 11. UPDATE PROFILE
// ============================================================
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const user = await User.findById(req.user._id || req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ success: false, message: 'Name cannot be empty' });
      }
      user.name = String(name).trim();
    }

    if (email !== undefined) {
      const newEmail = String(email).toLowerCase().trim();
      if (!newEmail) {
        return res.status(400).json({ success: false, message: 'Email cannot be empty' });
      }
      if (newEmail !== user.email) {
        const exists = await User.findOne({ email: newEmail });
        if (exists) {
          return res.status(400).json({
            success: false,
            message: 'Email already in use by another account',
          });
        }
        user.email = newEmail;
      }
    }

    if (phone !== undefined) {
      const newPhone = phone ? String(phone).trim() : '';
      if (newPhone && newPhone !== user.phone) {
        const exists = await User.findOne({ phone: newPhone });
        if (exists) {
          return res.status(400).json({
            success: false,
            message: 'Phone number already in use by another account',
          });
        }
        user.phone = newPhone;
      } else if (!newPhone) {
        user.phone = undefined;
      }
    }

    await user.save();

    const safe = await User.findById(user._id).select('-password -twoFactorSecret');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: userResponse(safe),
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({
        success: false,
        message: `${field} already in use`,
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 12. CHANGE PASSWORD
// ============================================================
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match',
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password',
      });
    }

    const user = await User.findById(req.user._id || req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please login again with your new password.',
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 13. ADMIN: FORCE RESET USER PASSWORD
// ============================================================
router.put('/users/:id/reset-password', protect, authorize('admin'), async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;