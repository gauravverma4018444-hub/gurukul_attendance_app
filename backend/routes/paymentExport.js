// backend/routes/paymentExport.js
const express = require("express");
const router = express.Router();
const PaymentRow = require("../models/PaymentRow");
const PaymentSheet = require("../models/PaymentSheet");

// ── Auth Middleware (fail-loud) ──
const authModule = require("../middleware/auth");
const auth =
  typeof authModule === "function"
    ? authModule
    : authModule.protect || authModule.auth || authModule.verifyToken || authModule.authenticate;

if (typeof auth !== "function") {
  throw new Error(
    "[paymentExport.js] Auth middleware not found. Check exports of ../middleware/auth"
  );
}

// ── Helpers ──
const isValidYear = (year) => typeof year === "string" && /^\d{4}-\d{4}$/.test(year);

const toPlainObj = (raw) => {
  if (!raw) return {};
  if (raw instanceof Map) {
    const obj = {};
    raw.forEach((v, k) => (obj[k] = v));
    return obj;
  }
  return typeof raw === "object" ? { ...raw } : {};
};

// ────────────────────────────────────────────────────────
// GET /api/payments/export-data/:academicYear
// ────────────────────────────────────────────────────────
router.get("/export-data/:academicYear", auth, async (req, res) => {
  try {
    const { academicYear } = req.params;

    // 0. Validate input
    if (!isValidYear(academicYear)) {
      return res.status(400).json({
        success: false,
        message: "Invalid academic year format. Expected: YYYY-YYYY (e.g., 2024-2025).",
      });
    }

    // 1. Fetch sheets for the academic year
    const sheets = await PaymentSheet.find({ academicYear }).lean();
    if (!sheets?.length) {
      return res.status(404).json({
        success: false,
        message: `No payment sheets found for ${academicYear}.`,
      });
    }

    // 2. Fetch rows with populated student info
    const rows = await PaymentRow.find({
      sheet: { $in: sheets.map((s) => s._id) },
    })
      .populate(
        "student",
        "studentId name className section rollNumber gender parentPhone phone address dateOfBirth fatherName isActive"
      )
      .lean();

    // 3. Build unified column list
    const colMap = new Map();
    sheets.forEach((s) =>
      (s.columns || []).forEach((c) => {
        if (!colMap.has(c.key)) {
          colMap.set(c.key, {
            _id: c._id,
            key: c.key,
            label: c.label,
            type: c.type || "currency",
            order: c.order || 0,
            width: c.width || 150,
            editable: c.editable !== false,
            isFixed: c.isFixed || false,
          });
        }
      })
    );

    // Ensure mandatory fixed columns exist
    const ensure = (key, label, type, order, fixed, editable) => {
      if (!colMap.has(key))
        colMap.set(key, {
          _id: `fixed-${key}`,
          key,
          label,
          type,
          order,
          isFixed: fixed,
          editable,
          width: 150,
        });
    };
    ensure("studentId", "Student ID", "text", 0, true, false);
    ensure("name", "Student Name", "text", 1, true, false);
    ensure("paymentStatus", "Payment Status", "status", 99, true, true);

    const columns = Array.from(colMap.values()).sort((a, b) => a.order - b.order);

    // 4. Raw clean rows (filter orphans first)
    const rawCleanRows = rows
      .filter((row) => row.student && row.student._id) // ✅ drop orphans
      .map((row) => {
        const d = toPlainObj(row.data);
        const st = row.student;
        d.studentId = st.studentId || d.studentId || "";
        d.name = st.name || d.name || "";

        if (!d.paymentStatus) {
          const tf = Number(d.totalFee || d.totalFees || d.annualFee || 0);
          const rc = Number(d.received || d.paid || d.collected || 0);
          d.paymentStatus = tf > 0 && rc >= tf ? "Paid" : rc > 0 ? "Partial" : "Unpaid";
        }

        return {
          _id: row._id,
          student: st,
          data: d,
          rowColor: row.rowColor || "none",
          payments: (row.payments || []).map((p) => ({
            receiptNo: p.receiptNo || "",
            paymentDate: p.paymentDate,
            amount: Number(p.amount) || 0,
            feeHead: p.feeHead || "",
            paymentMode: p.paymentMode || "Cash",
            totalFee: p.totalFee || null,
            totalPaidTillDate: Number(p.totalPaidTillDate) || 0,
            balance: p.balance ?? null,
            collectedByName: p.collectedByName || "",
            remarks: p.remarks || "",
          })),
        };
      });

    // ── 5. DEDUPLICATE STUDENTS BY STUDENT ID (fixed) ──
    const studentMap = new Map();

    rawCleanRows.forEach((row) => {
      // ✅ Use ONLY student._id or studentId — never fall back to row._id
      const sKey = String(row.student._id || row.student.studentId);
      if (!sKey) return; // skip if neither exists

      if (!studentMap.has(sKey)) {
        studentMap.set(sKey, row);
      } else {
        const existing = studentMap.get(sKey);

        // Merge 'data' fields — prefer non-empty values
        Object.keys(row.data).forEach((key) => {
          const newV = row.data[key];
          const oldV = existing.data[key];

          const isOldBlank =
            oldV === "" || oldV === null || oldV === undefined || oldV === "Unpaid" || oldV === 0;
          const isNewPopulated =
            newV !== "" && newV !== null && newV !== undefined && newV !== "Unpaid" && newV !== 0;

          if (isOldBlank && isNewPopulated) {
            existing.data[key] = newV;
          }
        });

        // Merge receipts/payments by receiptNo
        if (row.payments?.length > 0) {
          const existingReceipts = new Set(existing.payments.map((p) => p.receiptNo));
          row.payments.forEach((p) => {
            if (p.receiptNo && !existingReceipts.has(p.receiptNo)) {
              existing.payments.push(p);
            }
          });
        }

        if (existing.rowColor === "none" && row.rowColor !== "none") {
          existing.rowColor = row.rowColor;
        }
      }
    });

    const cleanRows = Array.from(studentMap.values());

    // 6. Group deduplicated rows by class & section
    const gMap = {};
    cleanRows.forEach((r) => {
      const cn = r.student?.className || r.data?.className || "General";
      const sc = r.student?.section || r.data?.section || "A";
      const k = `${cn}-${sc}`;
      if (!gMap[k]) gMap[k] = { key: k, className: cn, section: sc, rows: [] };
      gMap[k].rows.push(r);
    });

    const groupedRows = Object.values(gMap).sort((a, b) => {
      const c = a.className.localeCompare(b.className, undefined, { numeric: true });
      return c !== 0 ? c : a.section.localeCompare(b.section);
    });

    // 7. Calculate summary stats
    const fk = (keywords) => {
      for (const c of columns) {
        if (keywords.some((k) => c.label.toLowerCase().includes(k))) return c.key;
      }
      return null;
    };
    const tfk = fk(["total fee", "total fees", "annual"]);
    const rck = fk(["received", "paid", "collected"]);
    const rmk = fk(["remaining", "balance", "due", "pending"]);
    const sum = (key) =>
      key ? cleanRows.reduce((s, r) => s + (Number(r.data?.[key]) || 0), 0) : 0;

    const totalFees = sum(tfk);
    const totalReceived = sum(rck);

    res.json({
      success: true,
      data: {
        academicYear,
        columns,
        rows: cleanRows,
        groupedRows,
        summary: {
          totalStudents: cleanRows.length,
          totalClasses: groupedRows.length,
          totalFees,
          totalReceived,
          totalRemaining: sum(rmk),
          paidCount: cleanRows.filter(
            (r) => String(r.data?.paymentStatus).toLowerCase() === "paid"
          ).length,
          unpaidCount: cleanRows.filter(
            (r) => String(r.data?.paymentStatus).toLowerCase() === "unpaid"
          ).length,
          partialCount: cleanRows.filter(
            (r) => String(r.data?.paymentStatus).toLowerCase() === "partial"
          ).length,
          collectionRate: totalFees > 0 ? ((totalReceived / totalFees) * 100).toFixed(2) : "0.00",
        },
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ success: false, message: "Failed to compile export data." });
  }
});

// ────────────────────────────────────────────────────────
// NOTE: /academic-years REMOVED from this file.
// It is handled by routes/payments.js to avoid route collision.
// ────────────────────────────────────────────────────────

module.exports = router;