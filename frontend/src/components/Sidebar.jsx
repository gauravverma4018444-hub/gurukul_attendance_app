import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaChartPie,
  FaUserGraduate,
  FaUserPlus,
  FaCheckDouble,
  FaFileAlt,
  FaUserShield,
  FaFileInvoiceDollar,
  FaCog,
  FaDatabase, // Added Database icon
} from 'react-icons/fa';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: <FaChartPie /> },
    { path: '/students', label: 'Student List', icon: <FaUserGraduate /> },
    { path: '/students/register', label: 'Register Student', icon: <FaUserPlus /> },
    { path: '/faculty-access', label: 'Faculty Access', icon: <FaUserShield /> },
    { path: '/attendance', label: 'Attendance', icon: <FaCheckDouble /> },
    { path: '/payments', label: 'Payment Manage', icon: <FaFileInvoiceDollar /> },
    { path: '/reports', label: 'Reports & Export', icon: <FaFileAlt /> },
    { path: '/settings', label: 'Settings', icon: <FaCog /> },
    { path: '/settings/backup', label: 'Database Backup', icon: <FaDatabase /> }, // Added Backup Link
  ];

  const theme = {
    bg: '#0b1220',
    activeBg: '#4f46e5',
    white: '#ffffff',
    muted: '#94a3b8',
    hover: 'rgba(255,255,255,0.06)',
  };

  const styles = {
    shell: {
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      width: '240px',
      padding: '16px 12px',
      boxSizing: 'border-box',
      zIndex: 200,
      pointerEvents: 'none',
    },
    sidebar: {
      pointerEvents: 'auto',
      height: '100%',
      backgroundColor: theme.bg,
      borderRadius: '24px',
      padding: '22px 14px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 10px 40px rgba(15, 23, 42, 0.35)',
      overflowY: 'auto',
    },
    brand: {
      padding: '4px 12px 20px',
      marginBottom: '6px',
    },
    brandLabel: {
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '1.4px',
      textTransform: 'uppercase',
      color: theme.muted,
      margin: 0,
    },
    menu: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    },
    menuItem: (isActive) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      borderRadius: '14px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: isActive ? 700 : 500,
      backgroundColor: isActive ? theme.activeBg : 'transparent',
      color: isActive ? theme.white : theme.muted,
      transition: 'background-color 0.15s ease, color 0.15s ease',
      whiteSpace: 'nowrap',
      boxShadow: isActive ? '0 6px 16px rgba(79, 70, 229, 0.35)' : 'none',
    }),
    icon: (isActive) => ({
      fontSize: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '20px',
      flexShrink: 0,
      color: isActive ? theme.white : theme.muted,
    }),
    label: {
      lineHeight: 1.2,
    },
  };

  /**
   * Only one item active at a time.
   * - Exact match wins
   * - startsWith is used only if no longer/more-specific menu path also matches
   * Fixes: /settings/backup no longer activates /settings
   */
  const isItemActive = (path) => {
    const { pathname } = location;

    if (path === '/') {
      return pathname === '/';
    }

    // Exact match
    if (pathname === path) return true;

    // Pathname is under this path (e.g. /students/123 under /students)
    if (!pathname.startsWith(path + '/')) return false;

    // If a more specific menu item also matches, don't highlight this one
    const hasMoreSpecificMatch = menuItems.some((other) => {
      if (other.path === path) return false;
      if (other.path.length <= path.length) return false;
      return (
        pathname === other.path ||
        pathname.startsWith(other.path + '/')
      );
    });

    return !hasMoreSpecificMatch;
  };

  return (
    <div style={styles.shell}>
      <div style={styles.sidebar}>
        <div style={styles.brand}>
          <p style={styles.brandLabel}>Admin Panel</p>
        </div>

        <ul style={styles.menu}>
          {menuItems.map((item) => {
            const active = isItemActive(item.path);

            return (
              <li
                key={item.path}
                style={styles.menuItem(active)}
                onClick={() => navigate(item.path)}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = theme.hover;
                    e.currentTarget.style.color = theme.white;
                    const icon = e.currentTarget.firstElementChild;
                    if (icon) icon.style.color = theme.white;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = theme.muted;
                    const icon = e.currentTarget.firstElementChild;
                    if (icon) icon.style.color = theme.muted;
                  }
                }}
              >
                <span style={styles.icon(active)}>{item.icon}</span>
                <span style={styles.label}>{item.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;