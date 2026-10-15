import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { authAPI } from '../api/api';

const FacultyManagement = () => {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | active | blocked

  // Add Faculty Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    assignedClasses: '',
  });

  // Reset Password Modal State
  const [resetModal, setResetModal] = useState({
    show: false,
    userId: null,
    userName: '',
    newPassword: '',
  });
  const [resetting, setResetting] = useState(false);

  const openAddModal = () => {
    setForm({ name: '', email: '', phone: '', password: '', assignedClasses: '' });
    setShowAddModal(true);
  };

  useEffect(() => {
    fetchFaculties();
  }, []);

  const fetchFaculties = async () => {
    setLoading(true);
    try {
      const res = await authAPI.getUsers();
      const all = res.data?.data || res.data || [];
      const teachers = all.filter((u) => u.role === 'teacher');
      setFaculties(teachers);
    } catch (err) {
      toast.error('Failed to load faculties');
      setFaculties([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleAccess = async (id, name, currentlyActive) => {
    const next = !currentlyActive;
    const msg = next
      ? `Grant Android App access to "${name}"?`
      : `Revoke Android App access for "${name}"? They will be blocked from the app.`;

    if (!window.confirm(msg)) return;

    try {
      await authAPI.updateUser(id, { isActive: next });
      setFaculties((prev) =>
        prev.map((f) => (f._id === id ? { ...f, isActive: next } : f))
      );
      toast.success(next ? `Access granted to ${name}` : `Access revoked for ${name}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update access');
    }
  };

  const handleAddFaculty = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.password) {
      toast.error('Name, Phone and Password are required');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      const classesArray = form.assignedClasses
        ? form.assignedClasses.split(',').map((c) => c.trim()).filter(Boolean)
        : [];

      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || `${form.phone.trim()}@gurukul.local`,
        phone: form.phone.trim(),
        password: form.password,
        role: 'teacher',
        assignedClasses: classesArray,
        isActive: true,
      };

      await authAPI.register(payload);
      toast.success(`${form.name} added — they can login on Android with phone + password`);
      setShowAddModal(false);
      fetchFaculties();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add faculty');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete faculty "${name}" permanently?`)) return;
    try {
      await authAPI.deleteUser(id);
      toast.success(`Deleted ${name}`);
      setFaculties((prev) => prev.filter((f) => f._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  // ✅ New Reset Password Handler
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetModal.newPassword || resetModal.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setResetting(true);
    try {
      await authAPI.resetUserPassword(resetModal.userId, { newPassword: resetModal.newPassword });
      toast.success(`Password successfully updated for ${resetModal.userName}`);
      setResetModal({ show: false, userId: null, userName: '', newPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  const filtered = faculties.filter((f) => {
    const q = search.toLowerCase().trim();
    const matchQ =
      !q ||
      (f.name || '').toLowerCase().includes(q) ||
      (f.email || '').toLowerCase().includes(q) ||
      String(f.phone || '').includes(q);
    const matchF =
      filter === 'all' ||
      (filter === 'active' && f.isActive) ||
      (filter === 'blocked' && !f.isActive);
    return matchQ && matchF;
  });

  const total = faculties.length;
  const activeCount = faculties.filter((f) => f.isActive).length;
  const blockedCount = total - activeCount;

  const getInitials = (name = '') => {
    const p = name.trim().split(/\s+/);
    return p.length >= 2
      ? (p[0][0] + p[1][0]).toUpperCase()
      : (p[0]?.[0] || 'T').toUpperCase();
  };

  const displayEmail = (f) => {
    if (!f.email) return null;
    if (f.email.endsWith('@gurukul.local')) return null;
    return f.email;
  };

  const styles = {
    page: { maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', system-ui, sans-serif" },
    header: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
    },
    title: { fontSize: '24px', fontWeight: 800, color: '#1c1d1e', margin: 0 },
    sub: { fontSize: '13px', color: '#64748b', marginTop: '4px' },
    addBtn: {
      padding: '10px 18px', backgroundColor: '#4f46e5', color: '#fff', border: 'none',
      borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(79,70,229,0.25)',
    },
    stats: {
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '14px', marginBottom: '18px',
    },
    card: {
      background: '#fff', borderRadius: '14px', padding: '16px 18px',
      border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(15,23,42,0.04)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    },
    statVal: { fontSize: '26px', fontWeight: 800, color: '#0f172a' },
    statLbl: { fontSize: '12px', color: '#64748b', fontWeight: 600, marginTop: '4px' },
    icon: (bg, c) => ({
      width: '42px', height: '42px', borderRadius: '12px', background: bg, color: c,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
    }),
    controls: { display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' },
    input: {
      flex: 1, minWidth: '220px', padding: '10px 14px', borderRadius: '10px',
      border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', background: '#fff',
    },
    select: {
      padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0',
      fontSize: '14px', background: '#fff', minWidth: '150px',
    },
    tableWrap: {
      background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0',
      boxShadow: '0 2px 10px rgba(15,23,42,0.04)', overflow: 'hidden',
    },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: '860px' },
    th: {
      textAlign: 'left', padding: '14px 16px', fontSize: '11px', fontWeight: 700,
      color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px',
      background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
    },
    td: { padding: '14px 16px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', verticalAlign: 'middle' },
    user: { display: 'flex', alignItems: 'center', gap: '12px' },
    avatar: {
      width: '40px', height: '40px', borderRadius: '10px', background: '#eef2ff',
      color: '#4f46e5', fontWeight: 800, fontSize: '13px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    name: { fontWeight: 700, color: '#0f172a' },
    email: { fontSize: '12px', color: '#64748b', marginTop: '2px' },
    naText: { fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', fontWeight: 500 },
    phone: {
      fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: '#334155',
      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
      padding: '4px 10px', display: 'inline-block', fontSize: '12px',
    },
    chip: {
      display: 'inline-block', background: '#eef2ff', color: '#4f46e5',
      border: '1px solid #c7d2fe', padding: '2px 8px', borderRadius: '6px',
      fontSize: '11px', fontWeight: 700, marginRight: '4px', marginBottom: '2px',
    },
    badge: (on) => ({
      display: 'inline-block', padding: '4px 12px', borderRadius: '20px',
      fontSize: '12px', fontWeight: 700,
      background: on ? '#dcfce7' : '#fee2e2',
      color: on ? '#166534' : '#991b1b',
      border: `1px solid ${on ? '#bbf7d0' : '#fecaca'}`,
    }),
    btnOn: {
      padding: '7px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
      background: '#10b981', color: '#fff', fontWeight: 700, fontSize: '12px', marginRight: '6px',
    },
    btnOff: {
      padding: '7px 12px', borderRadius: '8px', cursor: 'pointer',
      background: '#fff', color: '#ef4444', border: '1px solid #fecaca',
      fontWeight: 700, fontSize: '12px', marginRight: '6px',
    },
    btnReset: { // 🔑 New Button Style
      padding: '7px 12px', borderRadius: '8px', cursor: 'pointer',
      background: '#fff', color: '#3b82f6', border: '1px solid #bfdbfe',
      fontWeight: 600, fontSize: '12px', marginRight: '6px',
    },
    btnDel: {
      padding: '7px 12px', borderRadius: '8px', cursor: 'pointer',
      background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0',
      fontWeight: 600, fontSize: '12px',
    },
    empty: { textAlign: 'center', padding: '48px', color: '#94a3b8' },
    overlay: {
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)',
    },
    modal: {
      background: '#fff', borderRadius: '18px', width: '100%', maxWidth: '480px',
      padding: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
    },
    label: {
      display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b',
      textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.4px',
    },
    field: {
      width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
      fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '14px',
      backgroundColor: '#fff',
    },
    submit: {
      width: '100%', padding: '12px', background: '#4f46e5', color: '#fff', border: 'none',
      borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', marginTop: '4px',
    },
  };

  return (
    <div style={styles.page}>
      <style>{`
        input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #fff inset !important;
          -webkit-text-fill-color: #0f172a !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}> Faculty & App Access</h1>
          <p style={styles.sub}>
            Grant access so teachers can log in to the Android app with <strong>phone + password</strong>.
          </p>
        </div>
        <button style={styles.addBtn} onClick={openAddModal}>
          ➕ Add Faculty
        </button>
      </div>

      <div style={styles.stats}>
        <div style={styles.card}>
          <div>
            <div style={styles.statVal}>{total}</div>
            <div style={styles.statLbl}>Total Faculties</div>
          </div>
          <div style={styles.icon('#eef2ff', '#4f46e5')}>👥</div>
        </div>
        <div style={styles.card}>
          <div>
            <div style={styles.statVal}>{activeCount}</div>
            <div style={styles.statLbl}>App Access Enabled</div>
          </div>
          <div style={styles.icon('#dcfce7', '#16a34a')}>✅</div>
        </div>
        <div style={styles.card}>
          <div>
            <div style={styles.statVal}>{blockedCount}</div>
            <div style={styles.statLbl}>Access Blocked</div>
          </div>
          <div style={styles.icon('#fee2e2', '#dc2626')}>🔒</div>
        </div>
      </div>

      <div style={styles.controls}>
        <input
          style={styles.input}
          placeholder="🔍 Search name, phone or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select style={styles.select} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="active">✅ Access Enabled</option>
          <option value="blocked">🚫 Access Blocked</option>
        </select>
      </div>

      <div style={styles.tableWrap}>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Faculty</th>
                <th style={styles.th}>Android Login (Phone)</th>
                <th style={styles.th}>Assigned Classes</th>
                <th style={styles.th}>App Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={styles.empty}>Loading faculties...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="5" style={styles.empty}>No faculties found</td></tr>
              ) : (
                filtered.map((f) => {
                  const emailToShow = displayEmail(f);
                  return (
                  <tr key={f._id}>
                    <td style={styles.td}>
                      <div style={styles.user}>
                        <div style={styles.avatar}>{getInitials(f.name)}</div>
                        <div>
                          <div style={styles.name}>{f.name}</div>
                          {emailToShow ? (
                            <div style={styles.email}>{emailToShow}</div>
                          ) : (
                            <div style={styles.naText}>N/A</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      {f.phone ? (
                        <span style={styles.phone}>📞 {f.phone}</span>
                      ) : (
                        <span style={styles.naText}>N/A</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {(f.assignedClasses || []).length > 0
                        ? f.assignedClasses.map((c) => (
                            <span key={c} style={styles.chip}>{c}</span>
                          ))
                        : <span style={styles.naText}>N/A</span>}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.badge(!!f.isActive)}>
                        {f.isActive ? 'Enabled' : 'Blocked'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {/* Toggle Access */}
                      {f.isActive ? (
                        <button style={styles.btnOff} onClick={() => toggleAccess(f._id, f.name, true)}>
                          Revoke
                        </button>
                      ) : (
                        <button style={styles.btnOn} onClick={() => toggleAccess(f._id, f.name, false)}>
                          Grant Access
                        </button>
                      )}

                      {/* 🔑 Reset Password Button */}
                      <button 
                        style={styles.btnReset} 
                        onClick={() => setResetModal({ show: true, userId: f._id, userName: f.name, newPassword: '' })}
                      >
                        🔑 Reset Pass
                      </button>

                      <button style={styles.btnDel} onClick={() => handleDelete(f._id, f.name)}>
                        Delete
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

      {/* =========================================
          ADD FACULTY MODAL 
      ============================================= */}
      {showAddModal && (
        <div style={styles.overlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                ➕ Add Faculty (Android Access)
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
              >✕</button>
            </div>

            <form onSubmit={handleAddFaculty} autoComplete="off">
              <input type="text" tabIndex={-1} autoComplete="off" style={{ position: 'absolute', opacity: 0, height: 0 }} />
              <input type="password" tabIndex={-1} autoComplete="new-password" style={{ position: 'absolute', opacity: 0, height: 0 }} />

              <label style={styles.label}>Full Name *</label>
              <input
                style={styles.field}
                required
                placeholder="e.g. Ramesh Kumar"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />

              <label style={styles.label}>Phone (Android Login ID) *</label>
              <input
                style={styles.field}
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />

              <label style={styles.label}>Password (App Login) *</label>
              <input
                style={styles.field}
                type="text" // Shown as text so admin knows what they type
                required
                placeholder="Min 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />

              <label style={styles.label}>Email (optional)</label>
              <input
                style={styles.field}
                type="text"
                placeholder="e.g. faculty@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />

              <label style={styles.label}>Assigned Classes (comma separated, optional)</label>
              <input
                style={styles.field}
                placeholder="e.g. 10-A, 9-B"
                value={form.assignedClasses}
                onChange={(e) => setForm({ ...form, assignedClasses: e.target.value })}
              />

              <button type="submit" style={styles.submit} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create & Enable App Access'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          RESET PASSWORD MODAL 
      ============================================= */}
      {resetModal.show && (
        <div style={styles.overlay} onClick={() => setResetModal({ ...resetModal, show: false })}>
          <div style={{...styles.modal, maxWidth: '400px'}} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                🔑 Reset Password
              </h2>
              <button
                onClick={() => setResetModal({ ...resetModal, show: false })}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
              >✕</button>
            </div>
            
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', marginTop: 0 }}>
              Set a new login password for <strong>{resetModal.userName}</strong>. Once saved, provide this password to the teacher so they can log into the Android app.
            </p>

            <form onSubmit={handleResetPassword}>
              <label style={styles.label}>New Password</label>
              <input
                style={styles.field}
                type="text" // Keep as text so admin can see what they are giving the teacher
                required
                autoComplete="off"
                placeholder="Enter new password (min 6 chars)"
                value={resetModal.newPassword}
                onChange={(e) => setResetModal({ ...resetModal, newPassword: e.target.value })}
              />

              <button type="submit" style={styles.submit} disabled={resetting}>
                {resetting ? 'Resetting...' : 'Overwrite Password'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default FacultyManagement;