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
.payment-sheet-container { width: 100%; max-width: 100%; min-width: 0; overflow: hidden; font-family: 'Inter', sans-serif; color: #111827; }
.payment-sheet-container * { box-sizing: border-box; }
.payment-sheet-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.payment-sheet-title-area { display: flex; align-items: center; gap: 10px; min-width: 0; }
.payment-sheet-icon { width: 40px; height: 40px; background: #eef2ff; color: #4f46e5; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
.payment-sheet-title-area h2 { font-size: 21px; font-weight: 700; margin: 0; }
.payment-sheet-title-area p { color: #6b7280; font-size: 12px; margin-top: 3px; }
.payment-header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.payment-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 9px 14px; min-height: 38px; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; white-space: nowrap; }
.payment-btn:disabled, .payment-add-btn:disabled, .payment-create-column-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.payment-btn-refresh { background: white; color: #374151; border: 1px solid #e5e7eb; }
.payment-btn-edit { background: #4f46e5; color: white; }
.payment-btn-save { background: #059669; color: white; }
.payment-btn-cancel { background: white; color: #dc2626; border: 1px solid #fecaca; }
.payment-unsaved-warning { display: flex; align-items: center; gap: 10px; padding: 10px 13px; margin-bottom: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 9px; color: #92400e; font-size: 12px; }
.payment-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.payment-search-box { display: flex; align-items: center; gap: 10px; background: white; padding: 0 12px; border: 1px solid #e5e7eb; border-radius: 9px; width: 320px; max-width: 100%; height: 39px; color: #9ca3af; }
.payment-search-box input { border: none; outline: none; width: 100%; height: 100%; font-size: 12px; background: transparent; min-width: 0; }
.payment-search-box button { border: none; background: transparent; cursor: pointer; color: #9ca3af; }
.payment-add-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; background: #4f46e5; color: white; padding: 10px 15px; height: 39px; border: none; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; }
.payment-add-column-panel { background: white; padding: 16px; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 12px; }
.payment-add-column-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.payment-add-column-header h3 { font-size: 15px; font-weight: 700; }
.payment-add-column-header button { background: #f3f4f6; border: none; padding: 8px; border-radius: 7px; cursor: pointer; }
.payment-add-column-form { display: flex; align-items: end; gap: 12px; flex-wrap: wrap; }
.payment-form-group { display: flex; flex-direction: column; gap: 7px; flex: 1; min-width: 170px; }
.payment-form-group label { font-size: 12px; font-weight: 600; color: #374151; }
.payment-form-group input, .payment-form-group select { height: 39px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 10px; font-size: 12px; background: white; outline: none; width: 100%; }
.payment-create-column-btn { background: #059669; color: white; border: none; border-radius: 8px; padding: 0 16px; height: 39px; display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; cursor: pointer; }
.payment-table-card { width: 100%; max-width: 100%; min-width: 0; background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; }
.payment-table-info { padding: 11px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px; border-bottom: 1px solid #e5e7eb; flex-wrap: wrap; }
.payment-table-info > div { display: flex; align-items: center; gap: 8px; color: #4f46e5; font-weight: 700; font-size: 13px; }
.payment-table-info > span { font-size: 12px; color: #6b7280; }
.payment-table-scroll { width: 100%; max-width: 100%; min-width: 0; height: clamp(300px, calc(100vh - 280px), 850px); overflow: auto; position: relative; overscroll-behavior-x: contain; scrollbar-width: thin; scrollbar-color: #64748b #e2e8f0; }
.payment-table-scroll::-webkit-scrollbar { width: 9px; height: 11px; }
.payment-table-scroll::-webkit-scrollbar-thumb { background: #64748b; border-radius: 8px; }
.payment-excel-table { border-collapse: separate; border-spacing: 0; table-layout: fixed; font-size: 12px; }
.payment-excel-table th, .payment-excel-table td { border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; padding: 0; height: 42px; white-space: nowrap; background: white; overflow: hidden; }
.payment-excel-table thead th { position: sticky; top: 0; z-index: 10; background: #f8fafc; color: #374151; font-weight: 700; height: 45px; text-align: left; overflow: visible; }
.payment-column-header { display: flex; align-items: center; justify-content: space-between; gap: 7px; padding: 0 10px; height: 100%; }
.payment-column-header > span { overflow: hidden; text-overflow: ellipsis; }
.payment-column-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.payment-column-actions button { border: none; background: transparent; color: #94a3b8; font-size: 11px; cursor: pointer; padding: 4px; }
.payment-column-actions button:disabled { opacity: 0.4; cursor: not-allowed; }
.payment-column-edit { display: flex; align-items: center; gap: 5px; width: 100%; }
.payment-column-edit input { min-width: 40px; width: 100%; padding: 5px; border: 1px solid #4f46e5; border-radius: 5px; outline: none; }
.payment-column-edit button { background: #4f46e5; color: white; border: none; padding: 6px; border-radius: 5px; cursor: pointer; }
.payment-class-divider td { background: #e0e7ff !important; border-top: 2px solid #c7d2fe; height: 43px; padding: 0; }
.payment-class-toggle { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 16px; border: none; background: transparent; color: #312e81; font-size: 13px; font-weight: 700; cursor: pointer; text-align: left; }
.payment-class-toggle:hover { background: rgba(79,70,229,0.06); }
.payment-class-count { font-size: 11px; font-weight: 500; color: #6366f1; }
.payment-row-number { text-align: center !important; color: #94a3b8 !important; background: #f8fafc !important; position: sticky; left: 0; z-index: 5; }
.payment-sticky-id, .payment-sticky-name { position: sticky; z-index: 5; background: white; }
.payment-sticky-name { box-shadow: 3px 0 6px rgba(0,0,0,0.04); }
.payment-excel-table thead .payment-row-number, .payment-excel-table thead .payment-sticky-id, .payment-excel-table thead .payment-sticky-name { z-index: 20; background: #f1f5f9 !important; }
.payment-column-resizer { position: absolute; top: 0; right: 0; width: 10px; height: 100%; cursor: col-resize; touch-action: none; z-index: 30; }
.payment-column-resizer::after { content: ""; position: absolute; top: 20%; right: 3px; width: 2px; height: 60%; background: #cbd5e1; }
.payment-column-resizer:hover::after { background: #4f46e5; }
body.payment-column-resizing { cursor: col-resize !important; user-select: none !important; }
.payment-cell-wrapper { width: 100%; height: 100%; }
.payment-cell-input { width: 100%; height: 42px; border: 2px solid transparent; outline: none; background: transparent; padding: 0 10px; font-size: 12px; color: #111827; font-family: inherit; }
.payment-cell-input:focus { border-color: #4f46e5; background: white; }
.payment-cell-modified { background: #fffbeb !important; }
.payment-cell-modified .payment-cell-input, .payment-cell-modified .payment-status-select { background: #fffbeb; border-left: 3px solid #f59e0b; }
.payment-readonly-value { display: block; padding: 11px; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
.payment-status-select { width: 100%; height: 42px; border: 2px solid transparent; outline: none; padding: 0 8px; background: transparent; font-size: 12px; font-weight: 600; cursor: pointer; }
.payment-status-badge { display: inline-flex; padding: 6px 10px; margin: 5px; border-radius: 6px; font-size: 11px; font-weight: 700; }
.payment-status-badge.paid { background: #dcfce7; color: #166534; }
.payment-status-badge.unpaid { background: #fee2e2; color: #991b1b; }
.payment-status-badge.partial { background: #fef3c7; color: #92400e; }
.payment-row-actions { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 0 8px; height: 100%; }
.payment-row-color-btn { width: 24px; height: 24px; border-radius: 6px; border: 2px solid transparent; cursor: pointer; flex-shrink: 0; }
.payment-row-color-btn.green { background: #22c55e; }
.payment-row-color-btn.red { background: #ef4444; }
.payment-row-color-btn.active { border-color: #111827; box-shadow: 0 0 0 2px white inset; }
.payment-row-color-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.payment-receipt-btn { background: #0284c7; color: white; border: none; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; transition: background 0.2s; height: 28px; }
.payment-receipt-btn:hover { background: #0369a1; }
.payment-receipt-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.payment-excel-table tbody tr.payment-row-green td { background: #dcfce7 !important; }
.payment-excel-table tbody tr.payment-row-red td { background: #fee2e2 !important; }
.payment-excel-table tbody tr.payment-row-green td.payment-cell-modified, .payment-excel-table tbody tr.payment-row-red td.payment-cell-modified { background: #fffbeb !important; }
.payment-excel-table tfoot td { background: #eef2ff; padding: 11px; font-weight: 700; color: #312e81; border-top: 2px solid #c7d2fe; }
.payment-total-label { text-align: center; font-size: 17px; }
.payment-empty { text-align: center; padding: 35px 20px !important; color: #9ca3af; }
.payment-sheet-footer { margin-top: 9px; display: flex; align-items: center; gap: 8px; color: #059669; font-size: 11px; }
.payment-sheet-footer.unsaved { color: #d97706; }
.payment-notification { position: fixed; top: 85px; right: 25px; z-index: 9999; display: flex; align-items: center; gap: 12px; padding: 13px 16px; max-width: 420px; border-radius: 10px; box-shadow: 0 10px 35px rgba(0,0,0,0.12); font-size: 12px; font-weight: 500; }
.payment-notification.success { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
.payment-notification.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.payment-notification button { margin-left: auto; border: none; background: transparent; color: inherit; cursor: pointer; }
.payment-loading, .payment-error { min-height: 280px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: #6b7280; font-size: 13px; }
.payment-spinner { width: 35px; height: 35px; border: 4px solid #e0e7ff; border-top-color: #4f46e5; border-radius: 50%; animation: payment-spin 0.8s linear infinite; }
@keyframes payment-spin { to { transform: rotate(360deg); } }
.payment-error button { border: none; background: #4f46e5; color: white; padding: 10px 18px; border-radius: 9px; cursor: pointer; }

/* ── EXPORT DROPDOWN ── */
.payment-export-dropdown { position: relative; display: inline-block; }
.payment-export-menu {
  position: absolute; top: calc(100% + 6px); right: 0;
  background: white; border: 1px solid #e5e7eb; border-radius: 9px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.10); min-width: 195px;
  z-index: 100; overflow: hidden; animation: exportFadeIn 0.15s ease;
}
@keyframes exportFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
.payment-export-menu button {
  width: 100%; display: flex; align-items: center; gap: 10px;
  padding: 11px 14px; background: white; border: none;
  text-align: left; font-size: 12px; font-weight: 600;
  color: #374151; cursor: pointer; border-bottom: 1px solid #f3f4f6;
}
.payment-export-menu button:last-child { border-bottom: none; }
.payment-export-menu button:hover { background: #f9fafb; }
.payment-export-menu button.excel-item { color: #16a34a; }
.payment-export-menu button.excel-item:hover { background: #f0fdf4; }
.payment-export-menu button.pdf-item { color: #dc2626; }
.payment-export-menu button.pdf-item:hover { background: #fef2f2; }
.payment-export-menu button:disabled { opacity: 0.45; cursor: not-allowed; }

@media (max-width: 768px) {
  .payment-sheet-title-area h2 { font-size: 18px; }
  .payment-header-actions { width: 100%; }
  .payment-header-actions button { flex: 1; }
  .payment-toolbar { flex-direction: column; align-items: stretch; }
  .payment-search-box, .payment-add-btn { width: 100%; }
  .payment-add-column-form { flex-direction: column; align-items: stretch; }
  .payment-form-group, .payment-create-column-btn { width: 100%; }
  .payment-table-scroll { height: 60vh; min-height: 300px; -webkit-overflow-scrolling: touch; }
  .payment-notification { left: 15px; right: 15px; max-width: none; }
  .payment-export-menu { right: auto; left: 0; }
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
  //  EXPORT HANDLERS (placed AFTER filteredRows/groupedRows)
  // ══════════════════════════════════════════════════════
  const buildExportColumns = useCallback(() => {
    const exportCols = [...activeColumns];
    const hasStatus = exportCols.some((c) => c.key === "paymentStatus");
    if (!hasStatus) {
      exportCols.push(FIXED_STATUS_COLUMN);
    }
    return exportCols;
  }, [activeColumns]);

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