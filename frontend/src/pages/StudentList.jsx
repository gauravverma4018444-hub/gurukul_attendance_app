import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../api/api';  // ← adjust to your actual relative path to api.js
import {
  fetchClasses,
  fetchStudents,
  deleteStudent,
  fetchStudentById,
  clearSelectedStudent
} from '../redux/studentSlice';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const StudentList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux Selectors
  const { students, classes, selectedStudent, loading } = useSelector((state) => state.students);

  // Local UI filters/modals state
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [search, setSearch] = useState('');

  // Single Student Visualization local states
  const [vizStudent, setVizStudent] = useState(null);
  const now = new Date();
  const [vizMonth, setVizMonth] = useState(now.getMonth() + 1);
  const [vizYear, setVizYear] = useState(now.getFullYear());
  const [vizDaysMap, setVizDaysMap] = useState({});
  const [vizLoading, setVizLoading] = useState(false);

  // ─── Class-Wise Multi-Student Visualization State ─────────
  const [isClassVizOpen, setIsClassVizOpen] = useState(false);
  const [classVizClass, setClassVizClass] = useState('');
  const [classVizSection, setClassVizSection] = useState('');
  const [classVizMonth, setClassVizMonth] = useState(now.getMonth() + 1);
  const [classVizYear, setClassVizYear] = useState(now.getFullYear());
  const [classVizLoading, setClassVizLoading] = useState(false);
  const [classVizRows, setClassVizRows] = useState([]);
  const [classSortBy, setClassSortBy] = useState('roll');

  // Prevent stale/old API calls from updating UI
  const classFetchSeq = useRef(0);

  // Responsive state
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    dispatch(fetchClasses());

    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dispatch]);

  // Sync main student list
  useEffect(() => {
    const params = {};
    if (selectedClass) params.className = selectedClass;
    if (selectedSection) params.section = selectedSection;
    if (search) params.search = search;

    dispatch(fetchStudents(params));
  }, [selectedClass, selectedSection, search, dispatch]);

  // Stable class/section arrays
  const uniqueClasses = useMemo(() => {
    return [...new Set(classes.map((c) => c.className).filter(Boolean))];
  }, [classes]);

  const uniqueSections = useMemo(() => {
    return [
      ...new Set(
        classes
          .filter((c) => !selectedClass || c.className === selectedClass)
          .map((c) => c.section)
          .filter(Boolean)
      ),
    ];
  }, [classes, selectedClass]);

  const classVizUniqueSections = useMemo(() => {
    return [
      ...new Set(
        classes
          .filter((c) => !classVizClass || c.className === classVizClass)
          .map((c) => c.section)
          .filter(Boolean)
      ),
    ];
  }, [classes, classVizClass]);

  // Lookup student details because old /monthly-grid may not return className/section
  const studentLookup = useMemo(() => {
    const map = new Map();
    students.forEach((s) => {
      map.set(String(s._id), s);
    });
    return map;
  }, [students]);

  // ─── 1. FETCH SINGLE STUDENT VISUALIZATION ───────────────
  useEffect(() => {
    if (!vizStudent) return;

    const fetchSingleStudentData = async () => {
      setVizLoading(true);
      try {
        const token = localStorage.getItem('token');

        const res = await api.get(`/attendance/student/${vizStudent._id}`, {
          params: { month: vizMonth, year: vizYear },
        });

        if (res.data?.success && res.data?.data?.records) {
          const map = {};
          res.data.data.records.forEach((rec) => {
            const day = new Date(rec.date).getDate();
            map[day] = rec.status;
          });
          setVizDaysMap(map);
        } else {
          setVizDaysMap({});
        }
      } catch (err) {
        setVizDaysMap({});
      } finally {
        setVizLoading(false);
      }
    };

    fetchSingleStudentData();
  }, [vizStudent, vizMonth, vizYear]);

  // ─── Controlled Class Visualization Loader ────────────────
  // IMPORTANT: This is called manually only, not from useEffect.
  const loadClassVisualization = async ({
    cName = classVizClass,
    sec = classVizSection,
    month = classVizMonth,
    year = classVizYear,
  } = {}) => {
    const requestId = ++classFetchSeq.current;

    setClassVizLoading(true);
    setClassVizRows([]);

    const token = localStorage.getItem('token');

    try {
      // Compatible with your current backend:
      // If no class selected, fetch each class separately.
      const classesToFetch = cName ? [cName] : uniqueClasses;

      if (!classesToFetch.length) {
        if (classFetchSeq.current === requestId) {
          setClassVizRows([]);
          setClassVizLoading(false);
        }
        return;
      }

      const allRows = [];

      await Promise.all(
        classesToFetch.map(async (cls) => {
          try {
            const res = await api.get('/attendance/monthly-grid', {
              params: {
                className: cls,
                section: sec || undefined,
                month,
                year,
              },
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (res.data?.success && Array.isArray(res.data.data)) {
              res.data.data.forEach((item) => {
                const rawId = item.studentId?._id || item.studentId;
                if (!rawId) return;

                const sid = String(rawId);
                const lookup = studentLookup.get(sid);

                allRows.push({
                  _id: sid,
                  name: item.name || lookup?.name || 'Unknown',
                  rollNumber: item.rollNumber || lookup?.rollNumber || '',
                  className: item.className || lookup?.className || cls,
                  section: item.section || lookup?.section || sec || '',
                  days: item.days || {},
                  summary: item.summary || {},
                });
              });
            }
          } catch (err) {
            console.warn(`Failed loading visualization for class ${cls}`, err);
          }
        })
      );

      if (classFetchSeq.current === requestId) {
        setClassVizRows(allRows);
      }
    } catch (err) {
      console.error('Class visualization load failed:', err);

      if (classFetchSeq.current === requestId) {
        setClassVizRows([]);
      }
    } finally {
      if (classFetchSeq.current === requestId) {
        setClassVizLoading(false);
      }
    }
  };

  const closeClassVisualization = () => {
    classFetchSeq.current += 1;
    setIsClassVizOpen(false);
    setClassVizLoading(false);
  };

  const handleClassVizClassChange = (value) => {
    setClassVizClass(value);
    setClassVizSection('');

    loadClassVisualization({
      cName: value,
      sec: '',
      month: classVizMonth,
      year: classVizYear,
    });
  };

  const handleClassVizSectionChange = (value) => {
    setClassVizSection(value);

    loadClassVisualization({
      cName: classVizClass,
      sec: value,
      month: classVizMonth,
      year: classVizYear,
    });
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from the list?`)) {
      try {
        await dispatch(deleteStudent(id)).unwrap();
        toast.success('Student removed successfully');
        dispatch(clearSelectedStudent());
      } catch (err) {
        toast.error(err || 'Failed to remove student');
      }
    }
  };

  const viewDetails = async (id) => {
    try {
      await dispatch(fetchStudentById(id)).unwrap();
    } catch (err) {
      toast.error(err || 'Failed to load student details');
    }
  };

  const openVisualization = (student) => {
    setVizMonth(now.getMonth() + 1);
    setVizYear(now.getFullYear());
    setVizStudent(student);
  };

  const closeVisualization = () => {
    setVizStudent(null);
    setVizDaysMap({});
  };

  const changeVizMonth = (dir) => {
    let m = vizMonth + dir;
    let y = vizYear;

    if (m < 1) {
      m = 12;
      y -= 1;
    }

    if (m > 12) {
      m = 1;
      y += 1;
    }

    setVizMonth(m);
    setVizYear(y);
  };

  const changeClassVizMonth = (dir) => {
    let m = classVizMonth + dir;
    let y = classVizYear;

    if (m < 1) {
      m = 12;
      y -= 1;
    }

    if (m > 12) {
      m = 1;
      y += 1;
    }

    setClassVizMonth(m);
    setClassVizYear(y);

    loadClassVisualization({
      cName: classVizClass,
      sec: classVizSection,
      month: m,
      year: y,
    });
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  // Calendar day builder
  const getCalendarDays = (m, y) => {
    const firstDay = new Date(y, m - 1, 1).getDay();
    const daysInMonth = new Date(y, m, 0).getDate();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({ type: 'empty', id: `empty-${i}` });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(y, m - 1, d);
      days.push({
        type: 'date',
        date: d,
        isSunday: dateObj.getDay() === 0
      });
    }

    return days;
  };

  const calendarDaysSingle = getCalendarDays(vizMonth, vizYear);
  const calendarDaysClass = getCalendarDays(classVizMonth, classVizYear);

  const getCellStyle = (status) => {
    switch (status) {
      case 'present':
        return {
          backgroundColor: '#22c55e',
          color: '#ffffff',
          fontWeight: '700',
          boxShadow: '0 4px 10px rgba(34, 197, 94, 0.3)',
          border: 'none'
        };
      case 'absent':
        return {
          backgroundColor: '#ef4444',
          color: '#ffffff',
          fontWeight: '700',
          border: 'none'
        };
      case 'late':
        return {
          backgroundColor: '#eab308',
          color: '#ffffff',
          fontWeight: '700',
          border: 'none'
        };
      default:
        return {
          backgroundColor: 'transparent',
          color: '#64748b',
          fontWeight: '500',
          border: '1px solid #e2e8f0'
        };
    }
  };

  // Compute stats helper
  const computeStudentStats = (studentId, daysMap, m, y) => {
    const map = daysMap || {};
    let present = 0;
    let absent = 0;

    const daysCount = new Date(y, m, 0).getDate();

    for (let d = 1; d <= daysCount; d++) {
      const status = map[d] || map[String(d)];

      if (status === 'present' || status === 'late') present++;
      if (status === 'absent') absent++;
    }

    const pct = present + absent > 0
      ? Math.round((present / (present + absent)) * 100)
      : 0;

    const color = pct >= 75 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444';

    return { present, absent, pct, color, map };
  };

  // Single student summary stats
  const singleStats = computeStudentStats(vizStudent?._id, vizDaysMap, vizMonth, vizYear);

  // Filtered & Sorted class visualization rows
  const classStudents = useMemo(() => {
    const rows = [...classVizRows];

    return rows.sort((a, b) => {
      if (classSortBy === 'roll') {
        return (parseInt(a.rollNumber) || 0) - (parseInt(b.rollNumber) || 0);
      }

      const statA = computeStudentStats(a._id, a.days, classVizMonth, classVizYear);
      const statB = computeStudentStats(b._id, b.days, classVizMonth, classVizYear);

      if (classSortBy === 'lowest') return statA.pct - statB.pct;
      if (classSortBy === 'highest') return statB.pct - statA.pct;

      return 0;
    });
  }, [classVizRows, classSortBy, classVizMonth, classVizYear]);

  // Calculate Overall Class Average
  const classAvgPct = classStudents.length > 0
    ? Math.round(
        classStudents.reduce(
          (acc, s) => acc + computeStudentStats(s._id, s.days, classVizMonth, classVizYear).pct,
          0
        ) / classStudents.length
      )
    : 0;

  const isMobile = windowWidth < 900;

  const styles = {
    container: { maxWidth: '1200px', margin: '0 auto' },
    header: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: '12px',
      marginBottom: '24px'
    },
    title: { fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: '#18181a', margin: 0 },
    headerBtnGroup: {
      display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto', flexWrap: 'wrap'
    },
    classVizBtn: {
      padding: '10px 18px', backgroundColor: '#7c3aed', color: '#fff', border: 'none',
      borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
      display: 'flex', alignItems: 'center', gap: '6px',
      boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
      flex: isMobile ? '1' : 'none', justifyContent: 'center'
    },
    addBtn: {
      padding: '10px 20px', backgroundColor: '#4472C4', color: '#fff', border: 'none',
      borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
      flex: isMobile ? '1' : 'none'
    },
    filters: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: '12px',
      marginBottom: '20px',
      alignItems: isMobile ? 'stretch' : 'center'
    },
    filterSelect: {
      padding: '10px 14px', border: '2px solid #e0e0e0', borderRadius: '8px',
      fontSize: '14px', outline: 'none', width: isMobile ? '100%' : '140px',
    },
    searchInput: {
      padding: '10px 14px', border: '2px solid #e0e0e0', borderRadius: '8px',
      fontSize: '14px', outline: 'none', width: isMobile ? '100%' : 'auto', flex: isMobile ? 'none' : 1,
    },
    count: { fontSize: '14px', color: '#1e1c1c', marginBottom: '12px' },
    tableWrap: {
      width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch',
      backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
    },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: '650px' },
    th: {
      padding: '14px 16px', textAlign: 'left', backgroundColor: '#1a1a2e', color: '#fff',
      fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
    },
    td: { padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontSize: '14px', color: '#333' },
    actionsCell: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
    actionBtn: (color) => ({
      padding: isMobile ? '6px 10px' : '6px 12px',
      backgroundColor: color, color: '#fff', border: 'none',
      borderRadius: '6px', cursor: 'pointer',
      fontSize: isMobile ? '11px' : '12px', fontWeight: 500,
    }),
    modal: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: isMobile ? '16px' : '0'
    },
    modalContent: {
      backgroundColor: '#fff', borderRadius: '14px', padding: isMobile ? '20px' : '32px',
      maxWidth: '600px', width: '100%', maxHeight: '85vh', overflowY: 'auto',
    },
    detailRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' },
    detailLabel: { fontWeight: 600, color: '#555', fontSize: '13px' },
    detailValue: { color: '#1a1a2e', fontSize: '14px', textAlign: 'right' },

    vizModalContent: {
      backgroundColor: '#f8fafc', borderRadius: '16px',
      padding: isMobile ? '20px 16px' : '32px',
      maxWidth: '900px', width: '100%', overflowX: 'hidden', overflowY: 'auto', maxHeight: '90vh',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
      position: 'relative'
    },
    classVizModalContent: {
      backgroundColor: '#f8fafc', borderRadius: '20px',
      padding: isMobile ? '55px 12px' : '58px 32px',
      maxWidth: '1000px', width: '100%', overflowX: 'hidden', overflowY: 'auto', maxHeight: '88vh',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      position: 'relative'
    },
    vizControls: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'stretch' : 'center',
      gap: '16px',
      marginBottom: '16px'
    },
    navBtn: {
      padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#fff',
      border: '1.5px solid #e2e8f0', color: '#0f172a', fontWeight: 600, fontSize: '13px',
    },
    vizCard: {
      backgroundColor: '#ffffff', borderRadius: '20px',
      padding: isMobile ? '16px' : '20px 24px',
      border: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center',
      justifyContent: 'space-between', gap: '20px',
      marginBottom: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
    },
    avatarBlock: {
      display: 'flex', alignItems: 'center', gap: '14px',
      width: isMobile ? '100%' : '220px',
      justifyContent: isMobile ? 'center' : 'flex-start'
    },
    initialsCircle: {
      width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#f1f5f9',
      border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '17px', fontWeight: '700', color: '#475569', flexShrink: 0
    },
    studentName: { fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: '0 0 4px 0', textTransform: 'capitalize' },
    studentRoll: { fontSize: '12.5px', fontWeight: '500', color: '#64748b', margin: 0 },
    calendarWrap: {
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%'
    },
    calendarGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: isMobile ? '3px' : '6px',
      width: '100%',
      maxWidth: '360px'
    },
    dayHeaderCell: {
      textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#94a3b8', paddingBottom: '4px'
    },
    calCell: (status, isSunday) => {
      const baseStyle = getCellStyle(status);
      if (!status && isSunday) {
        baseStyle.backgroundColor = '#fef2f2';
        baseStyle.color = '#ef4444';
        baseStyle.border = '1px solid #fecaca';
      }
      return {
        width: '100%', aspectRatio: '1/1',
        minHeight: isMobile ? '30px' : '36px',
        borderRadius: '7px', fontSize: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto', ...baseStyle,
      };
    },
    emptyCell: {
      width: '100%', aspectRatio: '1/1', minHeight: isMobile ? '30px' : '36px', backgroundColor: 'transparent'
    },
    performanceBox: {
      display: 'flex',
      flexDirection: isMobile ? 'row' : 'column',
      alignItems: 'center', backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0', borderRadius: '14px',
      padding: isMobile ? '12px' : '16px 14px',
      gap: '12px',
      minWidth: isMobile ? '100%' : '130px',
      justifyContent: 'space-around',
    },
    segment: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' },
    segmentIcon: (color) => ({ fontSize: '15px', color: color, marginBottom: '2px' }),
    segmentValue: (color) => ({ fontSize: '16px', fontWeight: '800', color: color }),
    segmentLabel: { fontSize: '10.5px', fontWeight: '600', color: '#64748b', whiteSpace: 'nowrap' },
    percentageRing: (color) => ({
      width: '48px', height: '48px', borderRadius: '50%', border: `4px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px',
      fontWeight: '800', color: '#1e293b', backgroundColor: '#ffffff',
    }),
    classSummaryBanner: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '14px',
      padding: '14px 20px',
      marginBottom: '20px',
    },
  };

  return (
    <div style={styles.container}>
      {/* ─── Upper Header Area ─── */}
      <div style={styles.header}>
        <h1 style={styles.title}>👨‍🎓 Student List</h1>

        <div style={styles.headerBtnGroup}>
          <button
            style={styles.classVizBtn}
            onClick={() => {
              const initialClass = selectedClass || (uniqueClasses[0] || '');
              const initialSection = selectedSection || '';
              const initialMonth = now.getMonth() + 1;
              const initialYear = now.getFullYear();

              setClassVizClass(initialClass);
              setClassVizSection(initialSection);
              setClassVizMonth(initialMonth);
              setClassVizYear(initialYear);
              setIsClassVizOpen(true);

              loadClassVisualization({
                cName: initialClass,
                sec: initialSection,
                month: initialMonth,
                year: initialYear,
              });
            }}
          >
            📊 Class Visualizations
          </button>

          <button style={styles.addBtn} onClick={() => navigate('/students/register')}>
            ➕ Add Student
          </button>
        </div>
      </div>

      <div style={styles.filters}>
        <select
          value={selectedClass}
          onChange={(e) => {
            setSelectedClass(e.target.value);
            setSelectedSection('');
          }}
          style={styles.filterSelect}
        >
          <option value="">All Classes</option>
          {uniqueClasses.map((c) => <option key={c} value={c}>Class {c}</option>)}
        </select>

        <select
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Sections</option>
          {uniqueSections.map((s) => <option key={s} value={s}>Section {s}</option>)}
        </select>

        <input
          type="text"
          placeholder="🔍 Search by name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.count}>Showing <strong>{students.length}</strong> students</div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Loading students...
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Roll</th>
                <th style={styles.th}>Student ID</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Class</th>
                <th style={styles.th}>Gender</th>
                <th style={styles.th}>Phone No.</th>
                <th style={styles.th}>Parent No.</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {students.map((student, index) => (
                <tr
                  key={student._id}
                  style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa' }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f0f5ff')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff' : '#fafafa')}
                >
                  <td style={styles.td}>{student.rollNumber}</td>
                  <td style={styles.td}>{student.studentId}</td>
                  <td style={{ ...styles.td, fontWeight: 500 }}>{student.name}</td>
                  <td style={styles.td}>{student.className}-{student.section}</td>
                  <td style={styles.td}>{student.gender}</td>
                  <td style={styles.td}>{student.phone || '-'}</td>
                  <td style={styles.td}>{student.parentPhone || '-'}</td>

                  <td style={styles.td}>
                    <div style={styles.actionsCell}>
                      <button style={styles.actionBtn('#4472C4')} onClick={() => viewDetails(student._id)}>View</button>
                      <button style={styles.actionBtn('#8b5cf6')} onClick={() => openVisualization(student)}>Visualize</button>
                      <button style={styles.actionBtn('#f39c12')} onClick={() => navigate(`/students/edit/${student._id}`)}>Edit</button>
                      <button style={styles.actionBtn('#e74c3c')} onClick={() => handleDelete(student._id, student.name)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Selected Student Detail Modal */}
      {selectedStudent && (
        <div style={styles.modal} onClick={() => dispatch(clearSelectedStudent())}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a2e' }}>
                Student Details
              </h2>

              <button
                onClick={() => dispatch(clearSelectedStudent())}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999' }}
              >
                ✕
              </button>
            </div>

            {[
              ['Student ID', selectedStudent.student.studentId],
              ['Name', selectedStudent.student.name],
              ['Class', `${selectedStudent.student.className}-${selectedStudent.student.section}`],
              ['Roll Number', selectedStudent.student.rollNumber],
              ['Gender', selectedStudent.student.gender]
            ].map(([label, value]) => (
              <div key={label} style={styles.detailRow}>
                <span style={styles.detailLabel}>{label}</span>
                <span style={styles.detailValue}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 📊 SINGLE STUDENT VISUALIZATION POPUP */}
      {vizStudent && (
        <div style={styles.modal} onClick={closeVisualization}>
          <div style={styles.vizModalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.vizControls}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? '18px' : '20px', fontWeight: '800', color: '#0f172a' }}>
                  📊 Monthly Attendance
                </h2>

                {isMobile && (
                  <button
                    onClick={closeVisualization}
                    style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '14px', cursor: 'pointer', color: '#64748b', fontWeight: 'bold' }}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-start', gap: '16px' }}>
                <button style={styles.navBtn} onClick={() => changeVizMonth(-1)}>◀ Prev</button>

                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', minWidth: isMobile ? '100px' : '130px', textAlign: 'center' }}>
                  {monthNames[vizMonth - 1]} {vizYear}
                </div>

                <button style={styles.navBtn} onClick={() => changeVizMonth(1)}>Next ▶</button>

                {!isMobile && (
                  <button
                    onClick={closeVisualization}
                    style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '14px', cursor: 'pointer', color: '#64748b', marginLeft: '12px', fontWeight: 'bold' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div style={styles.vizCard}>
              <div style={styles.avatarBlock}>
                <div style={styles.initialsCircle}>{getInitials(vizStudent.name)}</div>
                <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
                  <h3 style={styles.studentName}>{vizStudent.name}</h3>
                  <p style={styles.studentRoll}>Roll No: {vizStudent.rollNumber}</p>
                </div>
              </div>

              <div style={styles.calendarWrap}>
                <div style={styles.calendarGrid}>
                  {daysOfWeek.map((day, idx) => (
                    <div key={day} style={{ ...styles.dayHeaderCell, color: idx === 0 ? '#ef4444' : '#94a3b8' }}>
                      {day}
                    </div>
                  ))}

                  {vizLoading ? (
                    <div style={{ gridColumn: 'span 7', textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '20px' }}>
                      Loading calendar...
                    </div>
                  ) : (
                    calendarDaysSingle.map((item) => {
                      if (item.type === 'empty') {
                        return <div key={item.id} style={styles.emptyCell}></div>;
                      }

                      const status = vizDaysMap[item.date];

                      return (
                        <div
                          key={`date-${item.date}`}
                          style={styles.calCell(status, item.isSunday)}
                          title={`${item.date} ${monthNames[vizMonth - 1]}: ${status || (item.isSunday ? 'Holiday' : 'Unmarked')}`}
                        >
                          {item.date}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div style={styles.performanceBox}>
                <div style={styles.segment}>
                  <span style={styles.segmentIcon('#10b981')}>👤✓</span>
                  <span style={styles.segmentValue('#10b981')}>{singleStats.present}</span>
                  <span style={styles.segmentLabel}>Present</span>
                </div>

                <div style={styles.segment}>
                  <span style={styles.segmentIcon('#ef4444')}>👤✗</span>
                  <span style={styles.segmentValue('#ef4444')}>{singleStats.absent}</span>
                  <span style={styles.segmentLabel}>Absent</span>
                </div>

                <div style={styles.percentageRing(singleStats.color)}>
                  {singleStats.pct}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 📊 CLASS-WISE COMPARISON VISUALIZATION MODAL ─── */}
      {isClassVizOpen && (
        <div style={styles.modal} onClick={closeClassVisualization}>
          <div style={styles.classVizModalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.vizControls}>
              <div>
                <h2 style={{ margin: 0, fontSize: isMobile ? '18px' : '22px', fontWeight: '800', color: '#0f172a' }}>
                  📊 Class Visualizations
                </h2>

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <select
                    value={classVizClass}
                    onChange={(e) => handleClassVizClassChange(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600, outline: 'none' }}
                  >
                    <option value="">All Classes</option>
                    {uniqueClasses.map((c) => <option key={c} value={c}>Class {c}</option>)}
                  </select>

                  <select
                    value={classVizSection}
                    onChange={(e) => handleClassVizSectionChange(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600, outline: 'none' }}
                  >
                    <option value="">All Sections</option>
                    {classVizUniqueSections.map((s) => <option key={s} value={s}>Section {s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
                <button style={styles.navBtn} onClick={() => changeClassVizMonth(-1)}>◀ Prev</button>

                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', minWidth: '130px', textAlign: 'center' }}>
                  {monthNames[classVizMonth - 1]} {classVizYear}
                </div>

                <button style={styles.navBtn} onClick={() => changeClassVizMonth(1)}>Next ▶</button>

                <button
                  onClick={closeClassVisualization}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', fontSize: '15px', cursor: 'pointer', color: '#64748b', fontWeight: 'bold' }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={styles.classSummaryBanner}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Class Average: </span>
                  <strong style={{ fontSize: '16px', color: classAvgPct >= 75 ? '#16a34a' : classAvgPct >= 50 ? '#ca8a04' : '#dc2626' }}>
                    {classAvgPct}%
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Showing: </span>
                  <strong style={{ fontSize: '15px', color: '#1e293b' }}>{classStudents.length} Students</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Sort by:</span>

                <select
                  value={classSortBy}
                  onChange={(e) => setClassSortBy(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none', fontWeight: 600, color: '#334155' }}
                >
                  <option value="roll">Roll Number</option>
                  <option value="lowest">Lowest Attendance (At-Risk)</option>
                  <option value="highest">Highest Attendance</option>
                </select>
              </div>
            </div>

            {classVizLoading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', fontSize: '15px', fontWeight: 600 }}>
                Loading class visualizations...
              </div>
            ) : classStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                No students found for this class filter.
              </div>
            ) : (
              classStudents.map((student) => {
                const { present, absent, pct, color, map } = computeStudentStats(
                  student._id,
                  student.days,
                  classVizMonth,
                  classVizYear
                );

                return (
                  <div key={student._id} style={styles.vizCard}>
                    <div style={styles.avatarBlock}>
                      <div style={styles.initialsCircle}>{getInitials(student.name)}</div>

                      <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
                        <h3 style={styles.studentName}>{student.name}</h3>
                        <p style={styles.studentRoll}>
                          Roll No: {student.rollNumber} | Class: {student.className}-{student.section}
                        </p>
                      </div>
                    </div>

                    <div style={styles.calendarWrap}>
                      <div style={styles.calendarGrid}>
                        {daysOfWeek.map((day, idx) => (
                          <div key={day} style={{ ...styles.dayHeaderCell, color: idx === 0 ? '#ef4444' : '#94a3b8' }}>
                            {day}
                          </div>
                        ))}

                        {calendarDaysClass.map((item) => {
                          if (item.type === 'empty') {
                            return <div key={item.id} style={styles.emptyCell}></div>;
                          }

                          const status = map[item.date] || map[String(item.date)];

                          return (
                            <div
                              key={`cls-date-${student._id}-${item.date}`}
                              style={styles.calCell(status, item.isSunday)}
                              title={`${item.date} ${monthNames[classVizMonth - 1]}: ${status || (item.isSunday ? 'Holiday' : 'Unmarked')}`}
                            >
                              {item.date}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={styles.performanceBox}>
                      <div style={styles.segment}>
                        <span style={styles.segmentIcon('#10b981')}>👤✓</span>
                        <span style={styles.segmentValue('#10b981')}>{present}</span>
                        <span style={styles.segmentLabel}>Present</span>
                      </div>

                      <div style={styles.segment}>
                        <span style={styles.segmentIcon('#ef4444')}>👤✗</span>
                        <span style={styles.segmentValue('#ef4444')}>{absent}</span>
                        <span style={styles.segmentLabel}>Absent</span>
                      </div>

                      <div style={styles.percentageRing(color)}>
                        {pct}%
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentList;