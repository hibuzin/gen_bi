import { useEffect, useMemo, useState } from "react";
import {
  FaSearch,
  FaFileExcel,
  FaFilePdf,
  FaEye,
  FaTimes,
  FaReceipt,
  FaRupeeSign,
  FaClock,
} from "react-icons/fa";
import styles from "./BillReports.module.css";
import {
  exportPurchaseBillWiseExcel,
  exportPurchaseBillWisePdf,
} from "./BillWiseExport";
import { API } from "../../../constants/api";

const PURCHASE_BILL_WISE_URL = API.gstbillreport;
const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function SalesBillWiseAudit() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    fetchBillWiseAudit();
  }, []);

  const fetchBillWiseAudit = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(PURCHASE_BILL_WISE_URL, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to fetch bill-wise audit");
      }

      setRecords(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error("Purchase bill-wise audit error:", error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return records;

    return records.filter((row) => {
      const itemNames = (row.items || [])
        .map((item) => item.itemName || "")
        .join(" ");

      return [
        row.invoiceNo,
        row.customerName,
        row.customerGstNumber,
        row.placeOfSupply,
        row.action,
        row.paymentMethod,
        row.paymentStatus,
        row.user?.name,
        row.user?.email,
        row.user?.role,
        itemNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [records, search]);

  const stats = useMemo(() => {
    return filteredRecords.reduce(
      (acc, row) => {
        acc.totalBills += 1;
        acc.totalSales += Number(row.summary?.grandTotal || 0);
        acc.pendingAmount += Number(row.pendingAmount || 0);
        return acc;
      },
      {
        totalBills: 0,
        totalSales: 0,
        pendingAmount: 0,
      }
    );
  }, [filteredRecords]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Bill Wise Audit</h2>
          <p className={styles.subtitle}>
            Purchase audit bill-wise transaction history
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.excelBtn}
            onClick={() => exportPurchaseBillWiseExcel(filteredRecords)}
            disabled={!filteredRecords.length}
          >
            <FaFileExcel />
            Excel
          </button>

          <button
            className={styles.pdfBtn}
            onClick={() => exportPurchaseBillWisePdf(filteredRecords)}
            disabled={!filteredRecords.length}
          >
            <FaFilePdf />
            PDF
          </button>
        </div>
      </div>

      <div className={styles.cardsRow}>
        <div className={styles.infoCard}>
          <div className={styles.cardRow}>
            <div className={`${styles.cardTitle} ${styles.billCard}`}>
              <FaReceipt />
              <p>Total Bills</p>
            </div>
          </div>
          <h2>{stats.totalBills}</h2>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.cardRow}>
            <div className={`${styles.cardTitle} ${styles.amountCard}`}>
              <FaRupeeSign />
              <p>Total Amount</p>
            </div>
          </div>
          <h2>{money(stats.totalSales)}</h2>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.cardRow}>
            <div className={`${styles.cardTitle} ${styles.pendingCard}`}>
              <FaClock />
              <p>Pending Amount</p>
            </div>
          </div>
          <h2>{money(stats.pendingAmount)}</h2>
        </div>
      </div>

      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <FaSearch className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice, customer, item, payment..."
          />
        </div>

        <div className={styles.resultCount}>
          Showing {filteredRecords.length} of {records.length} records
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Date</th>
              <th>Invoice No</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Taxable Amount</th>
              <th>GST</th>
              <th>Grand Total</th>
              <th>Paid</th>
              <th>Pending</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Action</th>
              <th>View</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="14">
                  <div className={styles.tableLoader}>
                    <div className={styles.spinner}></div>
                    <p>Loading bill-wise audit...</p>
                  </div>
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="14">
                  <div className={styles.emptyState}>No records found</div>
                </td>
              </tr>
            ) : (
              filteredRecords.map((row, index) => (
                <tr key={row.auditId || `${row.invoiceNo}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{formatDate(row.invoiceDate || row.date)}</td>
                  <td className={styles.invoiceCell}>{row.invoiceNo || "-"}</td>
                  <td>{row.customerName || "-"}</td>
                  <td>{row.itemCount ?? row.items?.length ?? 0}</td>
                  <td>{money(row.summary?.subTotal)}</td>
                  <td>{money(row.summary?.totalGST)}</td>
                  <td className={styles.totalCell}>
                    {money(row.summary?.grandTotal)}
                  </td>
                  <td>{money(row.paidAmount)}</td>
                  <td
                    className={
                      Number(row.pendingAmount || 0) > 0
                        ? styles.dueCell
                        : undefined
                    }
                  >
                    {money(row.pendingAmount)}
                  </td>
                  <td className={styles.capitalize}>
                    {row.paymentMethod || "-"}
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        String(row.paymentStatus).toLowerCase() === "paid"
                          ? styles.paid
                          : String(row.paymentStatus).toLowerCase() === "due"
                          ? styles.due
                          : styles.partial
                      }`}
                    >
                      {row.paymentStatus || "-"}
                    </span>
                  </td>
                  <td>
                    <span className={styles.actionBadge}>
                      {row.action || "-"}
                    </span>
                  </td>
                  <td>
                    <button
                      className={styles.viewBtn}
                      onClick={() => setSelectedRecord(row)}
                      title="View details"
                    >
                      <FaEye />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedRecord && (
        <div
          className={styles.modalOverlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedRecord(null);
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Bill Audit Details</h3>
                <p>{selectedRecord.invoiceNo || "-"}</p>
              </div>

              <button
                className={styles.closeBtn}
                onClick={() => setSelectedRecord(null)}
              >
                <FaTimes />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <Detail
                  label="Invoice No"
                  value={selectedRecord.invoiceNo || "-"}
                />
                <Detail
                  label="Invoice Date"
                  value={formatDateTime(
                    selectedRecord.invoiceDate || selectedRecord.date
                  )}
                />
                <Detail
                  label="Customer"
                  value={selectedRecord.customerName || "-"}
                />
                <Detail
                  label="Customer GST"
                  value={selectedRecord.customerGstNumber || "-"}
                />
                <Detail
                  label="Place of Supply"
                  value={selectedRecord.placeOfSupply || "-"}
                />
                <Detail label="Action" value={selectedRecord.action || "-"} />
                <Detail
                  label="User Role"
                  value={selectedRecord.user?.role || "-"}
                />
                <Detail
                  label="Payment Method"
                  value={selectedRecord.paymentMethod || "-"}
                />
                <Detail
                  label="Payment Status"
                  value={selectedRecord.paymentStatus || "-"}
                />
                <Detail
                  label="Paid Amount"
                  value={money(selectedRecord.paidAmount)}
                />
                <Detail
                  label="Pending Amount"
                  value={money(selectedRecord.pendingAmount)}
                />
                <Detail
                  label="Grand Total"
                  value={money(selectedRecord.summary?.grandTotal)}
                />
              </div>

              <section className={styles.section}>
                <h4>Items</h4>

                <div className={styles.modalTableWrapper}>
                  <table className={styles.modalTable}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Barcode</th>
                        <th>HSN</th>
                        <th>Qty</th>
                        <th>Unit</th>
                        <th>MRP</th>
                        <th>Rate</th>
                        <th>Discount</th>
                        <th>Taxable</th>
                        <th>GST %</th>
                        <th>GST Amount</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedRecord.items || []).map((item, index) => (
                        <tr key={item.productId || index}>
                          <td>{item.itemName || "-"}</td>
                          <td>{item.barcode || "-"}</td>
                          <td>{item.hsnCode || "-"}</td>
                          <td>{item.qty ?? 0}</td>
                          <td>{item.totalKg || item.unitText || item.unit || "-"}</td>
                          <td>{money(item.mrp)}</td>
                          <td>{money(item.rate)}</td>
                          <td>{money(item.discountAmount)}</td>
                          <td>{money(item.taxableAmount)}</td>
                          <td>{Number(item.gstRate || 0)}%</td>
                          <td>{money(item.gstAmount)}</td>
                          <td>{money(item.finalAmount ?? item.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className={styles.section}>
                <h4>Bill Summary</h4>

                <div className={styles.summaryGrid}>
                  <SummaryItem
                    label="Sub Total"
                    value={money(selectedRecord.summary?.subTotal)}
                  />
                  <SummaryItem
                    label="Total GST"
                    value={money(selectedRecord.summary?.totalGST)}
                  />
                  <SummaryItem
                    label="Item Discount"
                    value={money(selectedRecord.summary?.itemDiscountAmount)}
                  />
                  <SummaryItem
                    label="Bill Discount"
                    value={money(selectedRecord.summary?.billDiscountAmount)}
                  />
                  <SummaryItem
                    label="Loyalty Discount"
                    value={money(selectedRecord.summary?.loyaltyDiscount)}
                  />
                  <SummaryItem
                    label="Grand Total"
                    value={money(selectedRecord.summary?.grandTotal)}
                    strong
                  />
                </div>
              </section>

              {!!selectedRecord.payments?.length && (
                <section className={styles.section}>
                  <h4>Payments</h4>

                  <div className={styles.paymentList}>
                    {selectedRecord.payments.map((payment, index) => (
                      <div className={styles.paymentCard} key={index}>
                        <span>{payment.method || "-"}</span>
                        <strong>{money(payment.amount)}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className={styles.detailItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SummaryItem({ label, value, strong = false }) {
  return (
    <div className={`${styles.summaryItem} ${strong ? styles.summaryStrong : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}