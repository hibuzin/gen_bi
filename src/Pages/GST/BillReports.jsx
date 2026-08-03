import { useEffect, useMemo, useState } from "react";
import {
  FiSearch,
  FiRefreshCw,
  FiEye,
  FiX,
  FiFileText,
  FiUser,
  FiCalendar,
  FiFilter,
} from "react-icons/fi";
import { API } from "../../constants/api";
import styles from "./BillReports.module.css";


function BillReports() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    module: "Bill",
    action: "",
    fromDate: "",
    toDate: "",
  });

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const getToken = () => localStorage.getItem("token");

  const fetchAuditLogs = async (customFilters = filters) => {
    try {
      setLoading(true);

      const query = new URLSearchParams();

      if (customFilters.module) {
        query.append("module", customFilters.module);
      }

      if (customFilters.action) {
        query.append("action", customFilters.action);
      }

      if (customFilters.fromDate) {
        query.append("fromDate", customFilters.fromDate);
      }

      if (customFilters.toDate) {
        query.append("toDate", customFilters.toDate);
      }

      const token = getToken();

      const response = await fetch(`${API.auditreports}?${query.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && {
            Authorization: `Bearer ${token}`,
          }),
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to fetch audit logs");
      }

      setAuditLogs(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      console.error("Audit logs fetch error:", error);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleApplyFilters = () => {
    fetchAuditLogs(filters);
  };

  const handleResetFilters = () => {
    const resetFilters = {
      search: "",
      module: "Bill",
      action: "",
      fromDate: "",
      toDate: "",
    };

    setFilters(resetFilters);
    fetchAuditLogs(resetFilters);
  };

  const formatCurrency = (value) => {
    const amount = Number(value || 0);

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (dateValue) => {
    if (!dateValue) return "-";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const getInvoiceNumber = (log) => {
    return (
      log?.newData?.invoiceNo ||
      log?.oldData?.invoiceNo ||
      log?.documentId ||
      "-"
    );
  };

  const getCustomerName = (log) => {
    return (
      log?.newData?.customerName ||
      log?.oldData?.customerName ||
      "Walk-in Customer"
    );
  };

  const getGrandTotal = (log) => {
    return (
      log?.newData?.summary?.grandTotal ??
      log?.newData?.grandTotal ??
      log?.oldData?.summary?.grandTotal ??
      log?.oldData?.grandTotal ??
      0
    );
  };

  const getPaidAmount = (log) => {
    return (
      log?.newData?.paidAmount ??
      log?.oldData?.paidAmount ??
      0
    );
  };

  const getPendingAmount = (log) => {
    return (
      log?.newData?.pendingAmount ??
      log?.oldData?.pendingAmount ??
      0
    );
  };

  const getPaymentMethod = (log) => {
    return (
      log?.newData?.paymentMethod ||
      log?.oldData?.paymentMethod ||
      "-"
    );
  };

  const getPaymentStatus = (log) => {
    return (
      log?.newData?.paymentStatus ||
      log?.oldData?.paymentStatus ||
      "-"
    );
  };

  const getItems = (log) => {
    if (Array.isArray(log?.newData?.items)) {
      return log.newData.items;
    }

    if (Array.isArray(log?.oldData?.items)) {
      return log.oldData.items;
    }

    return [];
  };

  const filteredLogs = useMemo(() => {
    const searchValue = filters.search.trim().toLowerCase();

    if (!searchValue) return auditLogs;

    return auditLogs.filter((log) => {
      const invoiceNumber = getInvoiceNumber(log).toLowerCase();
      const customerName = getCustomerName(log).toLowerCase();
      const moduleName = String(log.module || "").toLowerCase();
      const actionName = String(log.action || "").toLowerCase();
      const roleName = String(
        log.userId?.role || log.role || ""
      ).toLowerCase();
      const documentId = String(log.documentId || "").toLowerCase();

      return (
        invoiceNumber.includes(searchValue) ||
        customerName.includes(searchValue) ||
        moduleName.includes(searchValue) ||
        actionName.includes(searchValue) ||
        roleName.includes(searchValue) ||
        documentId.includes(searchValue)
      );
    });
  }, [auditLogs, filters.search]);

  const summary = useMemo(() => {
    const totalAmount = filteredLogs.reduce(
      (total, log) => total + Number(getGrandTotal(log) || 0),
      0
    );

    const createCount = filteredLogs.filter(
      (log) => String(log.action).toLowerCase() === "create"
    ).length;

    const updateCount = filteredLogs.filter(
      (log) => String(log.action).toLowerCase() === "update"
    ).length;

    return {
      totalLogs: filteredLogs.length,
      createCount,
      updateCount,
      totalAmount,
    };
  }, [filteredLogs]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Bill Reports</h1>
          <p>View and monitor bill activity history</p>
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={() => fetchAuditLogs(filters)}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? styles.spinning : ""} />
          Refresh
        </button>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <FiFileText />
          </div>

          <div>
            <span>Total Logs</span>
            <strong>{summary.totalLogs}</strong>
          </div>
        </div>
{/*
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <FiFileText />
          </div>

          <div>
            <span>Created</span>
            <strong>{summary.createCount}</strong>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <FiRefreshCw />
          </div>

          <div>
            <span>Updated</span>
            <strong>{summary.updateCount}</strong>
          </div>
        </div>
*/}
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <FiFileText />
          </div>

          <div>
            <span>Total Bill Value</span>
            <strong>{formatCurrency(summary.totalAmount)}</strong>
          </div>
        </div>
      </div> 

      <div className={styles.filterCard}>
        <div className={styles.filterTitle}>
          <FiFilter />
          <span>Filters</span>
        </div>

        <div className={styles.filterGrid}>
          <div className={styles.searchBox}>
            <FiSearch />

            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search invoice, customer or role"
            />
          </div>
{/*
          <select
            name="module"
            value={filters.module}
            onChange={handleFilterChange}
            className={styles.filterControl}
          >
            <option value="">All Modules</option>
            <option value="Bill">Bill</option>
            <option value="Purchase">Purchase</option>
            <option value="Customer">Customer</option>
            <option value="Supplier">Supplier</option>
            <option value="Product">Product</option>
          </select> 

          <select
            name="action"
            value={filters.action}
            onChange={handleFilterChange}
            className={styles.filterControl}
          >
            <option value="">All Actions</option>
            <option value="Create">Create</option>
            <option value="Update">Update</option>
            <option value="Delete">Delete</option>
          </select>
*/}
          <input
            type="date"
            name="fromDate"
            value={filters.fromDate}
            onChange={handleFilterChange}
            className={styles.filterControl}
            title="From date"
          />

          <input
            type="date"
            name="toDate"
            value={filters.toDate}
            onChange={handleFilterChange}
            className={styles.filterControl}
            title="To date"
          />

          <button
            type="button"
            className={styles.applyButton}
            onClick={handleApplyFilters}
          >
            Apply
          </button>

          <button
            type="button"
            className={styles.resetButton}
            onClick={handleResetFilters}
          >
            Reset
          </button>
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div>
            <h2>Bill Audit History</h2>
            <p>{filteredLogs.length} records found</p>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Date & Time</th>
                <th>Invoice No</th>
                <th>Customer</th>
                <th>User Role</th>
                <th>Action</th>
                <th>Items</th>
                <th>Payment</th>
                <th>Status</th>
                <th className={styles.amountColumn}>Amount</th>
                <th className={styles.actionColumn}>View</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11">
                    <div className={styles.loadingState}>
                      <div className={styles.loader} />
                      <span>Loading audit logs...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="11">
                    <div className={styles.emptyState}>
                      <FiFileText />
                      <h3>No audit logs found</h3>
                      <p>Try changing the filters or date range.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => {
                  const status = getPaymentStatus(log);
                  const action = log.action || "-";
                  const items = getItems(log);

                  return (
                    <tr key={log._id}>
                      <td>{index + 1}</td>

                      <td>
                        <div className={styles.dateCell}>
                          <span>{formatDate(log.createdAt)}</span>
                          <small>{formatTime(log.createdAt)}</small>
                        </div>
                      </td>

                      <td>
                        <span className={styles.invoiceNumber}>
                          {getInvoiceNumber(log)}
                        </span>
                      </td>

                      <td>
                        <div className={styles.customerCell}>
                          <div className={styles.customerAvatar}>
                            <FiUser />
                          </div>

                          <div>
                            <span>{getCustomerName(log)}</span>
                            <small>
                              {log.newData?.customerGstNumber ||
                                log.oldData?.customerGstNumber ||
                                "No GST number"}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={styles.roleBadge}>
                          {log.userId?.role || log.role || "-"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`${styles.actionBadge} ${
                            styles[
                              `action${action
                                .charAt(0)
                                .toUpperCase()}${action.slice(1).toLowerCase()}`
                            ] || ""
                          }`}
                        >
                          {action}
                        </span>
                      </td>

                      <td>
                        <div className={styles.itemCount}>
                          <strong>{items.length}</strong>
                          <span>{items.length === 1 ? "Item" : "Items"}</span>
                        </div>
                      </td>

                      <td>
                        <span className={styles.paymentMethod}>
                          {getPaymentMethod(log)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            status.toLowerCase() === "paid"
                              ? styles.paidStatus
                              : status.toLowerCase() === "partial"
                                ? styles.partialStatus
                                : styles.pendingStatus
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className={styles.amountColumn}>
                        <strong className={styles.amount}>
                          {formatCurrency(getGrandTotal(log))}
                        </strong>
                      </td>

                      <td className={styles.actionColumn}>
                        <button
                          type="button"
                          className={styles.viewButton}
                          onClick={() => setSelectedLog(log)}
                          title="View audit details"
                        >
                          <FiEye />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLog && (
        <AuditDetailsModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          formatTime={formatTime}
          getInvoiceNumber={getInvoiceNumber}
          getCustomerName={getCustomerName}
          getGrandTotal={getGrandTotal}
          getPaidAmount={getPaidAmount}
          getPendingAmount={getPendingAmount}
          getPaymentMethod={getPaymentMethod}
          getPaymentStatus={getPaymentStatus}
          getItems={getItems}
        />
      )}
    </div>
  );
}

function AuditDetailsModal({
  log,
  onClose,
  formatCurrency,
  formatDate,
  formatTime,
  getInvoiceNumber,
  getCustomerName,
  getGrandTotal,
  getPaidAmount,
  getPendingAmount,
  getPaymentMethod,
  getPaymentStatus,
  getItems,
}) {
  const data = log.newData || log.oldData || {};
  const items = getItems(log);

  const summary = data.summary || {
    subTotal: data.subTotal,
    totalGST: data.totalGSTAmount,
    itemDiscountAmount: data.itemDiscountAmount,
    billDiscountAmount: data.billDiscountAmount,
    billDiscountPercentage: data.billDiscountPercentage,
    loyaltyDiscount: data.loyaltyDiscount,
    grandTotal: data.grandTotal,
  };

  const payments = Array.isArray(data.payments) ? data.payments : [];

  return (
    <div className={styles.modalOverlay} onMouseDown={onClose}>
      <div
        className={styles.modal}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2>Audit Log Details</h2>
            <p>{getInvoiceNumber(log)}</p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
          >
            <FiX />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.detailSection}>
            <h3>Audit Information</h3>

            <div className={styles.infoGrid}>
              <InfoItem
                label="Module"
                value={log.module || "-"}
              />

              <InfoItem
                label="Action"
                value={log.action || "-"}
              />

              <InfoItem
                label="User Role"
                value={log.userId?.role || log.role || "-"}
              />

              <InfoItem
                label="Document ID"
                value={log.documentId || "-"}
              />

              <InfoItem
                label="Created Date"
                value={formatDate(log.createdAt)}
              />

              <InfoItem
                label="Created Time"
                value={formatTime(log.createdAt)}
              />
            </div>
          </div>

          <div className={styles.detailSection}>
            <h3>Bill Information</h3>

            <div className={styles.infoGrid}>
              <InfoItem
                label="Invoice Number"
                value={getInvoiceNumber(log)}
              />

              <InfoItem
                label="Invoice Date"
                value={formatDate(data.invoiceDate)}
              />

              <InfoItem
                label="Customer"
                value={getCustomerName(log)}
              />

              <InfoItem
                label="Customer GST"
                value={data.customerGstNumber || "-"}
              />

              <InfoItem
                label="Place of Supply"
                value={data.placeOfSupply || "-"}
              />

              <InfoItem
                label="Payment Method"
                value={getPaymentMethod(log)}
              />

              <InfoItem
                label="Payment Status"
                value={getPaymentStatus(log)}
              />
            </div>
          </div>

          <div className={styles.detailSection}>
            <div className={styles.sectionHeader}>
              <h3>Items</h3>
              <span>{items.length} items</span>
            </div>

            <div className={styles.itemsTableWrapper}>
              <table className={styles.itemsTable}>
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Item</th>
                    <th>Barcode</th>
                    <th>HSN</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Rate</th>
                    <th>GST</th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan="9" className={styles.noItems}>
                        No item details available
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => (
                      <tr
                        key={
                          item.productId ||
                          item.barcodeId ||
                          `${item.itemName}-${index}`
                        }
                      >
                        <td>{index + 1}</td>
                        <td>{item.itemName || item.productName || "-"}</td>
                        <td>{item.barcode || "-"}</td>
                        <td>{item.hsnCode || "-"}</td>
                        <td>{item.qty ?? 0}</td>
                        <td>
                          {item.totalKg ||
                            item.unitText ||
                            item.unit ||
                            "-"}
                        </td>
                        <td>
                          {formatCurrency(
                            item.rate ||
                              item.price ||
                              item.finalAmount ||
                              0
                          )}
                        </td>
                        <td>
                          {item.gstRate ?? item.gst ?? 0}%
                        </td>
                        <td>
                          {formatCurrency(
                            item.finalAmount ??
                              item.totalAmount ??
                              0
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.detailSection}>
            <h3>Bill Summary</h3>

            <div className={styles.billSummary}>
              <SummaryRow
                label="Subtotal"
                value={formatCurrency(summary.subTotal || 0)}
              />

              <SummaryRow
                label="Total GST"
                value={formatCurrency(
                  summary.totalGST ??
                    data.totalGSTAmount ??
                    0
                )}
              />

              <SummaryRow
                label="Item Discount"
                value={formatCurrency(
                  summary.itemDiscountAmount || 0
                )}
              />

              <SummaryRow
                label="Bill Discount"
                value={formatCurrency(
                  summary.billDiscountAmount || 0
                )}
              />

              <SummaryRow
                label="Loyalty Discount"
                value={formatCurrency(
                  summary.loyaltyDiscount || 0
                )}
              />

              <SummaryRow
                label="Grand Total"
                value={formatCurrency(getGrandTotal(log))}
                strong
              />

              <SummaryRow
                label="Paid Amount"
                value={formatCurrency(getPaidAmount(log))}
              />

              <SummaryRow
                label="Pending Amount"
                value={formatCurrency(getPendingAmount(log))}
              />
            </div>
          </div>

          {payments.length > 0 && (
            <div className={styles.detailSection}>
              <h3>Payment Details</h3>

              <div className={styles.paymentList}>
                {payments.map((payment, index) => (
                  <div
                    className={styles.paymentItem}
                    key={payment._id || `${payment.method}-${index}`}
                  >
                    <div>
                      <span>Payment {index + 1}</span>
                      <strong>{payment.method || "-"}</strong>
                    </div>

                    <strong>
                      {formatCurrency(payment.amount || 0)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.modalCloseButton}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className={styles.infoItem}>
      <span>{label}</span>
      <strong title={String(value)}>{value}</strong>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div
      className={`${styles.summaryRow} ${
        strong ? styles.grandTotalRow : ""
      }`}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default BillReports;