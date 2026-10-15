import React, { useState, useEffect } from 'react';
import { attendanceAPI, studentAPI } from '../api/api';
import { toast } from 'react-toastify';
import { triggerRefresh } from '../utils/refresh';

// After successfully marking attendance:
const handleMarkAttendance = async () => {
  try {
    await attendanceAPI.mark(data);
    toast.success('Attendance marked');
    triggerRefresh('attendance');  // ← ADD THIS LINE
  } catch (err) {
    toast.error('Failed');
  }
};
const AttendanceView = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    fetchClasses();
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await studentAPI.getClasses();
      setClasses(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load classes');
    }
  };

  const fetchAttendance = async () => {
    if (!selectedClass || !selectedSection) {
      toast.warning('Please select class and board');
      return;
    }

    setLoading(true);
    try {
      const res = await attendanceAPI.getByClass({
        className: selectedClass,
        section: selectedSection,
        date: selectedDate,
      });
      setAttendance(res.data.data);
    } catch (err) {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const setStudentStatus = (index, status) => {
    if (!attendance) return;
    const updated = { ...attendance };
    updated.records[index].status = status;
    setAttendance(updated);
  };

  const markAllPresent = () => {
    if (!attendance) return;
    const updated = { ...attendance };
    updated.records.forEach((r) => (r.status = 'present'));
    setAttendance(updated);
    toast.success('Marked all students as Present');
  };

  const markAllAbsent = () => {
    if (!attendance) return;
    const updated = { ...attendance };
    updated.records.forEach((r) => (r.status = 'absent'));
    setAttendance(updated);
    toast.info('Marked all students as Absent');
  };

  const saveAttendance = async () => {
    if (!attendance) return;
    setSaving(true);

    try {
      const payload = {
        date: selectedDate,
        className: selectedClass,
        section: selectedSection,
        records: attendance.records.map((r) => ({
          student: r.student._id,
          status: r.status,
          remarks: r.remarks || '',
        })),
      };

      await attendanceAPI.mark(payload);
      toast.success('Attendance saved successfully!');
    } catch (err) {
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const uniqueClasses = [...new Set(classes.map((c) => c.className))];

  const boardsFromData = classes
    .filter((c) => c.className === selectedClass)
    .map((c) => c.section)
    .filter(Boolean);

  const uniqueBoards = [...new Set(boardsFromData.length ? boardsFromData : ['CBSE', 'MP', 'ICSE'])];

  const BOARD_OPTIONS = ['CBSE', 'MP', 'ICSE'];
  const boardOptions = [...new Set([...BOARD_OPTIONS, ...uniqueBoards])];

  const presentCount =
    attendance?.records.filter((r) => r.status === 'present' || r.status === 'late').length || 0;
  const absentCount =
    attendance?.records.filter((r) => r.status === 'absent').length || 0;
  const totalCount = attendance?.records.length || 0;
  const pct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const isMobile = windowWidth < 768;

  const boardLabel = (b) => {
    if (b === 'MP') return 'MP Board';
    return b;
  };

  /* ---------- Styles — dark backdrop + frosted cards ---------- */
  const styles = {
    page: {
      fontFamily: "'Inter', system-ui, sans-serif",
      color: '#1e293b',
      paddingBottom: '40px',
      backgroundColor: 'transparent', // lets network canvas show through
      minHeight: '100vh',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: isMobile ? '16px' : '30px',
    },
    headerWrapper: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      marginBottom: '24px',
    },
    titleRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    title: {
      fontSize: isMobile ? '22px' : '26px',
      fontWeight: 800,
      margin: 0,
      letterSpacing: '-0.5px',
      color: '#1e1f20', // light on dark bg
    },
    liveBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      background: 'rgba(14, 165, 233, 0.15)',
      color: '#7dd3fc',
      fontSize: '11px',
      fontWeight: 700,
      padding: '4px 10px',
      borderRadius: '12px',
      border: '1px solid rgba(14, 165, 233, 0.25)',
    },
    liveDot: {
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      backgroundColor: '#38bdf8',
      boxShadow: '0 0 8px #38bdf8',
    },
    dateSub: {
      fontSize: '13px',
      color: '#94a3b8',
      fontWeight: 500,
      margin: '4px 0 0 0',
    },

    panel: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '24px',
      padding: isMobile ? '20px' : '24px',
      boxShadow: '0 12px 48px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.5)',
      marginBottom: '24px',
    },

    controlsGrid: {
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
    },
    controlGroup: {
      flex: '1 1 200px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    label: {
      fontSize: '12px',
      fontWeight: '700',
      color: '#475569',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    input: {
      padding: '12px 16px',
      border: 'none',
      borderRadius: '14px',
      fontSize: '14px',
      outline: 'none',
      backgroundColor: '#f1f5f9',
      color: '#334155',
      fontWeight: '600',
      cursor: 'pointer',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
      width: '100%',
      boxSizing: 'border-box',
    },
    loadBtn: {
      padding: '12px 28px',
      backgroundColor: '#4f46e5',
      color: '#fff',
      border: 'none',
      borderRadius: '14px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '700',
      height: '44px',
      boxShadow: '0 8px 20px rgba(79, 70, 229, 0.35)',
      transition: 'all 0.2s',
      flexShrink: 0,
    },

    row1: {
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
      gap: isMobile ? '12px' : '16px',
      marginBottom: '24px',
    },
    statCard: (glowColor) => ({
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(12px)',
      borderRadius: '16px',
      padding: isMobile ? '16px' : '20px',
      boxShadow: `0 8px 32px rgba(0,0,0,0.25), 0 0 0 1px ${glowColor}33`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      border: `1.5px solid ${glowColor}44`,
    }),
    statLabel: { fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' },
    statValue: { fontSize: '24px', fontWeight: 800, color: '#0f172a', lineHeight: 1 },
    iconBox: (bg, color) => ({
      width: '40px',
      height: '40px',
      borderRadius: '12px',
      backgroundColor: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
      color,
      flexShrink: 0,
    }),

    pillRow: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
    pillBtn: (type) => {
      const isGreen = type === 'present';
      return {
        padding: '10px 24px',
        borderRadius: '24px',
        fontSize: '13px',
        fontWeight: 700,
        cursor: 'pointer',
        border: 'none',
        backgroundColor: isGreen ? 'rgba(220, 252, 231, 0.95)' : 'rgba(254, 226, 226, 0.95)',
        color: isGreen ? '#15803d' : '#b91c1c',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        backdropFilter: 'blur(8px)',
      };
    },

    tableWrap: { overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: '600px' },
    th: {
      textAlign: 'left',
      fontSize: '11px',
      fontWeight: 800,
      color: '#475569',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      padding: '0 12px 16px',
      borderBottom: '1.5px solid #f1f5f9',
      whiteSpace: 'nowrap',
    },
    td: { padding: '16px 12px', borderBottom: '1px solid #f8fafc', verticalAlign: 'middle' },

    studentCell: { display: 'flex', alignItems: 'center', gap: '12px' },
    avatar: {
      width: '42px',
      height: '42px',
      borderRadius: '12px',
      backgroundColor: '#f1f5f9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: 800,
      color: '#475569',
      flexShrink: 0,
    },
    studentName: { fontWeight: 700, color: '#0f172a', fontSize: '14px' },
    studentSub: { fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: 500 },

    segmentedControl: {
      display: 'inline-flex',
      backgroundColor: '#f1f5f9',
      padding: '6px',
      borderRadius: '16px',
      gap: '6px',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)',
    },
    segmentBtn: (status, active) => {
      let activeBg = '#e2e8f0';
      let activeColor = '#64748b';
      let shadow = 'none';

      if (active) {
        if (status === 'present') {
          activeBg = '#22c55e';
          activeColor = '#fff';
          shadow = '0 4px 12px rgba(34,197,94,0.3)';
        }
        if (status === 'absent') {
          activeBg = '#ef4444';
          activeColor = '#fff';
          shadow = '0 4px 12px rgba(239,68,68,0.3)';
        }
        if (status === 'late') {
          activeBg = '#f59e0b';
          activeColor = '#fff';
          shadow = '0 4px 12px rgba(245,158,11,0.3)';
        }
        if (status === 'excused') {
          activeBg = '#3b82f6';
          activeColor = '#fff';
          shadow = '0 4px 12px rgba(59,130,246,0.3)';
        }
      }

      return {
        padding: isMobile ? '8px 12px' : '8px 18px',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '700',
        backgroundColor: active ? activeBg : 'transparent',
        color: active ? activeColor : '#64748b',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        minWidth: isMobile ? '35px' : '75px',
        textAlign: 'center',
        boxShadow: shadow,
      };
    },

    saveBtn: {
      padding: '16px 32px',
      backgroundColor: '#0f172a',
      color: '#fff',
      border: '1px solid #cda45e',
      borderRadius: '16px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '800',
      marginTop: '12px',
      width: '100%',
      boxShadow: '0 10px 25px rgba(15, 23, 42, 0.35)',
      transition: 'all 0.2s',
      display: 'flex',
      justifyContent: 'center',
    },
    spinner: {
      width: '20px',
      height: '20px',
      border: '3px solid rgba(255,255,255,0.3)',
      borderTop: '3px solid #fff',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      display: 'inline-block',
    },
  };

  const statCards = [
    { label: 'Total Students', value: totalCount, icon: '👥', color: '#8b5cf6', borderColor: '#c4b5fd', bg: '#f3e8ff' },
    { label: 'Present Today', value: presentCount, icon: '✓', color: '#22c55e', borderColor: '#86efac', bg: '#dcfce7' },
    { label: 'Absent Today', value: absentCount, icon: '✗', color: '#ef4444', borderColor: '#fca5a5', bg: '#fee2e2' },
    { label: 'Attendance %', value: `${pct}%`, icon: '📊', color: '#3b82f6', borderColor: '#93c5fd', bg: '#dbeafe' },
  ];

  return (
    <div style={styles.page}>
      <style>{`
        .table-scroll::-webkit-scrollbar { height: 6px; }
        .table-scroll::-webkit-scrollbar-track { background: transparent; }
        .table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>

      {/* HEADER */}
      <div style={styles.headerWrapper}>
        <div style={styles.titleRow}>
          <h1 style={styles.title}>Attendance Entry</h1>
          <div style={styles.liveBadge}>
            <span style={styles.liveDot}></span> ACTIVE
          </div>
        </div>
        <p style={styles.dateSub}>Mark daily attendance by class and board</p>
      </div>

      {/* FILTER PANEL */}
      <div style={styles.panel}>
        <div style={styles.controlsGrid}>
          <div style={styles.controlGroup}>
            <label style={styles.label}>Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection('');
                setAttendance(null);
              }}
              style={styles.input}
            >
              <option value="">Select Class</option>
              {uniqueClasses.map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.label}>Board</label>
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setAttendance(null);
              }}
              style={styles.input}
              disabled={!selectedClass}
            >
              <option value="">Select Board</option>
              {boardOptions.map((b) => (
                <option key={b} value={b}>
                  {boardLabel(b)}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.label}>Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setAttendance(null);
              }}
              style={styles.input}
            />
          </div>

          <button
            onClick={fetchAttendance}
            style={{ ...styles.loadBtn, width: isMobile ? '100%' : 'auto' }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            Fetch Roster
          </button>
        </div>
      </div>

      {loading && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            color: '#94a3b8',
            fontWeight: 600,
            fontSize: '15px',
          }}
        >
          Syncing student directory...
        </div>
      )}

      {attendance && !loading && (
        <>
          {/* STATS */}
          <div style={styles.row1}>
            {statCards.map((c) => (
              <div key={c.label} style={styles.statCard(c.borderColor)}>
                <div>
                  <div style={styles.statLabel}>{c.label}</div>
                  <div style={styles.statValue}>{c.value}</div>
                </div>
                <div style={styles.iconBox(c.bg, c.color)}>{c.icon}</div>
              </div>
            ))}
          </div>

          {/* BULK ACTIONS */}
          <div style={styles.pillRow}>
            <button style={styles.pillBtn('present')} onClick={markAllPresent}>
              <span style={{ fontSize: '16px' }}>✓</span> Mark All Present
            </button>
            <button style={styles.pillBtn('absent')} onClick={markAllAbsent}>
              <span style={{ fontSize: '16px' }}>✗</span> Mark All Absent
            </button>
          </div>

          {/* TABLE PANEL */}
          <div style={styles.panel}>
            <div className="table-scroll" style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, width: '80px' }}>Roll No</th>
                    <th style={styles.th}>Student Directory</th>
                    {!isMobile && <th style={styles.th}>Student ID</th>}
                    <th style={{ ...styles.th, textAlign: 'center' }}>Attendance Input</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.records.map((record, index) => (
                    <tr key={record.student._id}>
                      <td style={{ ...styles.td, fontWeight: '800', color: '#475569' }}>
                        {String(record.student.rollNumber).padStart(2, '0')}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.studentCell}>
                          <div style={styles.avatar}>{getInitials(record.student.name)}</div>
                          <div>
                            <div style={styles.studentName}>{record.student.name}</div>
                            {isMobile && (
                              <div style={styles.studentSub}>ID: {record.student.studentId}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      {!isMobile && (
                        <td
                          style={{
                            ...styles.td,
                            color: '#64748b',
                            fontWeight: '600',
                            fontSize: '13px',
                          }}
                        >
                          {record.student.studentId}
                        </td>
                      )}
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <div style={styles.segmentedControl}>
                          {['present', 'absent', 'late', 'excused'].map((status) => {
                            const active = record.status === status;
                            return (
                              <button
                                key={status}
                                onClick={() => setStudentStatus(index, status)}
                                style={styles.segmentBtn(status, active)}
                                title={`Set to ${status}`}
                              >
                                {isMobile
                                  ? status.substring(0, 1).toUpperCase()
                                  : status.charAt(0).toUpperCase() + status.slice(1)}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SAVE BUTTON */}
            <button
              style={{
                ...styles.saveBtn,
                opacity: saving ? 0.8 : 1,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
              onClick={saveAttendance}
              disabled={saving}
              onMouseEnter={(e) => !saving && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => !saving && (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {saving ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={styles.spinner}></div>
                  <span>Saving to Database...</span>
                </div>
              ) : (
                'Submit Attendance Records'
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceView;