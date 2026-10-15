const express = require("express");
const mongoose = require("mongoose");

const PaymentSheet = require("../models/PaymentSheet");
const PaymentRow = require("../models/PaymentRow");
const Student = require("../models/Student");
const Counter = require("../models/Counter");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

const MASTER_CLASS = "__MASTER__";
const MASTER_SECTION = "__ALL__";

const FIXED_COLUMNS = [
  {
    key: "studentId",
    label: "Student ID",
    type: "text",
    order: 0,
    isFixed: true,
    editable: false,
    width: 120,
  },
  {
    key: "name",
    label: "Student Name",
    type: "text",
    order: 1,
    isFixed: true,
    editable: false,
    width: 200,
  },
  {
    key: "subject",
    label: "Subject",
    type: "text",
    order: 2,
    isFixed: true,
    editable: true,
    width: 150,
  },
  {
    key: "paymentStatus",
    label: "Payment Status",
    type: "status",
    order: 3,
    isFixed: true,
    editable: true,
    width: 160,
  },
];

const DEFAULT_YEAR = () => {
  const year = new Date().getFullYear();
  return `${year}-${year + 1}`;
};

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const isValidYear = (year) =>
  typeof year === "string" && /^\d{4}-\d{4}$/.test(year);

const canAccessClass = (user, className) => {
  if (user.role === "admin") return true;

  const assigned = user.assignedClasses || [];

  // Teachers without assigned classes cannot access payment records.
  return assigned.includes(className);
};

const canAccessSheet = (user, sheet) => {
  if (user.role === "admin") return true;

  // Teachers can view the master sheet, but individual rows are filtered.
  if (
    sheet.className === MASTER_CLASS &&
    sheet.section === MASTER_SECTION
  ) {
    return true;
  }

  return canAccessClass(user, sheet.className);
};

const validateCellValue = (column, value) => {
  if (value === null || value === "") return true;

  switch (column.type) {
    case "currency":
    case "number":
      return (
        typeof value === "number" ||
        (typeof value === "string" &&
          value.trim() !== "" &&
          Number.isFinite(Number(value)))
      );

    case "date":
      return (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
      );

    case "status":
      if (column.key === "paymentStatus") {
        return ["Paid", "Unpaid", "Partial"].includes(value);
      }

      return typeof value === "string";

    default:
      return typeof value === "string";
  }
};

const formatRow = (row) => ({
  _id: row._id,
  student: row.student,
  data:
    row.data instanceof Map
      ? Object.fromEntries(row.data)
      : row.data || {},
  rowColor: row.rowColor || "none",
  updatedAt: row.updatedAt,
});

/**
 * Ensure the master sheet has all compulsory fixed columns.
 */
const ensureFixedColumns = async (sheet) => {
  let changed = false;

  FIXED_COLUMNS.forEach((fixedColumn) => {
    const existing = sheet.columns.find(
      (column) => column.key === fixedColumn.key
    );

    if (!existing) {
      sheet.columns.push(fixedColumn);
      changed = true;
    } else {
      if (existing.label !== fixedColumn.label) {
        existing.label = fixedColumn.label;
        changed = true;
      }

      if (existing.type !== fixedColumn.type) {
        existing.type = fixedColumn.type;
        changed = true;
      }

      if (existing.isFixed !== true) {
        existing.isFixed = true;
        changed = true;
      }

      if (existing.editable !== fixedColumn.editable) {
        existing.editable = fixedColumn.editable;
        changed = true;
      }
    }
  });

  if (changed) await sheet.save();

  return sheet;
};

/**
 * Find or create the master sheet for an academic year.
 */
const getOrCreateMasterSheet = async (academicYear, userId) => {
  let sheet = await PaymentSheet.findOne({
    className: MASTER_CLASS,
    section: MASTER_SECTION,
    academicYear,
  });

  if (!sheet) {
    try {
      sheet = await PaymentSheet.create({
        className: MASTER_CLASS,
        section: MASTER_SECTION,
        academicYear,
        columns: FIXED_COLUMNS,
        createdBy: userId,
      });
    } catch (error) {
      if (error.code !== 11000) throw error;

      sheet = await PaymentSheet.findOne({
        className: MASTER_CLASS,
        section: MASTER_SECTION,
        academicYear,
      });
    }
  }

  return ensureFixedColumns(sheet);
};

