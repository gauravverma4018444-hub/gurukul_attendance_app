import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import {
  FaTimes,
  FaPrint,
  FaMoneyBillWave,
  FaReceipt,
  FaSpinner,
  FaHistory,
} from "react-icons/fa";

const INSTITUTE = {
  name: "GURUKUL ACADEMY",
  address: "Gwalior - 474012",
  phone: "+91 9981731481",
  email: "omkargurukul@gmail.com",
};

const modalStyles = `
/* ─── OVERLAY ─── */
.rcpt-overlay {
  position: fixed; inset: 0; background: rgba(15,23,42,0.6); z-index: 10000;
  display: flex; align-items: center; justify-content: center;
  padding: 0;
  font-family: 'Inter', sans-serif;
}

/* ─── MODAL CONTAINER ─── */
.rcpt-modal {
  background: #fff; border-radius: 0; width: 100%; height: 100%;
  max-height: 100vh; max-width: 100vw;
  overflow: hidden; display: flex; flex-direction: column;
  box-shadow: 0 30px 60px rgba(0,0,0,0.3);
}

@media (min-width: 640px) {
  .rcpt-overlay { padding: 20px; }
  .rcpt-modal {
    border-radius: 14px;
    max-width: 720px;
    max-height: 92vh;
    height: auto;
    width: 100%;
  }
}

/* ─── HEADER ─── */
.rcpt-modal-header {
  padding: 14px 16px;
  background: #4f46e5; color: white;
  display: flex; justify-content: space-between; align-items: center;
  flex-shrink: 0; gap: 10px;
}
.rcpt-modal-header h2 {
  font-size: 14px; font-weight: 700;
  display: flex; align-items: center; gap: 8px; margin: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  min-width: 0; flex: 1;
}
@media (min-width: 640px) {
  .rcpt-modal-header { padding: 16px 22px; }
  .rcpt-modal-header h2 { font-size: 17px; }
}
.rcpt-modal-header button {
  background: rgba(255,255,255,0.2); color: #fff; border: none;
  width: 36px; height: 36px; min-width: 36px; border-radius: 8px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; flex-shrink: 0;
}

/* ─── BODY ─── */
.rcpt-modal-body {
  padding: 16px;
  overflow-y: auto; flex: 1;
  -webkit-overflow-scrolling: touch;
}
@media (min-width: 640px) {
  .rcpt-modal-body { padding: 20px; }
}

/* ─── TABS ─── */
.rcpt-tabs {
  display: flex; gap: 0;
  border-bottom: 1px solid #e5e7eb; margin-bottom: 14px;
}
.rcpt-tab {
  padding: 12px 14px;
  background: transparent; border: none;
  border-bottom: 2.5px solid transparent;
  cursor: pointer; font-size: 13px;
  font-weight: 600; color: #6b7280;
  display: flex; align-items: center; gap: 6px;
  flex: 1; justify-content: center;
  white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.2s, border-color 0.2s;
}
.rcpt-tab.active {
  color: #4f46e5;
  border-bottom-color: #4f46e5;
}
@media (min-width: 640px) {
  .rcpt-tab {
    flex: none;
    padding: 10px 16px;
    justify-content: flex-start;
  }
}

/* ─── FORM GRID ─── */
.rcpt-form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
@media (min-width: 480px) {
  .rcpt-form-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (min-width: 640px) {
  .rcpt-form-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 14px;
  }
}

/* ─── FIELD ─── */
.rcpt-field { display: flex; flex-direction: column; gap: 5px; }
.rcpt-field label {
  font-size: 11px; font-weight: 600; color: #374151;
  text-transform: uppercase; letter-spacing: 0.3px;
}
.rcpt-field input, .rcpt-field select {
  height: 44px; padding: 0 12px;
  border: 1px solid #d1d5db; border-radius: 10px;
  font-size: 15px; outline: none; font-family: inherit; background: #fff;
  width: 100%; box-sizing: border-box;
  -webkit-appearance: none;
  appearance: none;
}
@media (min-width: 640px) {
  .rcpt-field input, .rcpt-field select {
    height: 38px; font-size: 13px; border-radius: 8px;
  }
}
.rcpt-field input:focus, .rcpt-field select:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
}
.rcpt-field input.rcpt-input-error {
  border-color: #dc2626 !important;
  box-shadow: 0 0 0 3px rgba(220,38,38,0.12) !important;
  background: #fef2f2;
}
.rcpt-field input:disabled {
  background: #f3f4f6; color: #6b7280; cursor: not-allowed;
}

/* ─── HINTS ─── */
.rcpt-field-hint {
  font-size: 11px; color: #6b7280;
  margin-top: 2px; line-height: 1.4;
}
.rcpt-field-hint.error { color: #dc2626; font-weight: 600; }

/* ─── SECTION TITLE ─── */
.rcpt-section-title {
  font-size: 13px; font-weight: 700; color: #1f2937;
  margin: 18px 0 10px; padding-bottom: 6px;
  border-bottom: 1px solid #e5e7eb;
}

/* ─── FOOTER ─── */
.rcpt-footer {
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  display: flex; justify-content: stretch; gap: 10px;
  background: #f9fafb; flex-shrink: 0;
  flex-direction: column;
}
@media (min-width: 480px) {
  .rcpt-footer {
    flex-direction: row;
    justify-content: flex-end;
    padding: 14px 22px;
  }
}

/* ─── BUTTONS ─── */
.rcpt-btn {
  padding: 12px 18px; border-radius: 10px; font-size: 14px; font-weight: 600;
  border: none; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  -webkit-tap-highlight-color: transparent;
  width: 100%;
  min-height: 48px;
}
@media (min-width: 480px) {
  .rcpt-btn {
    width: auto;
    min-height: auto;
    padding: 10px 18px;
    font-size: 13px;
    border-radius: 8px;
  }
}
.rcpt-btn-cancel { background: #fff; color: #374151; border: 1px solid #d1d5db; }
.rcpt-btn-primary { background: #4f46e5; color: #fff; }
.rcpt-btn-success { background: #059669; color: #fff; }
.rcpt-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.rcpt-btn:active:not(:disabled) { transform: scale(0.98); }

/* ─── HISTORY ─── */
.rcpt-history-list { display: flex; flex-direction: column; gap: 10px; }
.rcpt-history-item {
  padding: 14px; background: #f9fafb;
  border: 1px solid #e5e7eb; border-radius: 10px;
  display: flex; flex-direction: column; gap: 10px;
}
@media (min-width: 480px) {
  .rcpt-history-item {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border-radius: 8px;
  }
}
.rcpt-history-item .rcpt-btn {
  width: 100%;
}
@media (min-width: 480px) {
  .rcpt-history-item .rcpt-btn {
    width: auto;
    min-width: 110px;
  }
}

/* ─── INFO / ERROR BOXES ─── */
.rcpt-error-box {
  background: #fef2f2; color: #b91c1c;
  padding: 12px 14px; border-radius: 10px;
  margin-bottom: 14px; font-size: 13px;
  border: 1px solid #fecaca;
  line-height: 1.5;
}
.rcpt-info-badge {
  background: #eff6ff; color: #1d4ed8;
  padding: 12px 14px; border-radius: 10px;
  font-size: 12px; margin-bottom: 14px;
  border: 1px solid #bfdbfe;
  display: flex; flex-direction: column; gap: 6px;
}
@media (min-width: 480px) {
  .rcpt-info-badge {
    flex-direction: row;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
}
.rcpt-info-badge strong { font-weight: 700; }

/* ─── PRINT ─── */
.rcpt-print-area { display: none; }
@media print {
  body * { visibility: hidden !important; }
  .rcpt-print-area, .rcpt-print-area * { visibility: visible !important; }
  .rcpt-print-area {
    display: block !important; position: absolute; top: 0; left: 0; width: 100%;
    background: #fff; padding: 0; margin: 0;
  }
  @page { size: A4; margin: 10mm; }
}
.rcpt-print-page { width: 100%; color: #000; font-family: Arial, sans-serif; }
.rcpt-print-copy {
  position: relative; border: 2px solid #000; padding: 15px 20px;
  margin-bottom: 25px; page-break-inside: avoid; overflow: hidden; background: #fff;
}
.rcpt-watermark {
  position: absolute; top: 55%; left: 50%; transform: translate(-50%, -50%);
  text-align: center; z-index: 0; opacity: 0.08; pointer-events: none; width: 80%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.rcpt-watermark svg { width: 160px; height: 160px; margin-bottom: 5px; color: #000; }
.rcpt-watermark-text {
  font-size: 38px; font-weight: 900; letter-spacing: 4px; color: #000; white-space: nowrap;
}
.rcpt-print-header, .rcpt-print-title, .rcpt-print-meta,
.rcpt-print-table, .rcpt-amount-table, .rcpt-print-footer {
  position: relative; z-index: 10;
}
.rcpt-print-table, .rcpt-amount-table {
  width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 15px;
}
.rcpt-print-table td, .rcpt-amount-table th, .rcpt-amount-table td {
  border: 1px solid #000; padding: 6px 10px; background: transparent;
}
.rcpt-print-table td.lbl, .rcpt-amount-table th, .rcpt-total-row td {
  background: rgba(240, 240, 240, 0.8) !important;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; font-weight: bold;
}
`;

