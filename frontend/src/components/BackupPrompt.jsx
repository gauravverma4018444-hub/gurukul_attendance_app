import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaDatabase, FaTimes, FaDownload, FaClock } from "react-icons/fa";

const styles = `
.backup-overlay {
  position: fixed; inset: 0; background: rgba(15,23,42,0.7); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 20px;
}
.backup-modal {
  background: #fff; width: 100%; max-width: 450px; border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); overflow: hidden; position: relative;
  text-align: center; padding: 30px 24px; font-family: 'Inter', sans-serif;
}
.backup-icon-wrapper {
  width: 70px; height: 70px; background: #ecfdf5; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;
  color: #10b981; font-size: 28px; box-shadow: 0 0 0 8px #d1fae5;
}
.backup-title { font-size: 20px; font-weight: 800; color: #111827; margin: 0 0 10px 0; }
.backup-desc { font-size: 14px; color: #4b5563; line-height: 1.5; margin: 0 0 24px 0; }
.backup-actions { display: flex; flex-direction: column; gap: 12px; }
.backup-btn {
  width: 100%; padding: 14px; border-radius: 12px; font-size: 14px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;
  border: none; outline: none;
}
.backup-btn-primary { background: #10b981; color: white; }
.backup-btn-primary:hover { background: #059669; }
.backup-btn-secondary { background: #f3f4f6; color: #4b5563; }
.backup-btn-secondary:hover { background: #e5e7eb; }
.backup-close {
  position: absolute; top: 16px; right: 16px; background: transparent; border: none;
  font-size: 18px; color: #9ca3af; cursor: pointer;
}
`;

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

const BackupPrompt = ({ isAdmin }) => {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) return;

    const last = localStorage.getItem("lastBackupPromptTime");
    const now = Date.now();

    if (!last || now - parseInt(last, 10) > TWENTY_FOUR_HOURS) {
      const t = setTimeout(() => setShow(true), 2500);
      return () => clearTimeout(t);
    }
  }, [isAdmin]);

  const dismiss = () => {
    localStorage.setItem("lastBackupPromptTime", Date.now().toString());
    setShow(false);
  };

  const goBackup = () => {
    dismiss();
    navigate("/settings/backup");
  };

  if (!show) return null;

  return (
    <>
      <style>{styles}</style>
      <div className="backup-overlay">
        <div className="backup-modal">
          <button className="backup-close" onClick={dismiss} title="Dismiss">
            <FaTimes />
          </button>

          <div className="backup-icon-wrapper">
            <FaDatabase />
          </div>

          <h2 className="backup-title">Daily Database Backup</h2>
          <p className="backup-desc">
            It’s been 24 hours since your last backup reminder. Please download a fresh
            database backup to keep student, payment, and attendance data safe.
          </p>

          <div className="backup-actions">
            <button className="backup-btn backup-btn-primary" onClick={goBackup}>
              <FaDownload /> Go to Backup Settings
            </button>
            <button className="backup-btn backup-btn-secondary" onClick={dismiss}>
              <FaClock /> Remind Me Tomorrow
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default BackupPrompt;