/**
 * Ensure every active student has a payment row in the master sheet.
 */
const syncMasterRows = async (sheet, user) => {
  const studentQuery = { isActive: true };

  if (user.role === "teacher") {
    studentQuery.className = {
      $in: user.assignedClasses || [],
    };
  }

  const students = await Student.find(studentQuery)
    .select("studentId name className section rollNumber isActive")
    .sort({
      className: 1,
      section: 1,
      rollNumber: 1,
    });

  if (students.length === 0) {
    return [];
  }

  const operations = students.map((student) => ({
    updateOne: {
      filter: {
        sheet: sheet._id,
        student: student._id,
      },
      update: {
        $setOnInsert: {
          sheet: sheet._id,
          student: student._id,
          data: {
            subject: "",
            paymentStatus: "Unpaid",
          },
          rowColor: "none",
        },
      },
      upsert: true,
    },
  }));

  await PaymentRow.bulkWrite(operations, {
    ordered: false,
  });

  const studentIds = students.map((student) => student._id);

  const rows = await PaymentRow.find({
    sheet: sheet._id,
    student: { $in: studentIds },
  }).populate(
    "student",
    "studentId name className section rollNumber isActive"
  );

  const validRows = rows.filter(
    (row) => row.student && row.student.isActive
  );

  validRows.sort((a, b) => {
    const studentA = a.student;
    const studentB = b.student;

    const classComparison = studentA.className.localeCompare(
      studentB.className,
      undefined,
      { numeric: true }
    );

    if (classComparison !== 0) return classComparison;

    const sectionComparison = studentA.section.localeCompare(
      studentB.section
    );

    if (sectionComparison !== 0) return sectionComparison;

    return studentA.rollNumber - studentB.rollNumber;
  });

  return validRows;
};

/**
 * GET /api/payments/master
 *
 * Returns one master sheet containing students from all classes.
 */
