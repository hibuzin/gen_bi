import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ==========================================
// COMMON HELPERS
// ==========================================

const formatDate = (date) => {
  if (!date) return "-";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "-";
  }

  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (date) => {
  if (!date) return "-";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "-";
  }

  return value.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const amount = (value) => {
  return Number(value || 0).toFixed(2);
};

// ==========================================
// NORMALIZE PURCHASE DATA
// ==========================================

const preparePurchaseRows = (data = []) => {
  return data.map((item, index) => ({
    "S.No": index + 1,

    "Audit Date": formatDateTime(item.date),

    Action: item.action || "-",

    "GRN No": item.grnNo || "-",

    "Invoice No": item.invoiceNo || "-",

    "GRN Date": formatDate(item.grnDate),

    Supplier: item.supplierName || "-",

    "Supplier GST No": item.supplierGstNumber || "-",

    "Item Name": item.itemName || "-",

    "Item Index": item.itemIndex || "-",

    "HSN Code": item.hsnCode || "-",

    Unit: item.unit || "-",

    Qty: Number(item.qty || 0),

    "Free Qty": Number(item.freeQty || 0),

    MRP: amount(item.mrp),

    "Purchase Price": amount(
      item.purchasePrice || item.costPrice
    ),

    "CGST Amount": amount(item.cgstAmount),

    "SGST Amount": amount(item.sgstAmount),

    "IGST Amount": amount(item.igstAmount),

    "Tax Amount": amount(item.taxAmount),

    User: item.user?.name || "-",

    Role: item.user?.role || "-",
  }));
};

// ==========================================
// EXCEL EXPORT
// ==========================================

export const exportPurchaseReportExcel = (data = []) => {
  if (!data.length) {
    alert("No purchase report data available");
    return;
  }

  const rows = preparePurchaseRows(data);

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // COLUMN WIDTHS
  worksheet["!cols"] = [
    { wch: 7 },  // S.No
    { wch: 22 }, // Audit Date
    { wch: 12 }, // Action
    { wch: 22 }, // GRN
    { wch: 18 }, // Invoice
    { wch: 15 }, // GRN Date
    { wch: 25 }, // Supplier
    { wch: 22 }, // GST
    { wch: 25 }, // Item
    { wch: 12 }, // Item Index
    { wch: 15 }, // HSN
    { wch: 10 }, // Unit
    { wch: 10 }, // Qty
    { wch: 10 }, // Free Qty
    { wch: 12 }, // MRP
    { wch: 16 }, // Purchase Price
    { wch: 14 }, // CGST
    { wch: 14 }, // SGST
    { wch: 14 }, // IGST
    { wch: 14 }, // Tax
    { wch: 18 }, // User
    { wch: 15 }, // Role
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Purchase Report"
  );

  const today = new Date()
    .toLocaleDateString("en-GB")
    .replaceAll("/", "-");

  XLSX.writeFile(
    workbook,
    `Purchase_Report_${today}.xlsx`
  );
};

// ==========================================
// PDF EXPORT
// ==========================================

export const exportPurchaseReportPDF = (data = []) => {
  if (!data.length) {
    alert("No purchase report data available");
    return;
  }

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a3",
  });

  const today = new Date().toLocaleDateString("en-IN");

  // ==========================================
  // TITLE
  // ==========================================

  doc.setFontSize(16);
  doc.text("Purchase Item-wise Audit Report", 14, 15);

  doc.setFontSize(9);
  doc.text(`Generated On: ${today}`, 14, 21);

  doc.text(`Total Records: ${data.length}`, 14, 26);

  // ==========================================
  // SUMMARY
  // ==========================================

  const totalQty = data.reduce(
    (sum, item) => sum + Number(item.qty || 0),
    0
  );

  const totalTax = data.reduce(
    (sum, item) => sum + Number(item.taxAmount || 0),
    0
  );

  doc.text(
    `Total Qty: ${totalQty.toFixed(2)}`,
    80,
    26
  );

  doc.text(
    `Total Tax: Rs. ${totalTax.toFixed(2)}`,
    125,
    26
  );

  // ==========================================
  // TABLE
  // ==========================================

  const tableBody = data.map((item, index) => [
    index + 1,

    formatDateTime(item.date),

    item.action || "-",

    item.grnNo || "-",

    item.invoiceNo || "-",

    formatDate(item.grnDate),

    item.supplierName || "-",

    item.itemName || "-",

    item.hsnCode || "-",

    item.unit || "-",

    Number(item.qty || 0),

    Number(item.freeQty || 0),

    amount(item.mrp),

    amount(
      item.purchasePrice || item.costPrice
    ),

    amount(item.cgstAmount),

    amount(item.sgstAmount),

    amount(item.igstAmount),

    amount(item.taxAmount),

    item.user?.name || "-",

    item.user?.role || "-",
  ]);

  autoTable(doc, {
    startY: 32,

    head: [
      [
        "S.No",
        "Audit Date",
        "Action",
        "GRN No",
        "Invoice",
        "GRN Date",
        "Supplier",
        "Item",
        "HSN",
        "Unit",
        "Qty",
        "Free",
        "MRP",
        "Purchase",
        "CGST",
        "SGST",
        "IGST",
        "Tax",
        "User",
        "Role",
      ],
    ],

    body: tableBody,

    theme: "grid",

    styles: {
      fontSize: 6.5,
      cellPadding: 2,
      overflow: "linebreak",
      valign: "middle",
    },

    headStyles: {
      fillColor: [3, 85, 85],
      textColor: 255,
      fontStyle: "bold",
    },

    alternateRowStyles: {
      fillColor: [248, 249, 250],
    },

    margin: {
      left: 8,
      right: 8,
    },

    didDrawPage: (dataArg) => {
      const pageCount =
        doc.internal.getNumberOfPages();

      doc.setFontSize(8);

      doc.text(
        `Page ${pageCount}`,
        doc.internal.pageSize.width - 25,
        doc.internal.pageSize.height - 8
      );
    },
  });

  const fileDate = new Date()
    .toLocaleDateString("en-GB")
    .replaceAll("/", "-");

  doc.save(`Purchase_Report_${fileDate}.pdf`);
};