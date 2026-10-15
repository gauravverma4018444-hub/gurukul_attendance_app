const ExcelJS = require('exceljs');

const generateExcel = async ({
  students,
  attendanceRecords,
  className,
  section,
  startDate,
  endDate,
  reportType,
  label,
}) => {
  const workbook = new ExcelJS.Workbook();

  // Color constants for high-quality professional layout
  const COLORS = {
    primaryDark: 'FF1A1A2E', // Navy title
    accentBlue: 'FF4472C4',  // Blue header
    zebraLight: 'FFF9FAFB',  // Light grey row
    borderLight: 'FFE0E0E0',
    textWhite: 'FFFFFFFF',
    statusPresent: 'FF27AE60',
    statusAbsent: 'FFE74C3C',
    statusLate: 'FFF39C12',
  };

  // Helper to style table header rows
  const formatHeaderRow = (row) => {
    row.height = 26;
    row.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.textWhite } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.accentBlue },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'medium' },
        right: { style: 'thin' },
      };
    });
  };

  // Helper to style cell grid borders
  const formatDataRow = (row, index) => {
    row.height = 20;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber <= 5 ? 'left' : 'center',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.borderLight } },
        bottom: { style: 'thin', color: { argb: COLORS.borderLight } },
        left: { style: 'thin', color: { argb: COLORS.borderLight } },
        right: { style: 'thin', color: { argb: COLORS.borderLight } },
      };
    });

    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.zebraLight },
      };
    }
  };

  // Build attendance lookup stats map
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

  // -------------------------------------------------------------
  // MODE 1: EXPORT ALL SCHOOL DATA (All Classes + Complete Profiles)
  // -------------------------------------------------------------
  if (reportType === 'all_data') {
    // 1. Master Summary Sheet
    const masterSheet = workbook.addWorksheet('All Students Summary');

    masterSheet.mergeCells('A1:P1');
    const masterTitle = masterSheet.getCell('A1');
    masterTitle.value = `COMPLETE SCHOOL REGISTER & ATTENDANCE DATABASE`;
    masterTitle.font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLORS.textWhite } };
    masterTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryDark } };
    masterTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    masterSheet.getRow(1).height = 40;

    masterSheet.mergeCells('A2:P2');
    const masterSub = masterSheet.getCell('A2');
    masterSub.value = `Generated On: ${new Date().toLocaleDateString()} | Target Range: Jan 1st - Dec 31st (Annual cumulative tracking)`;
    masterSub.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF555555' } };
    masterSub.alignment = { horizontal: 'center', vertical: 'middle' };
    masterSheet.getRow(2).height = 20;

    const masterHeaders = [
      { header: 'Class', key: 'className', width: 10 },
      { header: 'Section', key: 'section', width: 10 },
      { header: 'Roll No', key: 'rollNumber', width: 10 },
      { header: 'Student ID', key: 'studentId', width: 15 },
      { header: 'Student Name', key: 'name', width: 25 },
      { header: 'Gender', key: 'gender', width: 12 },
      { header: 'Email', key: 'email', width: 22 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Parent Phone', key: 'parentPhone', width: 15 },
      { header: 'Date of Birth', key: 'dateOfBirth', width: 15 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Present', key: 'present', width: 10 },
      { header: 'Absent', key: 'absent', width: 10 },
      { header: 'Late', key: 'late', width: 10 },
      { header: 'Total Days', key: 'totalDays', width: 12 },
      { header: 'Percentage %', key: 'percentage', width: 15 },
    ];

    const mHeaderRow = masterSheet.getRow(4);
    mHeaderRow.values = masterHeaders.map((h) => h.header);
    formatHeaderRow(mHeaderRow);

    students.forEach((student, index) => {
      const stats = studentStats[student._id.toString()] || { present: 0, absent: 0, late: 0 };
      const totalDays = stats.present + stats.absent + stats.late;
      const attended = stats.present + stats.late;
      const percentage = totalDays > 0 ? Math.round((attended / totalDays) * 100) : 0;

      const row = masterSheet.addRow([
        student.className,
        student.section,
        student.rollNumber,
        student.studentId,
        student.name,
        student.gender,
        student.email || '-',
        student.phone || '-',
        student.parentPhone || '-',
        student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '-',
        student.address || '-',
        stats.present,
        stats.absent,
        stats.late,
        totalDays,
        `${percentage}%`,
      ]);
      formatDataRow(row, index);
    });

    masterHeaders.forEach((col, i) => {
      masterSheet.getColumn(i + 1).width = col.width;
    });

    // 2. Individual Class Section Tabs
    const classGroups = {};
    students.forEach((s) => {
      const key = `Class ${s.className}-${s.section}`;
      if (!classGroups[key]) classGroups[key] = [];
      classGroups[key].push(s);
    });

    Object.keys(classGroups).forEach((groupName) => {
      const classStudents = classGroups[groupName];
      // Excel sheets max length rule: 31 chars
      const sheet = workbook.addWorksheet(groupName.substring(0, 31));

      sheet.mergeCells('A1:O1');
      const tCell = sheet.getCell('A1');
      tCell.value = `${groupName.toUpperCase()} - FULL CLASS REGISTER`;
      tCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLORS.textWhite } };
      tCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryDark } };
      tCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height = 30;

      const detailedHeaders = [
        { header: 'Roll No', width: 10 },
        { header: 'Student ID', width: 15 },
        { header: 'Student Name', width: 25 },
        { header: 'Gender', width: 12 },
        { header: 'Email', width: 22 },
        { header: 'Phone', width: 15 },
        { header: 'Parent Phone', width: 15 },
        { header: 'Date of Birth', width: 15 },
        { header: 'Address', width: 30 },
        { header: 'Present', width: 10 },
        { header: 'Absent', width: 10 },
        { header: 'Late', width: 10 },
        { header: 'Total Days', width: 12 },
        { header: 'Percentage %', width: 15 },
      ];

      const hRow = sheet.getRow(3);
      hRow.values = detailedHeaders.map((h) => h.header);
      formatHeaderRow(hRow);

      classStudents.forEach((student, index) => {
        const stats = studentStats[student._id.toString()] || { present: 0, absent: 0, late: 0 };
        const totalDays = stats.present + stats.absent + stats.late;
        const attended = stats.present + stats.late;
        const percentage = totalDays > 0 ? Math.round((attended / totalDays) * 100) : 0;

        const row = sheet.addRow([
          student.rollNumber,
          student.studentId,
          student.name,
          student.gender,
          student.email || '-',
          student.phone || '-',
          student.parentPhone || '-',
          student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '-',
          student.address || '-',
          stats.present,
          stats.absent,
          stats.late,
          totalDays,
          `${percentage}%`,
        ]);
        formatDataRow(row, index);
      });

      detailedHeaders.forEach((col, i) => {
        sheet.getColumn(i + 1).width = col.width;
      });
    });

    return await workbook.xlsx.writeBuffer();
  }

  // -------------------------------------------------------------
  // MODE 2: CLASS MONTHLY REPORT (Matrices with Daily Tracking)
  // -------------------------------------------------------------
  const worksheet = workbook.addWorksheet(`Class ${className}-${section}`);

  worksheet.mergeCells('A1:I1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `ATTENDANCE REPORT - CLASS ${className}-${section}`;
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLORS.textWhite } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryDark } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 35;

  worksheet.mergeCells('A2:I2');
  const subCell = worksheet.getCell('A2');
  subCell.value = `Period: ${label.replace(/_/g, ' ')} | Total Days Tracked: ${attendanceRecords.length} | Generated: ${new Date().toLocaleDateString()}`;
  subCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF333333' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 22;

  const baseHeaders = [
    { header: 'Roll No', key: 'rollNumber', width: 10 },
    { header: 'Student ID', key: 'studentId', width: 15 },
    { header: 'Student Name', key: 'name', width: 25 },
    { header: 'Gender', key: 'gender', width: 12 },
  ];

  // Dynamic day header dates (for up to 35 recorded days)
  const isDetailedDates = attendanceRecords.length <= 35;
  if (isDetailedDates) {
    attendanceRecords.forEach((record, index) => {
      const d = new Date(record.date);
      baseHeaders.push({
        header: `${d.getDate()}/${d.getMonth() + 1}`,
        key: `day_${index}`,
        width: 7,
      });
    });
  }

  baseHeaders.push(
    { header: 'Present', key: 'present', width: 10 },
    { header: 'Absent', key: 'absent', width: 10 },
    { header: 'Late', key: 'late', width: 10 },
    { header: 'Total Days', key: 'totalDays', width: 12 },
    { header: 'Percentage %', key: 'percentage', width: 15 }
  );

  const headerRow = worksheet.getRow(4);
  headerRow.values = baseHeaders.map((h) => h.header);
  formatHeaderRow(headerRow);

  students.forEach((student, sIndex) => {
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    const rowData = [
      student.rollNumber,
      student.studentId,
      student.name,
      student.gender,
    ];

    if (isDetailedDates) {
      attendanceRecords.forEach((attDoc) => {
        const studentRec = attDoc.records.find(
          (r) => r.student && r.student.toString() === student._id.toString()
        );
        const status = studentRec ? (studentRec.status || '').toLowerCase() : '-';

        if (status === 'present') {
          presentCount++;
          rowData.push('P');
        } else if (status === 'absent') {
          absentCount++;
          rowData.push('A');
        } else if (status === 'late') {
          lateCount++;
          rowData.push('L');
        } else {
          rowData.push('-');
        }
      });
    } else {
      const stats = studentStats[student._id.toString()] || { present: 0, absent: 0, late: 0 };
      presentCount = stats.present;
      absentCount = stats.absent;
      lateCount = stats.late;
    }

    const totalDays = presentCount + absentCount + lateCount;
    const percentage = totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 0;

    rowData.push(presentCount, absentCount, lateCount, totalDays, `${percentage}%`);

    const addedRow = worksheet.addRow(rowData);
    formatDataRow(addedRow, sIndex);

    if (isDetailedDates) {
      addedRow.eachCell((cell) => {
        if (cell.value === 'P') cell.font = { color: { argb: COLORS.statusPresent }, bold: true };
        else if (cell.value === 'A') cell.font = { color: { argb: COLORS.statusAbsent }, bold: true };
        else if (cell.value === 'L') cell.font = { color: { argb: COLORS.statusLate }, bold: true };
      });
    }
  });

  baseHeaders.forEach((col, i) => {
    worksheet.getColumn(i + 1).width = col.width || 12;
  });

  return await workbook.xlsx.writeBuffer();
};

module.exports = { generateExcel };