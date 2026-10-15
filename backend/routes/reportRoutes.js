const express = require('express');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const { protect, authorize } = require('../middleware/auth');
const { generateExcel } = require('../utils/excelGenerator');

const router = express.Router();

// Helper: Safely calculate query bounds 
const getDateRange = (query) => {
  const { reportType = 'monthly', month, year } = query;
  let start, end, label;

  if (reportType === 'all_data') {
    // Covers the entire current calendar year for cumulative database tracking
    const y = parseInt(year, 10) || new Date().getFullYear();
    start = new Date(y, 0, 1, 0, 0, 0, 0);
    end = new Date(y, 11, 31, 23, 59, 59, 999);
    label = `Annual_Complete_Register_${y}`;
  } else {
    // Monthly configurations
    const m = parseInt(month, 10) || new Date().getMonth() + 1;
    const y = parseInt(year, 10) || new Date().getFullYear();
    start = new Date(y, m - 1, 1, 0, 0, 0, 0);
    end = new Date(y, m, 0, 23, 59, 59, 999);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    label = `${monthNames[m - 1]}_${y}`;
  }

  return { start, end, label };
};

// @route   GET /api/reports/summary
// @desc    Get summary for Monthly or Complete School Database
// @access  Private
router.get('/summary', protect, async (req, res) => {
  try {
    const { className, section, reportType = 'monthly' } = req.query;

    const isAllData = reportType === 'all_data';

    if (!isAllData && (!className || !section)) {
      return res.status(400).json({
        success: false,
        message: 'Class name and section are required.',
      });
    }

    const { start, end } = getDateRange(req.query);

    // 1. Student search limits
    const studentFilter = { isActive: true };
    if (!isAllData) {
      studentFilter.className = className;
      studentFilter.section = section;
    }

    const students = await Student.find(studentFilter).sort({
      className: 1,
      section: 1,
      rollNumber: 1,
    });

    // 2. Attendance limits
    const attendanceFilter = { date: { $gte: start, $lte: end } };
    if (!isAllData) {
      attendanceFilter.className = className;
      attendanceFilter.section = section;
    }

    const attendanceRecords = await Attendance.find(attendanceFilter).sort({ date: 1 });
    const totalWorkingDays = attendanceRecords.length;

    // 3. Populate statistics map
    const studentStats = {};
    students.forEach((s) => {
      studentStats[s._id.toString()] = { present: 0, absent: 0, late: 0 };
    });

    attendanceRecords.forEach((attDoc) => {
      if (Array.isArray(attDoc.records)) {
        attDoc.records.forEach((r) => {
          const sId = r.student ? r.student.toString() : null;
          if (sId && studentStats[sId]) {
            const status = (r.status || '').toLowerCase();
            if (status === 'present') studentStats[sId].present++;
            else if (status === 'absent') studentStats[sId].absent++;
            else if (status === 'late') studentStats[sId].late++;
          }
        });
      }
    });

    // 4. Map summaries with percentages
    const studentSummaries = students.map((student) => {
      const stats = studentStats[student._id.toString()] || { present: 0, absent: 0, late: 0 };
      const totalDays = stats.present + stats.absent + stats.late;
      const attended = stats.present + stats.late;
      const percentage = totalDays > 0 ? Math.round((attended / totalDays) * 100) : 0;

      return {
        student: {
          _id: student._id,
          studentId: student.studentId,
          name: student.name,
          rollNumber: student.rollNumber,
          gender: student.gender,
          className: student.className,
          section: student.section,
        },
        summary: {
          present: stats.present,
          absent: stats.absent,
          late: stats.late,
          totalDays,
          percentage,
        },
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        className: isAllData ? null : className,
        section: isAllData ? null : section,
        reportType,
        totalWorkingDays,
        startDate: start,
        endDate: end,
        month: req.query.month ? parseInt(req.query.month, 10) : null,
        year: req.query.year ? parseInt(req.query.year, 10) : null,
        students: studentSummaries,
      },
    });
  } catch (error) {
    console.error('Summary Generation Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
    });
  }
});

