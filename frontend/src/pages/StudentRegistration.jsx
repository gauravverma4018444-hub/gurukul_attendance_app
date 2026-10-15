import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { studentAPI } from '../api/api';
import { toast } from 'react-toastify';

const StudentRegistration = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    email: '',
    phone: '',
    parentPhone: '',
    className: '',
    section: 'CBSE', // Board: CBSE | MP | ICSE
    rollNumber: '',
    gender: 'Male',
    dateOfBirth: '',
    address: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    if (isEdit) fetchStudent();

    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [id]);

  const fetchStudent = async () => {
    try {
      const res = await studentAPI.getById(id);
      const student = res.data.data.student;
      setFormData({
        studentId: student.studentId,
        name: student.name,
        email: student.email || '',
        phone: student.phone || '',
        parentPhone: student.parentPhone || '',
        className: student.className,
        section: student.section || 'CBSE',
        rollNumber: student.rollNumber,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth
          ? new Date(student.dateOfBirth).toISOString().split('T')[0]
          : '',
        address: student.address || '',
      });
    } catch (err) {
      toast.error('Failed to load student data');
      navigate('/students');
    }
  };

  // --- VALIDATION ENGINE ---
  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'studentId':
        if (!value.trim()) {
          error = 'Student ID is required';
        } else if (!/^[A-Za-z0-9\-_]+$/.test(value)) {
          error = 'Only letters, numbers, hyphens, and underscores are allowed';
        }
        break;
      case 'name':
        if (!value.trim()) {
          error = 'Full name is required';
        } else if (value.trim().length < 2) {
          error = 'Name must be at least 2 characters long';
        }
        break;
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;
      case 'phone':
        if (value && !/^\d{10}$/.test(value)) {
          error = 'Phone number must be exactly 10 digits';
        }
        break;
      case 'parentPhone':
        if (value && !/^\d{10}$/.test(value)) {
          error = 'Parent/Guardian phone number must be exactly 10 digits';
        }
        break;
      case 'className':
        if (!value.trim()) {
          error = 'Class name is required';
        }
        break;
      case 'section':
        if (!value || !['CBSE', 'MP', 'ICSE'].includes(value)) {
          error = 'Please select a valid board';
        }
        break;
      case 'rollNumber':
        if (!value) {
          error = 'Roll number is required';
        } else if (Number(value) <= 0 || !Number.isInteger(Number(value))) {
          error = 'Roll number must be a positive whole number';
        }
        break;
      case 'dateOfBirth':
        if (value) {
          const birthDate = new Date(value);
          const today = new Date();
          if (birthDate >= today) {
            error = 'Date of birth must be in the past';
          }
        }
        break;
      default:
        break;
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (touched[name]) {
      const fieldError = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: fieldError }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const fieldError = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: fieldError }));
  };

  const validateForm = () => {
    const formErrors = {};
    let isFormValid = true;

    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) {
        formErrors[key] = error;
        isFormValid = false;
      }
    });

    setErrors(formErrors);
    const allTouched = {};
    Object.keys(formData).forEach((key) => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    return isFormValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.warning('Please correct the highlighted errors in the form.');
      return;
    }

    setLoading(true);

    try {
      if (isEdit) {
        await studentAPI.update(id, formData);
        toast.success('Student updated successfully!');
      } else {
        await studentAPI.create(formData);
        toast.success('Student registered successfully!');
      }
      navigate('/students');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const isMobile = windowWidth < 768;

  const themeColors = {
    white: '#ffffff',
    textDark: '#0f172a',
    textMuted: '#64748b',
    borderLight: '#cbd5e1',
    primary: '#4f46e5',
    danger: '#ef4444',
    success: '#10b981',
    inputBg: '#f1f5f9',
  };

  const styles = {
    pageBackground: {
      backgroundColor: 'transparent', // lets canvas show through
      minHeight: '100vh',
      padding: isMobile ? '16px 12px 40px' : '30px 20px 40px',
      fontFamily: "'Inter', -apple-system, sans-serif",
      boxSizing: 'border-box',
    },
    container: {
      maxWidth: '850px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    },
    headerBlock: {
      marginBottom: '10px',
    },
    header: {
      fontSize: isMobile ? '22px' : '28px',
      fontWeight: '800',
      color: '#282a2c', // light text for dark background
      margin: 0,
      letterSpacing: '-0.5px',
    },
    subtitle: {
      fontSize: '14px',
      color: '#94a3b8',
      marginTop: '4px',
      fontWeight: 500,
    },
    form: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '24px',
      padding: isMobile ? '20px' : '36px',
      boxShadow: '0 12px 48px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.5)',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap: '20px 24px',
    },
    fullWidth: {
      gridColumn: '1 / -1',
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      marginBottom: '4px',
    },
    label: {
      fontSize: '12px',
      fontWeight: '700',
      color: '#475569',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      display: 'flex',
      alignItems: 'center',
      gap: '3px',
    },
    input: (hasError) => ({
      width: '100%',
      padding: '12px 16px',
      border: hasError ? `1.5px solid ${themeColors.danger}` : `1.5px solid ${themeColors.borderLight}`,
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      outline: 'none',
      transition: 'all 0.15s ease-in-out',
      boxSizing: 'border-box',
      backgroundColor: themeColors.inputBg,
      color: themeColors.textDark,
      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
    }),
    select: (hasError) => ({
      width: '100%',
      padding: '12px 16px',
      border: hasError ? `1.5px solid ${themeColors.danger}` : `1.5px solid ${themeColors.borderLight}`,
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      outline: 'none',
      backgroundColor: themeColors.inputBg,
      boxSizing: 'border-box',
      color: themeColors.textDark,
      cursor: 'pointer',
    }),
    textarea: (hasError) => ({
      width: '100%',
      padding: '12px 16px',
      border: hasError ? `1.5px solid ${themeColors.danger}` : `1.5px solid ${themeColors.borderLight}`,
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      outline: 'none',
      resize: 'vertical',
      minHeight: '90px',
      boxSizing: 'border-box',
      backgroundColor: themeColors.inputBg,
      color: themeColors.textDark,
    }),
    errorText: {
      color: themeColors.danger,
      fontSize: '11.5px',
      fontWeight: '600',
      marginTop: '2px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    btnGroup: {
      display: 'flex',
      gap: '12px',
      marginTop: '32px',
      justifyContent: 'flex-end',
      flexWrap: 'wrap-reverse',
    },
    submitBtn: {
      padding: '13px 36px',
      backgroundColor: themeColors.primary,
      color: '#fff',
      border: 'none',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '800',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      boxShadow: '0 8px 20px rgba(79, 70, 229, 0.35)',
    },
    cancelBtn: {
      padding: '13px 36px',
      backgroundColor: '#f1f5f9',
      color: '#475569',
      border: '1px solid #cbd5e1',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    required: {
      color: themeColors.danger,
      marginLeft: '2px',
    },
  };

  return (
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        {/* HEADER BAR */}
        <div style={styles.headerBlock}>
          <h1 style={styles.header}>
            {isEdit ? '✏️ Edit Student Profile' : '➕ Register New Student'}
          </h1>
          <p style={styles.subtitle}>
            {isEdit
              ? 'Modify information directory parameters'
              : 'Enter and enroll record configurations into directory files'}
          </p>
        </div>

        {/* INPUT FORM CONTAINER */}
        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <div style={styles.grid}>
            {/* Student ID */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Student ID <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g., STU-10A-001"
                required
                disabled={isEdit}
                style={{
                  ...styles.input(errors.studentId && touched.studentId),
                  backgroundColor: isEdit ? '#e2e8f0' : themeColors.inputBg,
                  color: isEdit ? themeColors.textMuted : themeColors.textDark,
                  cursor: isEdit ? 'not-allowed' : 'text',
                }}
              />
              {errors.studentId && touched.studentId && (
                <div style={styles.errorText}>⚠ {errors.studentId}</div>
              )}
            </div>

            {/* Full Name */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Full Name <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="First and last name"
                required
                style={styles.input(errors.name && touched.name)}
              />
              {errors.name && touched.name && (
                <div style={styles.errorText}>⚠ {errors.name}</div>
              )}
            </div>

            {/* Email Address */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="student@school.com"
                style={styles.input(errors.email && touched.email)}
              />
              {errors.email && touched.email && (
                <div style={styles.errorText}>⚠ {errors.email}</div>
              )}
            </div>

            {/* Student phone */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Phone Number</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="10-digit mobile number"
                style={styles.input(errors.phone && touched.phone)}
              />
              {errors.phone && touched.phone && (
                <div style={styles.errorText}>⚠ {errors.phone}</div>
              )}
            </div>

            {/* Parent Phone */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Parent/Guardian Phone</label>
              <input
                type="text"
                name="parentPhone"
                value={formData.parentPhone}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Parent 10-digit contact number"
                style={styles.input(errors.parentPhone && touched.parentPhone)}
              />
              {errors.parentPhone && touched.parentPhone && (
                <div style={styles.errorText}>⚠ {errors.parentPhone}</div>
              )}
            </div>

            {/* Gender Dropdown */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Gender <span style={styles.required}>*</span>
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                onBlur={handleBlur}
                style={styles.select(errors.gender && touched.gender)}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && touched.gender && (
                <div style={styles.errorText}>⚠ {errors.gender}</div>
              )}
            </div>

            {/* Class Designation */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Class <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="className"
                value={formData.className}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g., 10 or 12"
                required
                style={styles.input(errors.className && touched.className)}
              />
              {errors.className && touched.className && (
                <div style={styles.errorText}>⚠ {errors.className}</div>
              )}
            </div>

            {/* Board Selector (CBSE / MP / ICSE) */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Board <span style={styles.required}>*</span>
              </label>
              <select
                name="section"
                value={formData.section}
                onChange={handleChange}
                onBlur={handleBlur}
                style={styles.select(errors.section && touched.section)}
              >
                <option value="CBSE">CBSE</option>
                <option value="MP">MP Board</option>
                <option value="ICSE">ICSE</option>
              </select>
              {errors.section && touched.section && (
                <div style={styles.errorText}>⚠ {errors.section}</div>
              )}
            </div>

            {/* Roll Number */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Roll Number <span style={styles.required}>*</span>
              </label>
              <input
                type="number"
                name="rollNumber"
                value={formData.rollNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Assigned class index"
                required
                min="1"
                style={styles.input(errors.rollNumber && touched.rollNumber)}
              />
              {errors.rollNumber && touched.rollNumber && (
                <div style={styles.errorText}>⚠ {errors.rollNumber}</div>
              )}
            </div>

            {/* Date of birth calendar */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                onBlur={handleBlur}
                style={styles.input(errors.dateOfBirth && touched.dateOfBirth)}
              />
              {errors.dateOfBirth && touched.dateOfBirth && (
                <div style={styles.errorText}>⚠ {errors.dateOfBirth}</div>
              )}
            </div>

            {/* Full Residence Address */}
            <div style={{ ...styles.inputGroup, ...styles.fullWidth }}>
              <label style={styles.label}>Residential Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Street address, City, ZIP code"
                style={styles.textarea(errors.address && touched.address)}
              />
            </div>
          </div>

          {/* FORM CONTROLS FOOTER BUTTONS */}
          <div style={styles.btnGroup}>
            <button
              type="button"
              onClick={() => navigate('/students')}
              style={styles.cancelBtn}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitBtn,
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = '#4338ca';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = themeColors.primary;
              }}
            >
              {loading
                ? 'Saving Directory...'
                : isEdit
                ? 'Update student records'
                : 'Register Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentRegistration;