import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import PaymentSheet from "./PaymentSheet";

import {
  FaCalendarAlt,
  FaChevronDown,
  FaPlus,
  FaCheck,
  FaHistory
} from "react-icons/fa";

const styles = `
.payment-page {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: 4px;
  overflow-x: hidden;
  font-family: 'Inter', sans-serif;
}

.payment-page * {
  box-sizing: border-box;
}

.payment-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

/* ─── Custom Session Dropdown Container ─── */
.session-dropdown-container {
  position: relative;
  user-select: none;
}

.session-trigger-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0 14px;
  height: 42px;
  color: #1e293b;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.session-trigger-btn:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.session-trigger-btn.active {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.session-icon {
  color: #4f46e5;
  font-size: 14px;
}

.session-arrow {
  color: #94a3b8;
  font-size: 11px;
  transition: transform 0.2s ease;
}

.session-arrow.open {
  transform: rotate(180deg);
}

/* ─── Floating Menu ─── */
.session-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  width: 290px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
  z-index: 1000;
  padding: 10px;
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ─── Add Custom Input Box ─── */
.session-custom-input-box {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 4px 8px;
  margin-bottom: 10px;
}

.session-custom-input-box input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: #1e293b;
}

.session-custom-input-box input::placeholder {
  color: #94a3b8;
  font-weight: 400;
}

.session-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  gap: 4px;
}

.session-add-btn:hover {
  background: #4338ca;
}

/* ─── Session List ─── */
.session-list-header {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.5px;
  padding: 4px 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.session-list {
  max-height: 200px;
  overflow-y: auto;
  margin-top: 4px;
  padding-right: 2px;
}

.session-list::-webkit-scrollbar { width: 4px; }
.session-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
}

.session-item:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.session-item.selected {
  background: #eef2ff;
  color: #4f46e5;
  font-weight: 700;
}

.session-item-check {
  color: #4f46e5;
  font-size: 12px;
}

.payment-page-error {
  padding: 13px 16px;
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  border-radius: 10px;
  margin-bottom: 15px;
  font-size: 13px;
}

@media (max-width: 768px) {
  .session-dropdown-container {
    width: 100%;
  }

  .session-trigger-btn {
    width: 100%;
    justify-content: space-between;
  }

  .session-menu {
    width: 100%;
  }
}
`;

const PaymentPage = () => {
  // Current calendar default year
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const defaultYear =
    currentMonth >= 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;

  const [academicYear, setAcademicYear] = useState(defaultYear);
  const [customInput, setCustomInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Store existing created sessions (synced with localStorage & DB)
  const [existingSessions, setExistingSessions] = useState(() => {
    const saved = localStorage.getItem("payment_sessions_list");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return ["2026-2027", "2025-2026", "2024-2025", "2020-2021"];
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const dropdownRef = useRef(null);
  const token = localStorage.getItem("token");

  const api = useMemo(
    () =>
      axios.create({
        baseURL: "/api/payments",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    [token]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Save sessions list to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("payment_sessions_list", JSON.stringify(existingSessions));
  }, [existingSessions]);

  // Fetch created sessions from DB if endpoint exists
  useEffect(() => {
    const fetchCreatedYears = async () => {
      try {
        const res = await api.get("/academic-years");
        if (res.data && Array.isArray(res.data)) {
          const list = res.data
            .map((item) => (typeof item === "string" ? item : item.academicYear || item.year))
            .filter(Boolean);

          setExistingSessions((prev) =>
            Array.from(new Set([...list, ...prev])).sort().reverse()
          );
        }
      } catch (err) {
        // fallback to localStorage
      }
    };

    fetchCreatedYears();
  }, [api]);

  // Handle switching to a selected session
  const selectSession = (year) => {
    if (year === academicYear) {
      setIsOpen(false);
      return;
    }

    if (isSaving) {
      setError("Please wait until saving finishes.");
      return;
    }

    if (hasUnsavedChanges) {
      setError(
        "You have unsaved changes. Save or cancel before changing the academic year."
      );
      return;
    }

    setError("");
    setAcademicYear(year);
    setIsOpen(false);
  };

  // Handle creating & switching to a typed custom session
  const handleAddCustomSession = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;

    if (isSaving) {
      setError("Please wait until saving finishes.");
      return;
    }

    if (hasUnsavedChanges) {
      setError(
        "You have unsaved changes. Save or cancel before changing the academic year."
      );
      return;
    }

    // Add to list if new
    setExistingSessions((prev) =>
      Array.from(new Set([trimmed, ...prev])).sort().reverse()
    );

    setError("");
    setAcademicYear(trimmed);
    setCustomInput("");
    setIsOpen(false);
  };

  return (
    <>
      <style>{styles}</style>

      <div className="payment-page">
        <div className="payment-page-header">

          {/* ─── Interactive Session Dropdown + Custom Input ─── */}
          <div className="session-dropdown-container" ref={dropdownRef}>
            <button
              type="button"
              className={`session-trigger-btn ${isOpen ? "active" : ""}`}
              onClick={() => setIsOpen(!isOpen)}
            >
              <FaCalendarAlt className="session-icon" />
              <span>Session: {academicYear}</span>
              <FaChevronDown className={`session-arrow ${isOpen ? "open" : ""}`} />
            </button>

            {isOpen && (
              <div className="session-menu">
                {/* Custom Year Input Form */}
                <div className="session-custom-input-box">
                  <input
                    type="text"
                    placeholder="Type new (e.g. 2030-32)"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCustomSession();
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="session-add-btn"
                    onClick={handleAddCustomSession}
                  >
                    <FaPlus /> Add
                  </button>
                </div>

                {/* List of Existing / Created Sessions */}
                <div className="session-list-header">
                  <FaHistory /> Existing Sessions
                </div>

                <div className="session-list">
                  {existingSessions.map((year) => {
                    const isSelected = year === academicYear;
                    return (
                      <div
                        key={year}
                        className={`session-item ${isSelected ? "selected" : ""}`}
                        onClick={() => selectSession(year)}
                      >
                        <span>{year}</span>
                        {isSelected && <FaCheck className="session-item-check" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="payment-page-error" role="alert">
            {error}
          </div>
        )}

        <PaymentSheet
          academicYear={academicYear}
          token={token}
          onDirtyChange={setHasUnsavedChanges}
          onSavingChange={setIsSaving}
        />
      </div>
    </>
  );
};

export default PaymentPage;