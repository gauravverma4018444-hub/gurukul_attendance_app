const express = require('express');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// @route   GET /api/attendance/today-absentees
// @desc    Get list of all students absent today with full details
// @access  Private
// ============================================================
router.get('/today-absentees', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch raw attendance docs for today without strict Mongoose schema binding
    const attendanceDocs = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    }).lean();

    const absentStudentIds = new Set();
    const studentMetaMap = new Map();

    attendanceDocs.forEach((doc) => {
      // 1. Direct top-level student field (e.g. Compass raw insert)
      if (doc.status === 'absent' && doc.student) {
        absentStudentIds.add(doc.student.toString());
      }

      // 2. Records array style (e.g. App marked attendance)
      if (Array.isArray(doc.records)) {
        doc.records.forEach((rec) => {
          if (rec.status === 'absent' && rec.student) {
            const sid = rec.student._id ? rec.student._id.toString() : rec.student.toString();
            absentStudentIds.add(sid);
            if (doc.className) {
              studentMetaMap.set(sid, { className: doc.className, section: doc.section });
            }
          }
        });
      }
    });

    const studentIdArray = Array.from(absentStudentIds);

    // Fetch student documents for all collected absent IDs
    const students = await Student.find({ _id: { $in: studentIdArray } }).lean();

    const absentees = students.map((s) => {
      const meta = studentMetaMap.get(s._id.toString()) || {};
      return {
        _id: s._id,
        studentId: s.studentId || 'N/A',
        name: s.name || 'Unknown',
        rollNumber: s.rollNumber || 'N/A',
        className: s.className || s.class || meta.className || 'N/A',
        section: s.section || meta.section || '',
        fatherName: s.fatherName || 'N/A',
        phone: s.phone || s.parentPhone || 'N/A',
        email: s.email || 'N/A',
        address: s.address || 'N/A',
        status: 'absent'
      };
    });

    return res.status(200).json({
      success: true,
      count: absentees.length,
      data: absentees
    });
  } catch (error) {
    console.error('Error fetching today absentees:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/attendance/mark
// @desc    Mark attendance for a class
// @access  Private (teacher & admin)
router.post('/mark', protect, async (req, res) => {
  try {
    const { date, className, section, records } = req.body;

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      date: attendanceDate,
      className,
      section
    });

    if (attendance) {
      attendance.records = records;
      attendance.markedBy = req.user._id;
      await attendance.save();

      return res.status(200).json({
        success: true,
        message: 'Attendance updated successfully',
        data: attendance
      });
    }

    attendance = await Attendance.create({
      date: attendanceDate,
      className,
      section,
      records,
      markedBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/attendance/class
// @desc    Get attendance for a specific class and date
// @access  Private
router.get('/class', protect, async (req, res) => {
  try {
    const { className, section, date } = req.query;

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      date: attendanceDate,
      className,
      section
    }).populate('records.student', 'name studentId rollNumber gender')
      .populate('markedBy', 'name');

    if (!attendance) {
      const students = await Student.find({
        className,
        section,
        isActive: true
      }).sort({ rollNumber: 1 });

      return res.status(200).json({
        success: true,
        isNew: true,
        data: {
          date: attendanceDate,
          className,
          section,
          records: students.map(s => ({
            student: {
              _id: s._id,
              name: s.name,
              studentId: s.studentId,
              rollNumber: s.rollNumber,
              gender: s.gender
            },
            status: 'present',
            remarks: ''
          }))
        }
      });
    }

    res.status(200).json({
      success: true,
      isNew: false,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/attendance/monthly-grid
// @access  Private
// @route   GET /api/attendance/monthly-grid
// @desc    Get monthly attendance grid for one class OR all classes
// @access  Private
router.get('/monthly-grid', protect, async (req, res) => {
  try {
    let { className, section, month, year } = req.query;

    if (!className && req.query.class) className = req.query.class;

    if (className && className.includes('-') && !section) {
      const parts = className.split('-');
      className = parts[0];
      section = parts.slice(1).join('-');
    }

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'month and year are required'
      });
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    if (Number.isNaN(m) || Number.isNaN(y) || m < 1 || m > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month or year'
      });
    }

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 1);

    // Student filter
    const studentQuery = { isActive: true };

    if (className) studentQuery.className = className;
    if (section) studentQuery.section = section;

    // Teacher restriction
    if (
      req.user.role === 'teacher' &&
      req.user.assignedClasses &&
      req.user.assignedClasses.length > 0
    ) {
      if (className && !req.user.assignedClasses.includes(className)) {
        return res.status(403).json({
          success: false,
          message: 'You are not allowed to view this class'
        });
      }

      if (!className) {
        studentQuery.className = { $in: req.user.assignedClasses };
      }
    }

    const students = await Student.find(studentQuery)
      .select('_id name studentId rollNumber className section gender')
      .sort({ className: 1, section: 1, rollNumber: 1 })
      .lean();

    // Attendance filter
    const attQuery = {
      date: { $gte: startDate, $lt: endDate }
    };

    if (className) attQuery.className = className;
    if (section) attQuery.section = section;

    if (
      req.user.role === 'teacher' &&
      req.user.assignedClasses &&
      req.user.assignedClasses.length > 0 &&
      !className
    ) {
      attQuery.className = { $in: req.user.assignedClasses };
    }

    const attendanceRecords = await Attendance.find(attQuery)
      .select('date className section records')
      .lean();

    const map = {};

    attendanceRecords.forEach((doc) => {
      const day = new Date(doc.date).getDate();

      if (!Array.isArray(doc.records)) return;

      doc.records.forEach((r) => {
        if (!r.student) return;

        const sid = r.student._id
          ? r.student._id.toString()
          : r.student.toString();

        if (!map[sid]) map[sid] = {};
        map[sid][day] = r.status;
      });
    });

    const data = students.map((s) => {
      const sid = s._id.toString();
      const days = map[sid] || {};

      let present = 0;
      let absent = 0;
      let late = 0;
      let excused = 0;

      Object.values(days).forEach((status) => {
        if (status === 'present') present++;
        else if (status === 'absent') absent++;
        else if (status === 'late') late++;
        else if (status === 'excused') excused++;
      });

      const totalMarked = present + absent + late + excused;

      const percentage =
        totalMarked > 0
          ? Math.round(((present + late) / totalMarked) * 100)
          : 0;

      return {
        studentId: s._id,
        name: s.name,
        rollNumber: s.rollNumber,
        studentCode: s.studentId,
        className: s.className,
        section: s.section,
        gender: s.gender,
        days,
        summary: {
          present,
          absent,
          late,
          excused,
          totalMarked,
          percentage
        }
      };
    });

    return res.status(200).json({
      success: true,
      month: m,
      year: y,
      className: className || 'ALL',
      section: section || 'ALL',
      count: data.length,
      data
    });

  } catch (error) {
    console.error('Monthly grid error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/attendance/unmarked-today
// @desc    Get classes whose attendance is NOT marked today
// @access  Private
router.get('/unmarked-today', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const allClasses = await Student.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: { className: '$className', section: '$section' },
          studentCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.className': 1, '_id.section': 1 } }
    ]);

    const marked = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    }).select('className section');

    const markedSet = new Set(marked.map((a) => `${a.className}|${a.section}`));

    const unmarked = allClasses
      .filter((c) => !markedSet.has(`${c._id.className}|${c._id.section}`))
      .map((c) => ({
        className: c._id.className,
        section: c._id.section,
        fullName: `${c._id.className}-${c._id.section}`,
        studentCount: c.studentCount
      }));

    res.status(200).json({
      success: true,
      count: unmarked.length,
      data: unmarked
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/attendance/student/:studentId
// @desc    Get attendance history for a specific student
// @access  Private
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const { month, year } = req.query;

    let dateFilter = {};
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      dateFilter = { date: { $gte: startDate, $lte: endDate } };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      dateFilter = { date: { $gte: startDate, $lte: endDate } };
    }

    const attendanceRecords = await Attendance.find({
      'records.student': req.params.studentId,
      ...dateFilter
    }).sort({ date: -1 });

    const studentAttendance = attendanceRecords.map(record => {
      const studentRecord = record.records.find(
        r => r.student.toString() === req.params.studentId
      );
      return {
        date: record.date,
        status: studentRecord?.status || 'N/A',
        remarks: studentRecord?.remarks || ''
      };
    });

    const summary = {
      total: studentAttendance.length,
      present: studentAttendance.filter(a => a.status === 'present').length,
      absent: studentAttendance.filter(a => a.status === 'absent').length,
      late: studentAttendance.filter(a => a.status === 'late').length,
      excused: studentAttendance.filter(a => a.status === 'excused').length
    };
    summary.percentage = summary.total > 0
      ? parseFloat(((summary.present + summary.late) / summary.total * 100).toFixed(2))
      : 0;

    res.status(200).json({
      success: true,
      data: {
        records: studentAttendance,
        summary
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/attendance/monthly-summary
// @desc    Get monthly attendance summary for a class
// @access  Private
router.get('/monthly-summary', protect, async (req, res) => {
  try {
    const { className, section, month, year } = req.query;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendanceRecords = await Attendance.find({
      className,
      section,
      date: { $gte: startDate, $lte: endDate }
    }).populate('records.student', 'name studentId rollNumber');

    const students = await Student.find({
      className,
      section,
      isActive: true
    }).sort({ rollNumber: 1 });

    const studentSummaries = students.map(student => {
      let present = 0, absent = 0, late = 0, excused = 0;
      const dailyRecords = [];

      attendanceRecords.forEach(record => {
        const studentRecord = record.records.find(
          r => r.student && r.student._id.toString() === student._id.toString()
        );
        const status = studentRecord?.status || 'N/A';

        if (status === 'present') present++;
        else if (status === 'absent') absent++;
        else if (status === 'late') late++;
        else if (status === 'excused') excused++;

        dailyRecords.push({
          date: record.date,
          status
        });
      });

      const totalDays = attendanceRecords.length;
      const percentage = totalDays > 0
        ? parseFloat(((present + late) / totalDays * 100).toFixed(2))
        : 0;

      return {
        student: {
          _id: student._id,
          name: student.name,
          studentId: student.studentId,
          rollNumber: student.rollNumber
        },
        summary: { present, absent, late, excused, totalDays, percentage },
        dailyRecords
      };
    });

    res.status(200).json({
      success: true,
      data: {
        className,
        section,
        month: parseInt(month),
        year: parseInt(year),
        totalWorkingDays: attendanceRecords.length,
        students: studentSummaries
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/attendance/absent-trend?month=10&year=2026
// @desc    Daily absent counts for a month (for trends graph)
// @access  Private
router.get('/absent-trend', protect, async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'month and year are required'
      });
    }

    const m = parseInt(month);
    const y = parseInt(year);
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 1);

    const records = await Attendance.find({
      date: { $gte: startDate, $lt: endDate }
    }).select('date records');

    // Count absents per day across ALL classes
    const dayMap = {};
    records.forEach((doc) => {
      const day = new Date(doc.date).getDate();
      const absentCount = doc.records.filter((r) => r.status === 'absent').length;
      dayMap[day] = (dayMap[day] || 0) + absentCount;
    });

    // Fill every day of the month (0 if no marking)
    const daysInMonth = new Date(y, m, 0).getDate();
    const data = [];
    for (let d = 1; d <= daysInMonth; d++) {
      data.push({ day: d, absent: dayMap[d] || 0 });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
module.exports = router;