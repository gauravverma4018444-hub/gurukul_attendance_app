import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { authAPI } from '../api/api';

const AuthContext = createContext(null);

// 1 hour idle timeout
const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'lastActivityAt';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const idleTimerRef = useRef(null);

  // 1. CLEAR TIMER HELPER
  const clearIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };

  // 2. LOGOUT CALLBACK
  const logout = useCallback(() => {
    clearIdleTimer();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    setUser(null);
    setToken(null);
  }, []);

  // 3. TOUCH ACTIVITY CALLBACK (MUST BE DEFINED BEFORE useEffect HOOKS)
  const touchActivity = useCallback(() => {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    clearIdleTimer();

    idleTimerRef.current = setTimeout(() => {
      logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }, IDLE_TIMEOUT_MS);
  }, [logout]);

  // 4. RESTORE SESSION useEffect
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);

    if (storedUser && storedToken) {
      const idleFor = lastActivity ? Date.now() - lastActivity : 0;

      if (lastActivity && idleFor > IDLE_TIMEOUT_MS) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        setUser(null);
        setToken(null);
      } else {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
        touchActivity();
      }
    }

    setLoading(false);
  }, [touchActivity]);

  // 5. ACTIVITY LISTENERS useEffect
  useEffect(() => {
    if (!user) {
      clearIdleTimer();
      return;
    }

    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    const onActivity = () => touchActivity();
    events.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true })
    );

    touchActivity();

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearIdleTimer();
    };
  }, [user, touchActivity]);

  // LOGIN & AUTH HELPERS
  const finishLoginProcess = (newToken, trustedToken, data) => {
    if (data.role !== 'admin') {
      throw new Error('Unauthorized: Only admins can access the web portal.');
    }

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(data));

    if (trustedToken) {
      localStorage.setItem('trustedDeviceToken', trustedToken);
    }

    setUser(data);
    setToken(newToken);
    touchActivity();
    return data;
  };

  const login = async (email, password) => {
    const trustedToken = localStorage.getItem('trustedDeviceToken');

    const response = await authAPI.login({
      identifier: email,
      password,
      trustedToken,
    });

    const result = response.data;

    if (result.requires2FA || result.requiresSetup2FA) {
      return result;
    }

    return finishLoginProcess(result.token, result.trustedToken, result.data);
  };

  const verifyOTP = async (tempUserId, otp, trustDevice, isSetup = false) => {
    const response = await authAPI.verify2FA({
      tempUserId,
      otp,
      trustDevice,
      isSetup,
    });

    const result = response.data;
    return finishLoginProcess(result.token, result.trustedToken, result.data);
  };

  const revokeTrustAndLogout = () => {
    clearIdleTimer();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('trustedDeviceToken');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        verifyOTP,
        logout,
        revokeTrustAndLogout,
        loading,
        touchActivity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};