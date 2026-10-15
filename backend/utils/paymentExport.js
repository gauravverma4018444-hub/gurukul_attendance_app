import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Institute Identity ──
const INST = {
  name: "GURUKUL ACADEMY",
  sub: "Senior Secondary Educational Institution",
  addr: "City Center, Gwalior - 474012 (M.P.)",
  phone: "+91 9981731481",
  email: "omkargurukul@gmail.com",
  affl: "Affiliated to CBSE Board, New Delhi",
};

// ── Helpers ──
const fmt = (v) =>
  (Number(v) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt) ? "—" : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const val = (row, col) => {
  if (col.key === "name") return row.student?.name || row.data?.name || "";
  if (col.key === "studentId") return row.student?.studentId || row.data?.studentId || "";
  return row.data?.[col.key] ?? "";
};

const fk = (cols, kw) => {
  for (const c of cols) if (kw.some((k) => c.label.toLowerCase().includes(k))) return c.key;
  return null;
};

const sum = (rows, key) => (key ? rows.reduce((s, r) => s + (Number(r.data?.[key]) || 0), 0) : 0);

const safeSheet = (n) => n.replace(/[\\/*?:[\]]/g, "-").substring(0, 31);

// ── Shared Excel Styles ──
const B = {
  top: { style: "thin", color: { rgb: "D1D5DB" } },
  bottom: { style: "thin", color: { rgb: "D1D5DB" } },
  left: { style: "thin", color: { rgb: "D1D5DB" } },
  right: { style: "thin", color: { rgb: "D1D5DB" } },
};

const S_TITLE = { font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E1B4B" } }, alignment: { horizontal: "center", vertical: "center" } };
const S_SUB = { font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4338CA" } }, alignment: { horizontal: "center" } };
const S_HDR = { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4F46E5" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: B };
const S_BANNER = { font: { bold: true, sz: 11, color: { rgb: "1E1B4B" } }, fill: { fgColor: { rgb: "E0E7FF" } }, alignment: { horizontal: "left", indent: 1 }, border: { top: { style: "medium", color: { rgb: "6366F1" } }, bottom: { style: "medium", color: { rgb: "6366F1" } } } };
const S_SUBTOT = { font: { bold: true, sz: 10, color: { rgb: "1E3A8A" } }, fill: { fgColor: { rgb: "DBEAFE" } }, border: { top: { style: "thin", color: { rgb: "3B82F6" } }, bottom: { style: "thin", color: { rgb: "3B82F6" } } } };
const S_GRAND = { font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "047857" } }, border: { top: { style: "double", color: { rgb: "000000" } }, bottom: { style: "double", color: { rgb: "000000" } } } };

const applyCurrency = (ws, addr, col) => {
  if (col?.type === "currency" && typeof ws[addr].v === "number") ws[addr].z = '"Rs."#,##0.00';
};

/* ================================================================
   EXCEL EXPORT  —  6 Tabs
   1. Executive Summary   2. Master Roster   3. Fee Defaulters
   4+. Per-Class Sheets   5. Transaction Ledger
================================================================ */
export const exportPaymentSheetToExcel = ({ rows, columns, academicYear, groupedRows }) => {
  const wb = XLSX.utils.book_new();
  const tfk = fk(columns, ["total fee", "total fees", "annual"]);
  const rck = fk(columns, ["received", "paid", "collected"]);
  const rmk = fk(columns, ["remaining", "balance", "due", "pending"]);

  const tFees = sum(rows, tfk);
  const tRecv = sum(rows, rck);
  const tRem = sum(rows, rmk);
  const paid = rows.filter((r) => r.data?.paymentStatus?.toLowerCase() === "paid").length;
  const partial = rows.filter((r) => r.data?.paymentStatus?.toLowerCase() === "partial").length;
  const unpaid = rows.filter((r) => r.data?.paymentStatus?.toLowerCase() === "unpaid").length;

  // ═══ TAB 1: EXECUTIVE SUMMARY ═══
  const d = [];
  d.push([INST.name.toUpperCase()]);
  d.push([`${INST.sub} — ${INST.affl}`]);
  d.push([`${INST.addr}  |  Ph: ${INST.phone}  |  ${INST.email}`]);
  d.push([]);
  d.push(["OFFICIAL ANNUAL FEE COLLECTION REPORT"]);
  d.push([`Academic Year: ${academicYear}   |   Generated: ${fmtDate(new Date())}`]);
  d.push([]);
  d.push(["EXECUTIVE FINANCIAL SUMMARY"]);
  d.push(["Metric", "Value"]);
  d.push(["Total Classes", groupedRows.length]);
  d.push(["Total Students", rows.length]);
  d.push(["Total Fee Assessment (Rs.)", tFees]);
  d.push(["Total Collected (Rs.)", tRecv]);
  d.push(["Total Outstanding (Rs.)", tRem]);
  d.push(["Collection Efficiency", tFees > 0 ? `${((tRecv / tFees) * 100).toFixed(2)}%` : "N/A"]);
  d.push([]);
  d.push(["PAYMENT STATUS DISTRIBUTION"]);
  d.push(["Status", "Students", "Percentage"]);
  d.push(["Fully Paid", paid, rows.length ? `${((paid / rows.length) * 100).toFixed(1)}%` : "0%"]);
  d.push(["Partially Paid", partial, rows.length ? `${((partial / rows.length) * 100).toFixed(1)}%` : "0%"]);
  d.push(["Unpaid", unpaid, rows.length ? `${((unpaid / rows.length) * 100).toFixed(1)}%` : "0%"]);
  d.push([]);
  d.push(["CLASS-WISE COLLECTION BREAKDOWN"]);
  d.push(["Class", "Strength", "Total Fees (Rs.)", "Collected (Rs.)", "Pending (Rs.)", "Recovery %"]);
  groupedRows.forEach((g) => {
    const gf = sum(g.rows, tfk), gr = sum(g.rows, rck), gp = sum(g.rows, rmk);
    d.push([`Class ${g.className}-${g.section}`, g.rows.length, gf, gr, gp, gf > 0 ? `${((gr / gf) * 100).toFixed(2)}%` : "N/A"]);
  });

  const ws1 = XLSX.utils.aoa_to_sheet(d);
  ws1["!cols"] = [{ wch: 32 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 }];
  ws1["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }, { s: { r: 4, c: 0 }, e: { r: 4, c: 5 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 5 } }, { s: { r: 7, c: 0 }, e: { r: 7, c: 5 } },
    { s: { r: 16, c: 0 }, e: { r: 16, c: 5 } }, { s: { r: 21, c: 0 }, e: { r: 21, c: 5 } },
  ];
  ws1["A1"].s = S_TITLE;
  ws1["A5"].s = S_SUB;
  ws1["A8"].s = S_BANNER;
  ws1["A17"].s = S_BANNER;
  ws1["A22"].s = S_BANNER;
  // Currency format on class breakdown numbers
  const r1 = XLSX.utils.decode_range(ws1["!ref"]);
  for (let r = 23; r <= r1.e.r; r++) {
    for (let c = 2; c <= 4; c++) {
      const a = XLSX.utils.encode_cell({ r, c });
      if (ws1[a] && typeof ws1[a].v === "number") ws1[a].z = '"Rs."#,##0.00';
    }
  }
  XLSX.utils.book_append_sheet(wb, ws1, "Executive Summary");

  // ═══ TAB 2: MASTER ROSTER ═══
  const m = [];
  m.push([`${INST.name} — ALL STUDENTS FEE AUDIT (${academicYear})`]);
  m.push([]);
  m.push(["#", "Class", "Sec", ...columns.map((c) => c.label)]);
  let sn = 1;
  groupedRows.forEach((g) => {
    m.push([`CLASS ${g.className}-${g.section}  (${g.rows.length} Students)`]);
    g.rows.forEach((row) => {
      m.push([sn++, g.className, g.section, ...columns.map((c) => {
        const v = val(row, c);
        return ["currency", "number"].includes(c.type) && v !== "" ? Number(v) || 0 : v || "";
      })]);
    });
    const st = ["", "", "SUBTOTAL"];
    columns.forEach((c) => st.push(["currency", "number"].includes(c.type) ? sum(g.rows, c.key) : ""));
    m.push(st);
    m.push([]);
  });
  const gt = ["", "", "GRAND TOTAL"];
  columns.forEach((c) => gt.push(["currency", "number"].includes(c.type) ? sum(rows, c.key) : ""));
  m.push(gt);

  const ws2 = XLSX.utils.aoa_to_sheet(m);
  const tc = 3 + columns.length;
  ws2["!cols"] = [{ wch: 6 }, { wch: 10 }, { wch: 8 }, ...columns.map((c) => ({ wch: Math.max(14, c.label.length + 4) }))];
  ws2["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: tc - 1 } }];
  ws2["A1"].s = S_TITLE;
  for (let c = 0; c < tc; c++) { const a = XLSX.utils.encode_cell({ r: 2, c }); if (ws2[a]) ws2[a].s = S_HDR; }
  const r2 = XLSX.utils.decode_range(ws2["!ref"]);
  for (let r = 3; r <= r2.e.r; r++) {
    const fc = ws2[XLSX.utils.encode_cell({ r, c: 0 })];
    const tc2 = ws2[XLSX.utils.encode_cell({ r, c: 2 })];
    if (fc && String(fc.v).startsWith("CLASS")) {
      if (!ws2["!merges"]) ws2["!merges"] = [];
      ws2["!merges"].push({ s: { r, c: 0 }, e: { r, c: tc - 1 } });
      fc.s = S_BANNER; continue;
    }
    if (tc2 && (tc2.v === "SUBTOTAL" || tc2.v === "GRAND TOTAL")) {
      const isG = tc2.v === "GRAND TOTAL";
      for (let c = 0; c < tc; c++) {
        const a = XLSX.utils.encode_cell({ r, c });
        if (!ws2[a]) ws2[a] = { v: "" };
        ws2[a].s = isG ? S_GRAND : S_SUBTOT;
        applyCurrency(ws2, a, columns[c - 3]);
      }
      continue;
    }
    if (fc?.v) {
      const ev = Number(fc.v) % 2 === 0;
      for (let c = 0; c < tc; c++) {
        const a = XLSX.utils.encode_cell({ r, c });
        if (!ws2[a]) continue;
        ws2[a].s = { font: { sz: 10 }, fill: { fgColor: { rgb: ev ? "F8FAFC" : "FFFFFF" } }, border: B };
        applyCurrency(ws2, a, columns[c - 3]);
      }
    }
  }
  ws2["!freeze"] = { xSplit: 3, ySplit: 3 };
  XLSX.utils.book_append_sheet(wb, ws2, "Master Roster");

  // ═══ TAB 3: FEE DEFAULTERS ═══
  const defs = rows.filter((r) => {
    const st = r.data?.paymentStatus?.toLowerCase();
    return st === "unpaid" || st === "partial" || (Number(r.data?.[rmk]) || 0) > 0;
  });
  const dd = [];
  dd.push([`${INST.name} — OUTSTANDING FEE DEFAULTERS (${academicYear})`]);
  dd.push([`Total Defaulters: ${defs.length} Students  |  Generated: ${fmtDate(new Date())}`]);
  dd.push([]);
  dd.push(["#", "Student ID", "Student Name", "Class", "Sec", "Parent Phone", "Total Fee (Rs.)", "Paid (Rs.)", "Pending (Rs.)", "Status"]);
  defs.forEach((row, i) => {
    dd.push([
      i + 1,
      row.student?.studentId || "", row.student?.name || "",
      row.student?.className || "", row.student?.section || "A",
      row.student?.parentPhone || row.student?.phone || "",
      Number(row.data?.[tfk]) || 0, Number(row.data?.[rck]) || 0,
      Number(row.data?.[rmk]) || 0, row.data?.paymentStatus || "Unpaid",
    ]);
  });
  const ws3 = XLSX.utils.aoa_to_sheet(dd);
  ws3["!cols"] = [{ wch: 6 }, { wch: 14 }, { wch: 22 }, { wch: 10 }, { wch: 6 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
  ws3["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }];
  ws3["A1"].s = S_TITLE;
  for (let c = 0; c < 10; c++) { const a = XLSX.utils.encode_cell({ r: 3, c }); if (ws3[a]) ws3[a].s = S_HDR; }
  const r3 = XLSX.utils.decode_range(ws3["!ref"]);
  for (let r = 4; r <= r3.e.r; r++) {
    for (let c = 0; c < 10; c++) {
      const a = XLSX.utils.encode_cell({ r, c });
      if (!ws3[a]) continue;
      ws3[a].s = { font: { sz: 10 }, border: B };
      if ([6, 7, 8].includes(c) && typeof ws3[a].v === "number") ws3[a].z = '"Rs."#,##0.00';
    }
  }
  XLSX.utils.book_append_sheet(wb, ws3, "Fee Defaulters");

  // ═══ TAB 4+: PER-CLASS ═══
  groupedRows.forEach((g) => {
    const cd = [];
    cd.push([`${INST.name} — CLASS ${g.className}-${g.section}`]);
    cd.push([`Session: ${academicYear}  |  Strength: ${g.rows.length}`]);
    cd.push([]);
    cd.push(["#", ...columns.map((c) => c.label)]);
    g.rows.forEach((row, i) => {
      cd.push([i + 1, ...columns.map((c) => {
        const v = val(row, c);
        return ["currency", "number"].includes(c.type) && v !== "" ? Number(v) || 0 : v || "";
      })]);
    });
    const tr = ["TOTAL"];
    columns.forEach((c) => tr.push(["currency", "number"].includes(c.type) ? sum(g.rows, c.key) : ""));
    cd.push(tr);

    const ws = XLSX.utils.aoa_to_sheet(cd);
    const cc = 1 + columns.length;
    ws["!cols"] = [{ wch: 6 }, ...columns.map((c) => ({ wch: Math.max(14, c.label.length + 4) }))];
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: cc - 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: cc - 1 } }];
    ws["A1"].s = S_TITLE;
    for (let c = 0; c < cc; c++) { const a = XLSX.utils.encode_cell({ r: 3, c }); if (ws[a]) ws[a].s = S_HDR; }
    const cr = XLSX.utils.decode_range(ws["!ref"]);
    for (let r = 4; r <= cr.e.r; r++) {
      const isLast = r === cr.e.r;
      for (let c = 0; c < cc; c++) {
        const a = XLSX.utils.encode_cell({ r, c });
        if (!ws[a]) ws[a] = { v: "" };
        ws[a].s = isLast ? S_GRAND : { font: { sz: 10 }, border: B };
        applyCurrency(ws, a, columns[c - 1]);
      }
    }
    ws["!freeze"] = { xSplit: 1, ySplit: 4 };
    XLSX.utils.book_append_sheet(wb, ws, safeSheet(`Class ${g.className}-${g.section}`));
  });

  // ═══ TAB 5: TRANSACTION LEDGER ═══
  const txAll = [];
  rows.forEach((r) => (r.payments || []).forEach((p) => txAll.push({ ...p, sName: r.student?.name || "", sId: r.student?.studentId || "", cls: r.student?.className || "", sec: r.student?.section || "A" })));
  txAll.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

  const td = [];
  td.push([`${INST.name} — FEE TRANSACTION LEDGER (${academicYear})`]);
  td.push([`Total Transactions: ${txAll.length}  |  Generated: ${fmtDate(new Date())}`]);
  td.push([]);
  td.push(["#", "Receipt No", "Date", "Student Name", "Student ID", "Class", "Amount (Rs.)", "Mode", "Fee Head", "Collected By", "Remarks"]);
  txAll.forEach((p, i) => {
    td.push([i + 1, p.receiptNo || "", fmtDate(p.paymentDate), p.sName, p.sId, `${p.cls}-${p.sec}`, Number(p.amount) || 0, p.paymentMode || "Cash", p.feeHead || "", p.collectedByName || "", p.remarks || ""]);
  });
  if (txAll.length) {
    const tot = txAll.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    td.push([]);
    td.push(["", "", "", "", "", "TOTAL COLLECTED", tot, "", "", "", ""]);
  }

  const ws5 = XLSX.utils.aoa_to_sheet(td);
  ws5["!cols"] = [{ wch: 6 }, { wch: 16 }, { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 18 }];
  ws5["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }];
  ws5["A1"].s = S_TITLE;
  for (let c = 0; c < 11; c++) { const a = XLSX.utils.encode_cell({ r: 3, c }); if (ws5[a]) ws5[a].s = S_HDR; }
  const r5 = XLSX.utils.decode_range(ws5["!ref"]);
  for (let r = 4; r <= r5.e.r; r++) {
    for (let c = 0; c < 11; c++) {
      const a = XLSX.utils.encode_cell({ r, c });
      if (!ws5[a]) continue;
      ws5[a].s = { font: { sz: 9 }, border: B };
      if (c === 6 && typeof ws5[a].v === "number") ws5[a].z = '"Rs."#,##0.00';
    }
  }
  XLSX.utils.book_append_sheet(wb, ws5, "Transaction Ledger");

  // ── SAVE ──
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), `Gurukul_Payment_Report_${academicYear}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/* ================================================================
   PDF EXPORT  —  Cover + Class Rosters + Transaction Ledger
================================================================ */
export const exportPaymentSheetToPDF = ({ rows, columns, academicYear, groupedRows }) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  const tfk = fk(columns, ["total fee", "total fees", "annual"]);
  const rck = fk(columns, ["received", "paid", "collected"]);
  const rmk = fk(columns, ["remaining", "balance", "due", "pending"]);
  const tFees = sum(rows, tfk);
  const tRecv = sum(rows, rck);
  const tRem = sum(rows, rmk);

  // ── Helper: add running footer to current page ──
  const addFooter = () => {
    const pg = doc.internal.getNumberOfPages();
    doc.setFontSize(7.5);
    doc.setTextColor(130);
    doc.setFont("helvetica", "normal");
    doc.text(`${INST.name}  |  Official Financial Audit Copy  |  Confidential`, 15, ph - 5);
    doc.text(`Page ${pg}`, pw - 15, ph - 5, { align: "right" });
  };

  // ═══ PAGE 1: COVER & SUMMARY ═══
  doc.setFillColor(30, 27, 75);
  doc.rect(0, 0, pw, 32, "F");
  doc.setTextColor(255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(INST.name, pw / 2, 13, { align: "center" });
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(`${INST.sub}  |  ${INST.affl}`, pw / 2, 19, { align: "center" });
  doc.text(`${INST.addr}  |  Ph: ${INST.phone}  |  ${INST.email}`, pw / 2, 25, { align: "center" });

  doc.setTextColor(30, 58, 138);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("ANNUAL FEE COLLECTION & AUDIT REPORT", pw / 2, 43, { align: "center" });
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Academic Session: ${academicYear}   |   Report Date: ${fmtDate(new Date())}`, pw / 2, 49, { align: "center" });

  // KPI Cards
  const cw = (pw - 50) / 4;
  [
    { l: "Total Students", v: String(rows.length), c: [59, 130, 246] },
    { l: "Total Assessment", v: `Rs. ${fmt(tFees)}`, c: [99, 102, 241] },
    { l: "Total Collected", v: `Rs. ${fmt(tRecv)}`, c: [16, 185, 129] },
    { l: "Outstanding Dues", v: `Rs. ${fmt(tRem)}`, c: [239, 68, 68] },
  ].forEach((cd, i) => {
    const x = 20 + i * (cw + 3.3);
    doc.setFillColor(...cd.c);
    doc.roundedRect(x, 55, cw, 20, 2, 2, "F");
    doc.setTextColor(255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(cd.l, x + cw / 2, 62, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(cd.v, x + cw / 2, 70, { align: "center" });
  });

  const rate = tFees > 0 ? ((tRecv / tFees) * 100).toFixed(2) : "0.00";
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Institutional Recovery Rate: ${rate}%`, pw / 2, 83, { align: "center" });

  // Status breakdown
  const paid = rows.filter((r) => r.data?.paymentStatus?.toLowerCase() === "paid").length;
  const partial = rows.filter((r) => r.data?.paymentStatus?.toLowerCase() === "partial").length;
  const unpaid = rows.filter((r) => r.data?.paymentStatus?.toLowerCase() === "unpaid").length;

  autoTable(doc, {
    startY: 88,
    head: [["Payment Status", "Students", "Percentage"]],
    body: [
      ["Fully Paid", paid, rows.length ? `${((paid / rows.length) * 100).toFixed(1)}%` : "0%"],
      ["Partially Paid", partial, rows.length ? `${((partial / rows.length) * 100).toFixed(1)}%` : "0%"],
      ["Unpaid", unpaid, rows.length ? `${((unpaid / rows.length) * 100).toFixed(1)}%` : "0%"],
    ],
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold", halign: "center", fontSize: 9 },
    bodyStyles: { halign: "center", fontSize: 9 },
    margin: { left: 20, right: 20 },
    tableWidth: 120,
  });

  // Class-wise summary — FIXED: no sumBy bug
  const classBody = groupedRows.map((g) => {
    const gf = sum(g.rows, tfk);
    const gr = sum(g.rows, rck);
    const gp = sum(g.rows, rmk);
    return [
      `Class ${g.className}-${g.section}`,
      g.rows.length,
      `Rs. ${fmt(gf)}`,
      `Rs. ${fmt(gr)}`,
      `Rs. ${fmt(gp)}`,
      gf > 0 ? `${((gr / gf) * 100).toFixed(1)}%` : "N/A",
    ];
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    head: [["Class & Section", "Strength", "Total Fees", "Collected", "Pending", "Recovery %"]],
    body: classBody,
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold", halign: "center", fontSize: 8.5 },
    bodyStyles: { fontSize: 8, halign: "center" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { halign: "left", fontStyle: "bold" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    margin: { left: 20, right: 20 },
  });

  // Signature lines
  const sy = ph - 18;
  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.setFont("helvetica", "normal");
  doc.text("Prepared By: ________________", 25, sy);
  doc.text("Auditor: ________________", pw / 2, sy, { align: "center" });
  doc.text("Principal: ________________", pw - 25, sy, { align: "right" });
  addFooter();

  // ═══ PAGES 2+: CLASS ROSTERS ═══
  const dispCols = columns.slice(0, 12);

  groupedRows.forEach((g) => {
    doc.addPage();
    doc.setFillColor(30, 27, 75);
    doc.rect(0, 0, pw, 14, "F");
    doc.setTextColor(255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(INST.name, 12, 9);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${academicYear}  |  Class Roster`, pw - 12, 9, { align: "right" });

    doc.setTextColor(30, 58, 138);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Class ${g.className} - Section ${g.section}  (${g.rows.length} Students)`, 12, 22);

    const head = [["#", ...dispCols.map((c) => c.label)]];
    const body = g.rows.map((row, i) => [
      i + 1,
      ...dispCols.map((c) => {
        const v = val(row, c);
        if (c.type === "currency" && v !== "") return `Rs. ${fmt(v)}`;
        if (c.type === "date" && v) return fmtDate(v);
        return v === "" || v === null ? "—" : String(v);
      }),
    ]);

    // Subtotal
    const stRow = ["", "SUBTOTAL"];
    dispCols.slice(1).forEach((c) => {
      if (["currency", "number"].includes(c.type)) {
        const s = g.rows.reduce((a, r) => a + (Number(r.data?.[c.key]) || 0), 0);
        stRow.push(c.type === "currency" ? `Rs. ${fmt(s)}` : String(s));
      } else stRow.push("");
    });
    body.push(stRow);

    autoTable(doc, {
      startY: 26,
      head, body,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold", fontSize: 7.5, halign: "center", cellPadding: 1.5 },
      bodyStyles: { fontSize: 7, cellPadding: 1.2 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 8, right: 8, bottom: 12 },
      didParseCell: (data) => {
        if (data.row.index === body.length - 1) {
          data.cell.styles.fillColor = [219, 234, 254];
          data.cell.styles.textColor = [30, 58, 138];
          data.cell.styles.fontStyle = "bold";
        }
        const col = dispCols[data.column.index - 1];
        if (col?.key === "paymentStatus" && data.row.index !== body.length - 1) {
          const v = String(data.cell.raw || "").toLowerCase();
          if (v === "paid") data.cell.styles.textColor = [5, 150, 105];
          else if (v === "unpaid") data.cell.styles.textColor = [220, 38, 38];
          else if (v === "partial") data.cell.styles.textColor = [217, 119, 6];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    addFooter();
  });

  // ═══ TRANSACTION LEDGER ═══
  const txAll = [];
  rows.forEach((r) => (r.payments || []).forEach((p) => txAll.push({ ...p, sN: r.student?.name || "", sI: r.student?.studentId || "", cls: `${r.student?.className || ""}-${r.student?.section || "A"}` })));

  if (txAll.length) {
    txAll.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
    doc.addPage();
    doc.setFillColor(30, 27, 75);
    doc.rect(0, 0, pw, 14, "F");
    doc.setTextColor(255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(INST.name, 12, 9);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Fee Transaction Ledger", pw - 12, 9, { align: "right" });

    doc.setTextColor(30, 58, 138);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Payment Receipts Log  (${txAll.length} Transactions)`, 12, 22);

    const txBody = txAll.map((t, i) => [
      i + 1, t.receiptNo || "—", fmtDate(t.paymentDate), t.sN, t.sI, t.cls,
      `Rs. ${fmt(t.amount)}`, t.paymentMode || "Cash", t.feeHead || "—", t.collectedByName || "—",
    ]);
    const tot = txAll.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    txBody.push(["", "", "", "", "", "TOTAL", `Rs. ${fmt(tot)}`, "", "", ""]);

    autoTable(doc, {
      startY: 26,
      head: [["#", "Receipt", "Date", "Student", "ID", "Class", "Amount", "Mode", "Fee Head", "Cashier"]],
      body: txBody,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold", fontSize: 7.5, halign: "center" },
      bodyStyles: { fontSize: 7, cellPadding: 1.2 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: { 0: { halign: "center", cellWidth: 8 }, 6: { halign: "right", fontStyle: "bold" } },
      margin: { left: 8, right: 8, bottom: 12 },
      didParseCell: (data) => {
        if (data.row.index === txBody.length - 1) {
          data.cell.styles.fillColor = [5, 150, 105];
          data.cell.styles.textColor = 255;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    addFooter();
  }

  // ── Fix all page numbers ──
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(130);
    doc.text(`Page ${i} of ${total}`, pw - 15, ph - 5, { align: "right" });
  }

  doc.save(`Gurukul_Payment_Report_${academicYear}_${new Date().toISOString().slice(0, 10)}.pdf`);
};