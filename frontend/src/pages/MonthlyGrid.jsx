import React, { useState, useEffect } from 'react';
import { attendanceAPI, studentAPI } from '../api/api';
import { toast } from 'react-toastify';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Stylized visual indicators for active states
const getCellStyle = (status) => {
  switch (status) {
    case 'present': 
      return { backgroundColor: '#22c55e', color: '#ffffff', fontWeight: '700' };
    case 'absent':  
      return { backgroundColor: '#ef4444', color: '#ffffff', fontWeight: '700' };
    case 'late':    
      return { backgroundColor: '#eab308', color: '#ffffff', fontWeight: '700' };
    default:        
      return { backgroundColor: 'transparent', color: '#64748b', fontWeight: '500' };
  }
};

const MonthlyGrid = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [year, setYear] = useState(now.getFullYear());
  const [className, setClassName] = useState('');
  const [classes, setClasses] = useState([]);
  const [grid, setGrid] = useState([]);
  const [loading, setLoading] = useState(false);

  // Helper to extract student name initials
  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  // Helper to get active calendar days of the month excluding Sundays
  const getActiveDaysInMonth = () => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const activeDays = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      if (dayOfWeek !== 0) { // Skip Sunday (0)
        activeDays.push(d);
      }
    }
    return activeDays;
  };

  const activeDaysList = getActiveDaysInMonth();

  useEffect(() => { fetchClasses(); }, []);
  useEffect(() => { if (className) fetchGrid(); }, [className, month, year]);

  const fetchClasses = async () => {
    try {
      const res = await studentAPI.getClasses();
      const list = res.data?.data || res.data || [];

      const names = list
        .map((c) => {
          if (typeof c === 'string') return c;
          return (
            c.fullName ||
            (c.className && c.section ? `${c.className}-${c.section}` : c.className) ||
            c.class || c.name || c._id || null
          );
        })
        .filter(Boolean);

      const unique = [...new Set(names)];
      setClasses(unique);
      if (unique.length > 0) setClassName(unique[0]);
    } catch (err) {
      toast.error('Failed to load classes');
    }
  };

  const fetchGrid = async () => {
    if (!className) return; 
    setLoading(true);
    try {
      const [cls, sec] = className.split('-'); // "12-A" → "12", "A"
      const res = await attendanceAPI.getMonthlyGrid({
        className: cls,
        section: sec,
        month,
        year,
      });
      setGrid(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load monthly attendance');
      setGrid([]);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (dir) => {
    let m = month + dir;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
  };

  const theme = {
    bg: '#f8fafc',
    cardBg: '#ffffff',
    textDark: '#0f172a',
    textMuted: '#64748b',
    border: '#e2e8f0',
    primary: '#4f46e5',
    shadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
  };

  const styles = {
    container: { 
      maxWidth: '100%', 
      margin: '0 auto', 
      padding: '24px',
      backgroundColor: theme.bg,
      minHeight: '100vh',
      fontFamily: "'Inter', -apple-system, sans-serif",
      boxSizing: 'border-box'
    },
    headerRow: {
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      flexWrap: 'wrap', 
      gap: '16px', 
      marginBottom: '24px',
    },
    titleSection: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
    },
    title: { 
      fontSize: '24px', 
      fontWeight: 800, 
      color: theme.textDark,
      letterSpacing: '-0.5px',
      margin: 0
    },
    subtitle: {
      fontSize: '13px',
      color: theme.textMuted,
      margin: 0
    },
    controls: { 
      display: 'flex', 
      gap: '10px', 
      alignItems: 'center', 
      flexWrap: 'wrap' 
    },
    select: {
      padding: '8px 14px', 
      borderRadius: '8px', 
      border: `1.5px solid ${theme.border}`,
      fontSize: '13.5px', 
      fontWeight: '600',
      outline: 'none', 
      backgroundColor: '#fff', 
      cursor: 'pointer',
      color: theme.textDark,
      boxShadow: theme.shadow,
    },
    navBtn: {
      padding: '8px 14px', 
      borderRadius: '8px', 
      cursor: 'pointer',
      backgroundColor: '#fff', 
      border: `1.5px solid ${theme.border}`,
      color: theme.textDark, 
      fontWeight: 600, 
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: theme.shadow,
    },
    monthLabel: { 
      fontSize: '15px', 
      fontWeight: 700, 
      color: theme.textDark, 
      minWidth: '140px', 
      textAlign: 'center' 
    },
    
    // Top Row Column Descriptions
    tableHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0 24px',
      marginBottom: '10px',
    },
    headerLabel: (width, align) => ({
      width: width,
      textAlign: align,
      fontSize: '12.5px',
      fontWeight: '600',
      color: theme.textMuted,
    }),

    // Card List Elements
    listContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
    studentCard: {
      backgroundColor: theme.cardBg,
      borderRadius: '20px',
      padding: '24px',
      border: `1px solid ${theme.border}`,
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '24px',
    },

    // Left block: Initials Avatar + Info
    avatarBlock: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      width: '280px',
    },
    initialsCircle: {
      width: '58px',
      height: '58px',
      borderRadius: '50%',
      backgroundColor: '#f1f5f9',
      border: `1px solid ${theme.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
      fontWeight: '700',
      color: '#475569',
      textTransform: 'uppercase',
    },
    studentName: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#1e293b',
      margin: '0 0 4px 0',
      textTransform: 'lowercase',
    },
    studentRoll: {
      fontSize: '13px',
      fontWeight: '500',
      color: theme.textMuted,
      margin: 0,
    },

    // Middle block: Vertical flowing grid columns
    gridBox: {
      display: 'grid',
      gridTemplateRows: 'repeat(5, auto)', // Strict 5 rows
      gridAutoFlow: 'column',               
      gap: '8px 24px',
      padding: '12px 20px',
    },
    cell: (status) => {
      const c = getCellStyle(status);
      return {
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: c.backgroundColor,
        color: c.color,
        fontSize: '11px',
        fontWeight: c.fontWeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'help',
        boxShadow: status === 'present' ? '0 4px 10px rgba(34, 197, 94, 0.3)' : 'none',
      };
    },

    // Right block: Segment Box Statistics
    performanceContainer: {
      display: 'flex',
      alignItems: 'center',
      backgroundColor: '#f8fafc',
      border: `1px solid ${theme.border}`,
      borderRadius: '16px',
      padding: '10px 16px',
      gap: '24px',
      width: '320px',
      justifyContent: 'space-between',
    },
    segment: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2px',
      flex: 1,
    },
    segmentDivider: {
      width: '1px',
      height: '40px',
      backgroundColor: theme.border,
    },
    segmentIcon: (color) => ({
      fontSize: '18px',
      color: color,
      marginBottom: '2px',
    }),
    segmentValue: (color) => ({
      fontSize: '16px',
      fontWeight: '800',
      color: color,
    }),
    segmentLabel: {
      fontSize: '10px',
      fontWeight: '600',
      color: theme.textMuted,
      whiteSpace: 'nowrap',
    },
    percentageRing: (color) => ({
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      border: `4px solid ${color}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12.5px',
      fontWeight: '800',
      color: '#1e293b',
      backgroundColor: '#ffffff',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
    }),

    legend: { 
      display: 'flex', 
      gap: '20px', 
      marginTop: '24px', 
      flexWrap: 'wrap',
      paddingTop: '16px',
      borderTop: `1px solid ${theme.border}`
    },
    legendItem: { 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      fontSize: '13px', 
      color: theme.textMuted,
      fontWeight: '600',
    },
    box: (bg) => ({ 
      width: '14px', 
      height: '14px', 
      borderRadius: '50%', 
      backgroundColor: bg,
    }),
    empty: { 
      textAlign: 'center', 
      padding: '60px 20px', 
      color: theme.textMuted, 
      fontSize: '14px',
      fontWeight: '500',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
    },
    loadingSpinner: {
      width: '28px',
      height: '28px',
      border: `3px solid ${theme.border}`,
      borderTop: `3px solid ${theme.primary}`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    }
  };

  return (
    <div style={styles.container}>
      {/* HEADER SECTION */}
      <div style={styles.headerRow}>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>📊 Attendance Register</h1>
          <p style={styles.subtitle}>View and track monthly structured calendar parameters</p>
        </div>
        <div style={styles.controls}>
          <select
            style={styles.select}
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          >
            {classes.length === 0 && <option value="">No classes available</option>}
            {classes.map((c) => (
              <option key={c} value={c}>Class {c}</option>
            ))}
          </select>
          <button style={styles.navBtn} onClick={() => changeMonth(-1)}>◀ Prev</button>
          <div style={styles.monthLabel}>{monthNames[month - 1]} {year}</div>
          <button style={styles.navBtn} onClick={() => changeMonth(1)}>Next ▶</button>
        </div>
      </div>

      {/* COLUMN LABELS TABLE HEADER */}
      {grid.length > 0 && !loading && (
        <div style={styles.tableHeader}>
          <div style={styles.headerLabel('280px', 'left')}>Student</div>
          <div style={styles.headerLabel('auto', 'center')}>Attendance</div>
          <div style={styles.headerLabel('320px', 'center')}>Performance</div>
        </div>
      )}

      {/* STUDENT DATA LIST */}
      <div>
        {loading ? (
          <div style={{ ...styles.studentCard, ...styles.empty }}>
            <div style={styles.loadingSpinner}></div>
            <div>Loading record entries...</div>
          </div>
        ) : grid.length === 0 ? (
          <div style={{ ...styles.studentCard, ...styles.empty }}>
            <span style={{ fontSize: '28px' }}>📭</span>
            <div>No student records associated with this class.</div>
          </div>
        ) : (
          <div style={styles.listContainer}>
            {grid.map((stu) => {
              let p = 0, a = 0;
              activeDaysList.forEach((d) => {
                const s = stu.days[d];
                if (s === 'present') p++;
                if (s === 'absent') a++;
              });
              const pct = p + a > 0 ? Math.round((p / (p + a)) * 100) : 0;
              const ringColor = pct >= 75 ? '#22c55e' : pct >= 50 ? '#eab308' : '#cbd5e1';

              return (
                <div key={stu.studentId} style={styles.studentCard}>
                  
                  {/* Left Section: Avatar + Name / Roll */}
                  <div style={styles.avatarBlock}>
                    <div style={styles.initialsCircle}>
                      {getInitials(stu.name)}
                    </div>
                    <div>
                      <h3 style={styles.studentName}>{stu.name}</h3>
                      <p style={styles.studentRoll}>Roll No: {stu.rollNumber}</p>
                    </div>
                  </div>

                  {/* Middle Section: Active Month Grid (Vertical Flow columns, Sundays Omitted) */}
                  <div style={styles.gridBox}>
                    {activeDaysList.map((d) => {
                      const status = stu.days[d];
                      const styleCell = getCellStyle(status);
                      return (
                        <div 
                          key={d} 
                          style={styles.cell(status)}
                          title={`Day ${d} (${monthNames[month - 1]}): ${status || 'Unmarked'}`}
                        >
                          {d}
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Section: Visual Segment Box Performance Metrics */}
                  <div style={styles.performanceContainer}>
                    {/* Segment: Present */}
                    <div style={styles.segment}>
                      <span style={styles.segmentIcon('#10b981')}>👤✓</span>
                      <span style={styles.segmentValue('#10b981')}>{p}</span>
                      <span style={styles.segmentLabel}>Present Days</span>
                    </div>

                    <div style={styles.segmentDivider}></div>

                    {/* Segment: Absent */}
                    <div style={styles.segment}>
                      <span style={styles.segmentIcon('#ef4444')}>👤✗</span>
                      <span style={styles.segmentValue('#ef4444')}>{a}</span>
                      <span style={styles.segmentLabel}>Absent Days</span>
                    </div>

                    <div style={styles.segmentDivider}></div>

                    {/* Progress Circle Indicators */}
                    <div>
                      <div style={styles.percentageRing(ringColor)}>
                        {pct}%
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Legend Indicators */}
        <div style={styles.legend}>
          <div style={styles.legendItem}><div style={styles.box('#22c55e')}></div> Present (P)</div>
          <div style={styles.legendItem}><div style={styles.box('#ef4444')}></div> Absent (A)</div>
          <div style={styles.legendItem}><div style={styles.box('#eab308')}></div> Late (L)</div>
          <div style={styles.legendItem}><div style={styles.box('#f1f5f9')}></div> Not Marked / Weekends</div>
        </div>
      </div>
      
      {/* Loading Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MonthlyGrid;