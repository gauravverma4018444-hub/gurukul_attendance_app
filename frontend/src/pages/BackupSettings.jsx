import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { 
  FaDatabase, 
  FaDownload, 
  FaUpload, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaHistory 
} from "react-icons/fa";

const styles = `
.backup-page {
  padding: 30px; max-width: 1000px; margin: 0 auto;
  font-family: 'Inter', sans-serif; color: #1f2937;
}
.backup-header { margin-bottom: 30px; }
.backup-header h1 { font-size: 24px; font-weight: 800; margin: 0 0 8px 0; display: flex; align-items: center; gap: 10px;}
.backup-header p { font-size: 14px; color: #6b7280; margin: 0; }
.backup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
@media (max-width: 768px) { .backup-grid { grid-template-columns: 1fr; } }
.backup-card {
  background: #fff; border-radius: 16px; padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
  border: 1px solid #e5e7eb; display: flex; flex-direction: column;
}
.card-icon {
  width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
  font-size: 20px; margin-bottom: 16px; flex-shrink: 0;
}
.icon-green { background: #dcfce7; color: #10b981; }
.icon-red { background: #fee2e2; color: #ef4444; }
.card-title { font-size: 18px; font-weight: 700; margin: 0 0 8px 0; }
.card-desc { font-size: 13px; color: #4b5563; line-height: 1.5; margin: 0 0 20px 0; flex: 1; }
.last-backup {
  font-size: 12px; font-weight: 600; color: #059669; display: flex; align-items: center; gap: 6px;
  background: #ecfdf5; padding: 8px 12px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #a7f3d0;
}
.danger-box {
  background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 8px;
  color: #b91c1c; font-size: 12px; font-weight: 600; margin-bottom: 20px; display: flex; gap: 8px;
}
.file-input-wrapper {
  border: 2px dashed #d1d5db; padding: 20px; border-radius: 12px; text-align: center;
  margin-bottom: 16px; cursor: pointer; transition: 0.2s; background: #f9fafb;
}
.file-input-wrapper:hover { border-color: #ef4444; background: #fef2f2; }
.file-input-wrapper input { display: none; }
.file-name { font-size: 13px; font-weight: 700; color: #ef4444; margin-top: 8px; display: block; }
.confirm-input {
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #d1d5db;
  font-size: 14px; outline: none; margin-bottom: 20px; transition: 0.2s; box-sizing: border-box;
}
.confirm-input:focus { border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }
.btn {
  width: 100%; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; gap: 8px; border: none; cursor: pointer; transition: 0.2s;
}
.btn-primary { background: #10b981; color: white; }
.btn-primary:hover:not(:disabled) { background: #059669; }
.btn-danger { background: #ef4444; color: white; }
.btn-danger:hover:not(:disabled) { background: #dc2626; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const BackupSettings = ({ token }) => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);
  
  const [restoreFile, setRestoreFile] = useState(null);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    // Check local storage for the last downloaded backup date
    const last = localStorage.getItem("lastBackupDate");
    if (last) setLastBackup(last);
  }, []);

  // =====================================
  // GENERATE & DOWNLOAD BACKUP
  // =====================================
  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      // NOTE: Update baseURL according to your setup
      const response = await axios.get("https://gurukul-attendance-app-2.onrender.com9425336363/api/backup/generate", {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob", // Important for receiving files
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Gurukul_DB_Backup_${new Date().toISOString().slice(0, 10)}.gz`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Database Backup Downloaded!");
      
      // Update last backup time
      const now = new Date().toLocaleString();
      localStorage.setItem("lastBackupDate", now);
      localStorage.setItem("lastBackupPromptTime", Date.now().toString()); // Resets the 24h prompt
      setLastBackup(now);

    } catch (error) {
      console.error(error);
      toast.error("Failed to generate backup.");
    } finally {
      setIsBackingUp(false);
    }
  };

  // =====================================
  // RESTORE DATABASE
  // =====================================
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setRestoreFile(e.target.files[0]);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) return toast.error("Please upload a .gz backup file.");
    if (confirmText !== "RESTORE") return toast.error("Type RESTORE to confirm.");

    setIsRestoring(true);
    const formData = new FormData();
    formData.append("backupFile", restoreFile);

    try {
      const response = await axios.post("https://gurukul-attendance-app-2.onrender.com9425336363/api/backup/restore", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success(response.data.message || "Database restored successfully!");
      setRestoreFile(null);
      setConfirmText("");
      
      // Force reload to fetch the restored data cleanly
      setTimeout(() => window.location.reload(), 2000);

    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to restore database.");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="backup-page">
      <style>{styles}</style>
      
      <div className="backup-header">
        <h1><FaDatabase /> Database Management</h1>
        <p>Securely backup your system data or restore from a previous version.</p>
      </div>

      <div className="backup-grid">
        
        {/* DOWNLOAD BACKUP CARD */}
        <div className="backup-card">
          <div className="card-icon icon-green"><FaDownload /></div>
          <h3 className="card-title">Export & Backup</h3>
          <p className="card-desc">
            Download a compressed <b>.gz</b> file containing all students, payments, attendance, and settings. Store this safely on your device.
          </p>
          
          {lastBackup && (
            <div className="last-backup">
              <FaCheckCircle /> Last Backup: {lastBackup}
            </div>
          )}

          <button 
            className="btn btn-primary" 
            onClick={handleBackup} 
            disabled={isBackingUp || isRestoring}
          >
            {isBackingUp ? "Packaging Data..." : "Generate Backup Now"}
          </button>
        </div>

        {/* RESTORE BACKUP CARD */}
        <div className="backup-card">
          <div className="card-icon icon-red"><FaUpload /></div>
          <h3 className="card-title">Restore System</h3>
          <p className="card-desc">
            Upload a previously downloaded <b>.gz</b> backup file to revert the entire system.
          </p>
          
          <div className="danger-box">
            <FaExclamationTriangle style={{ fontSize: '16px', marginTop: '2px' }} />
            <span><b>DANGER:</b> Restoring will permanently delete all current data and replace it with the backup file.</span>
          </div>

          <label className="file-input-wrapper">
            <input type="file" accept=".gz" onChange={handleFileChange} disabled={isRestoring || isBackingUp} />
            <FaHistory style={{ fontSize: '24px', color: '#9ca3af', marginBottom: '8px' }} />
            <div style={{ fontSize: '13px', color: '#4b5563', fontWeight: '600' }}>
              Click to browse or drag .gz file here
            </div>
            {restoreFile && <span className="file-name">{restoreFile.name}</span>}
          </label>

          <input 
            type="text" 
            className="confirm-input" 
            placeholder="Type RESTORE to confirm" 
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={isRestoring || isBackingUp || !restoreFile}
          />

          <button 
            className="btn btn-danger" 
            onClick={handleRestore} 
            disabled={isRestoring || isBackingUp || !restoreFile || confirmText !== "RESTORE"}
          >
            {isRestoring ? "Restoring Data (Do not close)..." : "Restore Database"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default BackupSettings;