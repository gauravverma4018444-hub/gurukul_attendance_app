import React, { useState, useEffect } from 'react';
import { reportAPI } from '../api/api';
import { toast } from 'react-toastify';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchNotifications();
  }, [days]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await reportAPI.getNotifications({ days });
      setNotifications(res.data.data);
    } catch (err) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityStyle = (severity) => {
    const map = {
      critical: {
        bg: '#fde8e8', border: '#e74c3c', icon: '🚨',
        label: 'CRITICAL', color: '#c0392b',
      },
      high: {
        bg: '#fff3e0', border: '#f39c12', icon: '⚠️',
        label: 'HIGH', color: '#e67e22',
      },
      warning: {
        bg: '#fff8e1', border: '#ffc107', icon: '📢',
        label: 'WARNING', color: '#f39c12',
      },
    };
    return map[severity] || map.warning;
  };

  const styles = {
    container: { maxWidth: '1000px', margin: '0 auto' },
    header: {
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', marginBottom: '24px',
    },
    title: { fontSize: '24px', fontWeight: 700, color: '#1a1a2e' },
    filterGroup: { display: 'flex', alignItems: 'center', gap: '8px' },
    label: { fontSize: '13px', fontWeight: 500, color: '#666' },
    select: {
      padding: '8px 12px', border: '2px solid #e0e0e0',
      borderRadius: '8px', fontSize: '13px', outline: 'none',
    },
    count: {
      padding: '12px 20px', backgroundColor: '#fde8e8',
      borderRadius: '10px', marginBottom: '20px',
      fontSize: '15px', fontWeight: 600, color: '#c0392b',
      display: 'flex', alignItems: 'center', gap: '8px',
    },
    card: (severity) => {
      const s = getSeverityStyle(severity);
      return {
        backgroundColor: s.bg,
        border: `2px solid ${s.border}`,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        transition: 'transform 0.2s',
      };
    },
    cardHeader: {
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', marginBottom: '12px',
    },
    studentName: { fontSize: '18px', fontWeight: 700, color: '#1a1a2e' },
    severityBadge: (severity) => {
      const s = getSeverityStyle(severity);
      return {
        padding: '4px 12px', backgroundColor: s.color,
        color: '#fff', borderRadius: '20px',
        fontSize: '11px', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.5px',
      };
    },
    cardDetails: {
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '12px',
    },
    detailItem: {
      padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.7)',
      borderRadius: '8px',
    },
    detailLabel: {
      fontSize: '11px', color: '#888', textTransform: 'uppercase',
      letterSpacing: '0.5px', marginBottom: '4px',
    },
    detailValue: { fontSize: '14px', fontWeight: 600, color: '#333' },
    empty: {
      textAlign: 'center', padding: '60px',
      backgroundColor: '#fff', borderRadius: '12px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    },
    emptyIcon: { fontSize: '48px', marginBottom: '16px' },
    emptyText: { fontSize: '18px', color: '#27ae60', fontWeight: 600 },
    emptySubtext: { fontSize: '14px', color: '#888', marginTop: '8px' },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🔔 Absence Notifications</h1>
        <div style={styles.filterGroup}>
          <span style={styles.label}>Period:</span>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            style={styles.select}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Checking attendance records...
        </div>
      ) : notifications.length > 0 ? (
        <>
          <div style={styles.count}>
            🚨 {notifications.length} student(s) have been absent more than the threshold
            (2+ consecutive days)
          </div>

          {notifications.map((notif, index) => {
            const s = getSeverityStyle(notif.severity);
            return (
              <div
                key={index}
                style={styles.card(notif.severity)}
                onMouseOver={(e) =>
                  (e.currentTarget.style.transform = 'translateY(-2px)')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.transform = 'translateY(0)')
                }
              >
                <div style={styles.cardHeader}>
                  <div>
                    <span style={{ fontSize: '20px', marginRight: '8px' }}>
                      {s.icon}
                    </span>
                    <span style={styles.studentName}>
                      {notif.student.name}
                    </span>
                  </div>
                  <span style={styles.severityBadge(notif.severity)}>
                    {s.label}
                  </span>
                </div>

                <div style={styles.cardDetails}>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>Student ID</div>
                    <div style={styles.detailValue}>{notif.student.studentId}</div>
                  </div>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>Class</div>
                    <div style={styles.detailValue}>
                      {notif.student.className}-{notif.student.section} (Roll: {notif.student.rollNumber})
                    </div>
                  </div>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>Total Absent Days</div>
                    <div style={{ ...styles.detailValue, color: '#e74c3c' }}>
                      {notif.totalAbsentDays} days
                    </div>
                  </div>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>Max Consecutive Absent</div>
                    <div style={{ ...styles.detailValue, color: '#e74c3c' }}>
                      {notif.maxConsecutiveAbsent} days
                    </div>
                  </div>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>Current Streak</div>
                    <div style={styles.detailValue}>
                      {notif.currentConsecutiveAbsent} days
                    </div>
                  </div>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>Parent Phone</div>
                    <div style={styles.detailValue}>
                      📞 {notif.student.parentPhone || notif.student.phone || 'N/A'}
                    </div>
                  </div>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>Last Absent</div>
                    <div style={styles.detailValue}>
                      {notif.lastAbsentDate
                        ? new Date(notif.lastAbsentDate).toLocaleDateString()
                        : 'N/A'}
                    </div>
                  </div>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>Recorded Days</div>
                    <div style={styles.detailValue}>
                      {notif.totalRecordedDays} days
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>✅</div>
          <div style={styles.emptyText}>All Good!</div>
          <div style={styles.emptySubtext}>
            No students have exceeded the absence threshold in the selected period.
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;