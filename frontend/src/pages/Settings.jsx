import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/api';
import { toast } from 'react-toastify';
import {
  FaUserCog,
  FaUser,
  FaEnvelope,
  FaPhoneAlt,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSave,
  FaKey,
  FaUserPlus,
  FaUserShield,
  FaTrash,
  FaToggleOn,
  FaToggleOff,
  FaTimes,
} from 'react-icons/fa';

const Settings = () => {
  const navigate = useNavigate();
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const isMobile = windowWidth < 768;

  // Profile
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    id: '',
  });

  // Password
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Admin management
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'admin',
  });
  const [savingAdmin, setSavingAdmin] = useState(false);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
    adminPass: false,
  });

  useEffect(() => {
    fetchProfile();
    fetchAdmins();
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const res = await authAPI.getProfile();
      const u = res.data.data;
      setProfile({
        name: u.name || '',
        email: u.email || '',
        phone: u.phone || '',
        role: u.role || '',
        id: u.id || u._id || '',
      });
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const res = await authAPI.getUsers();
      const list = res.data.data || [];
      setAdmins(list);
    } catch (err) {
      toast.error('Failed to load users');
      setAdmins([]);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdminFormChange = (e) => {
    const { name, value } = e.target;
    setAdminForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!profile.name.trim()) {
      toast.warning('Name is required');
      return;
    }
    if (!profile.email.trim()) {
      toast.warning('Email / Admin ID is required');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await authAPI.updateProfile({
        name: profile.name.trim(),
        email: profile.email.trim(),
        phone: profile.phone ? profile.phone.trim() : undefined,
      });

      setProfile((prev) => ({
        ...prev,
        name: res.data.data.name,
        email: res.data.data.email,
        phone: res.data.data.phone || '',
        role: res.data.data.role,
      }));

      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          localStorage.setItem(
            'user',
            JSON.stringify({
              ...parsed,
              name: res.data.data.name,
              email: res.data.data.email,
            })
          );
        } catch (_) {}
      }

      toast.success('Admin Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.warning('Please fill in all password fields');
      return;
    }
    if (newPassword.length < 6) {
      toast.warning('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.warning('New password and confirm password do not match');
      return;
    }

    setSavingPassword(true);
    try {
      await authAPI.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      toast.success('Password changed successfully! Please login again.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });

      setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const createAdmin = async (e) => {
    e.preventDefault();
    const { name, email, phone, password, role } = adminForm;

    if (!name.trim() || !email.trim() || !password) {
      toast.warning('Name, email and password are required');
      return;
    }
    if (password.length < 6) {
      toast.warning('Password must be at least 6 characters');
      return;
    }

    setSavingAdmin(true);
    try {
      await authAPI.registerUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : undefined,
        password,
        role: role || 'admin',
        isActive: true,
      });

      toast.success(`${role === 'teacher' ? 'Teacher' : 'Admin'} created successfully!`);
      setAdminForm({ name: '', email: '', phone: '', password: '', role: 'admin' });
      setShowAddAdmin(false);
      fetchAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSavingAdmin(false);
    }
  };

  const toggleUserActive = async (user) => {
    if (user.id === profile.id || user._id === profile.id) {
      toast.warning('You cannot deactivate your own account');
      return;
    }
    try {
      await authAPI.updateUser(user._id || user.id, {
        isActive: !user.isActive,
      });
      toast.success(user.isActive ? 'User deactivated' : 'User activated');
      fetchAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    }
  };

  const deleteUser = async (user) => {
    if (user.id === profile.id || user._id === profile.id) {
      toast.warning('You cannot delete your own account');
      return;
    }
    if (!window.confirm(`Delete "${user.name}" permanently? This cannot be undone.`)) {
      return;
    }
    try {
      await authAPI.deleteUser(user._id || user.id);
      toast.success('User deleted');
      fetchAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const theme = {
    white: '#ffffff',
    textDark: '#0f172a',
    textMuted: '#64748b',
    border: 'rgba(226, 232, 240, 0.8)',
    primary: '#4f46e5',
    primaryHover: '#4338ca',
    danger: '#ef4444',
    dangerHover: '#dc2626',
    success: '#10b981',
    inputBg: '#f1f5f9',
  };

  const styles = {
    page: {
      backgroundColor: 'transparent',
      minHeight: '100vh',
      padding: isMobile ? '16px 12px 40px' : '30px 20px 40px',
      fontFamily: "'Inter', system-ui, sans-serif",
      boxSizing: 'border-box',
    },
    container: {
      maxWidth: '850px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
    },
    pageHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '8px',
    },
    iconBox: {
      width: '52px',
      height: '52px',
      borderRadius: '16px',
      backgroundColor: 'rgba(99, 102, 241, 0.18)',
      color: '#818cf8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      boxShadow: '0 8px 20px rgba(99, 102, 241, 0.2)',
    },
    headerTitle: {
      fontSize: isMobile ? '22px' : '26px',
      fontWeight: 800,
      color: '#242527',
      margin: 0,
      letterSpacing: '-0.5px',
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '8px',
    },
    headerSubtitle: {
      fontSize: '13px',
      color: '#94a3b8',
      marginTop: '4px',
      margin: 0,
      fontWeight: 500,
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: '8px',
      fontSize: '11px',
      fontWeight: 700,
      backgroundColor: 'rgba(99, 102, 241, 0.2)',
      color: '#818cf8',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '24px',
      boxShadow: '0 12px 48px rgba(0,0,0,0.3)',
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.5)',
    },
    cardHeaderTopLine: (color) => ({
      height: '4px',
      backgroundColor: color,
      width: '100%',
    }),
    cardHeader: {
      padding: isMobile ? '20px 20px 12px' : '24px 28px 12px',
      borderBottom: `1px solid ${theme.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '12px',
      flexWrap: 'wrap',
    },
    cardTitle: {
      fontSize: '17px',
      fontWeight: 800,
      color: theme.textDark,
      margin: '0 0 6px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    cardDesc: {
      fontSize: '13px',
      color: theme.textMuted,
      margin: 0,
      lineHeight: '1.5',
    },
    cardBody: {
      padding: isMobile ? '20px' : '28px',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: '20px',
    },
    full: { gridColumn: '1 / -1' },
    group: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    label: {
      fontSize: '12px',
      fontWeight: 700,
      color: '#475569',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    inputWrap: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    },
    inputIcon: {
      position: 'absolute',
      left: '14px',
      color: '#94a3b8',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      pointerEvents: 'none',
    },
    input: {
      width: '100%',
      padding: '12px 14px 12px 40px',
      borderRadius: '12px',
      border: `1.5px solid #cbd5e1`,
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box',
      color: theme.textDark,
      backgroundColor: theme.inputBg,
      fontWeight: '600',
      transition: 'border-color 0.2s',
    },
    select: {
      width: '100%',
      padding: '12px 14px',
      borderRadius: '12px',
      border: `1.5px solid #cbd5e1`,
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box',
      color: theme.textDark,
      backgroundColor: theme.inputBg,
      fontWeight: '600',
      cursor: 'pointer',
    },
    eyeBtn: {
      position: 'absolute',
      right: '12px',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      fontSize: '16px',
      color: '#94a3b8',
      padding: '4px',
      display: 'flex',
      alignItems: 'center',
    },
    btnRow: {
      display: 'flex',
      justify: 'flex-end',
      gap: '10px',
      marginTop: '24px',
      paddingTop: '20px',
      borderTop: `1px solid ${theme.border}`,
      flexWrap: 'wrap',
    },
    btn: (bg) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 22px',
      borderRadius: '12px',
      border: 'none',
      backgroundColor: bg,
      color: '#fff',
      fontWeight: 800,
      fontSize: '14px',
      cursor: 'pointer',
      boxShadow: `0 8px 20px ${bg}40`,
      transition: 'all 0.2s ease',
    }),
    btnOutline: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 18px',
      borderRadius: '12px',
      border: `1.5px solid ${theme.border}`,
      backgroundColor: '#f8fafc',
      color: theme.textDark,
      fontWeight: 700,
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    hint: {
      fontSize: '12px',
      color: theme.textMuted,
      marginTop: '2px',
    },
    adminList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    },
    adminRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      padding: '14px 16px',
      borderRadius: '14px',
      border: `1px solid ${theme.border}`,
      backgroundColor: '#f8fafc',
      flexWrap: 'wrap',
    },
    adminLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: 0,
      flex: 1,
    },
    adminAvatar: {
      width: '40px',
      height: '40px',
      borderRadius: '12px',
      backgroundColor: '#e0e7ff',
      color: theme.primary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 800,
      fontSize: '14px',
      flexShrink: 0,
    },
    adminName: {
      fontWeight: 700,
      fontSize: '14px',
      color: theme.textDark,
    },
    adminMeta: {
      fontSize: '12px',
      color: theme.textMuted,
      marginTop: '2px',
    },
    rolePill: (role) => ({
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '6px',
      fontSize: '10px',
      fontWeight: 700,
      textTransform: 'uppercase',
      marginLeft: '6px',
      backgroundColor: role === 'admin' ? '#e0e7ff' : '#fef3c7',
      color: role === 'admin' ? theme.primary : '#b45309',
    }),
    statusPill: (active) => ({
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '6px',
      fontSize: '10px',
      fontWeight: 700,
      backgroundColor: active ? '#d1fae5' : '#fee2e2',
      color: active ? '#065f46' : '#991b1b',
      marginLeft: '6px',
    }),
    adminActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    iconBtn: (color) => ({
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      border: `1px solid ${theme.border}`,
      backgroundColor: '#ffffff',
      color,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
    }),
    emptyAdmins: {
      textAlign: 'center',
      padding: '28px',
      color: theme.textMuted,
      fontSize: '14px',
    },
    addFormBox: {
      marginTop: '16px',
      padding: '20px',
      borderRadius: '16px',
      border: `1.5px dashed ${theme.primary}55`,
      backgroundColor: 'rgba(245, 243, 255, 0.9)',
    },
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const p = name.trim().split(/\s+/);
    return p.length >= 2
      ? (p[0][0] + p[p.length - 1][0]).toUpperCase()
      : p[0].substring(0, 2).toUpperCase();
  };

  if (loadingProfile) {
    return (
      <div
        style={{
          ...styles.page,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: '#94a3b8', fontWeight: 600, fontSize: '15px' }}>
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* PAGE HEADER */}
        <div style={styles.pageHeader}>
          <div style={styles.iconBox}>
            <FaUserCog />
          </div>
          <div>
            <h1 style={styles.headerTitle}>
              Account Settings
              {profile.role && <span style={styles.badge}>{profile.role}</span>}
            </h1>
            <p style={styles.headerSubtitle}>
              Manage your profile, security, and admin accounts.
            </p>
          </div>
        </div>

        {/* CARD 1: PROFILE */}
        <div style={styles.card}>
          <div style={styles.cardHeaderTopLine(theme.primary)} />
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>
                <FaUser style={{ color: theme.primary }} /> Profile Information
              </h2>
              <p style={styles.cardDesc}>
                Update your personal details and the email used for logging in.
              </p>
            </div>
          </div>

          <form onSubmit={saveProfile} style={styles.cardBody}>
            <div style={styles.grid}>
              <div style={styles.group}>
                <label style={styles.label}>Full Name</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>
                    <FaUser />
                  </span>
                  <input
                    style={styles.input}
                    name="name"
                    value={profile.name}
                    onChange={handleProfileChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              <div style={styles.group}>
                <label style={styles.label}>Email Address (Login ID) *</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>
                    <FaEnvelope />
                  </span>
                  <input
                    style={styles.input}
                    type="email"
                    name="email"
                    value={profile.email}
                    onChange={handleProfileChange}
                    placeholder="admin@school.com"
                    required
                  />
                </div>
              </div>

              <div style={{ ...styles.group, ...styles.full }}>
                <label style={styles.label}>Phone Number</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>
                    <FaPhoneAlt />
                  </span>
                  <input
                    style={styles.input}
                    name="phone"
                    value={profile.phone}
                    onChange={handleProfileChange}
                    placeholder="10-digit mobile number"
                  />
                </div>
                <span style={styles.hint}>Optional. Can be used for recovery or alerts.</span>
              </div>
            </div>

            <div style={styles.btnRow}>
              <button
                type="submit"
                style={{
                  ...styles.btn(theme.primary),
                  opacity: savingProfile ? 0.7 : 1,
                  cursor: savingProfile ? 'not-allowed' : 'pointer',
                }}
                disabled={savingProfile}
              >
                <FaSave /> {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* CARD 2: PASSWORD */}
        <div style={styles.card}>
          <div style={styles.cardHeaderTopLine(theme.danger)} />
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>
                <FaLock style={{ color: theme.danger }} /> Security & Password
              </h2>
              <p style={styles.cardDesc}>
                Change your password. You will be logged out after a successful update.
              </p>
            </div>
          </div>

          <form onSubmit={savePassword} style={styles.cardBody}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={styles.group}>
                <label style={styles.label}>Current Password</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>
                    <FaLock />
                  </span>
                  <input
                    style={{ ...styles.input, paddingRight: '46px' }}
                    type={showPasswords.current ? 'text' : 'password'}
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    style={styles.eyeBtn}
                    onClick={() =>
                      setShowPasswords((p) => ({ ...p, current: !p.current }))
                    }
                  >
                    {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div style={styles.grid}>
                <div style={styles.group}>
                  <label style={styles.label}>New Password</label>
                  <div style={styles.inputWrap}>
                    <span style={styles.inputIcon}>
                      <FaKey />
                    </span>
                    <input
                      style={{ ...styles.input, paddingRight: '46px' }}
                      type={showPasswords.new ? 'text' : 'password'}
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Min 6 characters"
                    />
                    <button
                      type="button"
                      style={styles.eyeBtn}
                      onClick={() =>
                        setShowPasswords((p) => ({ ...p, new: !p.new }))
                      }
                    >
                      {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div style={styles.group}>
                  <label style={styles.label}>Confirm New Password</label>
                  <div style={styles.inputWrap}>
                    <span style={styles.inputIcon}>
                      <FaKey />
                    </span>
                    <input
                      style={{ ...styles.input, paddingRight: '46px' }}
                      type={showPasswords.confirm ? 'text' : 'password'}
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Repeat new password"
                    />
                    <button
                      type="button"
                      style={styles.eyeBtn}
                      onClick={() =>
                        setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))
                      }
                    >
                      {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.btnRow}>
              <button
                type="submit"
                style={{
                  ...styles.btn(theme.danger),
                  opacity: savingPassword ? 0.7 : 1,
                  cursor: savingPassword ? 'not-allowed' : 'pointer',
                }}
                disabled={savingPassword}
              >
                <FaLock /> {savingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* CARD 3: ADMIN MANAGEMENT */}
        <div style={styles.card}>
          <div style={styles.cardHeaderTopLine('#7c3aed')} />
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>
                <FaUserShield style={{ color: '#7c3aed' }} /> Admin Management
              </h2>
              <p style={styles.cardDesc}>
                Create additional admins or teachers and manage their access.
              </p>
            </div>
            <button
              type="button"
              style={styles.btnOutline}
              onClick={() => setShowAddAdmin((v) => !v)}
            >
              {showAddAdmin ? (
                <>
                  <FaTimes /> Cancel
                </>
              ) : (
                <>
                  <FaUserPlus /> Add Admin
                </>
              )}
            </button>
          </div>

          <div style={styles.cardBody}>
            {/* Add Admin Form */}
            {showAddAdmin && (
              <form onSubmit={createAdmin} style={styles.addFormBox}>
                <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '14px', color: theme.textDark }}>
                  New User Details
                </div>
                <div style={styles.grid}>
                  <div style={styles.group}>
                    <label style={styles.label}>Full Name *</label>
                    <div style={styles.inputWrap}>
                      <span style={styles.inputIcon}>
                        <FaUser />
                      </span>
                      <input
                        style={styles.input}
                        name="name"
                        value={adminForm.name}
                        onChange={handleAdminFormChange}
                        placeholder="Full name"
                        required
                      />
                    </div>
                  </div>

                  <div style={styles.group}>
                    <label style={styles.label}>Email (Login ID) *</label>
                    <div style={styles.inputWrap}>
                      <span style={styles.inputIcon}>
                        <FaEnvelope />
                      </span>
                      <input
                        style={styles.input}
                        type="email"
                        name="email"
                        value={adminForm.email}
                        onChange={handleAdminFormChange}
                        placeholder="user@school.com"
                        required
                      />
                    </div>
                  </div>

                  <div style={styles.group}>
                    <label style={styles.label}>Phone</label>
                    <div style={styles.inputWrap}>
                      <span style={styles.inputIcon}>
                        <FaPhoneAlt />
                      </span>
                      <input
                        style={styles.input}
                        name="phone"
                        value={adminForm.phone}
                        onChange={handleAdminFormChange}
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div style={styles.group}>
                    <label style={styles.label}>Role *</label>
                    <select
                      style={styles.select}
                      name="role"
                      value={adminForm.role}
                      onChange={handleAdminFormChange}
                    >
                      <option value="admin">Admin</option>
                      <option value="teacher">Teacher</option>
                    </select>
                  </div>

                  <div style={{ ...styles.group, ...styles.full }}>
                    <label style={styles.label}>Temporary Password *</label>
                    <div style={styles.inputWrap}>
                      <span style={styles.inputIcon}>
                        <FaKey />
                      </span>
                      <input
                        style={{ ...styles.input, paddingRight: '46px' }}
                        type={showPasswords.adminPass ? 'text' : 'password'}
                        name="password"
                        value={adminForm.password}
                        onChange={handleAdminFormChange}
                        placeholder="Min 6 characters"
                        required
                      />
                      <button
                        type="button"
                        style={styles.eyeBtn}
                        onClick={() =>
                          setShowPasswords((p) => ({
                            ...p,
                            adminPass: !p.adminPass,
                          }))
                        }
                      >
                        {showPasswords.adminPass ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    <span style={styles.hint}>
                      Share this password securely. They can change it after login.
                    </span>
                  </div>
                </div>

                <div style={styles.btnRow}>
                  <button
                    type="button"
                    style={styles.btnOutline}
                    onClick={() => setShowAddAdmin(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      ...styles.btn('#7c3aed'),
                      opacity: savingAdmin ? 0.7 : 1,
                      cursor: savingAdmin ? 'not-allowed' : 'pointer',
                    }}
                    disabled={savingAdmin}
                  >
                    <FaUserPlus />
                    {savingAdmin ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            )}

            {/* Users list */}
            <div style={{ marginTop: showAddAdmin ? '20px' : 0 }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: theme.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '12px',
                }}
              >
                All Users ({admins.length})
              </div>

              {loadingAdmins ? (
                <div style={styles.emptyAdmins}>Loading users...</div>
              ) : admins.length === 0 ? (
                <div style={styles.emptyAdmins}>No users found. Add your first admin above.</div>
              ) : (
                <div style={styles.adminList}>
                  {admins.map((u) => {
                    const uid = u._id || u.id;
                    const isMe = uid === profile.id;
                    return (
                      <div key={uid} style={styles.adminRow}>
                        <div style={styles.adminLeft}>
                          <div style={styles.adminAvatar}>{getInitials(u.name)}</div>
                          <div style={{ minWidth: 0 }}>
                            <div style={styles.adminName}>
                              {u.name}
                              {isMe && (
                                <span
                                  style={{
                                    ...styles.rolePill('admin'),
                                    backgroundColor: '#ecfdf5',
                                    color: '#065f46',
                                  }}
                                >
                                  You
                                </span>
                              )}
                              <span style={styles.rolePill(u.role)}>{u.role}</span>
                              <span style={styles.statusPill(u.isActive !== false)}>
                                {u.isActive !== false ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <div style={styles.adminMeta}>
                              {u.email}
                              {u.phone ? ` · ${u.phone}` : ''}
                            </div>
                          </div>
                        </div>

                        {!isMe && (
                          <div style={styles.adminActions}>
                            <button
                              type="button"
                              title={u.isActive !== false ? 'Deactivate' : 'Activate'}
                              style={styles.iconBtn(
                                u.isActive !== false ? theme.success : theme.textMuted
                              )}
                              onClick={() => toggleUserActive(u)}
                            >
                              {u.isActive !== false ? <FaToggleOn /> : <FaToggleOff />}
                            </button>
                            <button
                              type="button"
                              title="Delete user"
                              style={styles.iconBtn(theme.danger)}
                              onClick={() => deleteUser(u)}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;