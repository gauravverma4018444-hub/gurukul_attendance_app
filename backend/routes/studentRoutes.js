const express = require('express');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/students
// @desc    Register new student (admin only)
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      studentId, name, email, phone, parentPhone,
      className, section, rollNumber, gender,
      dateOfBirth, address
    } = req.body;

    const existingStudent = await Student.findOne({
      $or: [
        { studentId },
        { className, section, rollNumber }
      ]
    });

    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'Student with this ID or Roll Number in this class already exists'
      });
    }

    const student = await Student.create({
      studentId,
      name,
      email,
      phone,
      parentPhone,
      className,
      section,
      rollNumber,
      gender,
      dateOfBirth,
      address,
      registeredBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/students
// @desc    Get all students (with filters)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { className, section, search, isActive } = req.query;

    let query = {};

    if (className) query.className = className;
    if (section) query.section = section;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    else query.isActive = true;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    // Teachers can only see their assigned classes
    if (req.user.role === 'teacher' && req.user.assignedClasses && req.user.assignedClasses.length > 0) {
      query.className = { $in: req.user.assignedClasses };
    }

    const students = await Student.find(query)
      .sort({ className: 1, section: 1, rollNumber: 1 })
      .populate('registeredBy', 'name');

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ====================================================================
// @route   GET /api/students/classes
// @desc    Get list of all classes WITH TODAY'S MARKED STATUS (isMarkedToday)
// @access  Private
// ====================================================================
router.get('/classes', protect, async (req, res) => {
  try {
    let matchQuery = { isActive: true };

    if (req.user.role === 'teacher' && req.user.assignedClasses && req.user.assignedClasses.length > 0) {
      matchQuery.className = { $in: req.user.assignedClasses };
    }

    // 1. Fetch class groups and student count
    const classes = await Student.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { className: '$className', section: '$section' },
          studentCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.className': 1, '_id.section': 1 }
      }
    ]);

    // 2. Determine start and end of TODAY (Midnight to 23:59:59)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 3. Find attendance sheets created TODAY
    const markedToday = await Attendance.find({
      date: { $gte: todayStart, $lte: todayEnd }
    }).select('className section');

    // Quick lookup Set of marked classes: e.g. Set(["1-A", "2-B"])
    const markedSet = new Set(
      markedToday.map(item => `${item.className}-${item.section}`)
    );

    // 4. Format classes including isMarkedToday boolean
    const formattedClasses = classes.map(c => {
      const classKey = `${c._id.className}-${c._id.section}`;
      const isMarked = markedSet.has(classKey);

      return {
        className: c._id.className,
        section: c._id.section,
        studentCount: c.studentCount,
        fullName: classKey,
        isMarkedToday: isMarked, // ✅ Returns true if marked today
        isMarked: isMarked       // Fallback
      };
    });

    res.status(200).json({
      success: true,
      data: formattedClasses
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/students/:id
// @desc    Get single student with attendance summary
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('registeredBy', 'name');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get attendance summary
    const attendanceRecords = await Attendance.find({
      'records.student': student._id
    });

    let totalDays = 0;
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;

    attendanceRecords.forEach(record => {
      const studentRecord = record.records.find(
        r => r.student.toString() === student._id.toString()
      );
      if (studentRecord) {
        totalDays++;
        if (studentRecord.status === 'present') presentDays++;
        else if (studentRecord.status === 'absent') absentDays++;
        else if (studentRecord.status === 'late') lateDays++;
      }
    });

    const attendancePercentage = totalDays > 0
      ? ((presentDays + lateDays) / totalDays * 100).toFixed(2)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        student,
        attendanceSummary: {
          totalDays,
          presentDays,
          absentDays,
          lateDays,
          attendancePercentage: parseFloat(attendancePercentage)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/students/:id
// @desc    Update student (admin only)
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/students/:id
// @desc    Remove student (soft delete - admin only)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/students/:id/permanent
// @desc    Permanently delete student (admin only)
// @access  Private/Admin
router.delete('/:id/permanent', protect, authorize('admin'), async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Also remove attendance records
    await Attendance.updateMany(
      {},
      { $pull: { records: { student: req.params.id } } }
    );

    res.status(200).json({
      success: true,
      message: 'Student permanently deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;