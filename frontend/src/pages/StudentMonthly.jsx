import React, { useState, useEffect, useRef } from 'react';
import { attendanceAPI, studentAPI } from '../api/api';
import { toast } from 'react-toastify';

const monthNames = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const weekDayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const weekNames = ['1st Week', '2nd Week', '3rd Week', '4th Week', '5th Week', '6th Week'];

const StudentMonthly = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [classes, setClasses] = useState([]);
  const [className, setClassName] = useState('');
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [daysMap, setDaysMap] = useState({});
  const [loading, setLoading] = useState(false);

  // 🔍 NEW: search state
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  const daysInMonth = new Date(year, month, 0).getDate();

  useEffect(() => { fetchClasses(); }, []);
  useEffect(() => { if (className) fetchStudents(); }, [className]);
  useEffect(() => { if (studentId) fetchAttendance(); }, [studentId, month, year]);

  // 🔍 NEW: close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const fetchStudents = async () => {
    if (!className) return;
    try {
      const [cls, sec] = className.split('-');
      const res = await studentAPI.getAll({ className: cls, section: sec });
      const list = res.data?.data || res.data || [];
      setStudents(list);
      setStudentId(list.length > 0 ? list[0]._id : '');
      setSearchTerm(''); // 🔍 clear search when class changes
    } catch (err) {
      toast.error('Failed to load students');
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await attendanceAPI.getByStudent(studentId, { month, year });
      const raw = res.data?.data || res.data || [];
      const list = Array.isArray(raw) ? raw : raw.attendance || raw.records || [];

      const map = {};
      list.forEach((r) => {
        const d = new Date(r.date);
        if (d.getMonth() + 1 === month && d.getFullYear() === year) {
          map[d.getDate()] = r.status;
        }
      });
      setDaysMap(map);
    } catch (err) {
      toast.error('Failed to load attendance');
      setDaysMap({});
    } finally {
      setLoading(false);
    }
  };

  // 🔍 NEW: pick a student from search results
  const selectStudent = (student) => {
    setStudentId(student._id);
    setSearchTerm(`${student.rollNumber} — ${student.name}`);
    setShowDropdown(false);
  };

  // 🔍 NEW: filtered list based on search text (name OR roll number)
  const filteredStudents = students.filter((s) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      s.name?.toLowerCase().includes(term) ||
      String(s.rollNumber).toLowerCase().includes(term) ||
      String(s.studentId || '').toLowerCase().includes(term)
    );
  });

  const changeMonth = (dir) => {
    let m = month + dir, y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m); setYear(y);
  };

  // Summary
  let p = 0, a = 0, l = 0;
  Object.values(daysMap).forEach((s) => {
    if (s === 'present') p++;
    else if (s === 'absent') a++;
    else if (s === 'late') l++;
  });
  const marked = p + a + l;
  const pct = marked > 0 ? Math.round((p / marked) * 100) : 0;

  const selectedStudent = students.find((s) => s._id === studentId);

  /* -------- Build weeks -------- */
  const weeks = [];
  let currentWeek = new Array(7).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    currentWeek[dow] = d;
    if (dow === 6 || d === daysInMonth) {
      weeks.push(currentWeek);
      currentWeek = new Array(7).fill(null);
    }
  }

  const getBoxStyle = (status) => {
    const base = {
      width: '100%', aspectRatio: '1', borderRadius: '6px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', fontSize: '13px', fontWeight: 700,
      cursor: 'default', transition: 'transform 0.15s',
    };
    switch (status) {
      case 'present': return { ...base, backgroundColor: '#4CAF50', color: '#fff', border: '2px solid #4CAF50' };
      case 'absent':  return { ...base, backgroundColor: '#F44336', color: '#fff', border: '2px solid #F44336' };
      case 'late':    return { ...base, backgroundColor: '#FFC107', color: '#fff', border: '2px solid #FFC107' };
      default:        return { ...base, backgroundColor: '#fff', color: '#ccc', border: '2px solid #e0e0e0' };
    }
  };

  const statusLetter = (status) => {
    if (status === 'present') return '✓';
    if (status === 'absent') return '✗';
    if (status === 'late') return 'L';
    return '';
  };

  const styles = {
    container: { maxWidth: '720px', margin: '0 auto' },
    title: { fontSize: '22px', fontWeight: 700, color: '#1a1a2e', marginBottom: '20px' },
    controls: {
      display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center',
      marginBottom: '20px',
    },
    select: {
      padding: '10px 14px', borderRadius: '8px', border: '2px solid #e0e0e0',
      fontSize: '14px', backgroundColor: '#fff', cursor: 'pointer', minWidth: '120px',
    },
    // 🔍 NEW: search box styles
    searchWrap: { position: 'relative', minWidth: '240px', flex: '0 1 auto' },
    searchInput: {
      width: '100%', padding: '10px 14px 10px 38px', borderRadius: '8px',
      border: '2px solid #e0e0e0', fontSize: '14px', outline: 'none',
      boxSizing: 'border-box',
    },
    searchIcon: {
      position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
      fontSize: '15px', color: '#999', pointerEvents: 'none',
    },
    clearBtn: {
      position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
      border: 'none', background: '#e0e0e0', borderRadius: '50%', width: '20px',
      height: '20px', cursor: 'pointer', fontSize: '11px', color: '#666', lineHeight: 1,
    },
    dropdown: {
      position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
      backgroundColor: '#fff', borderRadius: '8px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)', border: '1px solid #eee',
      maxHeight: '260px', overflowY: 'auto', zIndex: 50,
    },
    dropdownItem: {
      padding: '10px 14px', cursor: 'pointer', fontSize: '14px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      borderBottom: '1px solid #f5f5f5',
    },
    dropdownEmpty: { padding: '14px', fontSize: '13px', color: '#999', textAlign: 'center' },
    navBtn: {
      padding: '10px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer',
      backgroundColor: '#4472C4', color: '#fff', fontWeight: 600,
    },
    monthLabel: { fontSize: '16px', fontWeight: 600, color: '#333', minWidth: '140px', textAlign: 'center' },
    summaryRow: {
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '12px', marginBottom: '20px',
    },
    summaryCard: (bg) => ({
      backgroundColor: bg, color: '#fff', borderRadius: '10px',
      padding: '14px', textAlign: 'center',
    }),
    summaryValue: { fontSize: '26px', fontWeight: 700 },
    summaryLabel: { fontSize: '11px', opacity: 0.9, marginTop: '2px', textTransform: 'uppercase' },
    weekCard: {
      backgroundColor: '#fff', borderRadius: '12px', padding: '16px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '14px',
    },
    weekHeader: {
      backgroundColor: '#4CAF50', color: '#fff', borderRadius: '8px',
      padding: '8px 14px', fontWeight: 700, fontSize: '14px',
      marginBottom: '12px', textAlign: 'center',
    },
    weekGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' },
    dayLabel: { textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#999', marginBottom: '6px' },
    emptyCell: { width: '100%', aspectRatio: '1' },
    legend: {
      display: 'flex', gap: '18px', marginTop: '8px', flexWrap: 'wrap',
      backgroundColor: '#fff', borderRadius: '12px', padding: '14px 16px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    },
    legendItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#555' },
    legendBox: (bg, border) => ({
      width: '16px', height: '16px', borderRadius: '4px',
      backgroundColor: bg, border: `2px solid ${border || bg}`,
    }),
    empty: { textAlign: 'center', padding: '50px', color: '#888' },
    studentInfo: { fontSize: '15px', color: '#555', marginBottom: '16px', fontWeight: 500 },
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🗓️ Student Attendance — Monthly View</h1>

      <div style={styles.controls}>
        {/* Class selector */}
        <select style={styles.select} value={className} onChange={(e) => setClassName(e.target.value)}>
          {classes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* 🔍 SEARCHABLE student picker */}
        <div style={styles.searchWrap} ref={searchRef}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            style={styles.searchInput}
            type="text"
            placeholder="Search by name or roll no..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
          />
          {searchTerm && (
            <button
              style={styles.clearBtn}
              onClick={() => { setSearchTerm(''); setShowDropdown(true); }}
              title="Clear"
            >
              ✕
            </button>
          )}

          {showDropdown && (
            <div style={styles.dropdown}>
              {filteredStudents.length === 0 ? (
                <div style={styles.dropdownEmpty}>No students match "{searchTerm}"</div>
              ) : (
                filteredStudents.map((s) => (
                  <div
                    key={s._id}
                    style={{
                      ...styles.dropdownItem,
                      backgroundColor: s._id === studentId ? '#f0f7ff' : '#fff',
                    }}
                    onClick={() => selectStudent(s)}
                    onMouseOver={(e) => { if (s._id !== studentId) e.currentTarget.style.backgroundColor = '#f9f9f9'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = s._id === studentId ? '#f0f7ff' : '#fff'; }}
                  >
                    <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{s.name}</span>
                    <span style={{ fontSize: '12px', color: '#999' }}>Roll: {s.rollNumber}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Month navigation */}
        <button style={styles.navBtn} onClick={() => changeMonth(-1)}>◀</button>
        <div style={styles.monthLabel}>{monthNames[month - 1]} {year}</div>
        <button style={styles.navBtn} onClick={() => changeMonth(1)}>▶</button>
      </div>

      {selectedStudent && (
        <>
          <div style={styles.studentInfo}>
            👨‍🎓 <strong>{selectedStudent.name}</strong> — Roll No: {selectedStudent.rollNumber} — Class: {className}
          </div>

          <div style={styles.summaryRow}>
            <div style={styles.summaryCard('#4CAF50')}>
              <div style={styles.summaryValue}>{p}</div>
              <div style={styles.summaryLabel}>Present</div>
            </div>
            <div style={styles.summaryCard('#F44336')}>
              <div style={styles.summaryValue}>{a}</div>
              <div style={styles.summaryLabel}>Absent</div>
            </div>
            <div style={styles.summaryCard('#9e9e9e')}>
              <div style={styles.summaryValue}>{daysInMonth - marked}</div>
              <div style={styles.summaryLabel}>Not Marked</div>
            </div>
            <div style={styles.summaryCard(pct >= 75 ? '#4472C4' : '#e74c3c')}>
              <div style={styles.summaryValue}>{pct}%</div>
              <div style={styles.summaryLabel}>Attendance</div>
            </div>
          </div>

          {loading ? (
            <div style={styles.empty}>Loading...</div>
          ) : (
            <>
              {weeks.map((week, wi) => (
                <div key={wi} style={styles.weekCard}>
                  <div style={styles.weekHeader}>{weekNames[wi] || `Week ${wi + 1}`}</div>
                  <div style={{ ...styles.weekGrid, marginBottom: '2px' }}>
                    {weekDayLabels.map((lbl, i) => (
                      <div key={i} style={{ ...styles.dayLabel, color: i === 0 ? '#F44336' : '#999' }}>
                        {lbl}
                      </div>
                    ))}
                  </div>
                  <div style={styles.weekGrid}>
                    {week.map((day, di) =>
                      day === null ? (
                        <div key={di} style={styles.emptyCell} />
                      ) : (
                        <div
                          key={di}
                          style={getBoxStyle(daysMap[day])}
                          title={`${day} ${monthNames[month - 1]} ${year} — ${daysMap[day] || 'Not marked'}`}
                        >
                          <div>{day}</div>
                          <div style={{ fontSize: '12px' }}>{statusLetter(daysMap[day])}</div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}

              <div style={styles.legend}>
                <div style={styles.legendItem}><div style={styles.legendBox('#4CAF50')}></div> Present ✓</div>
                <div style={styles.legendItem}><div style={styles.legendBox('#F44336')}></div> Absent ✗</div>
                <div style={styles.legendItem}><div style={styles.legendBox('#FFC107')}></div> Late</div>
                <div style={styles.legendItem}><div style={styles.legendBox('#fff', '#e0e0e0')}></div> Not Marked (blank)</div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default StudentMonthly;