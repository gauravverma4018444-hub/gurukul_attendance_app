import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const BottomNav = () => {
  const location = useLocation();

  const items = [
    { to: '/',          icon: '📊', label: 'Home' },
    { to: '/students',  icon: '👨‍🎓', label: 'Students' },
    { to: '/attendance',icon: '✅', label: 'Attend' },
    { to: '/payments',  icon: '💰', label: 'Payment' },
    { to: '/reports',   icon: '📥', label: 'Reports' },
  ];

  // Don't show bottom nav on login page
  if (location.pathname === '/login') return null;

  return (
    <>
      <style>{`
        /* --- WRAPPER & CONTAINER --- */
        .bottom-nav-wrapper {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          display: flex;
          justify-content: center;
          width: max-content;
          pointer-events: none; /* Allows clicking around it */
        }

        .bottom-nav-container {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: rgba(15, 23, 42, 0.85); /* Dark glass slate */
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 100px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          pointer-events: auto; /* Re-enable clicks for the nav */
        }

        /* --- NAV ITEMS --- */
        .nav-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 100px;
          text-decoration: none;
          color: #94a3b8;
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          user-select: none;
        }

        .nav-item:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
        }

        .icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          transition: all 0.3s ease;
        }

        .nav-label {
          white-space: nowrap;
          transition: all 0.3s ease;
        }

        /* --- ACTIVE STATE (LAPTOP/DESKTOP) --- */
        .nav-item.active {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); /* Active Indigo Gradient */
          color: #ffffff;
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
        }

        .nav-item.active .icon-wrap {
          transform: scale(1.1);
        }

        /* =========================================
           MOBILE RESPONSIVE (Phones & Small Tablets)
           ========================================= */
        @media (max-width: 768px) {
          .bottom-nav-wrapper {
            bottom: 16px;
            width: calc(100% - 32px); /* Full width with safe margins */
          }

          .bottom-nav-container {
            width: 100%;
            justify-content: space-between;
            padding: 8px 12px;
            border-radius: 24px; /* Rounded rectangle on mobile */
            gap: 0;
            background: rgba(15, 23, 42, 0.9);
          }

          .nav-item {
            flex-direction: column;
            padding: 8px 0;
            flex: 1; /* Equal spacing */
            border-radius: 16px;
            gap: 4px;
            background: transparent !important; /* Remove background pill on mobile */
            color: #94a3b8;
          }

          .nav-label {
            font-size: 11px;
            font-weight: 700;
            opacity: 0.8;
          }

          .icon-wrap {
            font-size: 20px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: transparent;
          }

          /* --- MOBILE ACTIVE STATE --- */
          .nav-item.active {
            color: #f1f5f9;
            box-shadow: none;
          }

          .nav-item.active .nav-label {
            opacity: 1;
            color: #818cf8;
          }

          .nav-item.active .icon-wrap {
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            transform: translateY(-6px); /* Floating lift effect */
            box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.2); 
          }
        }
      `}</style>

      <div className="bottom-nav-wrapper">
        <nav className="bottom-nav-container">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="icon-wrap">{item.icon}</div>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
};

export default BottomNav;