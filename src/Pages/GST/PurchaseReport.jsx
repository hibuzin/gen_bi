import { useEffect, useMemo, useState } from "react";
import {
  FaSearch,
  FaSyncAlt,
  FaShoppingCart,
  FaFilter,
} from "react-icons/fa";
import styles from "./PurchaseReport.module.css";
import { API } from "../../constants/api";
import {
  exportPurchaseReportExcel,
  exportPurchaseReportPDF,
} from "./purchaseReportExport";

const PURCHASE_AUDIT_URL = API.gstpurchasereport;

function PurchaseReport() {
  const [purchaseData, setPurchaseData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // ==========================================
  // FETCH PURCHASE ITEM-WISE AUDIT
  // ==========================================
  const fetchPurchaseReport = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const params = new URLSearchParams();

      if (action) {
        params.append("action", action);
      }

      if (fromDate) {
        params.append("fromDate", fromDate);
      }

      if (toDate) {
        params.append("toDate", toDate);
      }

      if (search.trim()) {
        params.append("search", search.trim());
      }

      const url = params.toString()
        ? `${PURCHASE_AUDIT_URL}?${params.toString()}`
        : PURCHASE_AUDIT_URL;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch purchase report");
      }

      if (data.success) {
        setPurchaseData(data.data || []);
      } else {
        setPurchaseData([]);
      }
    } catch (error) {
      console.error("Purchase report error:", error);
      setPurchaseData([]);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // INITIAL LOAD
  // ==========================================
  useEffect(() => {
    fetchPurchaseReport();
  }, []);

  // ==========================================
  // APPLY FILTER
  // ==========================================
  const handleApplyFilter = () => {
    fetchPurchaseReport();
  };

  // ==========================================
  // CLEAR FILTER
  // ==========================================
  const handleClearFilter = () => {
    setSearch("");
    setAction("");
    setFromDate("");
    setToDate("");

    setTimeout(() => {
      fetchPurchaseReportWithoutFilter();
    }, 0);
  };

  const fetchPurchaseReportWithoutFilter = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const response = await fetch(PURCHASE_AUDIT_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        setPurchaseData(data.data || []);
      } else {
        setPurchaseData([]);
      }
    } catch (error) {
      console.error("Purchase report error:", error);
      setPurchaseData([]);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // FRONTEND SEARCH
  // ==========================================
  const filteredData = useMemo(() => {
    if (!search.trim()) {
      return purchaseData;
    }

    const value = search.toLowerCase().trim();

    return purchaseData.filter((item) => {
      return (
        item.grnNo?.toLowerCase().includes(value) ||
        item.invoiceNo?.toLowerCase().includes(value) ||
        item.supplierName?.toLowerCase().includes(value) ||
        item.supplierGstNumber?.toLowerCase().includes(value) ||
        item.itemName?.toLowerCase().includes(value) ||
        item.itemCode?.toLowerCase().includes(value) ||
        item.hsnCode?.toLowerCase().includes(value) ||
        item.unit?.toLowerCase().includes(value) ||
        item.action?.toLowerCase().includes(value) ||
        item.user?.name?.toLowerCase().includes(value) ||
        item.user?.role?.toLowerCase().includes(value)
      );
    });
  }, [purchaseData, search]);

  // ==========================================
  // UNIQUE PURCHASE BILLS
  // ==========================================
  const totalBills = useMemo(() => {
    const bills = new Set(
      filteredData
        .map((item) => item.documentId || item.grnNo)
        .filter(Boolean)
    );

    return bills.size;
  }, [filteredData]);

  // ==========================================
  // TOTAL QUANTITY
  // ==========================================
  const totalQty = useMemo(() => {
    return filteredData.reduce(
      (total, item) => total + Number(item.qty || 0),
      0
    );
  }, [filteredData]);

  // ==========================================
  // TOTAL TAX
  // ==========================================
  const totalTax = useMemo(() => {
    return filteredData.reduce(
      (total, item) => total + Number(item.taxAmount || 0),
      0
    );
  }, [filteredData]);

  // ==========================================
  // DATE FORMAT
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

  // ==========================================
  // DATE TIME FORMAT
  // ==========================================
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

  // ==========================================
  // AMOUNT FORMAT
  // ==========================================
  const formatAmount = (value) => {
    const number = Number(value || 0);

    return number.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // ==========================================
  // ACTION CLASS
  // ==========================================
  const getActionClass = (value) => {
    const type = value?.toLowerCase();

    if (type === "create") {
      return styles.createBadge;
    }

    if (type === "update") {
      return styles.updateBadge;
    }

    if (type === "delete") {
      return styles.deleteBadge;
    }

    return styles.defaultBadge;
  };

  return (
    <div className={styles.container}>
      {/* =====================================
          HEADER
      ====================================== */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.titleIcon}>
            <FaShoppingCart />
          </div>

          <div>
            <h2>Purchase Report</h2>
            <p>Purchase bill item-wise audit report</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.excelBtn}
            onClick={() => exportPurchaseReportExcel(filteredData)}
            disabled={loading || filteredData.length === 0}
          >
            Excel
          </button>

          <button
            type="button"
            className={styles.pdfBtn}
            onClick={() => exportPurchaseReportPDF(filteredData)}
            disabled={loading || filteredData.length === 0}
          >
            PDF
          </button>

          <button
            type="button"
            onClick={fetchPurchaseReport}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* =====================================
          SUMMARY CARDS
      ====================================== */}
      <div className={styles.cards}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Total Bills</span>
          <strong>{totalBills}</strong>
        </div>

        <div className={styles.card}>
          <span className={styles.cardLabel}>Total Items</span>
          <strong>{filteredData.length}</strong>
        </div>

        <div className={styles.card}>
          <span className={styles.cardLabel}>Total Quantity</span>
          <strong>{totalQty.toFixed(2)}</strong>
        </div>

        <div className={styles.card}>
          <span className={styles.cardLabel}>Total Tax</span>
          <strong>₹{formatAmount(totalTax)}</strong>
        </div>
      </div>

      {/* =====================================
          FILTER SECTION
      ====================================== */}
      <div className={styles.filterSection}>
        <div className={styles.searchBox}>
          <FaSearch className={styles.searchIcon} />

          <input
            type="text"
            placeholder="Search GRN, invoice, supplier, item, HSN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleApplyFilter();
              }
            }}
          />
        </div>
      </div>

      {/* =====================================
          RESULT INFO
      ====================================== */}
      <div className={styles.tableHeader}>
        <div>
          <h3>Purchase Item Audit</h3>

          <span>
            {filteredData.length} item
            {filteredData.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* =====================================
          TABLE
      ====================================== */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Audit Date</th>
              <th>Action</th>
              <th>GRN No</th>
              <th>Invoice No</th>
              <th>GRN Date</th>
              <th>Supplier</th>
              <th>GST No</th>
              <th>Item</th>
              <th>HSN</th>
              <th>Unit</th>
              <th>Qty</th>
              <th>Free Qty</th>
              <th>MRP</th>
              <th>Purchase Price</th>
              <th>CGST</th>
              <th>SGST</th>
              <th>IGST</th>
              <th>Tax Amount</th>
              <th>User</th>
              <th>Role</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="21" className={styles.messageCell}>
                  <div className={styles.loader}></div>
                  <span>Loading purchase report...</span>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan="21" className={styles.messageCell}>
                  No purchase audit records found
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <tr
                  key={`${item.auditId}-${item.itemIndex}-${index}`}
                >
                  <td className={styles.serialNo}>
                    {index + 1}
                  </td>

                  <td className={styles.dateCell}>
                    {formatDateTime(item.date)}
                  </td>

                  <td>
                    <span
                      className={`${styles.actionBadge} ${getActionClass(
                        item.action
                      )}`}
                    >
                      {item.action || "-"}
                    </span>
                  </td>

                  <td>
                    <span className={styles.grnNo}>
                      {item.grnNo || "-"}
                    </span>
                  </td>

                  <td>{item.invoiceNo || "-"}</td>

                  <td>{formatDate(item.grnDate)}</td>

                  <td>
                    <div className={styles.supplierCell}>
                      <strong>{item.supplierName || "-"}</strong>
                    </div>
                  </td>

                  <td className={styles.gstNo}>
                    {item.supplierGstNumber || "-"}
                  </td>

                  <td>
                    <div className={styles.itemCell}>
                      <strong>{item.itemName || "-"}</strong>

                      {item.itemIndex ? (
                        <span>Item {item.itemIndex}</span>
                      ) : null}
                    </div>
                  </td>

                  <td>{item.hsnCode || "-"}</td>

                  <td>
                    <span className={styles.unitBadge}>
                      {item.unit || "-"}
                    </span>
                  </td>

                  <td className={styles.numberCell}>
                    {Number(item.qty || 0)}
                  </td>

                  <td className={styles.numberCell}>
                    {Number(item.freeQty || 0)}
                  </td>

                  <td className={styles.amountCell}>
                    ₹{formatAmount(item.mrp)}
                  </td>

                  <td className={styles.amountCell}>
                    ₹{formatAmount(
                      item.purchasePrice || item.costPrice
                    )}
                  </td>

                  <td className={styles.amountCell}>
                    ₹{formatAmount(item.cgstAmount)}
                  </td>

                  <td className={styles.amountCell}>
                    ₹{formatAmount(item.sgstAmount)}
                  </td>

                  <td className={styles.amountCell}>
                    ₹{formatAmount(item.igstAmount)}
                  </td>

                  <td className={styles.taxAmount}>
                    ₹{formatAmount(item.taxAmount)}
                  </td>

                  <td>{item.user?.name || "-"}</td>

                  <td>
                    <span className={styles.roleBadge}>
                      {item.user?.role || "-"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PurchaseReport;