router.get("/master", protect, async (req, res) => {
  try {
    const academicYear = req.query.academicYear || DEFAULT_YEAR();

    if (!isValidYear(academicYear)) {
      return res.status(400).json({
        success: false,
        message: "Invalid academic year",
      });
    }

    const sheet = await getOrCreateMasterSheet(
      academicYear,
      req.user._id
    );

    const rows = await syncMasterRows(sheet, req.user);

    const columns = [...sheet.columns].sort(
      (a, b) => a.order - b.order
    );

    res.json({
      success: true,
      data: {
        sheet,
        columns,
        rows: rows.map(formatRow),
        totalStudents: rows.length,
      },
    });
  } catch (error) {
    console.error("Master payment sheet error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
router.get("/academic-years", protect, async (req, res) => {
  try {
    const years = await PaymentSheet.distinct("academicYear");
    res.json({
      success: true,
      data: years.sort().reverse(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
/**
 * GET /api/payments/sheets
 *
 * List payment sheets.
 */
router.get("/sheets", protect, async (req, res) => {
  try {
    const query = {};

    if (req.query.academicYear) {
      query.academicYear = req.query.academicYear;
    }

    if (req.query.className) {
      query.className = req.query.className;
    }

    if (req.query.section) {
      query.section = req.query.section;
    }

    const sheets = await PaymentSheet.find(query).sort({
      academicYear: -1,
      className: 1,
      section: 1,
    });

    const accessibleSheets = sheets.filter((sheet) =>
      canAccessSheet(req.user, sheet)
    );

    res.json({
      success: true,
      count: accessibleSheets.length,
      data: accessibleSheets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/payments/sheets/:id
 *
 * Get a specific payment sheet.
 */
router.get("/sheets/:id", protect, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sheet ID",
      });
    }

    const sheet = await PaymentSheet.findById(req.params.id);

    if (!sheet) {
      return res.status(404).json({
        success: false,
        message: "Sheet not found",
      });
    }

    if (!canAccessSheet(req.user, sheet)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    let rows;

    if (sheet.className === MASTER_CLASS) {
      await ensureFixedColumns(sheet);
      rows = await syncMasterRows(sheet, req.user);
    } else {
      const studentQuery = {
        className: sheet.className,
        section: sheet.section,
        isActive: true,
      };

      if (req.user.role === "teacher") {
        studentQuery.className = {
          $in: req.user.assignedClasses || [],
        };
      }

      const students = await Student.find(studentQuery);

      rows = await PaymentRow.find({
        sheet: sheet._id,
        student: {
          $in: students.map((student) => student._id),
        },
      }).populate(
        "student",
        "studentId name className section rollNumber isActive"
      );
    }

    res.json({
      success: true,
      data: {
        sheet,
        columns: [...sheet.columns].sort(
          (a, b) => a.order - b.order
        ),
        rows: rows.map(formatRow),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/payments/sheets/:id/columns
 *
 * Add a custom column to the master sheet.
 */
router.post(
  "/sheets/:id/columns",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const { label, type = "currency", width = 150 } = req.body;

      if (!label || typeof label !== "string" || !label.trim()) {
        return res.status(400).json({
          success: false,
          message: "Column label is required",
        });
      }

      const allowedTypes = [
        "text",
        "number",
        "currency",
        "date",
        "status",
      ];

      if (!allowedTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid column type",
        });
      }

      const sheet = await PaymentSheet.findById(req.params.id);

      if (!sheet) {
        return res.status(404).json({
          success: false,
          message: "Sheet not found",
        });
      }

      const normalizedLabel = label.trim();

      if (
        sheet.columns.some(
          (column) =>
            column.label.toLowerCase() ===
            normalizedLabel.toLowerCase()
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Column with this name already exists",
        });
      }

      const key = `custom_${new mongoose.Types.ObjectId()
        .toString()
        .slice(-12)}`;

      const order =
        Math.max(
          -1,
          ...sheet.columns.map((column) => column.order)
        ) + 1;

      sheet.columns.push({
        key,
        label: normalizedLabel,
        type,
        width: Math.max(100, Math.min(Number(width) || 150, 700)),
        order,
        editable: true,
        isFixed: false,
      });

      await sheet.save();

      res.status(201).json({
        success: true,
        data: sheet.columns[sheet.columns.length - 1],
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * PUT /api/payments/sheets/:id/columns/:colId
 *
 * Rename or resize a column.
 */
router.put(
  "/sheets/:id/columns/:colId",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const sheet = await PaymentSheet.findById(req.params.id);

      if (!sheet) {
        return res.status(404).json({
          success: false,
          message: "Sheet not found",
        });
      }

      const column = sheet.columns.id(req.params.colId);

      if (!column) {
        return res.status(404).json({
          success: false,
          message: "Column not found",
        });
      }

      const { label, width, order } = req.body;

      if (label !== undefined) {
        if (column.isFixed) {
          return res.status(400).json({
            success: false,
            message: "Cannot rename a fixed column",
          });
        }

        if (
          typeof label !== "string" ||
          !label.trim()
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid column name",
          });
        }

        column.label = label.trim();
      }

      if (width !== undefined) {
        const newWidth = Number(width);

        if (
          !Number.isFinite(newWidth) ||
          newWidth < 100 ||
          newWidth > 700
        ) {
          return res.status(400).json({
            success: false,
            message: "Column width must be between 100 and 700",
          });
        }

        column.width = newWidth;
      }

      if (order !== undefined && !column.isFixed) {
        column.order = Number(order);
      }

      await sheet.save();

      res.json({
        success: true,
        data: column,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * DELETE /api/payments/sheets/:id/columns/:colId
 */
router.delete(
  "/sheets/:id/columns/:colId",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const sheet = await PaymentSheet.findById(req.params.id);

      if (!sheet) {
        return res.status(404).json({
          success: false,
          message: "Sheet not found",
        });
      }

      const column = sheet.columns.id(req.params.colId);

      if (!column) {
        return res.status(404).json({
          success: false,
          message: "Column not found",
        });
      }

      if (column.isFixed) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete a fixed column",
        });
      }

      const key = column.key;

      sheet.columns.pull(req.params.colId);
      await sheet.save();

      await PaymentRow.updateMany(
        { sheet: sheet._id },
        {
          $unset: {
            [`data.${key}`]: "",
          },
        }
      );

      res.json({
        success: true,
        message: "Column deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * PATCH /api/payments/rows/:rowId/bulk
 *
 * Save modified cells and row color.
 */
router.patch("/rows/:rowId/bulk", protect, async (req, res) => {
  try {
    if (!isValidId(req.params.rowId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment row ID",
      });
    }

    const { data = {}, rowColor } = req.body;

    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data)
    ) {
      return res.status(400).json({
        success: false,
        message: "data must be an object",
      });
    }

    const row = await PaymentRow.findById(req.params.rowId);

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "Payment row not found",
      });
    }

    const sheet = await PaymentSheet.findById(row.sheet);

    if (!sheet) {
      return res.status(404).json({
        success: false,
        message: "Payment sheet not found",
      });
    }

    const student = await Student.findById(row.student);

    if (!student || !student.isActive) {
      return res.status(404).json({
        success: false,
        message: "Student not found or inactive",
      });
    }

    if (!canAccessClass(req.user, student.className)) {
      return res.status(403).json({
        success: false,
        message: "You cannot edit this student's payments",
      });
    }

    if (!canAccessSheet(req.user, sheet)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const editableColumns = new Map(
      sheet.columns
        .filter((column) => column.editable)
        .map((column) => [column.key, column])
    );

    for (const [key, value] of Object.entries(data)) {
      const column = editableColumns.get(key);

      if (!column) {
        return res.status(400).json({
          success: false,
          message: `Column "${key}" is not editable`,
        });
      }

      if (!validateCellValue(column, value)) {
        return res.status(400).json({
          success: false,
          message: `Invalid value for "${column.label}"`,
        });
      }
    }

    if (
      rowColor !== undefined &&
      !["none", "green", "red"].includes(rowColor)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid row color",
      });
    }

    for (const [key, value] of Object.entries(data)) {
      row.data.set(key, value);
    }

    if (rowColor !== undefined) {
      row.rowColor = rowColor;
    }

    row.lastUpdatedBy = req.user._id;

    await row.save();

    res.json({
      success: true,
      message: "Payment row updated successfully",
      data: {
        _id: row._id,
        data: Object.fromEntries(row.data),
        rowColor: row.rowColor || "none",
        updatedAt: row.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/payments/sheets/:id/summary
 */
router.get("/sheets/:id/summary", protect, async (req, res) => {
  try {
    const sheet = await PaymentSheet.findById(req.params.id);

    if (!sheet) {
      return res.status(404).json({
        success: false,
        message: "Sheet not found",
      });
    }

    if (!canAccessSheet(req.user, sheet)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const rows =
      sheet.className === MASTER_CLASS
        ? await syncMasterRows(sheet, req.user)
        : await PaymentRow.find({ sheet: sheet._id }).populate(
            "student",
            "className isActive"
          );

    const summary = {};

    sheet.columns
      .filter(
        (column) =>
          column.type === "currency" ||
          column.type === "number"
      )
      .forEach((column) => {
        let total = 0;

        rows.forEach((row) => {
          if (
            !row.student ||
            !row.student.isActive ||
            !canAccessClass(req.user, row.student.className)
          ) {
            return;
          }

          const value = Number(row.data.get(column.key));

          if (Number.isFinite(value)) {
            total += value;
          }
        });

        summary[column.key] = {
          label: column.label,
          total,
        };
      });

    res.json({
      success: true,
      data: {
        totalStudents: rows.length,
        summary,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

const generateReceiptNo = async (academicYear) => {
  const counterId = `receipt_${academicYear}`;
  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const yearShort = academicYear.replace("-", "/");
  const padded = String(counter.seq).padStart(5, "0");
  return `RCPT/${yearShort}/${padded}`;
};

/**
 * GET /api/payments/rows/:rowId/receipts
 * Fetch all receipts for one student row.
 */
router.get("/rows/:rowId/receipts", protect, async (req, res) => {
  try {
    if (!isValidId(req.params.rowId)) {
      return res.status(400).json({ success: false, message: "Invalid row ID" });
    }

    const row = await PaymentRow.findById(req.params.rowId).populate(
      "student",
      "studentId name className section rollNumber gender dateOfBirth fatherName parentPhone phone address isActive"
    );

    if (!row) {
      return res.status(404).json({ success: false, message: "Row not found" });
    }

    if (!row.student || !row.student.isActive) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    if (!canAccessClass(req.user, row.student.className)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const totalPaid = (row.payments || []).reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0
    );

    res.json({
      success: true,
      data: {
        student: row.student,
        rowData: Object.fromEntries(row.data || []),
        payments: row.payments || [],
        totalPaid,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/payments/rows/:rowId/receipts
 * Create a new receipt and append amount to the payment row.
 */
router.post("/rows/:rowId/receipts", protect, async (req, res) => {
  try {
    if (!isValidId(req.params.rowId)) {
      return res.status(400).json({ success: false, message: "Invalid row ID" });
    }

    const {
      amount,
      feeHead,
      paymentMode = "Cash",
      paymentDate,
      remarks = "",
      totalFee = null,
      details = {},
    } = req.body;

    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number",
      });
    }

    if (!feeHead || typeof feeHead !== "string" || !feeHead.trim()) {
      return res.status(400).json({
        success: false,
        message: "Fee head is required",
      });
    }

    const validModes = ["Cash", "UPI", "Card", "Bank Transfer", "Cheque"];
    if (!validModes.includes(paymentMode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment mode",
      });
    }

    const row = await PaymentRow.findById(req.params.rowId).populate(
      "student",
      "studentId name className section rollNumber gender dateOfBirth fatherName parentPhone phone address isActive"
    );

    if (!row) {
      return res.status(404).json({ success: false, message: "Row not found" });
    }

    if (!row.student || !row.student.isActive) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    if (!canAccessClass(req.user, row.student.className)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const sheet = await PaymentSheet.findById(row.sheet);
    if (!sheet) {
      return res.status(404).json({ success: false, message: "Sheet not found" });
    }

    const receiptNo = await generateReceiptNo(sheet.academicYear);

    const previousPaid = (row.payments || []).reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0
    );
    const totalPaidTillDate = previousPaid + parsedAmount;
    const balance =
      totalFee !== null && Number.isFinite(Number(totalFee))
        ? Number(totalFee) - totalPaidTillDate
        : null;

    const student = row.student;

    const receiptEntry = {
      receiptNo,
      academicYear: sheet.academicYear,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      amount: parsedAmount,
      feeHead: feeHead.trim(),
      paymentMode,
      remarks: remarks || "",
      totalFee: totalFee !== null ? Number(totalFee) : null,
      totalPaidTillDate,
      balance,
      collectedBy: req.user._id,
      collectedByName: req.user.name || req.user.email || "",
      details: {
        name: details.name || student.name || "",
        studentId: details.studentId || student.studentId || "",
        className: details.className || student.className || "",
        section: details.section || student.section || "",
        rollNumber: details.rollNumber || student.rollNumber || "",
        gender: details.gender || student.gender || "",
        dateOfBirth: details.dateOfBirth || student.dateOfBirth || null,
        fatherName: details.fatherName || student.fatherName || "",
        parentPhone: details.parentPhone || student.parentPhone || "",
        phone: details.phone || student.phone || "",
        address: details.address || student.address || "",
      },
      createdAt: new Date(),
    };

    row.payments.push(receiptEntry);

    // Auto-update totals / status
    const totalPaidKey = "totalPaid";
    row.data.set(totalPaidKey, totalPaidTillDate);

    if (totalFee !== null && Number.isFinite(Number(totalFee))) {
      const totalFeeNum = Number(totalFee);
      if (totalPaidTillDate >= totalFeeNum) {
        row.data.set("paymentStatus", "Paid");
      } else if (totalPaidTillDate > 0) {
        row.data.set("paymentStatus", "Partial");
      }
    } else {
      // No total fee specified, mark as Partial on first payment
      const currentStatus = row.data.get("paymentStatus");
      if (currentStatus !== "Paid") {
        row.data.set("paymentStatus", "Partial");
      }
    }

    row.lastUpdatedBy = req.user._id;
    await row.save();

    const savedReceipt = row.payments[row.payments.length - 1];

    res.status(201).json({
      success: true,
      message: "Receipt generated successfully",
      data: {
        receipt: savedReceipt,
        totalPaid: totalPaidTillDate,
        rowData: Object.fromEntries(row.data),
      },
    });
  } catch (error) {
    console.error("Receipt creation error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;