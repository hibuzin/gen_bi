import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const number = (value) => Number(value || 0);

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// ======================================================
// FLATTEN BILL DATA FOR EXCEL
// ======================================================

const flattenRows = (records = []) =>
  records.map((row, index) => ({
    "S.No": index + 1,

    Date: formatDate(row.invoiceDate || row.date),

    "Invoice No": row.invoiceNo || "-",

    Customer: row.customerName || "-",

    "Customer GST": row.customerGstNumber || "-",

    "Place of Supply": row.placeOfSupply || "-",

    "Item Count": row.itemCount ?? row.items?.length ?? 0,

    "Item Names": (row.items || [])
      .map((item) => item.itemName)
      .filter(Boolean)
      .join(", "),

    "Sub Total": number(row.summary?.subTotal),

    GST: number(row.summary?.totalGST),

    "Item Discount": number(
      row.summary?.itemDiscountAmount
    ),

    "Bill Discount": number(
      row.summary?.billDiscountAmount
    ),

    "Loyalty Discount": number(
      row.summary?.loyaltyDiscount
    ),

    "Grand Total": number(
      row.summary?.grandTotal
    ),

    "Paid Amount": number(row.paidAmount),

    "Pending Amount": number(row.pendingAmount),

    "Payment Method": row.paymentMethod || "-",

    "Payment Status": row.paymentStatus || "-",

    Action: row.action || "-",

    "User Role": row.user?.role || "-",
  }));

// ======================================================
// EXCEL EXPORT
// ======================================================

export const exportPurchaseBillWiseExcel = (
  records = []
) => {
  if (!records.length) return;

  // -----------------------------
  // BILL WISE SHEET
  // -----------------------------

  const rows = flattenRows(records);

  const summarySheet =
    XLSX.utils.json_to_sheet(rows);

  summarySheet["!cols"] = [
    { wch: 7 },  // S.No
    { wch: 13 }, // Date
    { wch: 15 }, // Invoice
    { wch: 24 }, // Customer
    { wch: 18 }, // GST
    { wch: 18 }, // Place
    { wch: 11 }, // Item Count
    { wch: 35 }, // Item Names
    { wch: 14 }, // Sub Total
    { wch: 12 }, // GST
    { wch: 14 }, // Item Discount
    { wch: 14 }, // Bill Discount
    { wch: 16 }, // Loyalty
    { wch: 14 }, // Grand Total
    { wch: 14 }, // Paid
    { wch: 15 }, // Pending
    { wch: 16 }, // Payment Method
    { wch: 15 }, // Payment Status
    { wch: 12 }, // Action
    { wch: 14 }, // User Role
  ];

  // -----------------------------
  // ITEM WISE SHEET
  // -----------------------------

  const itemRows = [];

  records.forEach((row) => {
    (row.items || []).forEach((item) => {
      itemRows.push({
        "Invoice No":
          row.invoiceNo || "-",

        Customer:
          row.customerName || "-",

        Item:
          item.itemName || "-",

        Barcode:
          item.barcode || "-",

        HSN:
          item.hsnCode || "-",

        Qty:
          number(item.qty),

        "Free Qty":
          number(item.freeQty),

        "Total Given Qty":
          number(item.totalGivenQty),

        Unit:
          item.unit || "-",

        "Unit Text":
          item.unitText || "-",

        "Total Qty":
          item.totalKg || "-",

        MRP:
          number(item.mrp),

        Rate:
          number(item.rate),

        Discount:
          number(item.discountAmount),

        "Taxable Amount":
          number(item.taxableAmount),

        "GST %":
          number(item.gstRate),

        CGST:
          number(item.cgstAmount),

        SGST:
          number(item.sgstAmount),

        "GST Amount":
          number(item.gstAmount),

        "Final Amount":
          number(
            item.finalAmount ??
            item.totalAmount
          ),
      });
    });
  });

  const itemSheet =
    XLSX.utils.json_to_sheet(itemRows);

  itemSheet["!cols"] =
    Array.from(
      { length: 20 },
      () => ({ wch: 16 })
    );

  // -----------------------------
  // CREATE WORKBOOK
  // -----------------------------

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    summarySheet,
    "Bill Wise"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    itemSheet,
    "Items"
  );

  // -----------------------------
  // DOWNLOAD
  // -----------------------------

  XLSX.writeFile(
    workbook,
    `Purchase_Bill_Wise_Audit_${
      new Date()
        .toISOString()
        .slice(0, 10)
    }.xlsx`
  );
};

// ======================================================
// PDF EXPORT
// ======================================================

export const exportPurchaseBillWisePdf = (
  records = []
) => {
  if (!records.length) return;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // -----------------------------
  // TITLE
  // -----------------------------

  doc.setFontSize(15);

  doc.text(
    "Purchase Bill Wise Audit Report",
    14,
    15
  );

  doc.setFontSize(9);

  doc.text(
    `Generated: ${
      new Date().toLocaleString("en-IN")
    }`,
    14,
    21
  );

  // -----------------------------
  // TOTALS
  // -----------------------------

  const grandTotal =
    records.reduce(
      (sum, row) =>
        sum +
        number(
          row.summary?.grandTotal
        ),
      0
    );

  const pendingTotal =
    records.reduce(
      (sum, row) =>
        sum +
        number(
          row.pendingAmount
        ),
      0
    );

  doc.text(
    `Bills: ${records.length}    ` +
      `Total: Rs. ${grandTotal.toFixed(2)}    ` +
      `Pending: Rs. ${pendingTotal.toFixed(2)}`,
    14,
    27
  );

  // -----------------------------
  // PDF TABLE
  // -----------------------------

  autoTable(doc, {
    startY: 32,

    head: [
      [
        "S.No",
        "Date",
        "Invoice",
        "Customer",
        "Items",
        "Sub Total",
        "GST",
        "Grand Total",
        "Paid",
        "Pending",
        "Payment",
        "Status",
        "Action",
      ],
    ],

    body: records.map(
      (row, index) => [
        index + 1,

        formatDate(
          row.invoiceDate ||
          row.date
        ),

        row.invoiceNo || "-",

        row.customerName || "-",

        row.itemCount ??
          row.items?.length ??
          0,

        number(
          row.summary?.subTotal
        ).toFixed(2),

        number(
          row.summary?.totalGST
        ).toFixed(2),

        number(
          row.summary?.grandTotal
        ).toFixed(2),

        number(
          row.paidAmount
        ).toFixed(2),

        number(
          row.pendingAmount
        ).toFixed(2),

        row.paymentMethod || "-",

        row.paymentStatus || "-",

        row.action || "-",
      ]
    ),

    styles: {
      fontSize: 7,
      cellPadding: 2.2,
      overflow: "linebreak",
    },

    headStyles: {
      fontStyle: "bold",
    },

    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 18 },
      2: { cellWidth: 22 },
      3: { cellWidth: 28 },
      4: { cellWidth: 12 },
      5: { cellWidth: 20 },
      6: { cellWidth: 17 },
      7: { cellWidth: 21 },
      8: { cellWidth: 18 },
      9: { cellWidth: 18 },
      10: { cellWidth: 20 },
      11: { cellWidth: 18 },
      12: { cellWidth: 16 },
    },

    margin: {
      left: 8,
      right: 8,
    },
  });

  // -----------------------------
  // DOWNLOAD PDF
  // -----------------------------

  doc.save(
    `Purchase_Bill_Wise_Audit_${
      new Date()
        .toISOString()
        .slice(0, 10)
    }.pdf`
  );
};