import React, { useState, useEffect } from 'react';
import { attendanceAPI, studentAPI, reportAPI } from '../api/api';
import { toast } from 'react-toastify';

const REPORT_TYPES = {
  MONTHLY: 'monthly',
  ALL_DATA: 'all_data',
};

const Reports = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState(''); // Stores Board value
  const [reportType, setReportType] = useState(REPORT_TYPES.MONTHLY);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await studentAPI.getClasses();
      setClasses(res.data.data || []);
    } catch (err) {
      console.error('Failed to load classes', err);
      toast.error('Failed to load classes');
    }
  };

  const validateMonthlyInputs = () => {
    if (!selectedClass || !selectedSection) {
      toast.warning('Please select class and board');
      return false;
    }
    return true;
  };

  const fetchReport = async () => {
    if (reportType !== REPORT_TYPES.MONTHLY) return;
    if (!validateMonthlyInputs()) return;

    setLoading(true);
    try {
      const params = {
        className: selectedClass,
        section: selectedSection, // Passed to API as section
        reportType: 'monthly',
        month: selectedMonth,
        year: selectedYear,
      };

      const res = await attendanceAPI.getSummary(params);
      setReportData(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      let params = {};
      let fileName = 'Attendance';

      if (reportType === REPORT_TYPES.MONTHLY) {
        if (!validateMonthlyInputs()) {
          setExporting(false);
          return;
        }
        params = {
          className: selectedClass,
          section: selectedSection,
          reportType: 'monthly',
          month: selectedMonth,
          year: selectedYear,
        };
        fileName = `Attendance_${selectedClass}-${selectedSection}_${monthNames[selectedMonth - 1]}_${selectedYear}`;
      } else {
        // Full Export (All Classes - complete student info)
        params = {
          reportType: 'all_data',
        };
        const timestamp = new Date().toISOString().split('T')[0];
        fileName = `Complete_School_Data_${timestamp}`;
      }

      const response = await reportAPI.exportExcel(params);

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('Excel report exported successfully!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to export to Excel');
    } finally {
      setExporting(false);
    }
  };

  const uniqueClasses = [...new Set(classes.map((c) => c.className))].sort(
    (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })
  );

  // Dynamic board merging just like in AttendanceView
  const boardsFromData = classes
    .filter((c) => c.className === selectedClass)
    .map((c) => c.section)
    .filter(Boolean);

  const uniqueBoards = [...new Set(boardsFromData.length ? boardsFromData : ['CBSE', 'MP', 'ICSE'])];
  const BOARD_OPTIONS = ['CBSE', 'MP', 'ICSE'];
  const boardOptions = [...new Set([...BOARD_OPTIONS, ...uniqueBoards])];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const calculateStats = () => {
    if (!reportData?.students?.length) {
      return { avg: 0, above90: 0, below75: 0 };
    }

    const total = reportData.students.reduce(
      (sum, item) => sum + (item.summary?.percentage || 0),
      0
    );
    const avg = (total / reportData.students.length).toFixed(1);

    const above90 = reportData.students.filter(
      (s) => s.summary?.percentage >= 90
    ).length;

    const below75 = reportData.students.filter(
      (s) => s.summary?.percentage < 75
    ).length;

    return { avg, above90, below75 };
  };

  const stats = calculateStats();

  const getReportTitle = () =>
    `${monthNames[selectedMonth - 1]} ${selectedYear}`;

  const styles = {
    container: { maxWidth: '1200px', margin: '0 auto', padding: '0 10px' },
    header: { fontSize: '26px', fontWeight: 700, color: '#18181c', marginBottom: '6px' },
    subHeader: { fontSize: '13px', color: '#6b7280', marginBottom: '24px' },
    reportTypeTabs: {
      display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap',
      backgroundColor: '#f3f4f6', padding: '6px', borderRadius: '10px', width: 'fit-content'
    },
    tab: (active) => ({
      padding: '9px 20px', borderRadius: '7px', border: 'none', cursor: 'pointer',
      fontSize: '13px', fontWeight: 600, backgroundColor: active ? '#4472C4' : 'transparent',
      color: active ? '#fff' : '#4b5563', transition: 'all 0.2s',
    }),
    controls: {
      display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap',
      alignItems: 'flex-end', backgroundColor: '#fff', padding: '18px',
      borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    },
    controlGroup: {},
    label: {
      display: 'block', fontSize: '11px', fontWeight: 700, color: '#4b5563',
      marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px'
    },
    select: {
      padding: '10px 14px', border: '2px solid #e0e0e0', borderRadius: '8px',
      fontSize: '14px', outline: 'none', minWidth: '140px', backgroundColor: '#fff',
      cursor: 'pointer',
    },
    btn: (color, disabled) => ({
      padding: '10px 24px', backgroundColor: color, color: '#fff',
      border: 'none', borderRadius: '8px', cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: '14px', fontWeight: 600, height: 'fit-content',
      opacity: disabled ? 0.6 : 1, transition: 'transform 0.1s',
    }),
    statsRow: {
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '14px', marginBottom: '20px'
    },
    statCard: (color) => ({
      backgroundColor: '#fff', borderRadius: '12px', padding: '18px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.04)', borderLeft: `4px solid ${color}`
    }),
    statLabel: { fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '6px' },
    statValue: { fontSize: '24px', fontWeight: 700, color: '#1a1a2e' },
    table: { width: '100%', backgroundColor: '#fff', borderRadius: '12px', overflow: 'auto', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
    th: { padding: '13px 14px', textAlign: 'center', backgroundColor: '#1a1a2e', color: '#fff', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' },
    td: { padding: '11px 12px', borderBottom: '1px solid #f0f0f0', fontSize: '13px', textAlign: 'center' },
    pctBar: (pct) => ({
      width: `${Math.max(pct, 5)}%`, height: '22px',
      backgroundColor: pct >= 90 ? '#27ae60' : pct >= 75 ? '#f39c12' : '#e74c3c',
      borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: '11px', fontWeight: 600, minWidth: '40px',
    }),
    genderBadge: (gender) => ({
      padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
      backgroundColor: gender === 'Male' ? '#dbeafe' : gender === 'Female' ? '#fce7f3' : '#f3f4f6',
      color: gender === 'Male' ? '#1e40af' : gender === 'Female' ? '#9f1239' : '#374151',
    }),
    emptyState: { textAlign: 'center', padding: '60px 20px', backgroundColor: '#fff', borderRadius: '12px', color: '#6b7280' },
    exportInfoCard: {
      backgroundColor: '#fff',
      borderRadius: '12px',
      padding: '35px 30px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      textAlign: 'center',
      border: '2px dashed #4472C4',
    },
    featureList: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '12px',
      marginTop: '20px',
      textAlign: 'left',
    },
    featureItem: {
      padding: '10px 14px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      fontSize: '12px',
      color: '#374151',
      borderLeft: '3px solid #4472C4',
    },
  };

  const boardLabel = (b) => {
    if (b === 'MP') return 'MP Board';
    return b; // CBSE, ICSE
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Reports & Export</h1>
      <p style={styles.subHeader}>
        Generate monthly attendance summaries or export complete school data across all classes.
      </p>

      {/* Tabs */}
      <div style={styles.reportTypeTabs}>
        <button
          style={styles.tab(reportType === REPORT_TYPES.MONTHLY)}
          onClick={() => {
            setReportType(REPORT_TYPES.MONTHLY);
            setReportData(null);
          }}
        >
          Monthly Report
        </button>
        <button
          style={styles.tab(reportType === REPORT_TYPES.ALL_DATA)}
          onClick={() => {
            setReportType(REPORT_TYPES.ALL_DATA);
            setReportData(null);
          }}
        >
          Export Complete Data
        </button>
      </div>

      {/* Monthly Controls */}
      {reportType === REPORT_TYPES.MONTHLY && (
        <div style={styles.controls}>
          <div style={styles.controlGroup}>
            <label style={styles.label}>Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection('');
                setReportData(null);
              }}
              style={styles.select}
            >
              <option value="">Select Class</option>
              {uniqueClasses.map((c) => (
                <option key={c} value={c}>Class {c}</option>
              ))}
            </select>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.label}>Board</label>
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setReportData(null);
              }}
              style={styles.select}
              disabled={!selectedClass}
            >
              <option value="">Select Board</option>
              {boardOptions.map((b) => (
                <option key={b} value={b}>{boardLabel(b)}</option>
              ))}
            </select>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.label}>Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              style={styles.select}
            >
              {monthNames.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.label}>Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={styles.select}
            >
              {[2023, 2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchReport}
            style={styles.btn('#4472C4', loading)}
            disabled={loading}
          >
            {loading ? '⏳ Loading...' : 'View Report'}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={styles.btn('#27ae60', exporting)}
          >
            {exporting ? '⏳ Exporting...' : ' Export Excel'}
          </button>
        </div>
      )}

      {/* Export All Data Section */}
      {reportType === REPORT_TYPES.ALL_DATA && (
        <div style={styles.exportInfoCard}>
          <div style={{ fontSize: '48px', marginBottom: '14px' }}>🏫</div>
          <h2 style={{ fontSize: '20px', color: '#1a1a2e', marginBottom: '8px' }}>
            Complete Institute Data Export
          </h2>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '20px' }}>
            Export a comprehensive Excel file containing all students from every class with full personal and academic information.
          </p>

          <div style={styles.featureList}>
            <div style={styles.featureItem}>Full Student ID & Name</div>
            <div style={styles.featureItem}>Class & Board Info</div>
            <div style={styles.featureItem}>Roll Number</div>
            <div style={styles.featureItem}>Gender</div>
            <div style={styles.featureItem}>Email Address</div>
            <div style={styles.featureItem}>Phone Number</div>
            <div style={styles.featureItem}>Parent Phone</div>
            <div style={styles.featureItem}>Date of Birth</div>
            <div style={styles.featureItem}>Full Address</div>
            <div style={styles.featureItem}>Registration Date</div>
            <div style={styles.featureItem}>Overall Attendance Stats</div>
            <div style={styles.featureItem}>Grouped by Class Tabs</div>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            style={{ ...styles.btn('#27ae60', exporting), marginTop: '25px', padding: '14px 36px', fontSize: '15px' }}
          >
            {exporting ? '⏳ Generating Export...' : ' Export Complete School Data'}
          </button>
        </div>
      )}

      {/* Monthly Results */}
      {reportType === REPORT_TYPES.MONTHLY && (
        <>
          {loading && (
            <div style={styles.emptyState}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>⏳</div>
              <div>Calculating summaries and fetching student data...</div>
            </div>
          )}

          {!loading && !reportData && (
            <div style={styles.emptyState}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
              <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>No report generated yet</div>
              <div style={{ fontSize: '13px' }}>
                Select class, board, month & year, then click "View Report".
              </div>
            </div>
          )}

          {reportData && !loading && (
            <>
              {/* Stats Bar */}
              <div style={styles.statsRow}>
                <div style={styles.statCard('#4472C4')}>
                  <div style={styles.statLabel}>Class & Board</div>
                  <div style={styles.statValue}>
                    {reportData.className} - {boardLabel(reportData.section)}
                  </div>
                </div>
                <div style={styles.statCard('#8b5cf6')}>
                  <div style={styles.statLabel}>Active Period</div>
                  <div style={{ ...styles.statValue, fontSize: '16px' }}>
                    {getReportTitle()}
                  </div>
                </div>
                <div style={styles.statCard('#f59e0b')}>
                  <div style={styles.statLabel}>Working Days</div>
                  <div style={styles.statValue}>{reportData.totalWorkingDays || 0}</div>
                </div>
                <div style={styles.statCard('#06b6d4')}>
                  <div style={styles.statLabel}>Total Students</div>
                  <div style={styles.statValue}>{reportData.students?.length || 0}</div>
                </div>
                <div style={styles.statCard('#27ae60')}>
                  <div style={styles.statLabel}>Avg Attendance</div>
                  <div style={styles.statValue}>{stats.avg}%</div>
                </div>
                <div style={styles.statCard('#10b981')}>
                  <div style={styles.statLabel}>Excellent (≥90%)</div>
                  <div style={styles.statValue}>{stats.above90}</div>
                </div>
                <div style={styles.statCard('#e74c3c')}>
                  <div style={styles.statLabel}>Critical (&lt;75%)</div>
                  <div style={styles.statValue}>{stats.below75}</div>
                </div>
              </div>

              {/* Table */}
              <div style={{ ...styles.table, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '850px' }}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, textAlign: 'left' }}>Roll No.</th>
                      <th style={{ ...styles.th, textAlign: 'left' }}>Student ID</th>
                      <th style={{ ...styles.th, textAlign: 'left' }}>Name</th>
                      <th style={styles.th}>Gender</th>
                      <th style={styles.th}>Present</th>
                      <th style={styles.th}>Absent</th>
                      <th style={styles.th}>Late</th>
                      <th style={styles.th}>Tracked Days</th>
                      <th style={{ ...styles.th, minWidth: '180px' }}>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.students?.length > 0 ? (
                      reportData.students.map((item, index) => (
                        <tr key={item.student._id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ ...styles.td, textAlign: 'left', fontWeight: 600 }}>{item.student.rollNumber}</td>
                          <td style={{ ...styles.td, textAlign: 'left', color: '#6b7280' }}>{item.student.studentId}</td>
                          <td style={{ ...styles.td, textAlign: 'left', fontWeight: 500 }}>{item.student.name}</td>
                          <td style={styles.td}><span style={styles.genderBadge(item.student.gender)}>{item.student.gender}</span></td>
                          <td style={{ ...styles.td, color: '#27ae60', fontWeight: 600 }}>{item.summary.present}</td>
                          <td style={{ ...styles.td, color: '#e74c3c', fontWeight: 600 }}>{item.summary.absent}</td>
                          <td style={{ ...styles.td, color: '#f39c12', fontWeight: 600 }}>{item.summary.late}</td>
                          <td style={{ ...styles.td, fontWeight: 600 }}>{item.summary.totalDays}</td>
                          <td style={styles.td}>
                            <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={styles.pctBar(item.summary.percentage)}>{item.summary.percentage}%</div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} style={{ ...styles.td, textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                          No attendance data recorded matching the search parameters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;