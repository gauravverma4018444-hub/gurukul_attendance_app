import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/api';
import { toast } from 'react-toastify';

const Login = () => {
  const [step, setStep] = useState('CREDENTIALS');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [trustDevice, setTrustDevice] = useState(true);
  const [tempUserId, setTempUserId] = useState(null);
  const [qrCode, setQrCode] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Forgot Password State ──
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotOtp, setForgotOtp] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);

  const otpRefs = useRef([]);
  const forgotOtpRefs = useRef([]);
  const canvasRef = useRef(null);
  const { login, verifyOTP, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  // ── Network Background Animation ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 1;
        this.vy = (Math.random() - 0.5) * 1;
        this.radius = Math.random() * 2 + 1;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
        if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200, 210, 230, 0.5)';
        ctx.fill();
      }
    }

    const initParticles = () => {
      particles = [];
      const numParticles = Math.floor((canvas.width * canvas.height) / 15000);
      for (let i = 0; i < numParticles; i++) particles.push(new Particle());
    };
    initParticles();

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(200, 210, 230, ${1 - distance / 120})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // ── Login OTP Helpers ──
  const otpString = otp.join('');
  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowLeft' && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) otpRefs.current[index + 1]?.focus();
  };
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) newOtp[i] = pasted[i] || '';
    setOtp(newOtp);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };
  const resetOtp = () => setOtp(['', '', '', '', '', '']);

  // ── Forgot OTP Helpers ──
  const forgotOtpString = forgotOtp.join('');
  const handleForgotOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...forgotOtp];
    newOtp[index] = digit;
    setForgotOtp(newOtp);
    if (digit && index < 5) forgotOtpRefs.current[index + 1]?.focus();
  };
  const handleForgotOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !forgotOtp[index] && index > 0) forgotOtpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowLeft' && index > 0) forgotOtpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) forgotOtpRefs.current[index + 1]?.focus();
  };
  const handleForgotOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...forgotOtp];
    for (let i = 0; i < 6; i++) newOtp[i] = pasted[i] || '';
    setForgotOtp(newOtp);
    forgotOtpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };
  const resetForgotOtp = () => setForgotOtp(['', '', '', '', '', '']);

  // ── Login Submit ──
  const handleCredentialSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res?.requiresSetup2FA) {
        setTempUserId(res.tempUserId);
        setQrCode(res.qrCode);
        setSecretKey(res.secret);
        setStep('SETUP_2FA');
        resetOtp();
        toast.info('Google Authenticator setup required.');
      } else if (res?.requires2FA) {
        setTempUserId(res.tempUserId);
        setStep('VERIFY_OTP');
        resetOtp();
        toast.info('Please enter your Google Authenticator OTP.');
      } else {
        toast.success('Login successful!');
        navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e, isSetup = false) => {
    e.preventDefault();
    if (otpString.length < 6) return toast.warning('Please enter a valid 6-digit code');
    setLoading(true);
    try {
      await verifyOTP(tempUserId, otpString, trustDevice, isSetup);
      toast.success('Security verification passed! Welcome back.');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP code.');
      resetOtp();
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secretKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Secret key copied!');
  };

  // ── Forgot Password: Verify Identity ──
  const handleForgotVerify = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) return toast.warning('Enter your email or phone.');
    if (forgotOtpString.length < 6) return toast.warning('Enter the 6-digit authenticator code.');

    setLoading(true);
    try {
      const res = await authAPI.forgotPasswordVerify({
        identifier: forgotIdentifier.trim(),
        totpCode: forgotOtpString,
      });
      setResetToken(res.data.resetToken);
      toast.success('Identity verified! Set your new password.');
      setStep('FORGOT_RESET');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed.');
      resetForgotOtp();
      forgotOtpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password: Set New Password ──
  const handleForgotReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.warning('Password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match.');

    setLoading(true);
    try {
      await authAPI.forgotPasswordReset({
        resetToken,
        newPassword,
        confirmPassword,
      });
      toast.success('Password reset successful! Please log in.');
      setStep('CREDENTIALS');
      setEmail(forgotIdentifier);
      setPassword('');
      setForgotIdentifier('');
      setNewPassword('');
      setConfirmPassword('');
      setResetToken(null);
      resetForgotOtp();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed.');
      if (err.response?.status === 401) {
        setStep('FORGOT_VERIFY');
        resetForgotOtp();
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Icons ──
  const UserIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
  const LockIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  );

  return (
    <div className="login-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');

        .login-container {
          position: relative; min-height: 100vh;
          display: flex; flex-direction: column;
          background-color: #4b5463;
          font-family: 'Inter', sans-serif; overflow: hidden;
        }
        .network-canvas {
          position: absolute; top: 0; left: 0;
          width: 100%; height: 100%; z-index: 0; pointer-events: none;
        }
        .glow-overlay {
          position: absolute; top: -200px; left: 50%;
          transform: translateX(-50%);
          width: 800px; height: 500px;
          background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 60%);
          z-index: 1; pointer-events: none;
        }
        .content-wrapper {
          position: relative; z-index: 2; flex: 1;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; padding: 20px;
        }
        .page-header {
          text-align: center; margin-bottom: 50px;
          color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .header-sub {
          font-family: 'Cinzel', serif; font-size: 24px;
          font-weight: 600; letter-spacing: 2px; margin: 0 0 5px 0;
        }
        .header-main {
          font-family: 'Cinzel', serif; font-size: 42px;
          font-weight: 700; letter-spacing: 4px; margin: 0;
          display: flex; align-items: center; justify-content: center; gap: 15px;
        }
        .header-main::before, .header-main::after {
          content: ''; display: block; width: 40px; height: 15px;
          background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" fill="%23cda45e" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 22h20L12 2z"/></svg>') no-repeat center;
          background-size: contain; opacity: 0.8;
        }
        .header-main::after { transform: rotate(180deg); }
        .login-card {
          background: #fff; width: 100%; max-width: 450px;
          border-radius: 12px; padding: 50px 40px 30px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2); position: relative;
        }
        .avatar-top {
          position: absolute; top: -35px; left: 50%;
          transform: translateX(-50%); width: 70px; height: 70px;
          background: #e2e8f0; border-radius: 50%;
          border: 5px solid #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 32px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        .card-title {
          text-align: center; font-size: 20px;
          font-weight: 700; color: #1e293b; margin-bottom: 5px;
        }
        .card-subtitle {
          text-align: center; font-family: 'Cinzel', serif;
          font-size: 16px; font-weight: 700; color: #334155;
          margin-bottom: 30px; letter-spacing: 1px;
        }
        .form-group { margin-bottom: 20px; }
        .form-label {
          display: block; font-size: 13px;
          font-weight: 600; color: #0f172a; margin-bottom: 8px;
        }
        .input-wrapper { position: relative; }
        .input-icon {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%); color: #94a3b8; display: flex;
        }
        .form-input {
          width: 100%; padding: 12px 16px 12px 42px;
          border: 1.5px solid #cbd5e1; border-radius: 6px;
          font-size: 14px; outline: none; transition: border-color 0.2s;
          box-sizing: border-box; color: #1e293b;
        }
        .form-input:focus { border-color: #0f172a; }
        .eye-btn {
          position: absolute; right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #64748b;
        }
        .options-row {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 25px; font-size: 13px;
        }
        .remember-me {
          display: flex; align-items: center; gap: 6px;
          color: #334155; cursor: pointer;
        }
        .forgot-link {
          color: #334155; text-decoration: none; font-weight: 600;
          background: none; border: none; cursor: pointer;
          font-size: 13px; padding: 0; font-family: inherit;
        }
        .forgot-link:hover { text-decoration: underline; }
        .submit-btn {
          width: 100%; background: #0f172a; color: #f8fafc;
          padding: 14px; border: 1px solid #cda45e; border-radius: 6px;
          font-size: 14px; font-weight: 600; letter-spacing: 0.5px;
          cursor: pointer; transition: background 0.2s; margin-bottom: 20px;
        }
        .submit-btn:hover { background: #1e293b; }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .otp-container {
          display: flex; gap: 8px;
          justify-content: space-between; margin-top: 10px;
        }
        .otp-input {
          width: 100%; height: 50px; text-align: center;
          font-size: 20px; font-weight: 700;
          border: 1.5px solid #cbd5e1; border-radius: 6px;
          outline: none; color: #1e293b;
        }
        .otp-input:focus { border-color: #0f172a; }
        .qr-box {
          background: #f8fafc; padding: 15px; border-radius: 8px;
          text-align: center; margin-bottom: 20px; border: 1px solid #e2e8f0;
        }
        .back-btn {
          background: none; border: none; color: #64748b;
          font-size: 13px; cursor: pointer; margin-bottom: 15px;
          display: flex; align-items: center; gap: 5px; padding: 0;
        }
        .bottom-bar {
          background: #fff; padding: 15px; text-align: center;
          font-size: 12px; color: #334155; position: relative; z-index: 2;
        }
        .security-notice {
          background: #eff6ff; border-left: 3px solid #3b82f6;
          padding: 12px; font-size: 12px; color: #1e40af;
          margin-bottom: 20px; border-radius: 0 6px 6px 0; line-height: 1.6;
        }
        .step-indicator {
          display: flex; justify-content: center;
          gap: 8px; margin-bottom: 25px;
        }
        .step-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: #cbd5e1; transition: background 0.3s;
        }
        .step-dot.active { background: #0f172a; }
        .step-dot.done { background: #22c55e; }

        @media (max-width: 600px) {
          .header-main { font-size: 32px; }
          .login-card { padding: 40px 20px 20px; }
        }
      `}</style>

      <canvas ref={canvasRef} className="network-canvas" />
      <div className="glow-overlay"></div>

      <div className="content-wrapper">
        <div className="page-header">
          <h2 className="header-sub">GURUKUL ACADEMY</h2>
          <h1 className="header-main">ADMIN PORTAL</h1>
        </div>

        <div className="login-card">
          {step === 'CREDENTIALS' && <div className="avatar-top">👨‍💼</div>}
          {(step === 'FORGOT_VERIFY' || step === 'FORGOT_RESET') && <div className="avatar-top">🔐</div>}

          {/* ═══════ CREDENTIALS ═══════ */}
          {step === 'CREDENTIALS' && (
            <>
              <h2 className="card-title">Log In</h2>
              <h3 className="card-subtitle">LOG IN TO YOUR ACCOUNT</h3>

              <form onSubmit={handleCredentialSubmit}>
                <div className="form-group">
                  <label className="form-label">Email / Username</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><UserIcon /></span>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter your Email or ID"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label">Password</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><LockIcon /></span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Enter your Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: 'right', marginBottom: '10px' }}>
                  <button
                    type="button"
                    className="forgot-link"
                    onClick={() => {
                      setForgotIdentifier(email);
                      setStep('FORGOT_VERIFY');
                      resetForgotOtp();
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>

                <div className="options-row">
                  <label className="remember-me">
                    <input type="checkbox" defaultChecked />
                    Remember Me
                  </label>
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'AUTHENTICATING...' : 'SIGN IN TO YOUR ACCOUNT'}
                </button>
              </form>
            </>
          )}

          {/* ═══════ SETUP 2FA ═══════ */}
          {step === 'SETUP_2FA' && (
            <>
              <button className="back-btn" onClick={() => setStep('CREDENTIALS')}>← Back</button>
              <h2 className="card-title">Setup 2FA</h2>
              <h3 className="card-subtitle">SECURE YOUR ACCOUNT</h3>

              <div className="qr-box">
                <img src={qrCode} alt="QR Code" style={{ width: '150px', margin: '0 auto 10px' }} />
                <div style={{ fontSize: '11px', color: '#64748b' }}>MANUAL KEY</div>
                <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', marginTop: '5px' }}>
                  <code style={{ background: '#e2e8f0', padding: '4px 8px', borderRadius: '4px' }}>{secretKey}</code>
                  <button onClick={copySecret} style={{ border: 'none', background: '#0f172a', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>
                    {copied ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>

              <form onSubmit={(e) => handleOTPSubmit(e, true)}>
                <div className="form-group">
                  <label className="form-label">Enter 6-digit App Code</label>
                  <div className="otp-container" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input key={i} ref={(el) => (otpRefs.current[i] = el)} type="text" inputMode="numeric" maxLength="1" className="otp-input" value={digit} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(i, e)} autoFocus={i === 0} />
                    ))}
                  </div>
                </div>
                <button type="submit" className="submit-btn" disabled={loading || otpString.length < 6}>
                  {loading ? 'VERIFYING...' : 'VERIFY & ENABLE'}
                </button>
              </form>
            </>
          )}

          {/* ═══════ VERIFY OTP ═══════ */}
          {step === 'VERIFY_OTP' && (
            <>
              <button className="back-btn" onClick={() => setStep('CREDENTIALS')}>← Back</button>
              <h2 className="card-title">Authentication</h2>
              <h3 className="card-subtitle">ENTER AUTHENTICATOR CODE</h3>

              <form onSubmit={(e) => handleOTPSubmit(e, false)}>
                <div className="form-group">
                  <label className="form-label">6-Digit Code</label>
                  <div className="otp-container" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input key={i} ref={(el) => (otpRefs.current[i] = el)} type="text" inputMode="numeric" maxLength="1" className="otp-input" value={digit} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(i, e)} autoFocus={i === 0} />
                    ))}
                  </div>
                </div>
                <div className="options-row">
                  <label className="remember-me">
                    <input type="checkbox" checked={trustDevice} onChange={(e) => setTrustDevice(e.target.checked)} />
                    Trust this device for 30 days
                  </label>
                </div>
                <button type="submit" className="submit-btn" disabled={loading || otpString.length < 6}>
                  {loading ? 'VERIFYING...' : 'VERIFY ACCOUNT'}
                </button>
              </form>
            </>
          )}

          {/* ═══════ FORGOT: VERIFY VIA AUTHENTICATOR ═══════ */}
          {step === 'FORGOT_VERIFY' && (
            <>
              <button className="back-btn" onClick={() => { setStep('CREDENTIALS'); resetForgotOtp(); }}>
                ← Back to Login
              </button>
              <h2 className="card-title">Forgot Password</h2>
              <h3 className="card-subtitle">VERIFY WITH AUTHENTICATOR</h3>

              <div className="step-indicator">
                <div className="step-dot active" />
                <div className="step-dot" />
              </div>

              <div className="security-notice">
                🔐 Open your <strong>Google Authenticator</strong> app and enter the current 6-digit code to verify your identity. No email required.
              </div>

              <form onSubmit={handleForgotVerify}>
                <div className="form-group">
                  <label className="form-label">Email / Phone</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><UserIcon /></span>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter your Email or Phone"
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">6-Digit Authenticator Code</label>
                  <div className="otp-container" onPaste={handleForgotOtpPaste}>
                    {forgotOtp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => (forgotOtpRefs.current[i] = el)}
                        type="text" inputMode="numeric" maxLength="1"
                        className="otp-input" value={digit}
                        onChange={(e) => handleForgotOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleForgotOtpKeyDown(i, e)}
                      />
                    ))}
                  </div>
                </div>

                <button type="submit" className="submit-btn" disabled={loading || forgotOtpString.length < 6 || !forgotIdentifier}>
                  {loading ? 'VERIFYING...' : 'VERIFY & CONTINUE'}
                </button>
              </form>
            </>
          )}

          {/* ═══════ FORGOT: NEW PASSWORD ═══════ */}
          {step === 'FORGOT_RESET' && (
            <>
              <h2 className="card-title">Reset Password</h2>
              <h3 className="card-subtitle">CREATE NEW PASSWORD</h3>

              <div className="step-indicator">
                <div className="step-dot done" />
                <div className="step-dot active" />
              </div>

              <div className="security-notice">
                ✅ Identity verified via Google Authenticator. You have <strong>5 minutes</strong> to set a new password.
              </div>

              <form onSubmit={handleForgotReset}>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><LockIcon /></span>
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      autoFocus
                    />
                    <button type="button" className="eye-btn" onClick={() => setShowNewPass(!showNewPass)}>
                      {showNewPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><LockIcon /></span>
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '15px' }}>
                    ⚠ Passwords do not match
                  </div>
                )}

                <button type="submit" className="submit-btn" disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}>
                  {loading ? 'SAVING...' : 'RESET PASSWORD'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <div className="bottom-bar">
        Copyright © {new Date().getFullYear()} Gurukul Academy. All Rights Reserved.
      </div>
    </div>
  );
};

export default Login;