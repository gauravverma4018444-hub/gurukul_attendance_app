import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMasterSheet,
  saveRowBulk,
  addPaymentColumn,
  deletePaymentColumn,
  renamePaymentColumn,
  resizePaymentColumn,
  setLocalRows,
} from "../redux/paymentSlice";
import { paymentExportAPI } from "../api/api";

import {
  FaPlus,
  FaTrash,
  FaSearch,
  FaSyncAlt,
  FaTable,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimes,
  FaEdit,
  FaSave,
  FaMoneyBillWave,
  FaUndo,
  FaChevronDown,
  FaChevronRight,
  FaReceipt,
  FaFileExcel,
  FaFilePdf,
  FaDownload,
} from "react-icons/fa";

import ReceiptModal from "./ReceiptModal";
import {
  exportPaymentSheetToExcel,
  exportPaymentSheetToPDF,
} from "../utils/paymentExport";

const FIXED_STATUS_COLUMN = {
  _id: "fixed-payment-status",
  key: "paymentStatus",
  label: "Payment Status",
  type: "status",
  order: 3,
  isFixed: true,
  editable: true,
  width: 160,
};

const ROW_NUMBER_WIDTH = 55;
const ACTION_WIDTH = 190;

const styles = `
/* ── BASE ── */
.payment-sheet-container { 
  width: 100%; 
  max-width: 100%; 
  min-width: 0; 
  overflow: hidden; 
  font-family: 'Inter', sans-serif; 
  color: #111827; 
  padding: 0 16px;
}
.payment-sheet-container * { box-sizing: border-box; }

/* ── HEADER ── */
.payment-sheet-header { 
  display: flex; 
  align-items: flex-start; 
  justify-content: space-between; 
  gap: 16px; 
  margin-bottom: 16px; 
  flex-wrap: wrap; 
  padding: 16px 0;
}
.payment-sheet-title-area { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  min-width: 0; 
  flex: 1;
}
.payment-sheet-icon { 
  width: 44px; 
  height: 44px; 
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); 
  color: #4f46e5; 
  border-radius: 12px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-size: 20px; 
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.15);
}
.payment-sheet-title-area h2 { 
  font-size: 22px; 
  font-weight: 700; 
  margin: 0; 
  color: #1f2937;
}
.payment-sheet-title-area p { 
  color: #6b7280; 
  font-size: 13px; 
  margin-top: 4px; 
}
.payment-header-actions { 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  flex-wrap: wrap; 
  flex-shrink: 0;
}

/* ── BUTTONS ── */
.payment-btn { 
  display: inline-flex; 
  align-items: center; 
  justify-content: center; 
  gap: 8px; 
  padding: 10px 16px; 
  min-height: 42px; 
  border-radius: 10px; 
  font-size: 13px; 
  font-weight: 600; 
  cursor: pointer; 
  border: none; 
  white-space: nowrap;
  transition: all 0.2s ease;
}
.payment-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.payment-btn-refresh { 
  background: white; 
  color: #374151; 
  border: 1px solid #e5e7eb;
}
.payment-btn-refresh:hover:not(:disabled) { 
  background: #f9fafb; 
  border-color: #d1d5db;
}
.payment-btn-edit { 
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); 
  color: white;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
}
.payment-btn-edit:hover:not(:disabled) { 
  background: linear-gradient(135deg, #4338ca 0%, #3730a3 100%);
}
.payment-btn-save { 
  background: linear-gradient(135deg, #059669 0%, #047857 100%); 
  color: white;
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.3);
}
.payment-btn-save:hover:not(:disabled) { 
  background: linear-gradient(135deg, #047857 0%, #065f46 100%);
}
.payment-btn-cancel { 
  background: white; 
  color: #dc2626; 
  border: 1px solid #fecaca;
}
.payment-btn-cancel:hover:not(:disabled) { 
  background: #fef2f2;
}

/* ── WARNING ── */
.payment-unsaved-warning { 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  padding: 12px 16px; 
  margin-bottom: 16px; 
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); 
  border: 1px solid #fde68a; 
  border-radius: 10px; 
  color: #92400e; 
  font-size: 13px;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.1);
}

/* ── TOOLBAR ── */
.payment-toolbar { 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  gap: 12px; 
  margin-bottom: 16px; 
  flex-wrap: wrap;
}
.payment-search-box { 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  background: white; 
  padding: 0 14px; 
  border: 1px solid #e5e7eb; 
  border-radius: 10px; 
  width: 340px; 
  max-width: 100%; 
  height: 42px; 
  color: #9ca3af;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.payment-search-box:focus-within { 
  border-color: #4f46e5; 
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}
.payment-search-box input { 
  border: none; 
  outline: none; 
  width: 100%; 
  height: 100%; 
  font-size: 13px; 
  background: transparent; 
  min-width: 0;
}
.payment-search-box button { 
  border: none; 
  background: transparent; 
  cursor: pointer; 
  color: #9ca3af;
  padding: 4px;
}
.payment-search-box button:hover { color: #4f46e5; }
.payment-add-btn { 
  display: inline-flex; 
  align-items: center; 
  justify-content: center; 
  gap: 8px; 
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); 
  color: white; 
  padding: 10px 18px; 
  height: 42px; 
  border: none; 
  border-radius: 10px; 
  font-size: 13px; 
  font-weight: 600; 
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
  transition: all 0.2s;
}
.payment-add-btn:hover:not(:disabled) { 
  background: linear-gradient(135deg, #4338ca 0%, #3730a3 100%);
}

/* ── ADD COLUMN PANEL ── */
.payment-add-column-panel { 
  background: white; 
  padding: 20px; 
  border-radius: 12px; 
  border: 1px solid #e5e7eb; 
  margin-bottom: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
.payment-add-column-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 16px;
}
.payment-add-column-header h3 { 
  font-size: 16px; 
  font-weight: 700;
  color: #1f2937;
}
.payment-add-column-header button { 
  background: #f3f4f6; 
  border: none; 
  padding: 8px 10px; 
  border-radius: 8px; 
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}
.payment-add-column-header button:hover { 
  background: #e5e7eb; 
  color: #dc2626;
}
.payment-add-column-form { 
  display: flex; 
  align-items: flex-end; 
  gap: 12px; 
  flex-wrap: wrap;
}
.payment-form-group { 
  display: flex; 
  flex-direction: column; 
  gap: 8px; 
  flex: 1; 
  min-width: 180px;
}
.payment-form-group label { 
  font-size: 13px; 
  font-weight: 600; 
  color: #374151;
}
.payment-form-group input, 
.payment-form-group select { 
  height: 42px; 
  border: 1px solid #d1d5db; 
  border-radius: 9px; 
  padding: 0 12px; 
  font-size: 13px; 
  background: white; 
  outline: none; 
  width: 100%;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.payment-form-group input:focus, 
.payment-form-group select:focus { 
  border-color: #4f46e5; 
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}
.payment-create-column-btn { 
  background: linear-gradient(135deg, #059669 0%, #047857 100%); 
  color: white; 
  border: none; 
  border-radius: 9px; 
  padding: 0 20px; 
  height: 42px; 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  font-size: 13px; 
  font-weight: 600; 
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.3);
}
.payment-create-column-btn:hover:not(:disabled) { 
  background: linear-gradient(135deg, #047857 0%, #065f46 100%);
}

/* ── TABLE CARD ── */
.payment-table-card { 
  width: 100%; 
  max-width: 100%; 
  min-width: 0; 
  background: white; 
  border-radius: 12px; 
  border: 1px solid #e5e7eb; 
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
.payment-table-info { 
  padding: 14px 16px; 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  gap: 10px; 
  border-bottom: 1px solid #e5e7eb; 
  flex-wrap: wrap;
  background: #f8fafc;
}
.payment-table-info > div { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  color: #4f46e5; 
  font-weight: 700; 
  font-size: 14px;
}
.payment-table-info > span { 
  font-size: 13px; 
  color: #6b7280;
}

/* ── TABLE SCROLL ── */
.payment-table-scroll { 
  width: 100%; 
  max-width: 100%; 
  min-width: 0; 
  height: clamp(350px, calc(100vh - 320px), 750px); 
  overflow: auto; 
  position: relative; 
  overscroll-behavior-x: contain; 
  scrollbar-width: thin; 
  scrollbar-color: #64748b #e2e8f0;
  -webkit-overflow-scrolling: touch;
}
.payment-table-scroll::-webkit-scrollbar { 
  width: 10px; 
  height: 12px;
}
.payment-table-scroll::-webkit-scrollbar-track { 
  background: #e2e8f0; 
  border-radius: 8px;
}
.payment-table-scroll::-webkit-scrollbar-thumb { 
  background: #64748b; 
  border-radius: 8px;
}
.payment-table-scroll::-webkit-scrollbar-thumb:hover { 
  background: #475569;
}

/* ── TABLE ── */
.payment-excel-table { 
  border-collapse: separate; 
  border-spacing: 0; 
  table-layout: fixed; 
  font-size: 13px;
}
.payment-excel-table th, 
.payment-excel-table td { 
  border-right: 1px solid #e5e7eb; 
  border-bottom: 1px solid #e5e7eb; 
  padding: 0; 
  height: 46px; 
  white-space: nowrap; 
  background: white; 
  overflow: hidden;
}
.payment-excel-table thead th { 
  position: sticky; 
  top: 0; 
  z-index: 10; 
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); 
  color: #374151; 
  font-weight: 700; 
  height: 50px; 
  text-align: left; 
  overflow: visible;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}
.payment-column-header { 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  gap: 8px; 
  padding: 0 12px; 
  height: 100%;
}
.payment-column-header > span { 
  overflow: hidden; 
  text-overflow: ellipsis;
}
.payment-column-actions { 
  display: flex; 
  align-items: center; 
  gap: 4px; 
  flex-shrink: 0;
}
.payment-column-actions button { 
  border: none; 
  background: transparent; 
  color: #94a3b8; 
  font-size: 12px; 
  cursor: pointer; 
  padding: 5px;
  border-radius: 5px;
  transition: all 0.2s;
}
.payment-column-actions button:hover:not(:disabled) { 
  background: #e0e7ff; 
  color: #4f46e5;
}
.payment-column-actions button:disabled { 
  opacity: 0.4; 
  cursor: not-allowed;
}
.payment-column-edit { 
  display: flex; 
  align-items: center; 
  gap: 6px; 
  width: 100%;
}
.payment-column-edit input { 
  min-width: 50px; 
  width: 100%; 
  padding: 6px 8px; 
  border: 2px solid #4f46e5; 
  border-radius: 6px; 
  outline: none;
  font-size: 12px;
}
.payment-column-edit button { 
  background: #4f46e5; 
  color: white; 
  border: none; 
  padding: 7px; 
  border-radius: 6px; 
  cursor: pointer;
  transition: background 0.2s;
}
.payment-column-edit button:hover { 
  background: #4338ca;
}

/* ── CLASS DIVIDER ── */
.payment-class-divider td { 
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%) !important; 
  border-top: 2px solid #a5b4fc; 
  height: 48px; 
  padding: 0;
}
.payment-class-toggle { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  width: 100%; 
  padding: 14px 18px; 
  border: none; 
  background: transparent; 
  color: #312e81; 
  font-size: 14px; 
  font-weight: 700; 
  cursor: pointer; 
  text-align: left;
  transition: background 0.2s;
}
.payment-class-toggle:hover { 
  background: rgba(79, 70, 229, 0.08);
}
.payment-class-count { 
  font-size: 12px; 
  font-weight: 500; 
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  padding: 3px 8px;
  border-radius: 12px;
}

/* ── STICKY COLUMNS ── */
.payment-row-number { 
  text-align: center !important; 
  color: #94a3b8 !important; 
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%) !important; 
  position: sticky; 
  left: 0; 
  z-index: 5;
}
.payment-sticky-id, 
.payment-sticky-name { 
  position: sticky; 
  z-index: 5; 
  background: white;
}
.payment-sticky-name { 
  box-shadow: 3px 0 8px rgba(0, 0, 0, 0.06);
}
.payment-excel-table thead .payment-row-number, 
.payment-excel-table thead .payment-sticky-id, 
.payment-excel-table thead .payment-sticky-name { 
  z-index: 20; 
  background: linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%) !important;
}

/* ── COLUMN RESIZER ── */
.payment-column-resizer { 
  position: absolute; 
  top: 0; 
  right: 0; 
  width: 12px; 
  height: 100%; 
  cursor: col-resize; 
  touch-action: none; 
  z-index: 30;
}
.payment-column-resizer::after { 
  content: ""; 
  position: absolute; 
  top: 20%; 
  right: 4px; 
  width: 3px; 
  height: 60%; 
  background: #cbd5e1;
  border-radius: 2px;
}
.payment-column-resizer:hover::after { 
  background: #4f46e5;
}
body.payment-column-resizing { 
  cursor: col-resize !important; 
  user-select: none !important;
}

/* ── CELLS ── */
.payment-cell-wrapper { 
  width: 100%; 
  height: 100%;
}
.payment-cell-input { 
  width: 100%; 
  height: 46px; 
  border: 2px solid transparent; 
  outline: none; 
  background: transparent; 
  padding: 0 12px; 
  font-size: 13px; 
  color: #111827; 
  font-family: inherit;
  transition: all 0.2s;
}
.payment-cell-input:focus { 
  border-color: #4f46e5; 
  background: white;
}
.payment-cell-modified { 
  background: #fffbeb !important;
}
.payment-cell-modified .payment-cell-input, 
.payment-cell-modified .payment-status-select { 
  background: #fffbeb; 
  border-left: 3px solid #f59e0b;
}
.payment-readonly-value { 
  display: block; 
  padding: 13px 12px; 
  overflow: hidden; 
  text-overflow: ellipsis; 
  font-weight: 500;
}
.payment-status-select { 
  width: 100%; 
  height: 46px; 
  border: 2px solid transparent; 
  outline: none; 
  padding: 0 10px; 
  background: transparent; 
  font-size: 13px; 
  font-weight: 600; 
  cursor: pointer;
  border-radius: 6px;
}
.payment-status-select:focus { 
  border-color: #4f46e5;
}

/* ── STATUS BADGES ── */
.payment-status-badge { 
  display: inline-flex; 
  padding: 7px 12px; 
  margin: 6px; 
  border-radius: 8px; 
  font-size: 12px; 
  font-weight: 700;
}
.payment-status-badge.paid { 
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); 
  color: #166534;
  box-shadow: 0 2px 4px rgba(22, 101, 52, 0.15);
}
.payment-status-badge.unpaid { 
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); 
  color: #991b1b;
  box-shadow: 0 2px 4px rgba(153, 27, 27, 0.15);
}
.payment-status-badge.partial { 
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); 
  color: #92400e;
  box-shadow: 0 2px 4px rgba(146, 64, 14, 0.15);
}

/* ── ROW ACTIONS ── */
.payment-row-actions { 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  gap: 8px; 
  padding: 0 10px; 
  height: 100%;
  flex-wrap: wrap;
}
.payment-row-color-btn { 
  width: 26px; 
  height: 26px; 
  border-radius: 7px; 
  border: 2px solid transparent; 
  cursor: pointer; 
  flex-shrink: 0;
  transition: all 0.2s;
}
.payment-row-color-btn.green { 
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
}
.payment-row-color-btn.red { 
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}
.payment-row-color-btn.active { 
  border-color: #111827; 
  box-shadow: 0 0 0 2px white inset, 0 2px 6px rgba(0, 0, 0, 0.2);
}
.payment-row-color-btn:disabled { 
  opacity: 0.4; 
  cursor: not-allowed;
}
.payment-row-color-btn:hover:not(:disabled) { 
  transform: scale(1.1);
}
.payment-receipt-btn { 
  background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); 
  color: white; 
  border: none; 
  padding: 7px 12px; 
  border-radius: 7px; 
  font-size: 12px; 
  font-weight: 600; 
  cursor: pointer; 
  display: inline-flex; 
  align-items: center; 
  gap: 6px; 
  white-space: nowrap; 
  transition: all 0.2s; 
  height: 32px;
  box-shadow: 0 2px 6px rgba(2, 132, 199, 0.3);
}
.payment-receipt-btn:hover:not(:disabled) { 
  background: linear-gradient(135deg, #0369a1 0%, #075985 100%);
  transform: translateY(-1px);
}
.payment-receipt-btn:disabled { 
  opacity: 0.5; 
  cursor: not-allowed;
}

/* ── ROW COLORS ── */
.payment-excel-table tbody tr.payment-row-green td { 
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
}
.payment-excel-table tbody tr.payment-row-red td { 
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%) !important;
}
.payment-excel-table tbody tr.payment-row-green td.payment-cell-modified, 
.payment-excel-table tbody tr.payment-row-red td.payment-cell-modified { 
  background: #fffbeb !important;
}

/* ── FOOTER ── */
.payment-excel-table tfoot td { 
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); 
  padding: 14px; 
  font-weight: 700; 
  color: #312e81; 
  border-top: 2px solid #c7d2fe;
}
.payment-total-label { 
  text-align: center; 
  font-size: 18px;
}
.payment-empty { 
  text-align: center; 
  padding: 50px 20px !important; 
  color: #9ca3af;
  font-size: 14px;
}
.payment-sheet-footer { 
  margin-top: 12px; 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  color: #059669; 
  font-size: 12px;
  padding: 12px 16px;
  background: #f0fdf4;
  border-radius: 10px;
  border: 1px solid #bbf7d0;
}
.payment-sheet-footer.unsaved { 
  color: #d97706;
  background: #fffbeb;
  border-color: #fde68a;
}

/* ── NOTIFICATION ── */
.payment-notification { 
  position: fixed; 
  top: 90px; 
  right: 25px; 
  z-index: 9999; 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  padding: 14px 18px; 
  max-width: 450px; 
  border-radius: 12px; 
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15); 
  font-size: 13px; 
  font-weight: 500;
  animation: slideInRight 0.3s ease;
}
@keyframes slideInRight { 
  from { opacity: 0; transform: translateX(30px); } 
  to { opacity: 1; transform: translateX(0); }
}
.payment-notification.success { 
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); 
  color: #047857; 
  border: 1px solid #a7f3d0;
}
.payment-notification.error { 
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); 
  color: #b91c1c; 
  border: 1px solid #fecaca;
}
.payment-notification button { 
  margin-left: auto; 
  border: none; 
  background: transparent; 
  color: inherit; 
  cursor: pointer;
  padding: 4px;
  border-radius: 5px;
}
.payment-notification button:hover { 
  background: rgba(0, 0, 0, 0.1);
}

/* ── LOADING & ERROR ── */
.payment-loading, 
.payment-error { 
  min-height: 350px; 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center; 
  gap: 18px; 
  color: #6b7280; 
  font-size: 14px;
}
.payment-spinner { 
  width: 40px; 
  height: 40px; 
  border: 4px solid #e0e7ff; 
  border-top-color: #4f46e5; 
  border-radius: 50%; 
  animation: payment-spin 0.8s linear infinite;
}
@keyframes payment-spin { 
  to { transform: rotate(360deg); }
}
.payment-error button { 
  border: none; 
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); 
  color: white; 
  padding: 11px 22px; 
  border-radius: 10px; 
  cursor: pointer;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
}
.payment-error button:hover { 
  background: linear-gradient(135deg, #4338ca 0%, #3730a3 100%);
}

/* ── EXPORT DROPDOWN ── */
.payment-export-dropdown { 
  position: relative; 
  display: inline-block;
}
.payment-export-menu {
  position: absolute; 
  top: calc(100% + 8px); 
  right: 0;
  background: white; 
  border: 1px solid #e5e7eb; 
  border-radius: 12px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15); 
  min-width: 210px;
  z-index: 100; 
  overflow: hidden; 
  animation: exportFadeIn 0.2s ease;
}
@keyframes exportFadeIn { 
  from { opacity: 0; transform: translateY(-8px); } 
  to { opacity: 1; transform: translateY(0); }
}
.payment-export-menu button {
  width: 100%; 
  display: flex; 
  align-items: center; 
  gap: 12px;
  padding: 13px 16px; 
  background: white; 
  border: none;
  text-align: left; 
  font-size: 13px; 
  font-weight: 600;
  color: #374151; 
  cursor: pointer; 
  border-bottom: 1px solid #f3f4f6;
  transition: all 0.2s;
}
.payment-export-menu button:last-child { 
  border-bottom: none;
}
.payment-export-menu button:hover:not(:disabled) { 
  background: #f9fafb;
}
.payment-export-menu button.excel-item { 
  color: #16a34a;
}
.payment-export-menu button.excel-item:hover:not(:disabled) { 
  background: #f0fdf4;
}
.payment-export-menu button.pdf-item { 
  color: #dc2626;
}
.payment-export-menu button.pdf-item:hover:not(:disabled) { 
  background: #fef2f2;
}
.payment-export-menu button:disabled { 
  opacity: 0.45; 
  cursor: not-allowed;
}

/* ── RECEIPT MODAL RESPONSIVE ── */
.receipt-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.receipt-modal-content {
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.25);
  animation: modalSlideUp 0.3s ease;
}
@keyframes modalSlideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── RESPONSIVE: TABLET (768px - 1024px) ── */
@media (max-width: 1024px) {
  .payment-sheet-container {
    padding: 0 12px;
  }
  .payment-sheet-title-area h2 {
    font-size: 20px;
  }
  .payment-table-scroll {
    height: clamp(300px, calc(100vh - 300px), 650px);
  }
  .payment-excel-table {
    font-size: 12px;
  }
  .payment-excel-table th,
  .payment-excel-table td {
    height: 44px;
  }
  .payment-cell-input,
  .payment-status-select {
    height: 44px;
    font-size: 12px;
  }
  .payment-receipt-btn {
    padding: 6px 10px;
    font-size: 11px;
    height: 30px;
  }
  .payment-row-color-btn {
    width: 24px;
    height: 24px;
  }
}

/* ── RESPONSIVE: MOBILE (< 768px) ── */
@media (max-width: 768px) {
  .payment-sheet-container {
    padding: 0 8px;
  }
  
  /* Header */
  .payment-sheet-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    padding: 12px 0;
  }
  .payment-sheet-title-area {
    flex-direction: row;
    gap: 10px;
  }
  .payment-sheet-icon {
    width: 38px;
    height: 38px;
    font-size: 18px;
  }
  .payment-sheet-title-area h2 {
    font-size: 18px;
  }
  .payment-sheet-title-area p {
    font-size: 12px;
  }
  .payment-header-actions {
    width: 100%;
    justify-content: stretch;
  }
  .payment-header-actions .payment-btn {
    flex: 1;
    min-width: 0;
    padding: 10px 12px;
    font-size: 12px;
  }
  
  /* Toolbar */
  .payment-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .payment-search-box {
    width: 100%;
    height: 44px;
  }
  .payment-add-btn {
    width: 100%;
    height: 44px;
  }
  
  /* Add Column Panel */
  .payment-add-column-form {
    flex-direction: column;
    align-items: stretch;
  }
  .payment-form-group,
  .payment-create-column-btn {
    width: 100%;
  }
  
  /* Table */
  .payment-table-scroll {
    height: 60vh;
    min-height: 350px;
    -webkit-overflow-scrolling: touch;
  }
  .payment-excel-table {
    font-size: 11px;
  }
  .payment-excel-table th,
  .payment-excel-table td {
    height: 42px;
    padding: 0 8px;
  }
  .payment-column-header {
    padding: 0 8px;
    gap: 4px;
  }
  .payment-column-header > span {
    font-size: 11px;
  }
  .payment-column-actions button {
    padding: 4px;
    font-size: 11px;
  }
  
  /* Cells */
  .payment-cell-input,
  .payment-status-select {
    height: 42px;
    font-size: 12px;
    padding: 0 8px;
  }
  .payment-readonly-value {
    padding: 10px 8px;
    font-size: 12px;
  }
  .payment-status-badge {
    padding: 5px 8px;
    margin: 4px;
    font-size: 11px;
  }
  
  /* Row Actions - Mobile Optimized */
  .payment-row-actions {
    flex-direction: column;
    gap: 6px;
    padding: 8px 6px;
  }
  .payment-receipt-btn {
    width: 100%;
    justify-content: center;
    padding: 8px 12px;
    font-size: 12px;
    height: 36px;
  }
  .payment-row-color-btn {
    width: 28px;
    height: 28px;
  }
  
  /* Footer */
  .payment-sheet-footer {
    font-size: 11px;
    padding: 10px 12px;
    flex-wrap: wrap;
  }
  
  /* Notification */
  .payment-notification {
    left: 12px;
    right: 12px;
    top: 70px;
    max-width: none;
    padding: 12px 14px;
    font-size: 12px;
  }
  
  /* Export Menu */
  .payment-export-menu {
    right: auto;
    left: 0;
    min-width: 100%;
  }
  
  /* Unsaved Warning */
  .payment-unsaved-warning {
    font-size: 12px;
    padding: 10px 12px;
  }
  
  /* Table Info */
  .payment-table-info {
    padding: 12px 14px;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  
  /* Class Toggle */
  .payment-class-toggle {
    padding: 12px 14px;
    font-size: 13px;
  }
  .payment-class-count {
    font-size: 11px;
    padding: 2px 6px;
  }
  
  /* Receipt Modal */
  .receipt-modal-overlay {
    padding: 12px;
    align-items: flex-end;
  }
  .receipt-modal-content {
    max-width: 100%;
    max-height: 85vh;
    border-radius: 16px 16px 0 0;
    margin-bottom: 0;
  }
}

/* ── RESPONSIVE: SMALL MOBILE (< 480px) ── */
@media (max-width: 480px) {
  .payment-sheet-container {
    padding: 0 4px;
  }
  .payment-sheet-title-area h2 {
    font-size: 16px;
  }
  .payment-sheet-icon {
    width: 34px;
    height: 34px;
    font-size: 16px;
  }
  .payment-btn {
    padding: 9px 10px;
    font-size: 11px;
    min-height: 38px;
  }
  .payment-excel-table {
    font-size: 10px;
  }
  .payment-excel-table th,
  .payment-excel-table td {
    height: 40px;
  }
  .payment-cell-input,
  .payment-status-select {
    height: 40px;
    font-size: 11px;
  }
  .payment-receipt-btn {
    font-size: 11px;
    height: 34px;
    padding: 6px 10px;
  }
  .payment-row-color-btn {
    width: 26px;
    height: 26px;
  }
  .payment-notification {
    top: 60px;
    left: 8px;
    right: 8px;
    padding: 10px 12px;
    font-size: 11px;
  }
}

/* ── PRINT STYLES ── */
@media print {
  .payment-header-actions,
  .payment-toolbar,
  .payment-add-column-panel,
  .payment-unsaved-warning,
  .payment-sheet-footer,
  .payment-notification,
  .payment-column-actions,
  .payment-column-resizer,
  .payment-row-actions {
    display: none !important;
  }
  .payment-table-scroll {
    overflow: visible !important;
    height: auto !important;
  }
  .payment-excel-table {
    font-size: 10px;
  }
}
`;

