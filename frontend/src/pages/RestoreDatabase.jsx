import React, { useState } from "react";
import axios from "axios";
import { FaUpload, FaExclamationTriangle, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";

const styles = `
.restore-overlay {
  position: fixed; inset: 0; background: rgba(15,23,42,0.8); backdrop-filter: blur(5px);
  display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 20px;
}
.restore-modal {
  background: #fff; width: 100%; max-width: 480px; border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); position: relative;
  padding: 30px 24px; font-family: 'Inter', sans-serif;
}
.restore-header { text-align: center; margin-bottom: 20px; }
.restore-icon-wrapper {
  width: 70px; height: 70px; background: #fef2f2; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;
  color: #dc2626; font-size: 28px; box-shadow: 0 0 0 8px #fee2e2;
}
.restore-title { font-size: 22px; font-weight: 800; color: #111827; margin: 0 0 8px 0; }
.restore-desc { font-size: 14px; color: #4b5563; line-height: 1.5; margin: 0; }
.restore-warning-box {
  background: #fff5f5; border: 1px solid #fecaca; padding: 12px; border-radius: 10px;
  color: #991b1b; font-size: 13px; font-weight: 600; margin-bottom: 20px;
  display: flex; gap: 10px; align-items: flex-start;
}
.restore-field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
.restore-field label { font-size: 12px; font-weight: 700; color: #374151; text-transform: uppercase; }
.restore-file-input {
  border: 2px dashed #d1d5db; padding: 15px; border-radius: 10px; text-align: center;
  cursor: pointer; font-size: 13px; color: #6b7280; background: #f9fafb; transition: 0.2s;
}
.restore-file-input:hover { border-color: #4f46e5; background: #eef2ff; color: #4f46e5; }
.restore-text-input {
  width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 10px;
  font-size: 14px; outline: none; transition: 0.2s; box-sizing: border-box;
}
.restore-text-input:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.1); }
.restore-btn {
  width: 100%; padding: 14px; border-radius: 12px; font-size: 15px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;
  border: none; color: white; background: #dc2626; transition: 0.2s;
}
.restore-btn:hover:not(:disabled) { background: #b91c1c; }
.restore-btn:disabled { opacity: 0.5; cursor: not-allowed; background: #ef4444; }
.restore-close {
  position: absolute; top: 16px; right: 16px; background: transparent; border: none;
  font-size: 20px; color: #9ca3af; cursor: pointer;
}
.restore-close:hover { color: #111827; }
`;

const RestoreDatabase = ({ token }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleRestore = async () => {
    if (!file) {
      return toast.error("Please select a backup file first.");
    }
    
    // Ensure they typed RESTORE
    if (confirmText !== "RESTORE") {
      return toast.error("Please type RESTORE to confirm.");
    }

    const formData = new FormData();
    formData.append("backupFile", file);

    setLoading(true);
    try {
      // Replace with your actual backend URL
      const response = await axios.post("http://localhost:5000/api/backup/restore", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success(response.data.message || "Database restored successfully!");
      
      // Auto reload the page after 2 seconds to fetch the newly restored data
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to restore database.");
    } finally {
      setLoading(false);
      setIsOpen(false);
      setFile(null);
      setConfirmText("");
    }
  };

  return (
    <>
      <style>{styles}</style>
      
      {/* Button to open the Modal (Place this in your Admin Settings page) */}
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca",
          padding: "10px 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: "8px"
        }}
      >
        <FaUpload /> Restore Database
      </button>

      {isOpen && (
        <div className="restore-overlay" onClick={() => !loading && setIsOpen(false)}>
          <div className="restore-modal" onClick={(e) => e.stopPropagation()}>
            <button className="restore-close" onClick={() => !loading && setIsOpen(false)}>
              <FaTimes />
            </button>

            <div className="restore-header">
              <div className="restore-icon-wrapper">
                <FaExclamationTriangle />
              </div>
              <h2 className="restore-title">Restore Database</h2>
              <p className="restore-desc">Upload a `.gz` backup file to revert the system.</p>
            </div>

            <div className="restore-warning-box">
              <FaExclamationTriangle style={{ fontSize: "20px", flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>DANGER:</strong> This action will permanently erase current live data and replace it with the uploaded backup. This cannot be undone.
              </div>
            </div>

            <div className="restore-field">
              <label>1. Select Backup File (.gz)</label>
              <input 
                type="file" 
                accept=".gz" 
                onChange={handleFileChange} 
                className="restore-file-input"
                disabled={loading}
              />
              {file && <span style={{fontSize: '12px', color: '#10b981', fontWeight: 'bold'}}>Selected: {file.name}</span>}
            </div>

            <div className="restore-field">
              <label>2. Type "RESTORE" to confirm</label>
              <input 
                type="text" 
                placeholder="RESTORE" 
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="restore-text-input"
                disabled={loading}
              />
            </div>

            <button 
              className="restore-btn" 
              onClick={handleRestore}
              disabled={loading || !file || confirmText !== "RESTORE"}
            >
              {loading ? "Restoring Database... Do not close!" : "Restore Now"}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default RestoreDatabase;