// @route   GET /api/reports/export (or /api/reports/export-excel)
// @desc    Export Monthly reports or All School Data workbook to Excel
// @access  Private/Admin
router.get(['/export', '/export-excel'], protect, authorize('admin'), async (req, res) => {
  try {
    const { className, section, reportType = 'monthly' } = req.query;

    const isAllData = reportType === 'all_data';

    if (!isAllData && (!className || !section)) {
      return res.status(400).json({
        success: false,
        message: 'className and section selection parameters are required',
      });
    }

    const { start, end, label } = getDateRange(req.query);

    // Filter students
    const studentFilter = { isActive: true };
    if (!isAllData) {
      studentFilter.className = className;
      studentFilter.section = section;
    }

    // Include complete schema attributes for Student models
    const students = await Student.find(studentFilter).sort({
      className: 1,
      section: 1,
      rollNumber: 1,
    });

    // Filter attendance
    const attendanceFilter = { date: { $gte: start, $lte: end } };
    if (!isAllData) {
      attendanceFilter.className = className;
      attendanceFilter.section = section;
    }

    const attendanceRecords = await Attendance.find(attendanceFilter).sort({ date: 1 });

    const buffer = await generateExcel({
      students,
      attendanceRecords,
      className,
      section,
      startDate: start,
      endDate: end,
      reportType,
      label,
    });

    const fileName = isAllData
      ? `Complete_School_Data_${label}.xlsx`
      : `Attendance_${className}-${section}_${label}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`
    );
    return res.send(buffer);
  } catch (error) {
    console.error('Excel Export Process Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
    });
  }
});

// @route   GET /api/reports/notifications
router.get('/notifications', protect, async (req, res) => {
  try {
    const threshold = parseInt(process.env.ABSENT_THRESHOLD, 10) || 2;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days, 10));

    const students = await Student.find({ isActive: true });
    const notifications = [];

    for (const student of students) {
      const attendanceRecords = await Attendance.find({
        'records.student': student._id,
        date: { $gte: startDate },
      });

      let consecutiveAbsent = 0;
      let maxConsecutive = 0;
      let totalAbsent = 0;
      let lastAbsentDate = null;

      const sorted = attendanceRecords.sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      sorted.forEach((record) => {
        const studentRecord = record.records.find(
          (r) => r.student && r.student.toString() === student._id.toString()
        );
        if (studentRecord && studentRecord.status === 'absent') {
          totalAbsent++;
          consecutiveAbsent++;
          lastAbsentDate = record.date;
          if (consecutiveAbsent > maxConsecutive) {
            maxConsecutive = consecutiveAbsent;
          }
        } else {
          consecutiveAbsent = 0;
        }
      });

      if (maxConsecutive > threshold || totalAbsent > threshold) {
        notifications.push({
          student: {
            _id: student._id,
            name: student.name,
            studentId: student.studentId,
            className: student.className,
            section: student.section,
            rollNumber: student.rollNumber,
            gender: student.gender,
            parentPhone: student.parentPhone,
            phone: student.phone,
          },
          totalAbsentDays: totalAbsent,
          maxConsecutiveAbsent: maxConsecutive,
          currentConsecutiveAbsent: consecutiveAbsent,
          lastAbsentDate,
          totalRecordedDays: attendanceRecords.length,
          severity:
            maxConsecutive > 5
              ? 'critical'
              : maxConsecutive > 3
              ? 'high'
              : 'warning',
        });
      }
    }

    const severityOrder = { critical: 0, high: 1, warning: 2 };
    notifications.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );

    return res.status(200).json({
      success: true,
      threshold,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/reports/dashboard
router.get('/dashboard', protect, authorize('admin'), async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments({ isActive: true });
    const totalClasses = await Student.distinct('className', { isActive: true });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAttendance = await Attendance.find({ date: today });

    let todayPresent = 0;
    let todayAbsent = 0;
    let todayTotal = 0;

    todayAttendance.forEach((record) => {
      if (Array.isArray(record.records)) {
        record.records.forEach((r) => {
          todayTotal++;
          if (r.status === 'present' || r.status === 'late') todayPresent++;
          else if (r.status === 'absent') todayAbsent++;
        });
      }
    });

    const classesMarkedToday = todayAttendance.length;

    const totalClassSections = await Student.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: { className: '$className', section: '$section' } } },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalStudents,
        totalClasses: totalClasses.length,
        totalClassSections: totalClassSections.length,
        today: {
          date: today,
          totalMarked: todayTotal,
          present: todayPresent,
          absent: todayAbsent,
          classesMarked: classesMarkedToday,
          classesRemaining: totalClassSections.length - classesMarkedToday,
          attendancePercentage:
            todayTotal > 0
              ? parseFloat(((todayPresent / todayTotal) * 100).toFixed(2))
              : 0,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;