const PaymentSheet = ({
  academicYear,
  token,
  onDirtyChange,
  onSavingChange,
}) => {
  const dispatch = useDispatch();

  // ── Redux Selectors ──
  const {
    sheet,
    columns,
    rows: reduxRows,
    loading,
    error: reduxError,
    isSaving,
  } = useSelector((state) => state.payments);

  // ── Local State ──
  const [rows, setRows] = useState([]);
  const [activeColumns, setActiveColumns] = useState([]);
  const [search, setSearch] = useState("");
  const [collapsedClasses, setCollapsedClasses] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColLabel, setNewColLabel] = useState("");
  const [newColType, setNewColType] = useState("currency");
  const [addingColumn, setAddingColumn] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [editColumnLabel, setEditColumnLabel] = useState("");
  const [deletingColumn, setDeletingColumn] = useState(null);
  const [receiptRow, setReceiptRow] = useState(null);
  const [columnWidths, setColumnWidths] = useState({});
  const [notification, setNotification] = useState(null);

  // ── Export State ──
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportMenuRef = useRef(null);

  // ── Refs ──
  const resizingRef = useRef(null);
  const latestWidthsRef = useRef({});
  const originalRowsRef = useRef([]);
  const dirtyRef = useRef(false);

  // ── Notify Helper ──
  const notify = useCallback((message, type = "success") => {
    setNotification({ message, type });
  }, []);

  // ── Parent Callbacks ──
  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);

  useEffect(() => {
    onSavingChange?.(isSaving);
  }, [isSaving, onSavingChange]);

  // ── Load Sheet ──
  const loadSheet = useCallback(async () => {
    if (dirtyRef.current || isSaving) {
      notify("Save or cancel changes before refreshing.", "error");
      return;
    }
    dispatch(fetchMasterSheet({ academicYear, token }));
  }, [dispatch, academicYear, token, isSaving, notify]);

  useEffect(() => {
    loadSheet();
  }, [loadSheet]);

  // ── Sync Redux → Local ──
  useEffect(() => {
    if (reduxRows) {
      setRows(structuredClone(reduxRows));
      originalRowsRef.current = structuredClone(reduxRows);
    }
    if (columns) {
      setActiveColumns(columns);
    }
    setColumnWidths({});
    latestWidthsRef.current = {};
    setCollapsedClasses({});
    setIsEditing(false);
    setHasUnsavedChanges(false);
    dirtyRef.current = false;
  }, [reduxRows, columns]);

  // ── Browser Navigation Warning ──
  useEffect(() => {
    const beforeUnload = (event) => {
      if (dirtyRef.current || isSaving) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isSaving]);

  // ── Sidebar Navigation Guard ──
  useEffect(() => {
    const handleNavigationClick = (event) => {
      if (!dirtyRef.current && !isSaving) return;
      if (!(event.target instanceof Element)) return;

      const target = event.target;
      const isNavigation =
        target.closest(".sidebar-navigation") ||
        target.closest('a[href^="/"]');

      if (!isNavigation) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      notify("Save or cancel your changes before leaving.", "error");
    };

    document.addEventListener("click", handleNavigationClick, true);
    return () =>
      document.removeEventListener("click", handleNavigationClick, true);
  }, [isSaving, notify]);

  // ── Close Export Menu on Outside Click ──
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target)
      ) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Row Helpers ──
  const getOriginalRow = (rowId) =>
    originalRowsRef.current.find((row) => row._id === rowId);

  const getModifiedData = (row) => {
    const original = getOriginalRow(row._id);
    if (!original) return {};

    const changes = {};
    activeColumns.forEach((column) => {
      if (!column.editable) return;
      const oldValue = original.data?.[column.key] ?? "";
      const newValue = row.data?.[column.key] ?? "";
      if (String(oldValue) !== String(newValue)) {
        changes[column.key] = newValue;
      }
    });
    return changes;
  };

  const hasRowChanges = (row) => {
    const original = getOriginalRow(row._id);
    const dataChanged = Object.keys(getModifiedData(row)).length > 0;
    const colorChanged =
      (row.rowColor || "none") !== (original?.rowColor || "none");
    return dataChanged || colorChanged;
  };

  const updateLocalRows = (updatedRows) => {
    setRows(updatedRows);
    const changed = updatedRows.some(hasRowChanges);
    dirtyRef.current = changed;
    setHasUnsavedChanges(changed);
  };

  // ── Editing ──
  const startEditing = () => {
    originalRowsRef.current = structuredClone(rows);
    setIsEditing(true);
    setShowAddColumn(false);
    setEditingColumn(null);
    setHasUnsavedChanges(false);
    dirtyRef.current = false;
  };

  const updateCell = (rowId, key, value) => {
    if (!isEditing || isSaving) return;
    const updatedRows = rows.map((row) =>
      row._id === rowId
        ? { ...row, data: { ...row.data, [key]: value } }
        : row
    );
    updateLocalRows(updatedRows);
  };

  const updateRowColor = (rowId, color) => {
    if (!isEditing || isSaving) return;
    const updatedRows = rows.map((row) =>
      row._id === rowId
        ? { ...row, rowColor: row.rowColor === color ? "none" : color }
        : row
    );
    updateLocalRows(updatedRows);
  };

  const isCellModified = (rowId, key, value) => {
    const original = getOriginalRow(rowId);
    return String(original?.data?.[key] ?? "") !== String(value ?? "");
  };

  const cancelEditing = () => {
    if (isSaving) return;
    if (dirtyRef.current && !window.confirm("Discard all unsaved changes?")) {
      return;
    }
    setRows(structuredClone(originalRowsRef.current));
    setIsEditing(false);
    setHasUnsavedChanges(false);
    dirtyRef.current = false;
    notify("Changes discarded.");
  };

  // ── Save ──
  const saveAllChanges = async () => {
    if (!isEditing || !hasUnsavedChanges || isSaving) return;

    const modifiedRows = rows
      .map((row) => {
        const original = getOriginalRow(row._id);
        const data = getModifiedData(row);
        const colorChanged =
          (row.rowColor || "none") !== (original?.rowColor || "none");
        return {
          rowId: row._id,
          data,
          ...(colorChanged && { rowColor: row.rowColor || "none" }),
        };
      })
      .filter(
        (row) =>
          Object.keys(row.data).length > 0 || row.rowColor !== undefined
      );

    if (modifiedRows.length === 0) {
      setIsEditing(false);
      setHasUnsavedChanges(false);
      dirtyRef.current = false;
      return;
    }

    try {
      for (const modifiedRow of modifiedRows) {
        await dispatch(
          saveRowBulk({
            rowId: modifiedRow.rowId,
            data: modifiedRow.data,
            rowColor: modifiedRow.rowColor,
            token,
          })
        ).unwrap();
      }

      dispatch(setLocalRows(rows));
      originalRowsRef.current = structuredClone(rows);
      setHasUnsavedChanges(false);
      dirtyRef.current = false;
      setIsEditing(false);
      notify("All payment changes saved successfully.");
    } catch (err) {
      notify(err || "Failed to save changes. Please try again.", "error");
    }
  };

  // ── Ctrl+S Shortcut ──
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "s"
      ) {
        if (isEditing) {
          event.preventDefault();
          if (hasUnsavedChanges && !isSaving) {
            saveAllChanges();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, hasUnsavedChanges, isSaving, saveAllChanges]);

  // ── Receipt Callback ──
  const handleReceiptGenerated = useCallback(
    ({
      rowId,
      totalPaid,
      balance,
      totalFee,
      paymentStatus,
      columnKeys = {},
      rawRowData,
    }) => {
      setRows((prevRows) =>
        prevRows.map((row) => {
          if (row._id !== rowId) return row;

          const updatedData = {
            ...row.data,
            ...(rawRowData || {}),
          };

          if (columnKeys.received) {
            updatedData[columnKeys.received] = totalPaid;
          }
          if (columnKeys.remaining) {
            updatedData[columnKeys.remaining] = balance;
          }
          if (columnKeys.totalFees && totalFee) {
            const existing = row.data?.[columnKeys.totalFees];
            if (
              existing === "" ||
              existing === null ||
              existing === undefined
            ) {
              updatedData[columnKeys.totalFees] = totalFee;
            }
          }

          updatedData.paymentStatus = paymentStatus;

          activeColumns.forEach((col) => {
            const lbl = String(col.label || "").toLowerCase();
            if (
              !columnKeys.received &&
              (lbl.includes("received") || lbl === "paid")
            ) {
              updatedData[col.key] = totalPaid;
            }
            if (
              !columnKeys.remaining &&
              (lbl.includes("remaining") ||
                lbl.includes("balance") ||
                lbl.includes("due"))
            ) {
              updatedData[col.key] = balance;
            }
          });

          return { ...row, data: updatedData };
        })
      );

      dirtyRef.current = true;
      setHasUnsavedChanges(true);
      setIsEditing(true);
      notify(
        "Receipt printed! Received & Remaining auto-filled. Click Save Changes (or Ctrl+S)."
      );
    },
    [activeColumns, notify]
  );

  // ── Column Management ──
  const addColumn = async () => {
    if (isEditing || isSaving || !sheet?._id) return;
    if (!newColLabel.trim()) {
      notify("Please enter a column name.", "error");
      return;
    }

    try {
      setAddingColumn(true);
      await dispatch(
        addPaymentColumn({
          sheetId: sheet._id,
          label: newColLabel.trim(),
          type: newColType,
          token,
        })
      ).unwrap();

      setNewColLabel("");
      setNewColType("currency");
      setShowAddColumn(false);
      await loadSheet();
      notify("Column added successfully.");
    } catch (err) {
      notify(err || "Failed to add column.", "error");
    } finally {
      setAddingColumn(false);
    }
  };

  const deleteColumn = async (column) => {
    if (
      column.isFixed ||
      column.key === "paymentStatus" ||
      isEditing ||
      isSaving
    ) {
      return;
    }
    if (!window.confirm(`Delete "${column.label}" and all its values?`)) {
      return;
    }

    try {
      setDeletingColumn(column._id);
      await dispatch(
        deletePaymentColumn({
          sheetId: sheet._id,
          columnId: column._id,
          token,
        })
      ).unwrap();
      await loadSheet();
      notify("Column deleted successfully.");
    } catch (err) {
      notify(err || "Failed to delete column.", "error");
    } finally {
      setDeletingColumn(null);
    }
  };

  const renameColumn = async (columnId) => {
    if (isEditing || isSaving) return;
    const column = activeColumns.find((item) => item._id === columnId);
    if (!column || column.isFixed) return;
    if (!editColumnLabel.trim()) {
      notify("Column name cannot be empty.", "error");
      return;
    }

    try {
      await dispatch(
        renamePaymentColumn({
          sheetId: sheet._id,
          columnId,
          label: editColumnLabel.trim(),
          token,
        })
      ).unwrap();
      setEditingColumn(null);
      setEditColumnLabel("");
      await loadSheet();
      notify("Column renamed successfully.");
    } catch (err) {
      notify(err || "Failed to rename column.", "error");
    }
  };

  // ── Column Resizing ──
  const getColumnWidth = useCallback(
    (column) =>
      columnWidths[column.key] ?? Math.max(Number(column.width) || 150, 100),
    [columnWidths]
  );

  const startResize = (event, column) => {
    if (isEditing || isSaving) return;
    event.preventDefault();
    event.stopPropagation();

    resizingRef.current = {
      pointerId: event.pointerId,
      columnId: column._id,
      columnKey: column.key,
      startX: event.clientX,
      startWidth: getColumnWidth(column),
    };
    document.body.classList.add("payment-column-resizing");
  };

  useEffect(() => {
    const handlePointerMove = (event) => {
      const resizing = resizingRef.current;
      if (!resizing || event.pointerId !== resizing.pointerId) return;

      const width = Math.max(
        100,
        Math.min(700, resizing.startWidth + event.clientX - resizing.startX)
      );

      latestWidthsRef.current[resizing.columnKey] = width;
      setColumnWidths((previous) => ({
        ...previous,
        [resizing.columnKey]: width,
      }));
    };

    const finishResize = async (event) => {
      const resizing = resizingRef.current;
      if (!resizing || event.pointerId !== resizing.pointerId) return;

      resizingRef.current = null;
      document.body.classList.remove("payment-column-resizing");

      const width =
        latestWidthsRef.current[resizing.columnKey] ?? resizing.startWidth;

      if (!sheet?._id || resizing.columnId === FIXED_STATUS_COLUMN._id) {
        return;
      }

      try {
        await dispatch(
          resizePaymentColumn({
            sheetId: sheet._id,
            columnId: resizing.columnId,
            width,
            token,
          })
        ).unwrap();

        setActiveColumns((previous) =>
          previous.map((column) =>
            column._id === resizing.columnId ? { ...column, width } : column
          )
        );
      } catch (err) {
        console.error(err);
        notify("Failed to save column width.", "error");
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishResize);
    window.addEventListener("pointercancel", finishResize);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishResize);
      window.removeEventListener("pointercancel", finishResize);
      document.body.classList.remove("payment-column-resizing");
    };
  }, [dispatch, sheet?._id, token, notify]);

  // ── Search & Filtering ──
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) => {
      const name = String(
        row.student?.name || row.data?.name || ""
      ).toLowerCase();
      const studentId = String(
        row.student?.studentId || row.data?.studentId || ""
      ).toLowerCase();
      const rollNumber = String(
        row.student?.rollNumber ?? ""
      ).toLowerCase();

      return (
        name.includes(query) ||
        studentId.includes(query) ||
        rollNumber.includes(query)
      );
    });
  }, [rows, search]);

  // ── Group by Class ──
  const groupedRows = useMemo(() => {
    const groups = {};

    filteredRows.forEach((row) => {
      const className = String(row.student?.className || "Unknown");
      const section = String(row.student?.section || "A");
      const key = `${className}-${section}`;

      if (!groups[key]) {
        groups[key] = { key, className, section, rows: [] };
      }
      groups[key].rows.push(row);
    });

    return Object.values(groups).sort((a, b) => {
      const classCompare = a.className.localeCompare(b.className, undefined, {
        numeric: true,
      });
      if (classCompare !== 0) return classCompare;
      return a.section.localeCompare(b.section);
    });
  }, [filteredRows]);

  const toggleClass = (key) => {
    setCollapsedClasses((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  // ── Totals ──
  const columnTotals = useMemo(() => {
    const totals = {};
    activeColumns.forEach((column) => {
      if (["currency", "number"].includes(column.type)) {
        totals[column.key] = filteredRows.reduce((sum, row) => {
          const value = Number(row.data?.[column.key]);
          return sum + (Number.isFinite(value) ? value : 0);
        }, 0);
      }
    });
    return totals;
  }, [activeColumns, filteredRows]);

  // ── Sticky Helpers ──
  const getStickyClass = (column) => {
    if (column.key === "studentId") return "payment-sticky-id";
    if (column.key === "name") return "payment-sticky-name";
    return "";
  };

  const stickyOffsets = useMemo(() => {
    const offsets = {};
    let left = ROW_NUMBER_WIDTH;
    activeColumns.forEach((column) => {
      if (column.key === "studentId" || column.key === "name") {
        offsets[column.key] = left;
      }
      left += getColumnWidth(column);
    });
    return offsets;
  }, [activeColumns, getColumnWidth]);

  const getStickyStyle = (column) =>
    stickyOffsets[column.key] === undefined
      ? {}
      : { left: stickyOffsets[column.key] };

  const tableWidth = useMemo(
    () =>
      ROW_NUMBER_WIDTH +
      ACTION_WIDTH +
      activeColumns.reduce(
        (sum, column) => sum + getColumnWidth(column),
        0
      ),
    [activeColumns, getColumnWidth]
  );

  const formatNumber = (value) =>
    new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
    }).format(value || 0);

  // ── Cell Rendering ──
  const renderCell = (row, column) => {
    const value =
      column.key === "name"
        ? row.student?.name || row.data?.name || ""
        : column.key === "studentId"
        ? row.student?.studentId || row.data?.studentId || ""
        : row.data?.[column.key] ?? "";

    const modified =
      isEditing &&
      column.editable &&
      isCellModified(row._id, column.key, value);

    if (column.key === "paymentStatus") {
      const status = value || "Unpaid";

      if (!isEditing) {
        return (
          <span
            className={`payment-status-badge ${String(
              status
            ).toLowerCase()}`}
          >
            {status}
          </span>
        );
      }

      return (
        <div
          className={`payment-cell-wrapper ${
            modified ? "payment-cell-modified" : ""
          }`}
        >
          <select
            className="payment-status-select"
            value={status}
            disabled={isSaving}
            onChange={(event) =>
              updateCell(row._id, column.key, event.target.value)
            }
          >
            <option value="Unpaid">Unpaid</option>
            <option value="Partial">Partial</option>
            <option value="Paid">Paid</option>
          </select>
        </div>
      );
    }

    if (!column.editable || !isEditing) {
      return (
        <span className="payment-readonly-value" title={String(value)}>
          {value === "" || value === null ? "—" : value}
        </span>
      );
    }

    return (
      <div
        className={`payment-cell-wrapper ${
          modified ? "payment-cell-modified" : ""
        }`}
      >
        <input
          className="payment-cell-input"
          disabled={isSaving}
          type={
            ["currency", "number"].includes(column.type)
              ? "number"
              : column.type === "date"
              ? "date"
              : "text"
          }
          step={
            ["currency", "number"].includes(column.type)
              ? "any"
              : undefined
          }
          value={value}
          onChange={(event) =>
            updateCell(row._id, column.key, event.target.value)
          }
        />
      </div>
    );
  };

  // ══════════════════════════════════════════════════════
  //  EXPORT HANDLERS
  // ══════════════════════════════════════════════════════
  const handleExportExcel = useCallback(async () => {
    if (isExporting || filteredRows.length === 0) return;
    if (hasUnsavedChanges && !window.confirm("Unsaved changes exist. Export will use server data. Continue?")) {
      setShowExportMenu(false);
      return;
    }
    try {
      setIsExporting(true);
      setShowExportMenu(false);
      notify("Fetching report data from server...");

      const { data } = await paymentExportAPI.getExportData(academicYear);

      if (!data?.rows?.length) {
        notify("No payment data found.", "error");
        return;
      }

      exportPaymentSheetToExcel({
        rows: data.rows,
        columns: data.columns,
        academicYear: data.academicYear,
        groupedRows: data.groupedRows,
      });

      notify(`Excel exported! ${data.summary.totalStudents} students, ${data.summary.totalClasses} classes.`);
    } catch (err) {
      console.error(err);
      notify(err?.response?.data?.message || "Excel export failed.", "error");
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, hasUnsavedChanges, filteredRows, academicYear, notify]);

  const handleExportPDF = useCallback(async () => {
    if (isExporting || filteredRows.length === 0) return;
    if (hasUnsavedChanges && !window.confirm("Unsaved changes exist. Export will use server data. Continue?")) {
      setShowExportMenu(false);
      return;
    }
    try {
      setIsExporting(true);
      setShowExportMenu(false);
      notify("Fetching report data from server...");

      const { data } = await paymentExportAPI.getExportData(academicYear);

      if (!data?.rows?.length) {
        notify("No payment data found.", "error");
        return;
      }

      exportPaymentSheetToPDF({
        rows: data.rows,
        columns: data.columns,
        academicYear: data.academicYear,
        groupedRows: data.groupedRows,
      });

      notify(`PDF exported! ${data.summary.totalStudents} students, ${data.summary.totalClasses} classes.`);
    } catch (err) {
      console.error(err);
      notify(err?.response?.data?.message || "PDF export failed.", "error");
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, hasUnsavedChanges, filteredRows, academicYear, notify]);

  // ══════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="payment-loading">
          <div className="payment-spinner" />
          <p>Loading master payment sheet...</p>
        </div>
      </>
    );
  }

  if (reduxError && !sheet) {
    return (
      <>
        <style>{styles}</style>
        <div className="payment-error">
          <FaExclamationTriangle />
          <p>{reduxError}</p>
          <button onClick={loadSheet}>Try Again</button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>

      <div className="payment-sheet-container">
        {/* ── Notification ── */}
        {notification && (
          <div
            className={`payment-notification ${notification.type}`}
            role="alert"
          >
            {notification.type === "success" ? (
              <FaCheckCircle />
            ) : (
              <FaExclamationTriangle />
            )}
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              aria-label="Close notification"
            >
              <FaTimes />
            </button>
          </div>
        )}

        {/* ── Header ── */}
        <div className="payment-sheet-header">
          <div className="payment-sheet-title-area">
            <div className="payment-sheet-icon">
              <FaMoneyBillWave />
            </div>
            <div>
              <h2>Payment Sheet</h2>
              <p>Academic Year: {academicYear}</p>
            </div>
          </div>

          <div className="payment-header-actions">
            {!isEditing ? (
              <>
                {/* ── EXPORT DROPDOWN ── */}
                <div
                  className="payment-export-dropdown"
                  ref={exportMenuRef}
                >
                  <button
                    className="payment-btn"
                    style={{ background: "#0891b2", color: "white" }}
                    onClick={() => setShowExportMenu((prev) => !prev)}
                    disabled={
                      isExporting ||
                      filteredRows.length === 0 ||
                      isSaving
                    }
                    title="Export payment data"
                  >
                    <FaDownload />
                    {isExporting ? "Exporting..." : "Export"}
                    <FaChevronDown style={{ fontSize: 10 }} />
                  </button>

                  {showExportMenu && (
                    <div className="payment-export-menu">
                      <button
                        className="excel-item"
                        onClick={handleExportExcel}
                        disabled={isExporting}
                      >
                        <FaFileExcel />
                        Export to Excel (.xlsx)
                      </button>
                      <button
                        className="pdf-item"
                        onClick={handleExportPDF}
                        disabled={isExporting}
                      >
                        <FaFilePdf />
                        Export to PDF
                      </button>
                    </div>
                  )}
                </div>

                <button
                  className="payment-btn payment-btn-refresh"
                  onClick={loadSheet}
                  disabled={isExporting}
                >
                  <FaSyncAlt />
                  Refresh
                </button>
                <button
                  className="payment-btn payment-btn-edit"
                  onClick={startEditing}
                  disabled={isExporting}
                >
                  <FaEdit />
                  Edit Sheet
                </button>
              </>
            ) : (
              <>
                <button
                  className="payment-btn payment-btn-cancel"
                  onClick={cancelEditing}
                  disabled={isSaving}
                >
                  <FaUndo />
                  Cancel
                </button>
                <button
                  className="payment-btn payment-btn-save"
                  onClick={saveAllChanges}
                  disabled={!hasUnsavedChanges || isSaving}
                >
                  <FaSave />
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Unsaved Warning ── */}
        {hasUnsavedChanges && (
          <div className="payment-unsaved-warning">
            <FaExclamationTriangle />
            <span>
              You have unsaved payment changes. Save or cancel before
              leaving this sheet (or press Ctrl + S).
            </span>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="payment-toolbar">
          <div className="payment-search-box">
            <FaSearch />
            <input
              type="text"
              placeholder="Search all students..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <FaTimes />
              </button>
            )}
          </div>

          <button
            className="payment-add-btn"
            disabled={isEditing || isSaving}
            onClick={() => setShowAddColumn(true)}
          >
            <FaPlus />
            Add Column
          </button>
        </div>

        {/* ── Add Column Panel ── */}
        {showAddColumn && !isEditing && (
          <div className="payment-add-column-panel">
            <div className="payment-add-column-header">
              <h3>Add New Column</h3>
              <button
                onClick={() => setShowAddColumn(false)}
                aria-label="Close add column"
              >
                <FaTimes />
              </button>
            </div>

            <div className="payment-add-column-form">
              <div className="payment-form-group">
                <label>Column Name</label>
                <input
                  type="text"
                  placeholder="Example: January Fee"
                  value={newColLabel}
                  onChange={(event) =>
                    setNewColLabel(event.target.value)
                  }
                />
              </div>

              <div className="payment-form-group">
                <label>Column Type</label>
                <select
                  value={newColType}
                  onChange={(event) =>
                    setNewColType(event.target.value)
                  }
                >
                  <option value="currency">Currency (₹)</option>
                  <option value="number">Number</option>
                  <option value="text">Text</option>
                  <option value="date">Date</option>
                  <option value="status">Status</option>
                </select>
              </div>

              <button
                className="payment-create-column-btn"
                onClick={addColumn}
                disabled={addingColumn}
              >
                <FaPlus />
                {addingColumn ? "Adding..." : "Create Column"}
              </button>
            </div>
          </div>
        )}

        {/* ── Table Card ── */}
        <div className="payment-table-card">
          <div className="payment-table-info">
            <div>
              <FaTable />
              <span>All Class Payment Records</span>
            </div>
            <span>
              {groupedRows.length} Classes • {filteredRows.length}{" "}
              Students
            </span>
          </div>

          <div className="payment-table-scroll">
            <table
              className="payment-excel-table"
              style={{
                width: `max(100%, ${tableWidth}px)`,
                minWidth: `${tableWidth}px`,
              }}
            >
              <colgroup>
                <col style={{ width: ROW_NUMBER_WIDTH }} />
                {activeColumns.map((column) => (
                  <col
                    key={column._id}
                    style={{ width: getColumnWidth(column) }}
                  />
                ))}
                <col style={{ width: ACTION_WIDTH }} />
              </colgroup>

              <thead>
                <tr>
                  <th className="payment-row-number">#</th>
                  {activeColumns.map((column) => (
                    <th
                      key={column._id}
                      className={getStickyClass(column)}
                      style={getStickyStyle(column)}
                    >
                      <div className="payment-column-header">
                        {editingColumn === column._id ? (
                          <div className="payment-column-edit">
                            <input
                              autoFocus
                              value={editColumnLabel}
                              onChange={(event) =>
                                setEditColumnLabel(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  renameColumn(column._id);
                                }
                                if (event.key === "Escape") {
                                  setEditingColumn(null);
                                }
                              }}
                            />
                            <button
                              onClick={() => renameColumn(column._id)}
                            >
                              <FaSave />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span title={column.label}>
                              {column.label}
                            </span>
                            {!column.isFixed && (
                              <div className="payment-column-actions">
                                <button
                                  disabled={isEditing || isSaving}
                                  onClick={() => {
                                    setEditingColumn(column._id);
                                    setEditColumnLabel(column.label);
                                  }}
                                  title="Rename column"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  disabled={
                                    isEditing ||
                                    isSaving ||
                                    deletingColumn === column._id
                                  }
                                  onClick={() => deleteColumn(column)}
                                  title="Delete column"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {!isEditing && (
                        <div
                          className="payment-column-resizer"
                          onPointerDown={(event) =>
                            startResize(event, column)
                          }
                          title="Drag to resize column"
                        />
                      )}
                    </th>
                  ))}
                  <th>
                    <div className="payment-column-header">
                      Actions
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody>
                {groupedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeColumns.length + 2}
                      className="payment-empty"
                    >
                      No students found.
                    </td>
                  </tr>
                ) : (
                  groupedRows.map((group) => (
                    <React.Fragment key={group.key}>
                      <tr className="payment-class-divider">
                        <td colSpan={activeColumns.length + 2}>
                          <button
                            className="payment-class-toggle"
                            onClick={() => toggleClass(group.key)}
                          >
                            {collapsedClasses[group.key] ? (
                              <FaChevronRight />
                            ) : (
                              <FaChevronDown />
                            )}
                            <span>
                              Class {group.className}-
                              {group.section}
                            </span>
                            <span className="payment-class-count">
                              ({group.rows.length} Students)
                            </span>
                          </button>
                        </td>
                      </tr>

                      {!collapsedClasses[group.key] &&
                        group.rows.map((row, index) => (
                          <tr
                            key={row._id}
                            className={
                              row.rowColor === "green"
                                ? "payment-row-green"
                                : row.rowColor === "red"
                                ? "payment-row-red"
                                : ""
                            }
                          >
                            <td className="payment-row-number">
                              {index + 1}
                            </td>

                            {activeColumns.map((column) => {
                              const value =
                                row.data?.[column.key] ?? "";
                              const modified =
                                isEditing &&
                                column.editable &&
                                isCellModified(
                                  row._id,
                                  column.key,
                                  value
                                );

                              return (
                                <td
                                  key={column._id}
                                  className={`${getStickyClass(
                                    column
                                  )} ${
                                    modified
                                      ? "payment-cell-modified"
                                      : ""
                                  }`}
                                  style={getStickyStyle(column)}
                                >
                                  {renderCell(row, column)}
                                </td>
                              );
                            })}

                            <td>
                              <div className="payment-row-actions">
                                <button
                                  className="payment-receipt-btn"
                                  disabled={isEditing || isSaving}
                                  onClick={() => setReceiptRow(row)}
                                  title="Generate payment receipt"
                                >
                                  <FaReceipt /> Receipt
                                </button>
                                <button
                                  className={`payment-row-color-btn green ${
                                    row.rowColor === "green"
                                      ? "active"
                                      : ""
                                  }`}
                                  disabled={
                                    !isEditing || isSaving
                                  }
                                  onClick={() =>
                                    updateRowColor(
                                      row._id,
                                      "green"
                                    )
                                  }
                                  title="Mark row green"
                                />
                                <button
                                  className={`payment-row-color-btn red ${
                                    row.rowColor === "red"
                                      ? "active"
                                      : ""
                                  }`}
                                  disabled={
                                    !isEditing || isSaving
                                  }
                                  onClick={() =>
                                    updateRowColor(
                                      row._id,
                                      "red"
                                    )
                                  }
                                  title="Mark row red"
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  ))
                )}
              </tbody>

              {filteredRows.length > 0 && (
                <tfoot>
                  <tr>
                    <td className="payment-total-label">Σ</td>
                    {activeColumns.map((column) => (
                      <td
                        key={column._id}
                        className={getStickyClass(column)}
                        style={getStickyStyle(column)}
                      >
                        {column.key === "name" ? (
                          <strong>TOTAL</strong>
                        ) : columnTotals[column.key] !==
                          undefined ? (
                          <strong>
                            {column.type === "currency"
                              ? "₹"
                              : ""}
                            {formatNumber(
                              columnTotals[column.key]
                            )}
                          </strong>
                        ) : null}
                      </td>
                    ))}
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className={`payment-sheet-footer ${
            hasUnsavedChanges ? "unsaved" : ""
          }`}
        >
          {hasUnsavedChanges ? (
            <>
              <FaExclamationTriangle />
              <span>
                Changes are not saved yet. Press **Ctrl + S** or
                click "Save Changes" to update the database.
              </span>
            </>
          ) : (
            <>
              <FaCheckCircle />
              <span>All changes are saved.</span>
            </>
          )}
        </div>
      </div>

      {/* ── Receipt Modal ── */}
      {receiptRow && (
        <ReceiptModal
          row={receiptRow}
          columns={activeColumns}
          token={token}
          academicYear={academicYear}
          onClose={() => setReceiptRow(null)}
          onReceiptGenerated={handleReceiptGenerated}
        />
      )}
    </>
  );
};

export default PaymentSheet;