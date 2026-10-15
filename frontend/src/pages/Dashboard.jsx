import React, { useState, useEffect, useCallback } from 'react';import { reportAPI, attendanceAPI } from '../api/api';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';     // ← ADD useLocation
import { useAutoRefresh } from '../utils/refresh';                // ← ADD THIS

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showUnmarked, setShowUnmarked] = useState(false);
  const [unmarkedClasses, setUnmarkedClasses] = useState([]);
  const [unmarkedLoading, setUnmarkedLoading] = useState(false);

  const [absentees, setAbsentees] = useState([]);
  const [absenteesLoading, setAbsenteesLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 5;

  const [markedStudents, setMarkedStudents] = useState(new Set());

  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [showTrendModal, setShowTrendModal] = useState(false);

  const [hoveredDay, setHoveredDay] = useState(null);

  const realToday = new Date();
  const [navMonth, setNavMonth] = useState(realToday.getMonth());
  const [navYear, setNavYear] = useState(realToday.getFullYear());

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const navigate = useNavigate();

  const location = useLocation();

// Wrap data loading in useCallback so we can reuse it
const loadAllData = useCallback(
  (isBackground = false) => {
    fetchDashboard(isBackground);
    fetchTodayAbsentees(isBackground);
    fetchTrendData(isBackground);
  },
  []
);

// Initial load + background polling every 30s
useEffect(() => {
  loadAllData(false);

  const intervalId = setInterval(() => {
    loadAllData(true);
  }, 30000);

  const handleResize = () => setWindowWidth(window.innerWidth);
  window.addEventListener('resize', handleResize);

  return () => {
    window.removeEventListener('resize', handleResize);
    clearInterval(intervalId);
  };
}, [loadAllData]);

// 🔥 Auto-refresh when user navigates back to Dashboard
useEffect(() => {
  loadAllData(true);
}, [location.key, loadAllData]);

// 🔥 Auto-refresh when any data mutation happens elsewhere
useAutoRefresh(
  () => loadAllData(true),
  ['students', 'attendance', 'payments']
);

  const fetchDashboard = async (isBackground) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await reportAPI.getDashboard();
      setStats(res.data.data);
    } catch (err) {
      if (!isBackground) toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAbsentees = async (isBackground) => {
    if (!isBackground) setAbsenteesLoading(true);
    try {
      const res = await attendanceAPI.getTodayAbsentees();
      setAbsentees(res.data.data || []);
    } catch (err) {
      setAbsentees([]);
    } finally {
      setAbsenteesLoading(false);
    }
  };

  const fetchTrendData = async (isBackground) => {
    if (!isBackground) setTrendLoading(true);
    try {
      const res = await attendanceAPI.getAbsentTrend({
        month: realToday.getMonth() + 1,
        year: realToday.getFullYear(),
      });
      setTrendData(res.data.data || []);
    } catch (err) {
      console.error('Failed to load absentee trends', err);
      setTrendData([]);
    } finally {
      setTrendLoading(false);
    }
  };

  const openUnmarkedModal = async () => {
    setShowUnmarked(true);
    setUnmarkedLoading(true);
    try {
      const res = await attendanceAPI.getUnmarkedToday();
      setUnmarkedClasses(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load unmarked classes');
      setUnmarkedClasses([]);
    } finally {
      setUnmarkedLoading(false);
    }
  };

  const toggleMarkStudent = (id) => {
    setMarkedStudents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const isMobile = windowWidth < 900;

  const pct = stats?.today?.attendancePercentage || 0;
  const classesMarked = stats?.today?.classesMarked || 0;
  const classesRemaining = stats?.today?.classesRemaining || 0;
  const totalClassesToday = classesMarked + classesRemaining || 1;
  const markedPct = Math.round((classesMarked / totalClassesToday) * 100);

  const filtered = absentees.filter((s) => {
    const t = search.toLowerCase().trim();
    if (!t) return true;
    const cls = s.className || `${s.class || ''}${s.section ? '-' + s.section : ''}`;
    const phone = s.parentPhone || s.parent_phone || s.phone || s.mobile || '';
    return (
      (s.name || '').toLowerCase().includes(t) ||
      String(s.rollNumber || '').includes(t) ||
      cls.toLowerCase().includes(t) ||
      String(phone).toLowerCase().includes(t)
    );
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const todayDay = realToday.getDate();
  const monthDaysData = trendData.filter((item) => item.day <= todayDay);

  const getMonthName = () => realToday.toLocaleDateString('en-US', { month: 'short' });

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  };

  const daysInMonth = new Date(navYear, navMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(navYear, navMonth, 1).getDay();

  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const handlePrevMonth = () => {
    if (navMonth === 0) {
      setNavMonth(11);
      setNavYear((prev) => prev - 1);
    } else {
      setNavMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (navMonth === 11) {
      setNavMonth(0);
      setNavYear((prev) => prev + 1);
    } else {
      setNavMonth((prev) => prev + 1);
    }
  };

  const baseTotalStudents = stats?.totalStudents || 120;
  const chartYMax = Math.ceil((baseTotalStudents * 1.25) / 30) * 30;
  const yTicks = [chartYMax, chartYMax * 0.8, chartYMax * 0.6, chartYMax * 0.4, chartYMax * 0.2, 0];

  const GRAPH_HEIGHT = 220;
  const COLUMN_WIDTH = 85;
  const PADDING_TOP = 40;
  const SVG_WIDTH = Math.max(700, monthDaysData.length * COLUMN_WIDTH + 40);

  const points = monthDaysData.map((t, i) => {
    const hasRecord = t.totalMarked > 0 || t.present > 0 || t.absent > 0;
    const isUnmarked = !hasRecord;

    const absentCount = isUnmarked ? 0 : t.absent || 0;
    const presentCount = isUnmarked
      ? 0
      : t.present !== undefined
      ? t.present
      : Math.max(0, baseTotalStudents - absentCount);

    const x = i * COLUMN_WIDTH + COLUMN_WIDTH / 2 + 20;
    const yPresent = GRAPH_HEIGHT - (presentCount / chartYMax) * GRAPH_HEIGHT + PADDING_TOP;
    const yAbsent = GRAPH_HEIGHT - (absentCount / chartYMax) * GRAPH_HEIGHT + PADDING_TOP;

    const presentPct = isUnmarked ? 0 : Math.round((presentCount / baseTotalStudents) * 100);
    const absentPct = isUnmarked ? 0 : Math.round((absentCount / baseTotalStudents) * 100);

    return { ...t, x, yPresent, yAbsent, presentCount, absentCount, presentPct, absentPct, isUnmarked };
  });

  let presentPath = '';
  let absentPath = '';
  let presentArea = '';

  const markedPoints = points.filter((p) => !p.isUnmarked);

  if (markedPoints.length > 0) {
    markedPoints.forEach((p, i) => {
      if (i === 0) {
        presentPath += `M ${p.x},${p.yPresent}`;
        absentPath += `M ${p.x},${p.yAbsent}`;
        presentArea += `M ${p.x},${GRAPH_HEIGHT + PADDING_TOP} L ${p.x},${p.yPresent}`;
      } else {
        const prev = markedPoints[i - 1];
        const cpX = prev.x + (p.x - prev.x) / 2;
        presentPath += ` C ${cpX},${prev.yPresent} ${cpX},${p.yPresent} ${p.x},${p.yPresent}`;
        absentPath += ` C ${cpX},${prev.yAbsent} ${cpX},${p.yAbsent} ${p.x},${p.yAbsent}`;
        presentArea += ` C ${cpX},${prev.yPresent} ${cpX},${p.yPresent} ${p.x},${p.yPresent}`;
      }
    });
    presentArea += ` L ${markedPoints[markedPoints.length - 1].x},${GRAPH_HEIGHT + PADDING_TOP} Z`;
  }

  /* ---------- Styles — dark-backdrop friendly ---------- */
  const styles = {
    // KEY FIX: transparent so global canvas shows through
    page: {
      fontFamily: "'Inter', system-ui, sans-serif",
      color: '#1e293b',
      paddingBottom: '40px',
      backgroundColor: 'transparent',
      minHeight: '100vh',
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
      color: '#151617', // light text on dark bg
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
    },

    row1: {
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
      gap: isMobile ? '10px' : '16px',
      marginBottom: '20px',
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
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
    statLabel: { fontSize: '14px', color: '#475569', fontWeight: 600, marginBottom: '6px' },
    statValue: { fontSize: '24px', fontWeight: 800, color: '#0f172a', lineHeight: 1 },
    statSub: { fontSize: '11px', color: '#94a3b8', marginLeft: '6px', fontWeight: 500 },
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

    row2: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
      gap: isMobile ? '12px' : '16px',
      marginBottom: '24px',
    },
    kpiCard: (borderColor, shadowColor) => ({
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(12px)',
      borderRadius: '20px',
      padding: '24px',
      color: '#1e293b',
      boxShadow: `0 12px 40px rgba(0,0,0,0.28), 0 0 0 1px ${borderColor}40`,
      border: `2px solid ${borderColor}50`,
      display: 'flex',
      justifyContent: 'space-between',
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s',
      position: 'relative',
      overflow: 'hidden',
      minHeight: '130px',
    }),
    kpiLabel: { fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' },
    kpiValue: { fontSize: '36px', fontWeight: 800, margin: '0 0 6px 0', lineHeight: 1 },
    kpiSub: { fontSize: '12px', color: '#64748b', fontWeight: 500 },
    kpiIconBox: {
      width: '50px',
      height: '50px',
      borderRadius: '14px',
      background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      flexShrink: 0,
      color: '#475569',
    },
    progressTrack: {
      height: '8px',
      borderRadius: '4px',
      backgroundColor: '#fef08a',
      marginTop: '16px',
      overflow: 'hidden',
    },
    progressFill: (w) => ({
      height: '100%',
      width: `${w}%`,
      backgroundColor: '#ca8a04',
      borderRadius: '4px',
      transition: 'width 0.5s ease',
    }),

    pillRow: { display: 'flex', gap: '12px', marginBottom: '30px', flexWrap: 'wrap' },
    pill: (active) => ({
      padding: '10px 24px',
      borderRadius: '24px',
      fontSize: '13px',
      fontWeight: 700,
      cursor: 'pointer',
      border: active ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.08)',
      backgroundColor: active ? 'rgba(24, 23, 23, 0.2)' : 'rgba(24, 23, 23, 0.2)',
      backdropFilter: 'blur(8px)',
      boxShadow: active ? '0 4px 16px rgba(0,0,0,0.2)' : 'none',
      color: active ? '#252627' : '#222325',
      transition: 'all 0.2s',
    }),

    bottomGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1.8fr 1fr',
      gap: '24px',
      alignItems: 'stretch',
    },

    panel: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(16px)',
      borderRadius: '24px',
      padding: isMobile ? '20px' : '28px',
      boxShadow: '0 12px 48px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.5)',
      display: 'flex',
      flexDirection: 'column',
      height: isMobile ? 'auto' : '480px',
      minHeight: isMobile ? '360px' : '480px',
      overflow: 'hidden',
    },
    panelHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
      flexWrap: 'wrap',
      gap: '12px',
      flexShrink: 0,
    },
    panelTitleWrap: { display: 'flex', alignItems: 'center', gap: '10px' },
    panelTitleDot: { width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#3b82f6' },
    panelTitle: { fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 },

    searchBox: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      borderRadius: '24px',
      padding: '8px 16px',
      backgroundColor: '#f1f5f9',
      width: isMobile ? '100%' : '240px',
    },
    searchInput: {
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontSize: '13px',
      width: '100%',
      color: '#334155',
    },
    pageBtn: (disabled) => ({
      width: '36px',
      height: '36px',
      borderRadius: '12px',
      border: 'none',
      backgroundColor: '#f1f5f9',
      cursor: disabled ? 'not-allowed' : 'pointer',
      color: disabled ? '#cbd5e1' : '#64748b',
      fontSize: '16px',
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }),

    tableWrap: {
      flex: 1,
      overflowY: 'auto',
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      width: '100%',
      minHeight: 0,
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      minWidth: '450px',
    },
    th: {
      textAlign: 'left',
      fontSize: '11px',
      fontWeight: 800,
      color: '#1e293b',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      padding: '0 12px 16px',
      borderBottom: '1.5px solid #f1f5f9',
      whiteSpace: 'nowrap',
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid #f8fafc',
      verticalAlign: 'middle',
    },
    avatar: {
      width: '46px',
      height: '46px',
      borderRadius: '12px',
      backgroundColor: '#f1f5f9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      fontWeight: 800,
      color: '#475569',
      flexShrink: 0,
      overflow: 'hidden',
    },
    studentName: { fontWeight: 700, color: '#0f172a', fontSize: '14px' },
    studentSub: { fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: 500 },
    phoneText: { fontSize: '13px', color: '#475569', fontWeight: 500, textDecoration: 'none' },
    emptyCell: {
      textAlign: 'center',
      padding: '60px 40px',
      color: '#64748b',
      fontSize: '14px',
      fontWeight: 600,
    },
    markerBtn: (isMarked) => ({
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      border: isMarked ? 'none' : '2px solid #cbd5e1',
      backgroundColor: isMarked ? '#22c55e' : 'transparent',
      color: '#fff',
      fontSize: '14px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
      margin: '0 auto',
    }),

    calHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      flexShrink: 0,
    },
    calMonthText: { fontSize: '18px', fontWeight: 800, color: '#0f172a' },
    calNavBtn: {
      border: 'none',
      background: '#f1f5f9',
      borderRadius: '10px',
      width: '36px',
      height: '36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: '#475569',
      fontWeight: 'bold',
      transition: '0.2s',
    },
    calGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '8px',
      textAlign: 'center',
      flex: 1,
      alignContent: 'start',
    },
    calDayLabel: { fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '12px' },
    calDayCellWrap: (isToday, isNull) => ({
      aspectRatio: '1/1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      background: isToday
        ? 'linear-gradient(to right, #ff7e5f, #feb47b, #86a8e7, #91eae4)'
        : 'transparent',
      padding: isToday ? '3px' : '0',
      opacity: isNull ? 0 : 1,
      pointerEvents: isNull ? 'none' : 'auto',
    }),
    calDayCellInner: (isToday) => ({
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      backgroundColor: '#fff',
      fontSize: '14px',
      fontWeight: isToday ? 800 : 600,
      color: '#334155',
    }),

    overlay: {
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15,23,42,0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      backdropFilter: 'blur(6px)',
    },
    modal: {
      backgroundColor: '#fff',
      borderRadius: '20px',
      width: '100%',
      maxWidth: '480px',
      maxHeight: '85vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
      overflow: 'hidden',
    },
    modalHeader: {
      padding: '20px 24px',
      borderBottom: '1px solid #f1f5f9',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalTitle: { fontSize: '17px', fontWeight: 800 },
    modalClose: {
      border: 'none',
      background: '#f1f5f9',
      borderRadius: '50%',
      width: '32px',
      height: '32px',
      cursor: 'pointer',
      color: '#64748b',
      fontWeight: 700,
    },
    modalBody: { padding: '20px 24px', overflowY: 'auto' },
    trendModalWide: {
      backgroundColor: '#f8fafc',
      borderRadius: '20px',
      width: '100%',
      maxWidth: '1050px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
      overflow: 'hidden',
      position: 'relative',
    },
    trendHeader: {
      padding: '16px 20px',
      backgroundColor: '#fff',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    trendTitleRow: {
      fontSize: isMobile ? '16px' : '18px',
      fontWeight: 700,
      color: '#1e293b',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    trendBody: {
      padding: isMobile ? '16px' : '24px',
      overflowY: 'auto',
      position: 'relative',
      minHeight: '520px',
    },
    graphSubtitle: { fontSize: '13px', color: '#475569', marginBottom: '16px' },
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
          color: '#94a3b8',
          fontWeight: 600,
        }}
      >
        Loading dashboard...
      </div>
    );
  }

  const row1 = [
    {
      label: 'Total Students',
      value: stats?.totalStudents || 0,
      icon: '',
      color: '#8b5cf6',
      borderColor: '#c4b5fd',
      bg: '#f3e8ff',
      path: '/students',
    },
    {
      label: 'Total Classes',
      value: stats?.totalClasses || 0,
      icon: '',
      color: '#3b82f6',
      borderColor: '#93c5fd',
      bg: '#dbeafe',
      path: '/students',
    },
    {
      label: "Today's Present",
      value: stats?.today?.present || 0,
      icon: '',
      color: '#22c55e',
      borderColor: '#86efac',
      bg: '#dcfce7',
      path: '/attendance',
    },
    {
      label: "Today's Absent",
      value: stats?.today?.absent || 0,
      sub: 'Students',
      icon: '',
      color: '#ef4444',
      borderColor: '#fca5a5',
      bg: '#fee2e2',
    },
  ];

  const kpiHover = (e, enter, borderBase) => {
    e.currentTarget.style.transform = enter ? 'translateY(-4px)' : 'translateY(0)';
    e.currentTarget.style.boxShadow = enter
      ? `0 18px 44px rgba(0,0,0,0.35), 0 0 0 1px ${borderBase}50`
      : `0 12px 40px rgba(0,0,0,0.28), 0 0 0 1px ${borderBase}40`;
  };

  return (
    <div style={styles.page}>
      <style>{`
        .dark-scroll::-webkit-scrollbar { height: 10px; }
        .dark-scroll::-webkit-scrollbar-track { background: rgba(15, 23, 42, 1); border-radius: 6px; }
        .dark-scroll::-webkit-scrollbar-thumb { background: rgba(51, 65, 85, 1); border-radius: 6px; border: 2px solid rgba(15, 23, 42, 1); }
        .dark-scroll::-webkit-scrollbar-thumb:hover { background: rgba(71, 85, 105, 1); }

        .table-scroll::-webkit-scrollbar { height: 6px; }
        .table-scroll::-webkit-scrollbar-track { background: transparent; }
        .table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>

      {/* Header — light text for dark bg */}
      <div style={styles.headerWrapper}>
        <div style={styles.titleRow}>
          <h1 style={styles.title}>Gurukul AMS</h1>
          <div style={styles.liveBadge}>
            <span style={styles.liveDot}></span> LIVE
          </div>
        </div>
        <div style={styles.dateSub}>
          {realToday.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      {/* Top stats */}
      <div className="dash-row1" style={styles.row1}>
        {row1.map((c) => (
          <div
            key={c.label}
            style={styles.statCard(c.borderColor)}
            onClick={() => c.path && navigate(c.path)}
          >
            <div>
              <div style={styles.statLabel}>{c.label}</div>
              <div style={styles.statValue}>
                {c.value} {c.sub && <span style={styles.statSub}>{c.sub}</span>}
              </div>
            </div>
            <div style={styles.iconBox(c.bg, c.color)}>{c.icon}</div>
          </div>
        ))}
      </div>

      {/* KPI cards */}
      <div className="dash-row2" style={styles.row2}>
        <div
          style={styles.kpiCard('#2dd4bf', '#14b8a6')}
          onClick={() => navigate('/attendance')}
          onMouseEnter={(e) => kpiHover(e, true, '#14b8a6')}
          onMouseLeave={(e) => kpiHover(e, false, '#14b8a6')}
        >
          <div>
            <div style={styles.kpiLabel}>Mark Attendance</div>
            <div style={styles.kpiValue}>{stats?.today?.totalMarked || 0}</div>
            <div style={styles.kpiSub}>Attendance marked to date</div>
          </div>
          <div style={styles.kpiIconBox}>👆</div>
        </div>

        <div
          style={styles.kpiCard('#4ade80', '#22c55e')}
          onClick={() => setShowTrendModal(true)}
          onMouseEnter={(e) => kpiHover(e, true, '#22c55e')}
          onMouseLeave={(e) => kpiHover(e, false, '#22c55e')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%' }}>
            <div>
              <div style={styles.kpiLabel}>Monthly Analysis</div>
              <div style={styles.kpiSub}>View monthly trend ↗</div>
            </div>
            <ul
              style={{
                fontSize: '11px',
                color: '#64748b',
                paddingLeft: '14px',
                margin: '12px 0 0 0',
                lineHeight: '1.6',
              }}
            >
              <li>Trend chart</li>
              <li>Holographic chart</li>
              <li>Complex chart</li>
            </ul>
          </div>
          <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.2, fontSize: '100px' }}>
            📊
          </div>
        </div>

        <div style={styles.kpiCard('#f87171', '#ef4444')}>
          <div style={{ flex: 1 }}>
            <div style={styles.kpiLabel}>Classes Attendance Status</div>
            <div style={styles.kpiValue}>{classesMarked}</div>
            <div style={styles.kpiSub}>Classes Marked Today</div>
            <div style={styles.progressTrack}>
              <div style={styles.progressFill(markedPct)}></div>
            </div>
          </div>
        </div>

        <div
          style={styles.kpiCard('#facc15', '#eab308')}
          onClick={openUnmarkedModal}
          onMouseEnter={(e) => kpiHover(e, true, '#eab308')}
          onMouseLeave={(e) => kpiHover(e, false, '#eab308')}
        >
          <div>
            <div style={styles.kpiLabel}>Classes Remaining</div>
            <div style={styles.kpiValue}>{classesRemaining}</div>
            <div style={styles.kpiSub}>Classes to go — click to view</div>
          </div>
          <div style={styles.kpiIconBox}>🔗</div>
        </div>
      </div>

      {/* Action pills */}
      <div style={styles.pillRow}>
        <button style={styles.pill(true)}>Quick Actions</button>
        <button style={styles.pill(false)} onClick={() => navigate('/attendance')}>
          Mark Attendance
        </button>
        <button style={styles.pill(false)} onClick={() => navigate('/reports')}>
          Export Reports
        </button>
      </div>

      {/* Bottom grid */}
      <div className="dash-bottom-grid" style={styles.bottomGrid}>
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div style={styles.panelTitleWrap}>
              <div style={styles.panelTitleDot}></div>
              <h2 style={styles.panelTitle}>Today's Absentees</h2>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={styles.searchBox}>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>🔍</span>
                <input
                  style={styles.searchInput}
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                />
              </div>
              <button
                style={styles.pageBtn(safePage === 0)}
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
              >
                ‹
              </button>
              <button
                style={styles.pageBtn(safePage >= pageCount - 1)}
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage(safePage + 1)}
              >
                ›
              </button>
            </div>
          </div>

          <div className="table-scroll" style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: '60px' }}>Photo</th>
                  <th style={styles.th}>Student Details</th>
                  <th style={styles.th}>Contact</th>
                  <th style={{ ...styles.th, width: '70px', textAlign: 'center' }}>Mark</th>
                </tr>
              </thead>
              <tbody>
                {absenteesLoading ? (
                  <tr>
                    <td colSpan="4" style={styles.emptyCell}>
                      Syncing data...
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={styles.emptyCell}>
                      🎉 No absentees today!
                    </td>
                  </tr>
                ) : (
                  pageRows.map((s, i) => {
                    const uniqueId = s._id || s.studentId || i;
                    const name = s.name || s.studentName || 'Unknown';
                    const cls =
                      s.className ||
                      `${s.class || ''}${s.section ? '-' + s.section : ''}` ||
                      'N/A';
                    const phone = s.parentPhone || s.parent_phone || s.phone || s.mobile || '';
                    const isMarked = markedStudents.has(uniqueId);

                    return (
                      <tr key={uniqueId}>
                        <td style={styles.td}>
                          {s.photo ? (
                            <img src={s.photo} alt={name} style={styles.avatar} />
                          ) : (
                            <div style={styles.avatar}>{getInitials(name)}</div>
                          )}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.studentName}>{name}</div>
                          <div style={styles.studentSub}>{cls}</div>
                        </td>
                        <td style={styles.td}>
                          {phone ? (
                            <a href={`tel:${phone}`} style={styles.phoneText}>
                              {phone}
                            </a>
                          ) : (
                            <span style={{ fontSize: '13px', color: '#94a3b8' }}>No Contact</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <button
                            onClick={() => toggleMarkStudent(uniqueId)}
                            style={styles.markerBtn(isMarked)}
                            title="Toggle contacted status"
                          >
                            {isMarked ? '✓' : ''}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calendar */}
        <div style={styles.panel}>
          <div style={styles.calHeader}>
            <div style={styles.calMonthText}>
              {new Date(navYear, navMonth).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={styles.calNavBtn} onClick={handlePrevMonth}>
                ‹
              </button>
              <button style={styles.calNavBtn} onClick={handleNextMonth}>
                ›
              </button>
            </div>
          </div>

          <div style={styles.calGrid}>
            {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((d) => (
              <div key={d} style={styles.calDayLabel}>
                {d}
              </div>
            ))}

            {calendarDays.map((day, index) => {
              const isToday =
                day === realToday.getDate() &&
                navMonth === realToday.getMonth() &&
                navYear === realToday.getFullYear();
              return (
                <div key={index} style={styles.calDayCellWrap(isToday, day === null)}>
                  <div style={styles.calDayCellInner(isToday)}>{day || ''}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trend modal — unchanged logic */}
      {showTrendModal && (
        <div style={styles.overlay} onClick={() => setShowTrendModal(false)}>
          <div style={styles.trendModalWide} onClick={(e) => e.stopPropagation()}>
            <div style={styles.trendHeader}>
              <div style={styles.trendTitleRow}>
                <span style={{ fontSize: '22px' }}>📊</span>{' '}
                {isMobile
                  ? 'Monthly Trend'
                  : `Full Month Attendance — ${realToday.toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}`}
              </div>
              <button style={styles.modalClose} onClick={() => setShowTrendModal(false)}>
                ✕
              </button>
            </div>
            <div style={styles.trendBody}>
              <div style={styles.graphSubtitle}>
                Total Staff/Students: {baseTotalStudents} per day. Tracking presence and absence
                trends.
              </div>
              {trendLoading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                  Loading full month data...
                </div>
              ) : monthDaysData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                  No data recorded this month.
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: '#0f172a',
                    borderRadius: '16px',
                    padding: isMobile ? '20px 16px 16px' : '24px 24px 16px 24px',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
                  }}
                >
                  {/* ... keep your existing SVG chart JSX exactly as before ... */}
                  <div style={{ display: 'flex' }}>
                    <div
                      style={{
                        width: isMobile ? '50px' : '65px',
                        flexShrink: 0,
                        borderRight: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <div style={{ height: `${GRAPH_HEIGHT + PADDING_TOP}px`, position: 'relative' }}>
                        {yTicks.map((tick) => {
                          const y = GRAPH_HEIGHT - (tick / chartYMax) * GRAPH_HEIGHT + PADDING_TOP;
                          return (
                            <div
                              key={tick}
                              style={{
                                position: 'absolute',
                                top: y,
                                right: '12px',
                                transform: 'translateY(-50%)',
                                fontSize: '11px',
                                color: '#64748b',
                              }}
                            >
                              {tick}
                            </div>
                          );
                        })}
                      </div>
                      <div
                        style={{
                          marginTop: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '18px',
                          fontSize: '12px',
                          color: '#64748b',
                          textAlign: 'right',
                          paddingRight: '12px',
                        }}
                      >
                        <div>Day:</div>
                        <div>P:</div>
                        <div>A:</div>
                        <div>Stat:</div>
                      </div>
                    </div>
                    <div
                      style={{ flex: 1, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
                      className="dark-scroll"
                      onMouseLeave={() => setHoveredDay(null)}
                    >
                      <div
                        style={{
                          width: `${SVG_WIDTH}px`,
                          position: 'relative',
                          paddingBottom: '20px',
                        }}
                      >
                        <svg
                          width={SVG_WIDTH}
                          height={GRAPH_HEIGHT + PADDING_TOP}
                          style={{ overflow: 'visible' }}
                        >
                          <defs>
                            <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="rgba(74, 222, 128, 0.25)" />
                              <stop offset="100%" stopColor="rgba(74, 222, 128, 0)" />
                            </linearGradient>
                          </defs>
                          {yTicks.map((tick, i) => {
                            const y = GRAPH_HEIGHT - (tick / chartYMax) * GRAPH_HEIGHT + PADDING_TOP;
                            return (
                              <line
                                key={i}
                                x1="0"
                                y1={y}
                                x2={SVG_WIDTH}
                                y2={y}
                                stroke="rgba(255,255,255,0.05)"
                              />
                            );
                          })}
                          <path d={presentArea} fill="url(#presentGradient)" />
                          <path d={presentPath} fill="none" stroke="#4ade80" strokeWidth="2.5" />
                          <path d={absentPath} fill="none" stroke="#f87171" strokeWidth="2.5" />
                          {points.map((p) => (
                            <g
                              key={p.day}
                              onMouseEnter={() => setHoveredDay(p)}
                              onTouchStart={() => setHoveredDay(p)}
                              style={{ cursor: 'pointer' }}
                            >
                              <rect
                                x={p.x - COLUMN_WIDTH / 2}
                                y="0"
                                width={COLUMN_WIDTH}
                                height={GRAPH_HEIGHT + PADDING_TOP}
                                fill="transparent"
                              />
                              {!p.isUnmarked ? (
                                <>
                                  <text
                                    x={p.x}
                                    y={p.yPresent - 16}
                                    textAnchor="middle"
                                    fill="#f1f5f9"
                                    fontSize="11px"
                                    fontWeight="bold"
                                    opacity={hoveredDay && hoveredDay.day !== p.day ? 0.3 : 1}
                                  >
                                    {p.presentPct}%
                                  </text>
                                  <circle
                                    cx={p.x}
                                    cy={p.yPresent}
                                    r="4"
                                    fill="#0f172a"
                                    stroke="#4ade80"
                                    strokeWidth="2.5"
                                  />
                                  <circle
                                    cx={p.x}
                                    cy={p.yAbsent}
                                    r="4"
                                    fill="#0f172a"
                                    stroke="#f87171"
                                    strokeWidth="2.5"
                                  />
                                </>
                              ) : (
                                <>
                                  <text
                                    x={p.x}
                                    y={GRAPH_HEIGHT + PADDING_TOP - 15}
                                    textAnchor="middle"
                                    fill="#475569"
                                    fontSize="10px"
                                    fontWeight="700"
                                  >
                                    -
                                  </text>
                                  <circle
                                    cx={p.x}
                                    cy={GRAPH_HEIGHT + PADDING_TOP - 10}
                                    r="3"
                                    fill="#334155"
                                  />
                                </>
                              )}
                            </g>
                          ))}
                        </svg>
                        {hoveredDay && (
                          <div
                            style={{
                              position: 'absolute',
                              left: hoveredDay.x,
                              top: hoveredDay.yPresent + 25,
                              transform: 'translateX(-15%)',
                              backgroundColor: 'rgba(30, 41, 59, 0.95)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              backdropFilter: 'blur(8px)',
                              padding: '14px 18px',
                              borderRadius: '10px',
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: 600,
                              zIndex: 20,
                              pointerEvents: 'none',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                              whiteSpace: 'nowrap',
                              lineHeight: '1.6',
                            }}
                          >
                            <div
                              style={{
                                color: '#94a3b8',
                                marginBottom: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                letterSpacing: '0.5px',
                              }}
                            >
                              {getMonthName().toUpperCase()} {hoveredDay.day} DETAILS:
                            </div>
                            {hoveredDay.isUnmarked ? (
                              <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                                No attendance marked
                              </div>
                            ) : (
                              <>
                                <div style={{ marginBottom: '4px', color: '#f8fafc' }}>
                                  PRESENT: {hoveredDay.presentCount}{' '}
                                  <span style={{ color: '#4ade80' }}>({hoveredDay.presentPct}%)</span>
                                </div>
                                <div style={{ marginBottom: '4px', color: '#f8fafc' }}>
                                  ABSENT: {hoveredDay.absentCount}{' '}
                                  <span style={{ color: '#f87171' }}>({hoveredDay.absentPct}%)</span>
                                </div>
                                <div style={{ marginTop: '6px' }}>
                                  STATUS:{' '}
                                  <span
                                    style={{
                                      color: hoveredDay.absentCount > 0 ? '#f87171' : '#4ade80',
                                    }}
                                  >
                                    {hoveredDay.absentCount > 0 ? 'CHECK REQUIRED' : 'ALL PRESENT'}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        <div
                          style={{
                            display: 'flex',
                            width: `${SVG_WIDTH}px`,
                            marginTop: '20px',
                            paddingLeft: '20px',
                          }}
                        >
                          {points.map((p) => {
                            const isActive = hoveredDay?.day === p.day;
                            const isAlert = p.absentCount > 0;
                            return (
                              <div
                                key={p.day}
                                style={{
                                  width: `${COLUMN_WIDTH}px`,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '15px',
                                  fontSize: '12px',
                                  textAlign: 'center',
                                }}
                                onMouseEnter={() => setHoveredDay(p)}
                                onTouchStart={() => setHoveredDay(p)}
                              >
                                <div
                                  style={{
                                    color: isActive ? '#fff' : '#94a3b8',
                                    backgroundColor: isActive ? '#334155' : 'transparent',
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    transition: 'all 0.2s',
                                    fontWeight: isActive ? 700 : 500,
                                  }}
                                >
                                  {getMonthName()} {p.day}
                                </div>
                                {p.isUnmarked ? (
                                  <>
                                    <div style={{ color: '#475569', fontWeight: 'bold' }}>-</div>
                                    <div style={{ color: '#475569', fontWeight: 'bold' }}>-</div>
                                    <div
                                      style={{
                                        color: '#475569',
                                        fontSize: '11px',
                                        whiteSpace: 'nowrap',
                                        fontStyle: 'italic',
                                      }}
                                    >
                                      Unmarked
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div
                                      style={{
                                        color: isAlert ? '#f87171' : '#4ade80',
                                        fontWeight: 'bold',
                                      }}
                                    >
                                      ({p.presentCount})
                                    </div>
                                    <div
                                      style={{
                                        color: isAlert ? '#f87171' : '#4ade80',
                                        fontWeight: 'bold',
                                      }}
                                    >
                                      ({p.absentCount})
                                    </div>
                                    <div
                                      style={{
                                        color: isAlert ? '#f8fafc' : '#64748b',
                                        fontSize: '11px',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {isAlert ? 'Check' : 'Clear'}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '30px',
                      marginTop: '20px',
                      paddingTop: '16px',
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        color: '#94a3b8',
                        fontWeight: 600,
                      }}
                    >
                      <div
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '4px',
                          backgroundColor: '#4ade80',
                        }}
                      ></div>{' '}
                      Present
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        color: '#94a3b8',
                        fontWeight: 600,
                      }}
                    >
                      <div
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '4px',
                          backgroundColor: '#f87171',
                        }}
                      ></div>{' '}
                      Absent
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unmarked modal */}
      {showUnmarked && (
        <div style={styles.overlay} onClick={() => setShowUnmarked(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>⚠️ Classes Not Marked Today</div>
              <button style={styles.modalClose} onClick={() => setShowUnmarked(false)}>
                ✕
              </button>
            </div>
            <div style={styles.modalBody}>
              {unmarkedLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  Loading...
                </div>
              ) : unmarkedClasses.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: '#16a34a',
                    fontWeight: 700,
                  }}
                >
                  🎉 All classes marked for today!
                </div>
              ) : (
                unmarkedClasses.map((c) => (
                  <div
                    key={c.fullName}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '12px',
                      borderBottom: '1px solid #f1f5f9',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>
                        Class {c.fullName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {c.studentCount} students
                      </div>
                    </div>
                    <button
                      style={{
                        background: '#0f172a',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                      onClick={() => {
                        setShowUnmarked(false);
                        navigate('/attendance');
                      }}
                    >
                      Mark Now →
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;