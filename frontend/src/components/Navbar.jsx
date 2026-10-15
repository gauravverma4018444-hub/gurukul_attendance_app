import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const styles = {
    navbar: {
      position: 'fixed',
      top: 0,
      left: isMobile ? 0 : '260px',
      right: 0,
      height: isMobile ? '58px' : '72px',
      backgroundColor: 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '8px 12px 0 12px' : '16px 24px 0 16px',
      zIndex: 100,
      boxSizing: 'border-box',
      transition: 'left 0.2s ease, padding 0.2s ease',
    },
    bar: {
      flex: 1,
      height: isMobile ? '48px' : '56px',
      backgroundColor: '#ffffff',
      borderRadius: isMobile ? '12px' : '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '0 12px' : '0 22px',
      boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)',
      border: '1px solid rgba(226, 232, 240, 0.8)',
    },
    title: {
      fontSize: isMobile ? '14px' : '17px',
      fontWeight: 700,
      color: '#0f172a',
      letterSpacing: '-0.2px',
      margin: 0,
    },
    rightSection: {
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '8px' : '14px',
    },
    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '6px' : '10px',
      padding: '4px 8px',
      borderRadius: '12px',
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
    },
    avatar: {
      width: isMobile ? '28px' : '34px',
      height: isMobile ? '28px' : '34px',
      borderRadius: '10px',
      backgroundColor: '#4f46e5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: 700,
      fontSize: isMobile ? '11px' : '13px',
      flexShrink: 0,
    },
    userMeta: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1px',
      paddingRight: isMobile ? '2px' : '6px',
    },
    userName: {
      fontSize: isMobile ? '11px' : '13px',
      fontWeight: 600,
      color: '#0f172a',
      lineHeight: 1.2,
      whiteSpace: 'nowrap',
    },
    userRole: {
      fontSize: '9px',
      color: '#94a3b8',
      textTransform: 'uppercase',
      fontWeight: 600,
      letterSpacing: '0.4px',
      lineHeight: 1.2,
    },
    logoutBtn: {
      padding: isMobile ? '6px 10px' : '8px 14px',
      backgroundColor: '#fff',
      color: '#ef4444',
      border: '1.5px solid #fecaca',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: isMobile ? '11px' : '12px',
      fontWeight: 600,
      transition: 'all 0.15s ease',
      whiteSpace: 'nowrap',
    },
  };

  return (
    <nav style={styles.navbar}>
      <div style={styles.bar}>
        <h1 style={styles.title}>Attendance System</h1>

        <div style={styles.rightSection}>
          {/* User Profile Chip */}
          <div style={styles.userInfo}>
            <div style={styles.avatar}>
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div style={styles.userMeta}>
              <div style={styles.userName}>{user?.name || 'Admin'}</div>
              <div style={styles.userRole}>{user?.role || 'ADMIN'}</div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            style={styles.logoutBtn}
            onClick={logout}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#fef2f2';
              e.currentTarget.style.borderColor = '#f87171';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#fff';
              e.currentTarget.style.borderColor = '#fecaca';
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;