const numberToWords = (num) => {
  if (!num || num === 0) return "Zero Only";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const inWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + inWords(n % 100) : "");
    return "";
  };
  let n = Math.floor(Number(num) || 0);
  let output = "";
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) output += inWords(crore) + " Crore ";
  if (lakh) output += inWords(lakh) + " Lakh ";
  if (thousand) output += inWords(thousand) + " Thousand ";
  if (n) output += inWords(n);
  return (output.trim() || "Zero") + " Only";
};

const formatDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const getRowVal = (row, key) => {
  if (!key || !row?.data) return "";
  if (typeof row.data.get === "function") return row.data.get(key) ?? "";
  return row.data[key] ?? "";
};

const findColKey = (columns, keywords) => {
  const list = columns || [];
  for (const col of list) {
    const lbl = String(col.label || "").toLowerCase();
    if (keywords.some((k) => lbl.includes(k))) return col.key;
  }
  return null;
};

const ReceiptModal = ({
  row,
  columns = [],
  token,
  academicYear,
  onClose,
  onReceiptGenerated,
}) => {
  const [tab, setTab] = useState("new");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [printData, setPrintData] = useState(null);

  const student = row?.student || {};

  const totalFeesKey = useMemo(
    () => findColKey(columns, ["total fee", "total fees", "annual"]),
    [columns]
  );
  const receivedKey = useMemo(
    () => findColKey(columns, ["received", "paid", "collected"]),
    [columns]
  );
  const remainingKey = useMemo(
    () => findColKey(columns, ["remaining", "balance", "due", "pending"]),
    [columns]
  );

  const sheetTotalFees = Number(getRowVal(row, totalFeesKey)) || 0;
  const sheetReceived = Number(getRowVal(row, receivedKey)) || 0;

  const [form, setForm] = useState({
    name: "",
    studentId: "",
    className: "",
    section: "",
    parentPhone: "",
    amount: "",
    paymentMode: "Cash",
    paymentDate: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    setForm({
      name: student.name || getRowVal(row, "name") || "",
      studentId: student.studentId || getRowVal(row, "studentId") || "",
      className: student.className || getRowVal(row, "className") || "",
      section: student.section || getRowVal(row, "section") || "",
      parentPhone:
        student.parentPhone ||
        student.phone ||
        getRowVal(row, "parentPhone") ||
        getRowVal(row, "phone") ||
        getRowVal(row, "mobile") ||
        "",
      amount: "",
      paymentMode: "Cash",
      paymentDate: new Date().toISOString().slice(0, 10),
    });
    setError("");
  }, [row?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const API_BASE = import.meta.env.VITE_API_URL || 'https://gurukul-attendance-app-2.onrender.com/api';

  const api = useMemo(
    () =>
      axios.create({
        baseURL: `${API_BASE}/payments`,
        headers: { Authorization: `Bearer ${token}` },
      }),
    [token, API_BASE]
  );

  const loadHistory = useCallback(async () => {
    if (!row?._id) return;
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/rows/${row._id}/receipts`);
      setHistory(res.data?.data?.payments || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to load receipts");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [row?._id, api]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "amount" && error) setError("");
  };

  const historyPaid = history.reduce(
    (sum, r) => sum + (Number(r.amount) || 0),
    0
  );

  const paidTillDate = sheetReceived > 0 ? sheetReceived : historyPaid;

  const maxPayable =
    sheetTotalFees > 0 ? Math.max(0, sheetTotalFees - paidTillDate) : null;

  const amountNum = Number(form.amount);
  const hasAmount = form.amount !== "" && form.amount !== null;
  const isAmountPositive = hasAmount && Number.isFinite(amountNum) && amountNum > 0;
  const isOverLimit =
    maxPayable !== null && isAmountPositive && amountNum > maxPayable + 0.0001;
  const isFullyPaid = maxPayable === 0 && sheetTotalFees > 0;

  const remainingPreview =
    sheetTotalFees > 0
      ? Math.max(0, sheetTotalFees - paidTillDate - (isAmountPositive ? amountNum : 0))
      : 0;

  const canGenerate =
    !saving &&
    !loading &&
    isAmountPositive &&
    !isOverLimit &&
    !isFullyPaid &&
    form.name.trim();

  const handleGenerate = async () => {
    setError("");
    const amt = Number(form.amount);

    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid amount greater than 0.");
      return;
    }

    if (!form.name.trim()) {
      setError("Student name is required.");
      return;
    }

    const totalFee = sheetTotalFees;
    const prevPaid = paidTillDate;
    const remainingNow =
      totalFee > 0 ? Math.max(0, totalFee - prevPaid) : null;

    if (remainingNow !== null && amt > remainingNow + 0.0001) {
      setError(
        remainingNow === 0
          ? `Full fees already received (₹${totalFee.toLocaleString("en-IN")}). No further payment needed.`
          : `Paying amount (₹${amt.toLocaleString("en-IN")}) cannot exceed remaining balance (₹${remainingNow.toLocaleString("en-IN")}).`
      );
      return;
    }

    try {
      setSaving(true);

      const newTotalPaid = prevPaid + amt;
      const newBalance =
        totalFee > 0 ? Math.max(0, totalFee - newTotalPaid) : 0;

      let paymentStatus = "Partial";
      if (totalFee > 0 && newTotalPaid >= totalFee) paymentStatus = "Paid";
      else if (newTotalPaid <= 0) paymentStatus = "Unpaid";

      const payload = {
        amount: amt,
        feeHead: "Amount Paid",
        paymentMode: form.paymentMode,
        paymentDate: form.paymentDate,
        totalFee: totalFee || null,
        details: {
          name: form.name,
          studentId: form.studentId,
          className: form.className,
          section: form.section,
          parentPhone: form.parentPhone,
        },
      };

      const res = await api.post(`/rows/${row._id}/receipts`, payload);
      const receipt = res.data?.data?.receipt;

      if (receipt) {
        setPrintData(receipt);
        setTimeout(() => window.print(), 350);
      }

      onReceiptGenerated?.({
        rowId: row._id,
        totalPaid: newTotalPaid,
        balance: newBalance,
        totalFee,
        paymentStatus,
        columnKeys: {
          received: receivedKey,
          remaining: remainingKey,
          totalFees: totalFeesKey,
        },
        rawRowData: res.data?.data?.rowData || {},
      });

      await loadHistory();
      setForm((prev) => ({ ...prev, amount: "" }));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to generate receipt.");
    } finally {
      setSaving(false);
    }
  };

  const handleReprint = (receipt) => {
    setPrintData(receipt);
    setTimeout(() => window.print(), 250);
  };

  const renderCopy = (label, data) => {
    const amt = Number(data.amount) || 0;

    return (
      <div className="rcpt-print-copy">
        <div className="rcpt-watermark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            <path d="M12 2v20" />
          </svg>
          <div className="rcpt-watermark-text">{INSTITUTE.name}</div>
        </div>

        <div className="rcpt-print-header" style={{ textAlign: "center", borderBottom: "1px solid #000", paddingBottom: 10, marginBottom: 10 }}>
          <div style={{ position: "absolute", top: 0, right: 0, fontSize: 11, fontWeight: "bold" }}>
            [ {label} COPY ]
          </div>
          <h1 style={{ fontSize: 26, margin: "0 0 4px 0", textTransform: "uppercase" }}>
            {INSTITUTE.name}
          </h1>
          <p style={{ margin: "2px 0", fontSize: 12 }}>{INSTITUTE.address}</p>
          <p style={{ margin: "2px 0", fontSize: 12 }}>
            Phone: {INSTITUTE.phone} | Email: {INSTITUTE.email}
          </p>
        </div>

        <div className="rcpt-print-title" style={{ textAlign: "center", fontSize: 16, fontWeight: "bold", margin: "12px 0" }}>
          FEE RECEIPT
        </div>

        <div className="rcpt-print-meta" style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
          <div><strong>Receipt No:</strong> {data.receiptNo}</div>
          <div><strong>Date:</strong> {formatDate(data.paymentDate)}</div>
          <div><strong>Academic Year:</strong> {data.academicYear || academicYear}</div>
        </div>

        <table className="rcpt-print-table">
          <tbody>
            <tr>
              <td className="lbl" style={{ width: "22%" }}>Student Name</td>
              <td colSpan={3}>{data.details?.name || "-"}</td>
            </tr>
            <tr>
              <td className="lbl">Student ID</td>
              <td style={{ width: "28%" }}>{data.details?.studentId || "-"}</td>
              <td className="lbl" style={{ width: "22%" }}>Class / Section</td>
              <td style={{ width: "28%" }}>
                {data.details?.className || "-"}
                {data.details?.section ? ` - ${data.details.section}` : ""}
              </td>
            </tr>
            <tr>
              <td className="lbl">Parent Mobile</td>
              <td>{data.details?.parentPhone || "-"}</td>
              <td className="lbl">Payment Mode</td>
              <td>{data.paymentMode || "-"}</td>
            </tr>
          </tbody>
        </table>

        <table className="rcpt-amount-table">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Particulars</th>
              <th style={{ textAlign: "right", width: "30%" }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Amount Paid</td>
              <td style={{ textAlign: "right", fontWeight: "bold" }}>{amt.toFixed(2)}</td>
            </tr>
            <tr className="rcpt-total-row">
              <td>TOTAL PAID (This Receipt)</td>
              <td style={{ textAlign: "right" }}>₹ {amt.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ fontStyle: "italic", borderTop: "1px solid #000" }}>
                <strong>Amount in Words:</strong> {numberToWords(amt)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="rcpt-print-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 20 }}>
          <div style={{ fontSize: 12 }}>
            <p style={{ margin: "0 0 5px 0" }}>
              <strong>Received By:</strong> ______________________
            </p>
            <p style={{ fontSize: 10, margin: 0, color: "#444" }}>
              * This is a system generated receipt.
            </p>
          </div>
          <div style={{ textAlign: "center", width: 160, fontSize: 12 }}>
            <div style={{ borderTop: "1px solid #000", marginBottom: 5 }} />
            Authorized Signature
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{modalStyles}</style>

      <div className="rcpt-overlay" onClick={onClose}>
        <div className="rcpt-modal" onClick={(e) => e.stopPropagation()}>
          <div className="rcpt-modal-header">
            <h2>
              <FaReceipt /> Payment — {form.name || "Student"}
            </h2>
            <button type="button" onClick={onClose} aria-label="Close">
              <FaTimes />
            </button>
          </div>

          <div className="rcpt-modal-body">
            <div className="rcpt-tabs">
              <button
                type="button"
                className={`rcpt-tab ${tab === "new" ? "active" : ""}`}
                onClick={() => setTab("new")}
              >
                <FaMoneyBillWave /> New Receipt
              </button>
              <button
                type="button"
                className={`rcpt-tab ${tab === "history" ? "active" : ""}`}
                onClick={() => setTab("history")}
              >
                <FaHistory /> History ({history.length})
              </button>
            </div>

            {error && <div className="rcpt-error-box">{error}</div>}

            {loading ? (
              <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                <FaSpinner className="fa-spin" style={{ marginRight: 8 }} />
                Loading...
              </div>
            ) : tab === "new" ? (
              <>
                <div className="rcpt-info-badge">
                  <span>
                    Total Fees:{" "}
                    <strong>
                      {sheetTotalFees > 0
                        ? `₹ ${sheetTotalFees.toLocaleString("en-IN")}`
                        : "—"}
                    </strong>
                  </span>
                  <span>
                    Received:{" "}
                    <strong>₹ {paidTillDate.toLocaleString("en-IN")}</strong>
                  </span>
                  <span>
                    Remaining:{" "}
                    <strong>₹ {remainingPreview.toLocaleString("en-IN")}</strong>
                  </span>
                </div>

                {isFullyPaid && (
                  <div className="rcpt-error-box">
                    Full fees already received. No further payment is required.
                  </div>
                )}

                <div className="rcpt-section-title">Student Details</div>
                <div className="rcpt-form-grid">
                  <div className="rcpt-field">
                    <label>Student Name</label>
                    <input
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                    />
                  </div>
                  <div className="rcpt-field">
                    <label>Student ID</label>
                    <input
                      value={form.studentId}
                      onChange={(e) => updateField("studentId", e.target.value)}
                    />
                  </div>
                  <div className="rcpt-field">
                    <label>Class</label>
                    <input
                      value={form.className}
                      onChange={(e) => updateField("className", e.target.value)}
                    />
                  </div>
                  <div className="rcpt-field">
                    <label>Section</label>
                    <input
                      value={form.section}
                      onChange={(e) => updateField("section", e.target.value)}
                    />
                  </div>
                  <div className="rcpt-field">
                    <label>Parent Mobile</label>
                    <input
                      value={form.parentPhone}
                      onChange={(e) => updateField("parentPhone", e.target.value)}
                      placeholder="Parent phone number"
                      type="tel"
                      inputMode="tel"
                    />
                  </div>
                </div>

                <div className="rcpt-section-title">Payment</div>
                <div className="rcpt-form-grid">
                  <div className="rcpt-field">
                    <label>Paying Amount (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      max={maxPayable !== null ? maxPayable : undefined}
                      value={form.amount}
                      disabled={isFullyPaid}
                      className={isOverLimit ? "rcpt-input-error" : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          updateField("amount", "");
                          return;
                        }
                        const n = Number(val);
                        if (!Number.isFinite(n) || n < 0) return;
                        updateField("amount", val);
                      }}
                      onBlur={() => {
                        if (maxPayable !== null && isAmountPositive && amountNum > maxPayable) {
                          updateField("amount", String(maxPayable));
                        }
                      }}
                      placeholder="0.00"
                      autoFocus
                    />

                    {sheetTotalFees > 0 ? (
                      isFullyPaid ? (
                        <span className="rcpt-field-hint error">
                          Nothing left to pay — fees are fully received.
                        </span>
                      ) : isOverLimit ? (
                        <span className="rcpt-field-hint error">
                          Exceeds balance. Max: ₹{maxPayable.toLocaleString("en-IN")}
                        </span>
                      ) : (
                        <span className="rcpt-field-hint">
                          Max: ₹{maxPayable.toLocaleString("en-IN")}
                          {isAmountPositive && (
                            <> · After: ₹{remainingPreview.toLocaleString("en-IN")}</>
                          )}
                        </span>
                      )
                    ) : (
                      <span className="rcpt-field-hint">
                        No Total Fees on sheet — any amount allowed.
                      </span>
                    )}
                  </div>

                  <div className="rcpt-field">
                    <label>Payment Mode</label>
                    <select
                      value={form.paymentMode}
                      onChange={(e) => updateField("paymentMode", e.target.value)}
                      disabled={isFullyPaid}
                    >
                      <option>Cash</option>
                      <option>UPI</option>
                      <option>Card</option>
                      <option>Bank Transfer</option>
                      <option>Cheque</option>
                    </select>
                  </div>
                  <div className="rcpt-field">
                    <label>Payment Date</label>
                    <input
                      type="date"
                      value={form.paymentDate}
                      onChange={(e) => updateField("paymentDate", e.target.value)}
                      disabled={isFullyPaid}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="rcpt-history-list">
                {history.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 30, color: "#9ca3af" }}>
                    No receipts generated yet.
                  </div>
                ) : (
                  [...history].reverse().map((r) => (
                    <div key={r._id || r.receiptNo} className="rcpt-history-item">
                      <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
                        <strong style={{ color: "#111827", fontSize: 14 }}>
                          {r.receiptNo}
                        </strong>{" "}
                        — ₹{Number(r.amount).toFixed(2)}
                        <br />
                        <span style={{ fontSize: 12, color: "#6b7280" }}>
                          {r.feeHead || "Amount Paid"} • {r.paymentMode} •{" "}
                          {formatDate(r.paymentDate)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="rcpt-btn rcpt-btn-primary"
                        onClick={() => handleReprint(r)}
                      >
                        <FaPrint /> Reprint
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="rcpt-footer">
            <button
              type="button"
              className="rcpt-btn rcpt-btn-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Close
            </button>
            {tab === "new" && (
              <button
                type="button"
                className="rcpt-btn rcpt-btn-success"
                onClick={handleGenerate}
                disabled={!canGenerate}
                title={
                  isOverLimit
                    ? "Amount exceeds remaining balance"
                    : isFullyPaid
                    ? "Fees already fully paid"
                    : !isAmountPositive
                    ? "Enter a valid amount"
                    : "Generate & print receipt"
                }
              >
                <FaPrint /> {saving ? "Generating..." : "Generate & Print"}
              </button>
            )}
          </div>
        </div>
      </div>

      {printData && (
        <div className="rcpt-print-area">
          <div className="rcpt-print-page">
            {renderCopy("INSTITUTE", printData)}
            {renderCopy("PARENT", printData)}
          </div>
        </div>
      )}
    </>
  );
};

export default ReceiptModal;