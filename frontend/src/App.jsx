import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Settings from './pages/Settings';
import MonthlyGrid from './pages/MonthlyGrid.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import StudentRegistration from './pages/StudentRegistration.jsx';
import StudentList from './pages/StudentList.jsx';
import AttendanceView from './pages/AttendanceView.jsx';
import Reports from './pages/reports.jsx';
import Notifications from './pages/Notifications.jsx';
import Navbar from './components/Navbar.jsx';
import Sidebar from './components/Sidebar.jsx';
import StudentMonthly from './pages/StudentMonthly.jsx';
import FacultyManagement from './pages/FacultyManagement';
import PaymentPage from './pages/PaymentPage.jsx';
import AIAgent from './components/AIAgent.jsx';
import BackupSettings from "./pages/BackupSettings";
import BackupPrompt from "./components/BackupPrompt";
import NetworkBackground from './components/NetworkBackground';

/* ============================================================
   BOTTOM NAVIGATION (Mobile only - Light Glass Theme)
   ============================================================ */
const BottomNav = () => {
  const location = useLocation();

  if (location.pathname === '/login') return null;

  const items = [
    { to: '/',           icon: '📊', label: 'Home' },
    { to: '/students',   icon: '👨‍🎓', label: 'Students' },
    { to: '/attendance', icon: '✅', label: 'Attend' },
    { to: '/payments',   icon: '💰', label: 'Payment' },
    { to: '/reports',    icon: '📥', label: 'Reports' },
  ];

  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `bottom-nav-item ${isActive ? 'active' : ''}`
          }
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

/* ============================================================
   PRIVATE ROUTE (Light Loading State)
   ============================================================ */
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '16px',
        color: '#64748b',
        fontWeight: 600,
        backgroundColor: '#f8fafc',
      }}>
        Loading...
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

/* ============================================================
   APP LAYOUT
   ============================================================ */
const AppLayout = () => {
  const { user, token } = useAuth();

  return (
    <div className="app-layout">
      {/* Global Canvas */}
      <NetworkBackground />

      <div className="sidebar-desktop">
        <Sidebar />
      </div>

      <div className="main-wrapper">
        <div className="navbar-top">
          <Navbar />
        </div>

        <div className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/students" element={<StudentList />} />
            <Route path="/students/register" element={<StudentRegistration />} />
            <Route path="/students/edit/:id" element={<StudentRegistration />} />
            <Route path="/attendance" element={<AttendanceView />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/attendance/monthly" element={<MonthlyGrid />} />
            <Route path="/attendance/student" element={<StudentMonthly />} />
            <Route path="/faculty-access" element={<FacultyManagement />} />
            <Route path="/payments" element={<PaymentPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route
              path="/settings/backup"
              element={<BackupSettings token={token} />}
            />
          </Routes>
        </div>
      </div>

      <BottomNav />
      <AIAgent />

      {user?.role === 'admin' && <BackupPrompt isAdmin />}
    </div>
  );
};

/* ============================================================
   ROOT APP (Light Theme Base)
   ============================================================ */
function App() {
  return (
    <AuthProvider>
      <Router>
        <style>{`
          /* =====================================================
             GLOBAL RESET & LIGHT THEME BASE
             ===================================================== */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Inter', 'Segoe UI', sans-serif;
            background-color: #f8fafc !important; /* Premium Crisp Light Slate */
            color: #0f172a;                       /* Dark Slate text */
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
          }

          /* Light Scrollbars */
          ::-webkit-scrollbar { width: 7px; height: 7px; }
          ::-webkit-scrollbar-track { background: #f1f5f9; }
          ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

          /* =====================================================
             DESKTOP LAYOUT (TRANSPARENT WRAPPERS FOR CANVAS)
             ===================================================== */
          .app-layout {
            display: flex;
            min-height: 100vh;
            background: transparent !important;
            position: relative;
          }

          .sidebar-desktop {
            display: flex;
            flex-direction: column;
            width: 260px;
            min-height: 100vh;
            position: fixed;
            left: 0;
            top: 0;
            z-index: 100;
          }

          .main-wrapper {
            flex: 1;
            margin-left: 260px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            width: calc(100% - 260px);
            background: transparent !important;
            position: relative;
            z-index: 1;
          }

          .navbar-top {
            position: sticky;
            top: 0;
            z-index: 90;
            height: 65px;
            background: transparent;
          }

          .main-content {
            flex: 1;
            padding: 24px;
            min-height: calc(100vh - 65px);
            background: transparent !important;
            position: relative;
            z-index: 1;
          }

          /* Bottom nav hidden on desktop */
          .bottom-nav {
            display: none;
          }

          /* =====================================================
             MOBILE LAYOUT (max-width: 900px)
             ===================================================== */
          @media (max-width: 900px) {
            .sidebar-desktop {
              display: none !important;
            }

            .main-wrapper {
              margin-left: 0 !important;
              width: 100% !important;
              padding-bottom: 78px;
            }

            .main-content {
              padding: 14px 12px 20px !important;
            }

            .navbar-top {
              height: 56px;
            }

            /* Light frosted glass bottom navigation */
            .bottom-nav {
              display: flex !important;
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              height: 68px;
              background: rgba(255, 255, 255, 0.88);
              backdrop-filter: blur(16px);
              -webkit-backdrop-filter: blur(16px);
              border-top: 1px solid rgba(226, 232, 240, 0.8);
              z-index: 1000;
              justify-content: space-around;
              align-items: center;
              padding: 0 4px;
              padding-bottom: env(safe-area-inset-bottom);
              box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.05);
            }

            .bottom-nav-item {
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 3px;
              text-decoration: none;
              color: #64748b;
              font-size: 10px;
              font-weight: 600;
              padding: 8px 2px;
              border-radius: 14px;
              transition: all 0.2s ease;
              max-width: 72px;
              -webkit-tap-highlight-color: transparent;
            }

            .bottom-nav-item .nav-icon {
              font-size: 22px;
              line-height: 1;
            }

            .bottom-nav-item .nav-label {
              font-size: 10px;
              letter-spacing: 0.2px;
              white-space: nowrap;
            }

            .bottom-nav-item.active {
              color: #ffffff;
              background: linear-gradient(135deg, #4f46e5, #6366f1);
              box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);
            }

            .bottom-nav-item.active .nav-icon {
              transform: scale(1.08);
            }

            .ai-float-btn {
              bottom: 90px !important;
            }
          }

          @media (max-width: 380px) {
            .bottom-nav-item .nav-label {
              font-size: 9px;
            }
            .bottom-nav-item .nav-icon {
              font-size: 20px;
            }
          }
        `}</style>

        <ToastContainer
          position="top-right"
          autoClose={3000}
          theme="light"
          style={{ zIndex: 99999 }}
        />

        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <AppLayout />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;